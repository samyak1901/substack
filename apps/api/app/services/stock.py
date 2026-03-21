"""Stock overview service — fetches company data primarily from yfinance, with FMP for profile info."""

import asyncio
import logging
import math
from datetime import UTC, datetime, timedelta

import httpx
import yfinance as yf
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import StockResearch
from app.services.research import _fmp_get

logger = logging.getLogger(__name__)

FMP_BASE = "https://financialmodelingprep.com/stable"
OVERVIEW_STALE_HOURS = 24


def _safe(val):
    """Convert NaN/Inf to None for JSON serialization."""
    if val is None:
        return None
    try:
        if math.isnan(val) or math.isinf(val):
            return None
    except (TypeError, ValueError):
        return val
    return val


def _fetch_yfinance_overview(ticker: str) -> dict:
    """Fetch comprehensive overview data from yfinance (runs in thread)."""
    stock = yf.Ticker(ticker)
    result: dict = {}

    try:
        info = stock.info or {}
    except Exception as e:
        logger.warning(f"yfinance info error for {ticker}: {e}")
        info = {}

    # --- Statistics ---
    price = info.get("currentPrice") or info.get("regularMarketPrice")
    market_cap = info.get("marketCap")
    shares = info.get("sharesOutstanding")
    if not shares and price and market_cap and price > 0:
        shares = market_cap / price

    result["statistics"] = {
        "market_cap": _safe(market_cap),
        "price": _safe(price),
        "beta": _safe(info.get("beta")),
        "vol_avg": _safe(info.get("averageVolume")),
        "range": f"{info.get('fiftyTwoWeekLow', '')}-{info.get('fiftyTwoWeekHigh', '')}"
        if info.get("fiftyTwoWeekLow")
        else "",
        "changes": _safe(info.get("regularMarketChange")),
        "change_percentage": _safe(info.get("regularMarketChangePercent")),
        "shares_outstanding": _safe(shares),
        "last_dividend": _safe(info.get("lastDividendValue") or info.get("dividendRate")),
        "enterprise_value": _safe(info.get("enterpriseValue")),
        "revenue_per_share": _safe(info.get("revenuePerShare")),
        "net_income_per_share": None,
    }

    # --- Profile (from yfinance info) ---
    result["profile"] = {
        "description": info.get("longBusinessSummary", ""),
        "ceo": "",  # FMP provides this better
        "website": info.get("website", ""),
        "sector": info.get("sector", ""),
        "industry": info.get("industry", ""),
        "employees": info.get("fullTimeEmployees"),
        "ipo_date": "",
        "exchange": info.get("exchange", ""),
        "country": info.get("country", ""),
        "currency": info.get("currency", "USD"),
        "company_name": info.get("longName") or info.get("shortName") or ticker,
        "image": "",  # FMP provides this
    }

    # --- Margins ---
    result["margins"] = {
        "gross": _safe(info.get("grossMargins")),
        "ebitda": _safe(info.get("ebitdaMargins")),
        "operating": _safe(info.get("operatingMargins")),
        "net": _safe(info.get("profitMargins")),
        "fcf": None,
    }

    # --- Valuation ---
    result["valuation"] = {
        "pe": _safe(info.get("forwardPE") or info.get("trailingPE")),
        "pb": _safe(info.get("priceToBook")),
        "ps": _safe(info.get("priceToSalesTrailing12Months")),
        "pfcf": None,
        "ev_to_sales": _safe(info.get("enterpriseToRevenue")),
        "ev_to_ebitda": _safe(info.get("enterpriseToEbitda")),
        "dividend_yield": _safe(info.get("dividendYield")),
        "payout_ratio": _safe(info.get("payoutRatio")),
    }

    # Compute P/FCF
    fcf = info.get("freeCashflow")
    if fcf and market_cap and fcf > 0:
        result["valuation"]["pfcf"] = _safe(market_cap / fcf)

    # Compute FCF margin
    total_rev = info.get("totalRevenue")
    if fcf and total_rev and total_rev > 0:
        result["margins"]["fcf"] = _safe(fcf / total_rev)

    # --- Returns ---
    result["returns"] = {
        "roa": _safe(info.get("returnOnAssets")),
        "roe": _safe(info.get("returnOnEquity")),
        "roic": None,
        "roce": None,
    }

    # --- Growth ---
    result["growth"] = {
        "revenue_growth_yoy": _safe(info.get("revenueGrowth")),
        "eps_growth_yoy": _safe(info.get("earningsGrowth")),
        "net_income_growth_yoy": _safe(info.get("earningsGrowth")),
        "revenue_growth_3yr": None,
        "revenue_growth_5yr": None,
        "eps_growth_3yr": None,
        "eps_growth_5yr": None,
        "dividends_growth_yoy": None,
    }

    # --- Financial Health ---
    result["financial_health"] = {
        "current_ratio": _safe(info.get("currentRatio")),
        "quick_ratio": _safe(info.get("quickRatio")),
        "debt_to_equity": _safe(info.get("debtToEquity")),
        "interest_coverage": None,
        "cash_per_share": _safe(info.get("totalCashPerShare")),
    }

    # --- Dividends ---
    result["dividends"] = {
        "yield": _safe(info.get("dividendYield")),
        "payout_ratio": _safe(info.get("payoutRatio")),
        "dps": _safe(info.get("dividendRate")),
        "dps_growth": None,
    }

    # --- Financials (income statement + cash flow, 5 years) ---
    financials_years = _build_yfinance_financials(stock)
    if financials_years:
        result["financials"] = {"years": financials_years}

        # Compute multi-year growth rates from actual data
        revenues = [(y["year"], y["revenue"]) for y in financials_years if y.get("revenue")]
        if len(revenues) >= 4:
            result["growth"]["revenue_growth_3yr"] = _safe(
                _cagr(revenues[-4][1], revenues[-1][1], 3)
            )
        if len(revenues) >= 5:
            result["growth"]["revenue_growth_5yr"] = _safe(
                _cagr(revenues[0][1], revenues[-1][1], len(revenues) - 1)
            )

    # --- Balance Sheet ---
    balance_sheet = _build_yfinance_balance_sheet(stock)
    if balance_sheet:
        result["balance_sheet"] = balance_sheet

    result["fetched_at"] = datetime.now(UTC).isoformat()
    return result


