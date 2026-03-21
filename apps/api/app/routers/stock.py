import asyncio
import logging

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session as async_session_factory
from app.dependencies import get_db
from app.models import Alert, Article, Digest, StockResearch, WatchlistEntry
from app.schemas.stock import (
    StockProfileResponse,
    StockSearchResponse,
    StockSearchResult,
    WatchlistAddRequest,
)
from app.services.ai_analysis import generate_ai_analysis
from app.services.stock import get_quarterly_financials, get_stock_profile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stock", tags=["stock"])

FMP_BASE = "https://financialmodelingprep.com/stable"


# --- Static routes MUST come before /{ticker} ---


@router.get("/search/tickers")
async def api_search_tickers(
    q: str = Query(..., min_length=1, max_length=20),
):
    """Search for tickers via FMP search endpoint."""
    settings = get_settings()
    if not settings.fmp_api_key:
        return StockSearchResponse(results=[])

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{FMP_BASE}/search-name",
                params={"query": q, "apikey": settings.fmp_api_key, "limit": 10},
            )
            if resp.status_code != 200:
                return StockSearchResponse(results=[])
            data = resp.json()
            if not isinstance(data, list):
                return StockSearchResponse(results=[])
            results = [
                StockSearchResult(
                    ticker=item.get("symbol", ""),
                    company_name=item.get("name", ""),
                    exchange=item.get("exchangeShortName") or item.get("stockExchange"),
                )
                for item in data[:10]
            ]
            return StockSearchResponse(results=results)
    except Exception as e:
        logger.warning(f"Ticker search error: {e}")
        return StockSearchResponse(results=[])


