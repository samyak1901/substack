import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.api.services.digest_service import generate_and_store_digest
from app.api.services.price_service import refresh_all_prices
from app.api.services.watchlist_service import extract_and_store_watchlist
from app.database import async_session

logger = logging.getLogger(__name__)


async def _daily_digest_job():
    logger.info("Scheduled job: generating daily digest...")
    async with async_session() as db:
        await generate_and_store_digest(db, since_hours=24, all_subs=False)


async def _monthly_watchlist_job():
    logger.info("Scheduled job: extracting monthly watchlist...")
    async with async_session() as db:
        await extract_and_store_watchlist(db, weeks=1)


async def _weekly_price_refresh_job():
    logger.info("Scheduled job: refreshing prices...")
    async with async_session() as db:
        await refresh_all_prices(db)


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    # Daily digest at 7:00 AM UTC
    scheduler.add_job(_daily_digest_job, "cron", hour=7, minute=0, id="daily_digest")

    # Weekly watchlist on Monday at 8:00 AM UTC
    scheduler.add_job(_monthly_watchlist_job, "cron", day_of_week="mon", hour=8, minute=0, id="weekly_watchlist")

    # Weekly price refresh every Monday at 9:00 AM UTC
    scheduler.add_job(_weekly_price_refresh_job, "cron", day_of_week="mon", hour=9, minute=0, id="weekly_price_refresh")

    return scheduler
