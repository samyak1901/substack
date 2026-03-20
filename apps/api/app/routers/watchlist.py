from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models import WatchlistEntry
from app.schemas.watchlist import (
    AlertListResponse,
    AlertOut,
    MarkAlertsReadRequest,
    WatchlistEntryOut,
    WatchlistEntryUpdate,
    WatchlistResponse,
)
from app.services.watchlist import get_alerts, list_watchlist, mark_alerts_read, refresh_all_prices

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


def _serialize_entry(e: WatchlistEntry) -> dict:
    price_change_pct = None
    if e.price_at_mention and e.current_price and e.price_at_mention > 0:
        price_change_pct = round(
            (e.current_price - e.price_at_mention) / e.price_at_mention * 100, 2
        )

    return {
        "ticker": e.ticker,
        "company": e.company,
        "price_at_mention": e.price_at_mention,
        "current_price": e.current_price,
        "reasoning": e.reasoning,
        "article_url": e.article_url,
        "article_title": e.article_title,
        "publication": e.publication,
        "author": e.author,
        "mention_date": e.mention_date,
        "sector": e.sector,
        "market_cap": e.market_cap,
        "conviction": e.conviction,
        "target_price": e.target_price,
        "notes": e.notes,
        "price_updated_at": e.price_updated_at.isoformat() if e.price_updated_at else None,
        "price_change_pct": price_change_pct,
    }


@router.get("", response_model=WatchlistResponse)
async def api_list_watchlist(
    sort_by: str = Query(
        "mention_date",
        pattern="^(mention_date|ticker|company|current_price|price_at_mention)$",
    ),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
):
    entries = await list_watchlist(db, sort_by, order)
    return WatchlistResponse(
        entries=[WatchlistEntryOut(**_serialize_entry(e)) for e in entries],
        total=len(entries),
    )


@router.patch("/{ticker}", response_model=WatchlistEntryOut)
async def api_update_entry(
    ticker: str,
    body: WatchlistEntryUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WatchlistEntry).where(WatchlistEntry.ticker == ticker)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")

    if body.notes is not None:
        entry.notes = body.notes
    if body.conviction is not None:
        entry.conviction = body.conviction

    await db.commit()
    await db.refresh(entry)
    return WatchlistEntryOut(**_serialize_entry(entry))


@router.post("/refresh")
async def api_refresh_prices(db: AsyncSession = Depends(get_db)):
    count = await refresh_all_prices(db)
    return {"status": "ok", "message": f"Refreshed {count} entries"}


@router.get("/alerts", response_model=AlertListResponse)
async def api_get_alerts(
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    alerts = await get_alerts(db, unread_only)
    unread_count = sum(1 for a in alerts if not a.is_read)
    return AlertListResponse(
        alerts=[
            AlertOut(
                id=a.id,
                ticker=a.ticker,
                alert_type=a.alert_type,
                message=a.message,
                is_read=a.is_read,
                triggered_price=a.triggered_price,
                target_price=a.target_price,
                created_at=a.created_at.isoformat() if a.created_at else "",
            )
            for a in alerts
        ],
        unread_count=unread_count,
    )


@router.post("/alerts/mark-read")
async def api_mark_alerts_read(
    body: MarkAlertsReadRequest,
    db: AsyncSession = Depends(get_db),
):
    await mark_alerts_read(db, body.alert_ids)
    return {"status": "ok"}