@router.post("/watchlist")
async def api_add_to_watchlist(
    body: WatchlistAddRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add a ticker to the watchlist."""
    ticker = body.ticker.strip().upper()
    existing = await db.get(WatchlistEntry, ticker)
    if existing:
        if body.conviction is not None:
            existing.conviction = body.conviction
        if body.target_price is not None:
            existing.target_price = body.target_price
        if body.notes is not None:
            existing.notes = body.notes
        await db.commit()
        return {"status": "ok", "message": f"{ticker} updated on watchlist"}

    entry = WatchlistEntry(
        ticker=ticker,
        company=body.company or ticker,
        conviction=body.conviction,
        target_price=body.target_price,
        notes=body.notes,
    )
    db.add(entry)
    await db.commit()
    return {"status": "ok", "message": f"{ticker} added to watchlist"}


@router.delete("/watchlist/{ticker}")
async def api_remove_from_watchlist(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a ticker from the watchlist."""
    ticker = ticker.strip().upper()
    entry = await db.get(WatchlistEntry, ticker)
    if not entry:
        raise HTTPException(status_code=404, detail=f"{ticker} not on watchlist")
    await db.delete(entry)
    await db.commit()
    return {"status": "ok", "message": f"{ticker} removed from watchlist"}


# --- Phase 2: Dashboard endpoints ---


@router.get("/dashboard/summary")
async def api_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """Dashboard data: latest digest summary, watchlist movers, recent research, unread alerts."""

    # Latest digest
    latest_digest = None
    d = await db.execute(select(Digest).order_by(Digest.date.desc()).limit(1))
    digest = d.scalar_one_or_none()
    if digest:
        latest_digest = {
            "id": digest.id,
            "date": digest.date,
            "overview": digest.overview,
            "article_count": digest.article_count,
        }

    # Watchlist movers (sorted by price change)
    w = await db.execute(select(WatchlistEntry).limit(20))
    entries = list(w.scalars().all())
    movers = []
    for e in entries:
        pct = None
        if e.price_at_mention and e.current_price and e.price_at_mention > 0:
            pct = round((e.current_price - e.price_at_mention) / e.price_at_mention * 100, 2)
        movers.append(
            {
                "ticker": e.ticker,
                "company": e.company,
                "current_price": e.current_price,
                "price_change_pct": pct,
                "conviction": e.conviction,
            }
        )
    movers.sort(key=lambda x: x.get("price_change_pct") or 0, reverse=True)
    gainers = [m for m in movers if (m.get("price_change_pct") or 0) > 0][:5]
    losers = [m for m in reversed(movers) if (m.get("price_change_pct") or 0) < 0][:5]

    # Recent research
    r = await db.execute(
        select(StockResearch)
        .where(StockResearch.last_refreshed.isnot(None))
        .order_by(StockResearch.last_refreshed.desc())
        .limit(5)
    )
    research_items = [
        {
            "ticker": sr.ticker,
            "company": sr.company,
            "share_price": sr.share_price,
            "market_cap": sr.market_cap,
            "last_refreshed": sr.last_refreshed.isoformat() if sr.last_refreshed else None,
        }
        for sr in r.scalars().all()
    ]

    # Unread alerts
    a = await db.execute(
        select(Alert).where(Alert.is_read == False).order_by(Alert.created_at.desc()).limit(5)  # noqa: E712
    )
    alerts = [
        {
            "id": al.id,
            "ticker": al.ticker,
            "alert_type": al.alert_type,
            "message": al.message,
            "created_at": al.created_at.isoformat() if al.created_at else "",
        }
        for al in a.scalars().all()
    ]

    return {
        "latest_digest": latest_digest,
        "gainers": gainers,
        "losers": losers,
        "recent_research": research_items,
        "alerts": alerts,
        "watchlist_count": len(entries),
    }


# --- Phase 5: Unified search ---


@router.get("/unified/search")
async def api_unified_search(
    q: str = Query(..., min_length=1, max_length=200),
    db: AsyncSession = Depends(get_db),
):
    """Combined stock + article search."""
    settings = get_settings()

    # Search stocks via FMP
    stocks = []
    if settings.fmp_api_key and len(q) <= 20:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{FMP_BASE}/search-name",
                    params={"query": q, "apikey": settings.fmp_api_key, "limit": 5},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        # Check which are on watchlist
                        tickers = [item.get("symbol", "") for item in data[:5]]
                        wl_result = await db.execute(
                            select(WatchlistEntry.ticker).where(WatchlistEntry.ticker.in_(tickers))
                        )
                        on_watchlist = set(wl_result.scalars().all())

                        stocks = [
                            {
                                "ticker": item.get("symbol", ""),
                                "company_name": item.get("name", ""),
                                "exchange": item.get("exchangeShortName"),
                                "on_watchlist": item.get("symbol", "") in on_watchlist,
                            }
                            for item in data[:5]
                        ]
        except Exception as e:
            logger.warning(f"Stock search error: {e}")

    # Search articles
    articles = []
    if len(q) >= 2:
        result = await db.execute(
            select(Article)
            .where(
                (Article.title.ilike(f"%{q}%"))
                | (Article.author.ilike(f"%{q}%"))
                | (Article.summary_raw.ilike(f"%{q}%"))
            )
            .order_by(Article.id.desc())
            .limit(10)
        )
        for a in result.scalars().all():
            articles.append(
                {
                    "id": a.id,
                    "title": a.title,
                    "author": a.author,
                    "publication": a.publication,
                    "url": a.url,
                    "category": a.category,
                    "reading_time_minutes": a.reading_time_minutes,
                }
            )

    return {"stocks": stocks, "articles": articles}


# --- Dynamic routes ---


@router.get("/{ticker}/quarterly")
async def api_get_quarterly(ticker: str):
    """Fetch quarterly financials on demand (yfinance)."""
    ticker = ticker.strip().upper()
    data = await get_quarterly_financials(ticker, "")
    return data


@router.get("/{ticker}/ai-analysis")
async def api_get_ai_analysis(ticker: str, db: AsyncSession = Depends(get_db)):
    """Get cached AI analysis for a stock."""
    ticker = ticker.strip().upper()
    research = await db.get(StockResearch, ticker)
    if not research or not research.ai_analysis:
        return {"ai_analysis": None}
    return {"ai_analysis": research.ai_analysis}


@router.post("/{ticker}/ai-analysis")
async def api_generate_ai_analysis(
    ticker: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger AI analysis generation."""
    ticker = ticker.strip().upper()
    research = await db.get(StockResearch, ticker)
    if not research or not research.overview:
        raise HTTPException(
            status_code=404, detail="No overview data available. Load stock profile first."
        )

    # Run in background
    async def _run_analysis():
        async with async_session_factory() as session:
            sr = await session.get(StockResearch, ticker)
            if not sr or not sr.overview:
                return

            transcript = ""
            if sr.headwinds_tailwinds:
                transcript = ""  # Already analyzed, don't need transcript again

            result = await asyncio.to_thread(
                generate_ai_analysis,
                ticker,
                sr.company or ticker,
                sr.overview,
                transcript,
            )

            if result:
                sr.ai_analysis = result
                await session.commit()

    background_tasks.add_task(_run_analysis)
    return {"status": "ok", "message": f"AI analysis generation started for {ticker}"}


@router.get("/{ticker}", response_model=StockProfileResponse)
async def api_get_stock_profile(
    ticker: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Get full stock profile with FMP overview data.

    Auto-triggers research and AI analysis in background if missing.
    """
    ticker = ticker.strip().upper()
    if not ticker or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Invalid ticker")

    try:
        profile = await get_stock_profile(db, ticker)
    except Exception as e:
        logger.exception(f"Stock profile error for {ticker}")
        raise HTTPException(status_code=500, detail=str(e)) from e

    # Include watchlist info
    entry = await db.get(WatchlistEntry, ticker)
    if entry:
        profile["watchlist"] = {
            "on_watchlist": True,
            "conviction": entry.conviction,
            "target_price": entry.target_price,
            "notes": entry.notes,
            "price_at_mention": entry.price_at_mention,
        }
    else:
        profile["watchlist"] = {"on_watchlist": False}

    # Auto-trigger research if missing (non-blocking background)
    research = profile.get("research", {})
    if not research.get("last_refreshed"):
        background_tasks.add_task(_auto_generate_research, ticker)

    # Auto-trigger AI analysis if missing but overview exists
    if not research.get("ai_analysis") and profile.get("overview"):
        background_tasks.add_task(_auto_generate_ai, ticker)

    return profile


async def _auto_generate_research(ticker: str):
    """Background task: auto-generate research for a stock."""
    from app.services.research import generate_research

    try:
        async with async_session_factory() as db:
            # Double-check it's still missing
            sr = await db.get(StockResearch, ticker)
            if sr and sr.last_refreshed:
                return
            await generate_research(db, ticker)
            logger.info(f"Auto-generated research for {ticker}")
    except Exception as e:
        logger.error(f"Auto research generation failed for {ticker}: {e}")


async def _auto_generate_ai(ticker: str):
    """Background task: auto-generate AI analysis for a stock."""
    try:
        async with async_session_factory() as db:
            sr = await db.get(StockResearch, ticker)
            if not sr or not sr.overview or sr.ai_analysis:
                return

            result = await asyncio.to_thread(
                generate_ai_analysis,
                ticker,
                sr.company or ticker,
                sr.overview,
                "",
            )

            if result:
                sr.ai_analysis = result
                await db.commit()
                logger.info(f"Auto-generated AI analysis for {ticker}")
    except Exception as e:
        logger.error(f"Auto AI analysis failed for {ticker}: {e}")


@router.get("/{ticker}/articles")
async def api_get_stock_articles(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Get articles mentioning a ticker from digests."""
    ticker = ticker.strip().upper()

    result = await db.execute(
        select(Article, Digest.date)
        .join(Digest, Article.digest_id == Digest.id)
        .where((Article.title.ilike(f"%{ticker}%")) | (Article.summary_raw.ilike(f"%{ticker}%")))
        .order_by(Digest.date.desc())
        .limit(20)
    )
    rows = result.all()

    articles = []
    for article, digest_date in rows:
        articles.append(
            {
                "id": article.id,
                "title": article.title,
                "author": article.author,
                "publication": article.publication,
                "url": article.url,
                "summary_html": article.summary_html,
                "category": article.category,
                "reading_time_minutes": article.reading_time_minutes,
                "digest_date": digest_date,
            }
        )

    return {"articles": articles, "total": len(articles)}
