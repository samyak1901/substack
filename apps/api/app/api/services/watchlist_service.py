import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.client import SubstackClient
from app.config import get_settings
from app.models import ProcessedPost, WatchlistEntry
from app.services.extractor import PitchExtractor
from app.services.finance import get_prices

logger = logging.getLogger(__name__)

# Max posts to process concurrently (balances speed vs API rate limits)
POST_CONCURRENCY = 5
# Max concurrent price lookups per post
PRICE_CONCURRENCY = 3


async def extract_and_store_watchlist(
    db: AsyncSession,
    weeks: int = 1,
) -> int:
    """Extract stock pitches and store in DB. Returns number of pitches found."""
    settings = get_settings()
    if not settings.substack_sid or not settings.gemini_api_key:
        logger.error("Missing SUBSTACK_SID or GEMINI_API_KEY environment variables.")
        return 0

    client = SubstackClient(settings.substack_sid)
    extractor = PitchExtractor(settings.gemini_api_key)
    hours = weeks * 7 * 24

    logger.info(f"Fetching posts from PAID subscriptions (last {weeks} week(s))...")
    posts = await asyncio.to_thread(
        client.get_recent_posts, since_hours=hours, all_subs=False
    )

    if not posts:
        logger.info("No articles found.")
        return 0

    # Filter out already-processed posts before doing any heavy work
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
        return 0

    post_semaphore = asyncio.Semaphore(POST_CONCURRENCY)
    price_semaphore = asyncio.Semaphore(PRICE_CONCURRENCY)

    async def _fetch_prices(ticker: str, post_date: datetime) -> dict:
        async with price_semaphore:
            return await asyncio.to_thread(get_prices, ticker, post_date)

    async def _process_post(
        i: int, post: dict
    ) -> list[WatchlistEntry]:
        async with post_semaphore:
            url = post.get("canonical_url", "")
            title = post.get("title", "Untitled")
            bylines = post.get("publishedBylines") or post.get("bylines") or []
            author = bylines[0].get("name", "Unknown") if bylines else "Unknown"
            publication = post.get("_publication_name", "")
            post_date_str = post.get("post_date") or post.get("published_at", "")
            post_date = client._parse_date(post_date_str)

            if not post_date:
                return []

            content = await asyncio.to_thread(client.get_post_content, post)
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

            # Fetch prices for all tickers in this post concurrently
            price_tasks = [
                _fetch_prices(pitch.ticker_symbol, post_date) for pitch in pitches
            ]
            price_results = await asyncio.gather(*price_tasks)

            entries = []
            for pitch, prices in zip(pitches, price_results):
                price_at = prices["price_at_mention"]
                current = prices["current_price"]
                entries.append(WatchlistEntry(
                    ticker=pitch.ticker_symbol,
                    company=pitch.company_name,
                    price_at_mention=price_at if isinstance(price_at, (int, float)) else None,
                    current_price=current if isinstance(current, (int, float)) else None,
                    reasoning=pitch.sentiment_reasoning,
                    article_url=url,
                    article_title=title,
                    publication=publication,
                    author=author,
                    mention_date=post_date.strftime("%Y-%m-%d"),
                    sector=prices.get("sector"),
                    market_cap=prices.get("market_cap"),
                    conviction=pitch.conviction_level,
                    target_price=pitch.target_price,
                    price_updated_at=datetime.now(timezone.utc),
                ))
            return entries

    # Process all posts concurrently (bounded by semaphore)
    tasks = [_process_post(i, post) for i, post in enumerate(unprocessed, 1)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    total_pitches = 0
    for post, result in zip(unprocessed, results):
        url = post.get("canonical_url", "")
        if isinstance(result, Exception):
            logger.error(f"Failed to process {url}: {result}")
            continue
        for entry in result:
            # Check if ticker already exists to preserve user-edited notes
            existing = await db.get(WatchlistEntry, entry.ticker)
            if existing:
                # Update with newest pitch data but keep user notes
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
                # notes intentionally preserved
            else:
                db.add(entry)
            total_pitches += 1
        db.add(ProcessedPost(canonical_url=url))

    await db.commit()
    logger.info(f"Extracted {total_pitches} pitches.")
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