def _cagr(start: float, end: float, years: int) -> float | None:
    """Compute compound annual growth rate."""
    if not start or not end or years <= 0 or start <= 0:
        return None
    return (end / start) ** (1 / years) - 1


def _build_yfinance_financials(stock: yf.Ticker) -> list[dict]:
    """Build per-year financials from yfinance income statement + cash flow."""
    years_data: dict = {}

    # Income statement
    try:
        inc = stock.financials
        if inc is not None and not inc.empty:
            for col in inc.columns:
                year = str(col.year)
                row = {}
                for field, yf_key in [
                    ("revenue", "Total Revenue"),
                    ("ebitda", "EBITDA"),
                    ("ebit", "EBIT"),
                    ("net_income", "Net Income"),
                    ("eps", "Basic EPS"),
                ]:
                    if yf_key in inc.index:
                        row[field] = _safe(float(inc.at[yf_key, col]))
                if row:
                    row["year"] = year
                    years_data.setdefault(year, {}).update(row)
    except Exception as e:
        logger.warning(f"yfinance income statement error: {e}")

    # Cash flow
    try:
        cf = stock.cashflow
        if cf is not None and not cf.empty:
            for col in cf.columns:
                year = str(col.year)
                row = {}
                for field, yf_key in [
                    ("fcf", "Free Cash Flow"),
                    ("operating_cf", "Operating Cash Flow"),
                ]:
                    if yf_key in cf.index:
                        row[field] = _safe(float(cf.at[yf_key, col]))
                if row:
                    years_data.setdefault(year, {"year": year}).update(row)
    except Exception as e:
        logger.warning(f"yfinance cash flow error: {e}")

    # Compute margins
    for yd in years_data.values():
        rev = yd.get("revenue")
        if rev and rev != 0:
            if yd.get("ebitda"):
                yd["ebitda_margin"] = _safe(yd["ebitda"] / rev)
            if yd.get("ebit"):
                yd["ebit_margin"] = _safe(yd["ebit"] / rev)
            if yd.get("net_income"):
                yd["net_margin"] = _safe(yd["net_income"] / rev)
            if yd.get("fcf"):
                yd["fcf_margin"] = _safe(yd["fcf"] / rev)

    if not years_data:
        return []

    return sorted(years_data.values(), key=lambda x: x.get("year", ""))


