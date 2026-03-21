import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.dependencies import get_db
from app.models import StockResearch
from app.schemas.jobs import JobStartResponse
from app.schemas.research import ResearchListItem, ResearchListResponse, ResearchOut
from app.services.progress import ProgressReporter
from app.services.research import generate_research, get_research

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/research", tags=["research"])


def _serialize(r: StockResearch) -> dict:
    return {
        "ticker": r.ticker,
        "company": r.company,
        "share_price": r.share_price,
        "market_cap": r.market_cap,
        "enterprise_value": r.enterprise_value,
        "financials": r.financials,
        "price_history": r.price_history,
        "business_overview": r.business_overview,
        "management": r.management,
        "insider_activity": r.insider_activity,
        "superinvestors": r.superinvestors,
        "headwinds_tailwinds": r.headwinds_tailwinds,
        "options_data": r.options_data,
        "auditor": r.auditor,
        "last_refreshed": r.last_refreshed.isoformat() if r.last_refreshed else None,
    }


@router.get("", response_model=ResearchListResponse)
async def api_list_research(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StockResearch).order_by(StockResearch.last_refreshed.desc())
    )
    items = list(result.scalars().all())
    return ResearchListResponse(
        items=[
            ResearchListItem(
                ticker=r.ticker,
                company=r.company,
                share_price=r.share_price,
                market_cap=r.market_cap,
                last_refreshed=r.last_refreshed.isoformat() if r.last_refreshed else None,
            )
            for r in items
        ],
        total=len(items),
    )


@router.get("/{ticker}", response_model=ResearchOut)
async def api_get_research(ticker: str, db: AsyncSession = Depends(get_db)):
    research = await get_research(db, ticker)
    if not research:
        raise HTTPException(status_code=404, detail=f"No research found for {ticker}. Trigger a refresh first.")
    return ResearchOut(**_serialize(research))


async def _run_research(ticker: str, progress: ProgressReporter):
    await progress.start()
    try:
        async with async_session() as db:
            await generate_research(db, ticker, progress=progress)
        if not await progress.is_done():
            await progress.complete(f"Research generated for {ticker}")
    except Exception as e:
        logger.exception(f"Research job failed for {ticker}")
        await progress.fail(str(e))


@router.post("/{ticker}/refresh", response_model=JobStartResponse)
async def api_refresh_research(
    ticker: str,
    background_tasks: BackgroundTasks,
):
    ticker = ticker.strip().upper()
    if not ticker or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Invalid ticker")
    progress = ProgressReporter("research")
    background_tasks.add_task(_run_research, ticker, progress)
    return JobStartResponse(
        job_id=progress.job_id,
        status="started",
        message=f"Research generation started for {ticker}",
    )
