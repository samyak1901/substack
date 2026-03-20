import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WatchlistEntry
from app.services.finance import get_prices

logger = logging.getLogger(__name__)


async def refresh_all_prices(db: AsyncSession) -> int:
    """Refresh current_price for all watchlist entries. Returns count updated."""
    result = await db.execute(select(WatchlistEntry))
    entries = list(result.scalars().all())

    if not entries:
        return 0

    updated = 0
    for entry in entries:
        try:
            prices = get_prices(entry.ticker, datetime.now(timezone.utc))
            current = prices["current_price"]
            if isinstance(current, (int, float)):
                entry.current_price = current
                entry.price_updated_at = datetime.now(timezone.utc)
                updated += 1
        except Exception as e:
            logger.warning(f"Failed to refresh price for {entry.ticker}: {e}")

    await db.commit()
    logger.info(f"Refreshed prices for {updated}/{len(entries)} entries.")
    return updated