def _build_yfinance_balance_sheet(stock: yf.Ticker) -> list[dict]:
    """Build per-year balance sheet from yfinance."""
    result = []
    try:
        bs = stock.balance_sheet
        if bs is not None and not bs.empty:
            for col in sorted(bs.columns):
                year = str(col.year)
                entry = {"year": year}
                mappings = [
                    ("total_assets", "Total Assets"),
                    ("total_liabilities", "Total Liabilities Net Minority Interest"),
                    ("total_equity", "Stockholders Equity"),
                    ("total_debt", "Total Debt"),
                    ("net_debt", "Net Debt"),
                    ("cash", "Cash And Cash Equivalents"),
                ]
                for field, yf_key in mappings:
                    if yf_key in bs.index:
                        entry[field] = _safe(float(bs.at[yf_key, col]))
                    else:
                        entry[field] = None
                result.append(entry)
    except Exception as e:
        logger.warning(f"yfinance balance sheet error: {e}")

    return result


async def _fetch_fmp_profile(ticker: str, fmp_api_key: str) -> dict:
    """Fetch just the FMP profile for company image, CEO, IPO date."""
    if not fmp_api_key:
        return {}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            data = await _fmp_get(client, "profile", ticker, fmp_api_key)
            if isinstance(data, list) and data:
                p = data[0]
                return {
                    "ceo": p.get("ceo", ""),
                    "image": p.get("image", ""),
                    "ipo_date": p.get("ipoDate", ""),
                    "exchange": p.get("exchangeShortName")
                    or p.get("exchangeFullName")
                    or p.get("exchange", ""),
                }
    except Exception as e:
        logger.warning(f"FMP profile fetch error for {ticker}: {e}")
    return {}


