import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import async_session
from app.services.digest import generate_and_store_digest
from app.services.watchlist import extract_and_store_watchlist, refresh_all_prices

logger = logging.getLogger(__name__)


async def _daily_digest_job():
    logger.info("Scheduled job: generating daily digest...")
    async with async_session() as db:
        await generate_and_store_digest(db, since_hours=24, all_subs=False)


async def _weekly_watchlist_job():
    logger.info("Scheduled job: extracting weekly watchlist...")
    async with async_session() as db:
        await extract_and_store_watchlist(db, weeks=1)


async def _weekly_price_refresh_job():
    logger.info("Scheduled job: refreshing prices...")
    async with async_session() as db:
        await refresh_all_prices(db)


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    scheduler.add_job(_daily_digest_job, "cron", hour=7, minute=0, id="daily_digest")
    scheduler.add_job(
        _weekly_watchlist_job, "cron", day_of_week="mon", hour=8, minute=0, id="weekly_watchlist"
    )
    scheduler.add_job(
        _weekly_price_refresh_job,
        "cron",
        day_of_week="mon",
        hour=9,
        minute=0,
        id="weekly_price_refresh",
    )

    return scheduler
