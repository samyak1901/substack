import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.substack import SubstackClient, parse_date
from app.config import get_settings
from app.models import Alert, ProcessedPost, WatchlistEntry
from app.services.extractor import PitchExtractor
from app.services.finance import get_prices

logger = logging.getLogger(__name__)

POST_CONCURRENCY = 5
PRICE_CONCURRENCY = 3


async def extract_and_store_watchlist(
    db: AsyncSession,
    weeks: int = 1,
    progress=None,
) -> int:
    settings = get_settings()
    if not settings.substack_sid or not settings.gemini_api_key:
        logger.error("Missing SUBSTACK_SID or GEMINI_API_KEY.")
        return 0

    async with SubstackClient(settings.substack_sid) as client:
        extractor = PitchExtractor()
        hours = weeks * 7 * 24

        logger.info(f"Fetching posts from PAID subscriptions (last {weeks} week(s))...")
        posts = await client.get_recent_posts(since_hours=hours, all_subs=False)

        if not posts:
            logger.info("No articles found.")
            return 0

        # Filter out already-processed posts
        urls = [p.get("canonical_url", "") for p in posts]
        existing_result = await db.execute(
            select(ProcessedPost.canonical_url).where(
                ProcessedPost.canonical_url.in_([u for u in urls if u])
            )
        )
        already_processed = set(existing_result.scalars().all())
        unprocessed = [p for p in posts if p.get("canonical_url", "") not in already_processed]

        logger.info(
            f"Found {len(posts)} articles, {len(unprocessed)} unprocessed. "
            f"Screening for stock pitches..."
        )

        if not unprocessed:
            logger.info("All articles already processed.")
            if progress:
                await progress.complete("All articles already processed.")
            return 0

        if progress:
            await progress.update(
                f"Found {len(unprocessed)} articles to screen for pitches...", 10
            )

        post_semaphore = asyncio.Semaphore(POST_CONCURRENCY)
        price_semaphore = asyncio.Semaphore(PRICE_CONCURRENCY)

        async def _fetch_prices(ticker: str, post_date: datetime):
            async with price_semaphore:
                return await asyncio.to_thread(get_prices, ticker, post_date)

        async def _process_post(i: int, post: dict) -> list[WatchlistEntry]:
            async with post_semaphore:
                url = post.get("canonical_url", "")
                title = post.get("title", "Untitled")
                bylines = post.get("publishedBylines") or post.get("bylines") or []
                author = bylines[0].get("name", "Unknown") if bylines else "Unknown"
                publication = post.get("_publication_name", "")
                post_date_str = post.get("post_date") or post.get("published_at", "")
                post_date = parse_date(post_date_str)

                if not post_date:
                    return []

                content = await client.get_post_content(post)
                if not content:
                    return []

                pitches = await asyncio.to_thread(
                    extractor.extract_pitches, title, author, content
                )

                if not pitches:
                    if i % 10 == 0:
                        logger.info(f"  [{i}/{len(unprocessed)}] Screened... (no pitches)")
                    return []

                logger.info(
                    f"  [{i}/{len(unprocessed)}] {title} — Found {len(pitches)} pitch(es)!"
                )

                price_tasks = [_fetch_prices(p.ticker_symbol, post_date) for p in pitches]
                price_results = await asyncio.gather(*price_tasks)

                entries = []
                for pitch, prices in zip(pitches, price_results, strict=True):
                    entries.append(
                        WatchlistEntry(
                            ticker=pitch.ticker_symbol,
                            company=pitch.company_name,
                            price_at_mention=prices.price_at_mention,
                            current_price=prices.current_price,
                            reasoning=pitch.sentiment_reasoning,
                            article_url=url,
                            article_title=title,
                            publication=publication,
                            author=author,
                            mention_date=post_date.strftime("%Y-%m-%d"),
                            sector=prices.sector,
                            market_cap=prices.market_cap,
                            conviction=pitch.conviction_level,
                            target_price=pitch.target_price,
                            price_updated_at=datetime.now(UTC),
                        )
                    )
                return entries

        tasks = [_process_post(i, post) for i, post in enumerate(unprocessed, 1)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    total_pitches = 0
    for post, result in zip(unprocessed, results, strict=True):
        url = post.get("canonical_url", "")
        if isinstance(result, Exception):
            logger.error(f"Failed to process {url}: {result}")
            continue
        for entry in result:
            existing = await db.get(WatchlistEntry, entry.ticker)
            if existing:
                existing.company = entry.company
                existing.price_at_mention = entry.price_at_mention
                existing.current_price = entry.current_price
                existing.reasoning = entry.reasoning
                existing.article_url = entry.article_url
                existing.article_title = entry.article_title
                existing.publication = entry.publication
                existing.author = entry.author
                existing.mention_date = entry.mention_date
                existing.sector = entry.sector
                existing.market_cap = entry.market_cap
                existing.conviction = entry.conviction
                existing.target_price = entry.target_price
                existing.price_updated_at = entry.price_updated_at
            else:
                db.add(entry)
            total_pitches += 1
        db.add(ProcessedPost(canonical_url=url))

    await db.commit()
    logger.info(f"Extracted {total_pitches} pitches.")
    if progress:
        await progress.complete(f"Extracted {total_pitches} pitches from {len(unprocessed)} articles.")
    return total_pitches


async def list_watchlist(
    db: AsyncSession,
    sort_by: str = "mention_date",
    order: str = "desc",
) -> list[WatchlistEntry]:
    col = getattr(WatchlistEntry, sort_by, WatchlistEntry.mention_date)
    ordering = col.desc() if order == "desc" else col.asc()
    result = await db.execute(select(WatchlistEntry).order_by(ordering))
    return list(result.scalars().all())


async def refresh_all_prices(db: AsyncSession, progress=None) -> int:
    result = await db.execute(select(WatchlistEntry))
    entries = list(result.scalars().all())

    if not entries:
        return 0

    updated = 0
    for i, entry in enumerate(entries, 1):
        try:
            if progress:
                pct = int((i / len(entries)) * 90)
                await progress.update(f"Refreshing {entry.ticker} ({i}/{len(entries)})", pct)
            old_price = entry.current_price
            prices = get_prices(entry.ticker, datetime.now(UTC))
            if prices.current_price is not None:
                entry.current_price = prices.current_price
                entry.price_updated_at = datetime.now(UTC)
                updated += 1

                # Check for target price alerts
                if entry.target_price and old_price:
                    if old_price < entry.target_price <= prices.current_price:
                        db.add(
                            Alert(
                                ticker=entry.ticker,
                                alert_type="target_reached",
                                message=(
                                    f"{entry.ticker} reached target ${entry.target_price:.2f} "
                                    f"(now ${prices.current_price:.2f})"
                                ),
                                triggered_price=prices.current_price,
                                target_price=entry.target_price,
                            )
                        )
                    elif old_price > entry.target_price >= prices.current_price:
                        db.add(
                            Alert(
                                ticker=entry.ticker,
                                alert_type="target_reached",
                                message=(
                                    f"{entry.ticker} dropped to target ${entry.target_price:.2f} "
                                    f"(now ${prices.current_price:.2f})"
                                ),
                                triggered_price=prices.current_price,
                                target_price=entry.target_price,
                            )
                        )
        except Exception as e:
            logger.warning(f"Failed to refresh price for {entry.ticker}: {e}")

    await db.commit()
    logger.info(f"Refreshed prices for {updated}/{len(entries)} entries.")
    if progress:
        await progress.complete(f"Refreshed {updated}/{len(entries)} prices.")
    return updated


async def get_alerts(
    db: AsyncSession, unread_only: bool = False
) -> list[Alert]:
    stmt = select(Alert).order_by(Alert.created_at.desc())
    if unread_only:
        stmt = stmt.where(Alert.is_read == False)  # noqa: E712
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def mark_alerts_read(db: AsyncSession, alert_ids: list[int]) -> None:
    for aid in alert_ids:
        alert = await db.get(Alert, aid)
        if alert:
            alert.is_read = True
    await db.commit()