def _fetch_price_history(ticker: str) -> list[dict]:
    """Fetch 5-year price history from yfinance (runs in thread)."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="5y", interval="1d")
        if hist.empty:
            return []
        prices = []
        for date, row in hist.iterrows():
            prices.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                }
            )
        return prices
    except Exception as e:
        logger.warning(f"yfinance history error for {ticker}: {e}")
        return []


async def get_stock_overview(ticker: str, fmp_api_key: str) -> dict:
    """Fetch overview data using yfinance as primary, FMP profile for extras."""
    # Run yfinance in thread (it's synchronous) + FMP profile concurrently
    yf_task = asyncio.to_thread(_fetch_yfinance_overview, ticker)
    fmp_task = _fetch_fmp_profile(ticker, fmp_api_key)

    yf_data, fmp_profile = await asyncio.gather(yf_task, fmp_task, return_exceptions=True)

    if isinstance(yf_data, Exception):
        logger.error(f"yfinance overview failed for {ticker}: {yf_data}")
        yf_data = {}
    if isinstance(fmp_profile, Exception):
        logger.warning(f"FMP profile failed for {ticker}: {fmp_profile}")
        fmp_profile = {}

    result = yf_data if isinstance(yf_data, dict) else {}

    # Merge FMP profile extras (image, CEO, IPO date, exchange)
    if isinstance(fmp_profile, dict) and fmp_profile:
        profile = result.get("profile", {})
        if fmp_profile.get("ceo"):
            profile["ceo"] = fmp_profile["ceo"]
        if fmp_profile.get("image"):
            profile["image"] = fmp_profile["image"]
        if fmp_profile.get("ipo_date"):
            profile["ipo_date"] = fmp_profile["ipo_date"]
        if fmp_profile.get("exchange") and not profile.get("exchange"):
            profile["exchange"] = fmp_profile["exchange"]
        result["profile"] = profile

    if "fetched_at" not in result:
        result["fetched_at"] = datetime.now(UTC).isoformat()

    return result


async def get_stock_profile(db: AsyncSession, ticker: str) -> dict:
    """Get composite stock profile: overview + research + watchlist entry.

    Fetches overview if not cached or stale (>24h).
    """
    ticker = ticker.strip().upper()
    settings = get_settings()

    # Get or create StockResearch record
    research = await db.get(StockResearch, ticker)
    now = datetime.now(UTC)

    # Determine if we need to refresh overview
    need_refresh = (
        research is None
        or research.overview is None
        or research.overview.get("fetched_at") is None
        or "financials" not in (research.overview or {})
        or (now - datetime.fromisoformat(research.overview["fetched_at"]))
        > timedelta(hours=OVERVIEW_STALE_HOURS)
    )

    overview = research.overview if research and research.overview else {}
    price_history = research.price_history if research else None

    if need_refresh:
        overview_task = get_stock_overview(ticker, settings.fmp_api_key)
        price_task = asyncio.to_thread(_fetch_price_history, ticker)

        new_overview, new_prices = await asyncio.gather(
            overview_task, price_task, return_exceptions=True
        )

        if isinstance(new_overview, Exception):
            logger.error(f"Overview fetch failed for {ticker}: {new_overview}")
            new_overview = overview
        if isinstance(new_prices, Exception):
            logger.error(f"Price history fetch failed for {ticker}: {new_prices}")
            new_prices = price_history or []

        overview = new_overview if isinstance(new_overview, dict) else {}
        price_history = new_prices if isinstance(new_prices, list) else []

        # Upsert into DB
        if research is None:
            research = StockResearch(ticker=ticker)
            db.add(research)

        research.overview = overview
        research.price_history = price_history

        # Update basic fields
        stats = overview.get("statistics", {})
        profile = overview.get("profile", {})
        research.company = profile.get("company_name") or research.company or ticker
        research.share_price = stats.get("price") or research.share_price
        research.market_cap = stats.get("market_cap") or research.market_cap
        research.enterprise_value = stats.get("enterprise_value") or research.enterprise_value

        await db.commit()
        await db.refresh(research)

    return {
        "ticker": research.ticker,
        "company": research.company,
        "share_price": research.share_price,
        "market_cap": research.market_cap,
        "enterprise_value": research.enterprise_value,
        "overview": overview,
        "price_history": price_history,
        "has_research": research.financials is not None or research.headwinds_tailwinds is not None,
        "research": {
            "financials": research.financials,
            "headwinds_tailwinds": research.headwinds_tailwinds,
            "management": research.management,
            "insider_activity": research.insider_activity,
            "superinvestors": research.superinvestors,
            "business_overview": research.business_overview,
            "options_data": research.options_data,
            "auditor": research.auditor,
            "ai_analysis": research.ai_analysis,
            "last_refreshed": research.last_refreshed.isoformat()
            if research.last_refreshed
            else None,
        },
    }


async def get_quarterly_financials(ticker: str, fmp_api_key: str) -> dict:
    """Fetch quarterly financials from yfinance."""
    data = await asyncio.to_thread(_fetch_quarterly_yfinance, ticker)
    return data


def _fetch_quarterly_yfinance(ticker: str) -> dict:
    """Fetch quarterly data from yfinance (runs in thread)."""
    stock = yf.Ticker(ticker)
    quarters: list[dict] = []
    balance_sheet: list[dict] = []

    # Quarterly income + cash flow
    try:
        inc = stock.quarterly_financials
        cf = stock.quarterly_cashflow
        if inc is not None and not inc.empty:
            for col in sorted(inc.columns):
                year = str(col.year)
                period = f"Q{((col.month - 1) // 3) + 1}"
                entry: dict = {"year": year, "period": period}
                for field, yf_key in [
                    ("revenue", "Total Revenue"),
                    ("ebitda", "EBITDA"),
                    ("ebit", "EBIT"),
                    ("net_income", "Net Income"),
                    ("eps", "Basic EPS"),
                ]:
                    if yf_key in inc.index:
                        entry[field] = _safe(float(inc.at[yf_key, col]))
                # Merge cash flow if available
                if cf is not None and not cf.empty and col in cf.columns:
                    for field, yf_key in [
                        ("fcf", "Free Cash Flow"),
                        ("operating_cf", "Operating Cash Flow"),
                    ]:
                        if yf_key in cf.index:
                            entry[field] = _safe(float(cf.at[yf_key, col]))
                quarters.append(entry)
    except Exception as e:
        logger.warning(f"yfinance quarterly financials error for {ticker}: {e}")

    # Quarterly balance sheet
    try:
        bs = stock.quarterly_balance_sheet
        if bs is not None and not bs.empty:
            for col in sorted(bs.columns):
                year = str(col.year)
                period = f"Q{((col.month - 1) // 3) + 1}"
                entry = {"year": year, "period": period}
                for field, yf_key in [
                    ("total_assets", "Total Assets"),
                    ("total_liabilities", "Total Liabilities Net Minority Interest"),
                    ("total_equity", "Stockholders Equity"),
                    ("total_debt", "Total Debt"),
                    ("net_debt", "Net Debt"),
                    ("cash", "Cash And Cash Equivalents"),
                ]:
                    if yf_key in bs.index:
                        entry[field] = _safe(float(bs.at[yf_key, col]))
                    else:
                        entry[field] = None
                balance_sheet.append(entry)
    except Exception as e:
        logger.warning(f"yfinance quarterly balance sheet error for {ticker}: {e}")

    return {
        "income_cashflow": quarters,
        "balance_sheet": balance_sheet,
    }
