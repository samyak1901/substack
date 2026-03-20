import asyncio
import csv
import logging
import threading
from pathlib import Path

from app.client import SubstackClient
from app.config import get_settings
from app.services.extractor import PitchExtractor
from app.services.finance import get_prices

logger = logging.getLogger(__name__)

POST_CONCURRENCY = 5
PRICE_CONCURRENCY = 3


async def _generate_watchlist_async(months: int, output_file: str) -> bool:
    """Async implementation of watchlist generation with concurrency."""
    s = get_settings()
    client = SubstackClient(s.substack_sid)
    extractor = PitchExtractor(s.gemini_api_key)
    hours = months * 30 * 24

    logger.info(f"Fetching posts from PAID subscriptions (last {months} months)...")
    posts = await asyncio.to_thread(
        client.get_recent_posts, since_hours=hours, all_subs=False
    )

    if not posts:
        logger.info("No articles found in that timeframe.")
        return False

    logger.info(f"Found {len(posts)} articles. Screening for stock pitches...")

    fields = ["Date", "Publication", "Author", "Company", "Ticker",
              "Price at Mention", "Current Price", "Sector", "Market Cap",
              "Conviction", "Target Price", "Reasoning",
              "Article Source", "Article Title"]

    out_path = Path(output_file)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()

    csv_lock = threading.Lock()
    post_semaphore = asyncio.Semaphore(POST_CONCURRENCY)
    price_semaphore = asyncio.Semaphore(PRICE_CONCURRENCY)

    async def _fetch_prices(ticker, post_date):
        async with price_semaphore:
            return await asyncio.to_thread(get_prices, ticker, post_date)

    async def _process_post(i, post) -> list[dict]:
        async with post_semaphore:
            title = post.get("title", "Untitled")
            bylines = post.get("publishedBylines") or post.get("bylines") or []
            author = bylines[0].get("name", "Unknown") if bylines else "Unknown"
            publication = post.get("_publication_name", "")
            post_date_str = post.get("post_date") or post.get("published_at", "")
            url = post.get("canonical_url", "")

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
                    logger.info(f"  [{i}/{len(posts)}] Screened... (no pitches)")
                return []

            logger.info(f"  [{i}/{len(posts)}] {title} — Found {len(pitches)} pitch(es)!")

            price_tasks = [
                _fetch_prices(pitch.ticker_symbol, post_date) for pitch in pitches
            ]
            price_results = await asyncio.gather(*price_tasks)

            rows = []
            for pitch, prices in zip(pitches, price_results):
                rows.append({
                    "Date": post_date.strftime("%Y-%m-%d"),
                    "Publication": publication,
                    "Author": author,
                    "Company": pitch.company_name,
                    "Ticker": pitch.ticker_symbol,
                    "Price at Mention": prices["price_at_mention"],
                    "Current Price": prices["current_price"],
                    "Sector": prices.get("sector", ""),
                    "Market Cap": prices.get("market_cap", ""),
                    "Conviction": pitch.conviction_level,
                    "Target Price": pitch.target_price or "",
                    "Reasoning": pitch.sentiment_reasoning,
                    "Article Source": url,
                    "Article Title": title,
                })
            return rows

    tasks = [_process_post(i, post) for i, post in enumerate(posts, 1)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    total_pitches = 0
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Failed to process post: {result}")
            continue
        if result:
            with csv_lock:
                with out_path.open("a", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=fields)
                    writer.writerows(result)
            total_pitches += len(result)

    if total_pitches == 0:
        logger.warning(f"Screened {len(posts)} articles but found 0 explicitly pitched stocks.")
        return False

    logger.info(f"\nSuccessfully extracted {total_pitches} pitches to {out_path.absolute()}")
    return True


def generate_watchlist(months: int = 12, output_file: str = "watchlist.csv") -> bool:
    """Extract stock pitches from the last N months of paid subscriptions and save to CSV."""
    return asyncio.run(_generate_watchlist_async(months, output_file))
