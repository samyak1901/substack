import asyncio
import logging
from datetime import UTC, datetime

import httpx
import yfinance as yf
from bs4 import BeautifulSoup
from google import genai
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_message, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.models import StockResearch

logger = logging.getLogger(__name__)

FMP_BASE = "https://financialmodelingprep.com/stable"
DATAROMA_BASE = "https://www.dataroma.com/m/stock.php"
SEC_EDGAR_BASE = "https://data.sec.gov"
SEC_EFTS_BASE = "https://efts.sec.gov/LATEST"


# --- Gemini schema for headwinds/tailwinds ---


class HeadwindsTailwinds(BaseModel):
    headwinds: list[str] = Field(description="Key headwinds facing the business (3-5 items)")
    tailwinds: list[str] = Field(description="Key tailwinds for the business (3-5 items)")
    recent_catalysts: str = Field(
        description="1-2 sentence summary of recent price action catalysts"
    )


# --- yfinance data ---


def _fetch_yfinance_data(ticker: str) -> dict:
    """Fetch company basics, price history, management, and options from yfinance."""
    stock = yf.Ticker(ticker)
    result: dict = {}

    try:
        info = stock.info
        result["share_price"] = info.get("currentPrice") or info.get("regularMarketPrice")
        result["market_cap"] = info.get("marketCap")
        result["enterprise_value"] = info.get("enterpriseValue")
        result["company"] = info.get("longName") or info.get("shortName") or ticker
        result["sector"] = info.get("sector")
        result["industry"] = info.get("industry")
        result["summary"] = info.get("longBusinessSummary", "")
        result["employees"] = info.get("fullTimeEmployees")

        # Management from companyOfficers
        officers = info.get("companyOfficers", [])
        mgmt = []
        for off in officers[:10]:
            mgmt.append({
                "name": off.get("name", ""),
                "title": off.get("title", ""),
                "age": off.get("age"),
                "total_pay": off.get("totalPay"),
            })
        result["officers"] = mgmt
    except Exception as e:
        logger.warning(f"yfinance info error for {ticker}: {e}")

    # 2-year price history
    try:
        hist = stock.history(period="5y", interval="1d")
        if not hist.empty:
            prices = []
            for date, row in hist.iterrows():
                prices.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                })
            result["price_history"] = prices
    except Exception as e:
        logger.warning(f"yfinance history error for {ticker}: {e}")

    # LEAP option dates
    try:
        options_dates = list(stock.options) if stock.options else []
        # LEAPS are typically > 1 year out
        now = datetime.now()
        leap_dates = [
            d for d in options_dates
            if (datetime.strptime(d, "%Y-%m-%d") - now).days > 365
        ]
        result["leap_dates"] = leap_dates
        result["all_option_dates"] = options_dates
    except Exception as e:
        logger.warning(f"yfinance options error for {ticker}: {e}")

    # Major holders
    try:
        holders = stock.major_holders
        if holders is not None and not holders.empty:
            holder_data = {}
            for _, row in holders.iterrows():
                if len(row) >= 2:
                    holder_data[str(row.iloc[1])] = str(row.iloc[0])
                elif len(row) == 1:
                    holder_data[str(row.name)] = str(row.iloc[0])
            result["major_holders"] = holder_data
    except Exception as e:
        logger.warning(f"yfinance holders error for {ticker}: {e}")

    # Insider transactions
    try:
        insider_tx = stock.insider_transactions
        if insider_tx is not None and not insider_tx.empty:
            txs = []
            for _, row in insider_tx.head(20).iterrows():
                txs.append({
                    "insider": str(row.get("Insider", "")),
                    "relation": str(row.get("Relation", "")),
                    "transaction": str(row.get("Transaction", "")),
                    "date": str(row.get("Start Date", "")),
                    "shares": str(row.get("Shares", "")),
                    "value": str(row.get("Value", "")),
                })
            result["insider_transactions"] = txs
    except Exception as e:
        logger.warning(f"yfinance insider transactions error for {ticker}: {e}")

    return result


# --- FMP API ---


async def _fmp_get(client: httpx.AsyncClient, endpoint: str, ticker: str, api_key: str, **extra) -> list | dict | None:
    """Helper to call FMP stable API."""
    params = {"symbol": ticker, "apikey": api_key, **extra}
    try:
        resp = await client.get(f"{FMP_BASE}/{endpoint}", params=params)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                return data
        else:
            logger.warning(f"FMP {endpoint} returned {resp.status_code} for {ticker}")
    except Exception as e:
        logger.warning(f"FMP {endpoint} error for {ticker}: {e}")
    return None


async def _fetch_fmp_financials(ticker: str, api_key: str) -> dict:
    """Fetch 5-year financials, ratios, and revenue segmentation from FMP stable API."""
    if not api_key:
        logger.info("No FMP API key configured, skipping FMP data")
        return {}

    result: dict = {}
    async with httpx.AsyncClient(timeout=30) as client:
        # Income statement (5 years)
        data = await _fmp_get(client, "income-statement", ticker, api_key, period="annual", limit=5)
        if data:
            years = []
            for item in reversed(data):  # oldest first
                years.append({
                    "year": item.get("fiscalYear", item.get("date", "")[:4]),
                    "revenue": item.get("revenue"),
                    "ebitda": item.get("ebitda"),
                    "ebit": item.get("operatingIncome"),
                    "net_income": item.get("netIncome"),
                    "eps": item.get("eps"),
                })
            result["income_statements"] = years

        # Cash flow statement (5 years)
        data = await _fmp_get(client, "cash-flow-statement", ticker, api_key, period="annual", limit=5)
        if data:
            cf_years = []
            for item in reversed(data):
                cf_years.append({
                    "year": item.get("fiscalYear", item.get("date", "")[:4]),
                    "fcf": item.get("freeCashFlow"),
                    "operating_cf": item.get("operatingCashFlow"),
                    "capex": item.get("capitalExpenditure"),
                })
            result["cash_flows"] = cf_years

        # Ratios (5 years) - has margins
        data = await _fmp_get(client, "ratios", ticker, api_key, period="annual", limit=5)
        if data:
            metrics = []
            for item in reversed(data):
                metrics.append({
                    "year": item.get("fiscalYear", item.get("date", "")[:4]),
                    "ebitda_margin": item.get("ebitdaMargin"),
                    "ebit_margin": item.get("ebitMargin"),
                    "net_margin": item.get("netProfitMargin"),
                })
            result["ratios"] = metrics

        # Key metrics (5 years) - has FCF/share, DSO
        data = await _fmp_get(client, "key-metrics", ticker, api_key, period="annual", limit=5)
        if data:
            km = []
            for item in reversed(data):
                km.append({
                    "year": item.get("fiscalYear", item.get("date", "")[:4]),
                    "fcf_per_share": item.get("freeCashFlowPerShare"),
                    "dso": item.get("daysOfSalesOutstanding"),
                    "enterprise_value": item.get("enterpriseValue"),
                })
            result["key_metrics"] = km

        # Revenue segmentation
        data = await _fmp_get(client, "revenue-product-segmentation", ticker, api_key, period="annual")
        if data:
            # Stable API returns [{symbol, fiscalYear, data: {segment: value}}]
            latest = data[0] if data else None
            if latest and isinstance(latest, dict):
                result["revenue_segments"] = latest.get("data", latest)

        # Earnings call transcript (most recent) — may require paid plan
        data = await _fmp_get(client, "earning-call-transcript", ticker, api_key, limit=1)
        if data:
            transcript = data[0].get("content", "")
            result["latest_transcript"] = transcript[:30000]
            result["transcript_date"] = data[0].get("date", "")
            result["transcript_quarter"] = data[0].get("quarter", "")
            result["transcript_year"] = data[0].get("year", "")

    return result


# --- SEC EDGAR ---


async def _fetch_sec_auditor(ticker: str) -> str | None:
    """Fetch auditor name from SEC EDGAR XBRL data."""
    headers = {"User-Agent": "SubstackDigest/1.0 research@example.com"}

    async with httpx.AsyncClient(timeout=15, headers=headers) as client:
        # Resolve ticker to CIK via company_tickers.json
        cik = None
        try:
            resp = await client.get(f"{SEC_EDGAR_BASE}/files/company_tickers.json")
            if resp.status_code != 200:
                return None
            tickers_data = resp.json()
            for entry in tickers_data.values():
                if entry.get("ticker", "").upper() == ticker.upper():
                    cik = str(entry["cik_str"]).zfill(10)
                    break
        except Exception as e:
            logger.warning(f"SEC CIK lookup error for {ticker}: {e}")
            return None

        if not cik:
            return None

        # Fetch company facts for auditor name
        try:
            resp = await client.get(
                f"{SEC_EDGAR_BASE}/api/xbrl/companyfacts/CIK{cik}.json"
            )
            if resp.status_code != 200:
                return None
            facts = resp.json()
            dei = facts.get("facts", {}).get("dei", {})
            auditor_facts = dei.get("AuditorName", {}).get("units", {})
            # Units key is empty string for non-monetary facts
            for unit_values in auditor_facts.values():
                if isinstance(unit_values, list) and unit_values:
                    return unit_values[-1].get("val")
        except Exception as e:
            logger.warning(f"SEC auditor fetch error for {ticker}: {e}")

    return None


# --- Dataroma superinvestor scraping ---


async def _fetch_dataroma(ticker: str) -> list[dict]:
    """Scrape Dataroma for superinvestor holdings of a given ticker."""
    results = []
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.dataroma.com/m/home.php",
    }

    async with httpx.AsyncClient(timeout=15, headers=headers, follow_redirects=True) as client:
        try:
            resp = await client.get(DATAROMA_BASE, params={"sym": ticker.upper()})
            if resp.status_code != 200:
                return results

            soup = BeautifulSoup(resp.text, "html.parser")
            table = soup.find("table", {"id": "grid"})
            if not table:
                return results

            rows = table.find_all("tr")[1:]  # skip header
            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 5:
                    manager = cols[0].get_text(strip=True)
                    pct_portfolio = cols[3].get_text(strip=True)
                    reported_price = cols[4].get_text(strip=True)
                    activity = cols[2].get_text(strip=True) if len(cols) > 2 else ""
                    results.append({
                        "manager": manager,
                        "pct_of_portfolio": pct_portfolio,
                        "activity": activity,
                        "reported_price": reported_price,
                    })
        except Exception as e:
            logger.warning(f"Dataroma scrape error for {ticker}: {e}")

    return results


# --- Gemini headwinds/tailwinds analysis ---


class HeadwindsTailwindsAnalyzer:
    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model

    @retry(
        retry=retry_if_exception_message(match="429|RESOURCE_EXHAUSTED"),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=10, min=10, max=120),
        reraise=True,
    )
    def analyze(self, company: str, ticker: str, transcript: str) -> HeadwindsTailwinds | None:
        if not transcript:
            return None

        prompt = (
            f"Company: {company} ({ticker})\n\n"
            f"Earnings Call Transcript (most recent):\n{transcript}\n\n"
            "---\n"
            "Based on this earnings call transcript, identify:\n"
            "1. HEADWINDS: 3-5 key challenges, risks, or negative factors facing the business\n"
            "2. TAILWINDS: 3-5 key positive catalysts, growth drivers, or favorable trends\n"
            "3. RECENT_CATALYSTS: A brief 1-2 sentence summary of the most significant "
            "factors driving recent stock price action based on the earnings discussion\n\n"
            "Focus on specific, actionable insights rather than generic statements."
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": HeadwindsTailwinds,
                },
            )
            return response.parsed
        except Exception as e:
            logger.error(f"Gemini headwinds/tailwinds error: {e}")
            return None


# --- Main orchestrator ---


def _build_financials(fmp_data: dict) -> dict:
    """Merge FMP income statements, cash flows, ratios, and key metrics into the template format."""
    income = fmp_data.get("income_statements", [])
    cash_flows = fmp_data.get("cash_flows", [])
    ratios = fmp_data.get("ratios", [])
    key_metrics = fmp_data.get("key_metrics", [])

    # Build a per-year merged view
    years_data: dict = {}
    for item in income:
        year = item.get("year", "")
        years_data.setdefault(year, {}).update({
            "year": year,
            "revenue": item.get("revenue"),
            "ebitda": item.get("ebitda"),
            "ebit": item.get("ebit"),
            "net_income": item.get("net_income"),
            "eps": item.get("eps"),
        })

    for item in cash_flows:
        year = item.get("year", "")
        years_data.setdefault(year, {}).update({
            "fcf": item.get("fcf"),
            "operating_cf": item.get("operating_cf"),
            "capex": item.get("capex"),
        })

    for item in ratios:
        year = item.get("year", "")
        years_data.setdefault(year, {}).update({
            "ebitda_margin": item.get("ebitda_margin"),
            "ebit_margin": item.get("ebit_margin"),
            "net_margin": item.get("net_margin"),
        })

    for item in key_metrics:
        year = item.get("year", "")
        years_data.setdefault(year, {}).update({
            "fcf_per_share": item.get("fcf_per_share"),
            "dso": item.get("dso"),
        })

    # Compute FCF margin where possible
    for year_data in years_data.values():
        fcf = year_data.get("fcf")
        revenue = year_data.get("revenue")
        if fcf and revenue and revenue != 0:
            year_data["fcf_margin"] = fcf / revenue

    # Sort by year
    sorted_years = sorted(years_data.values(), key=lambda x: x.get("year", ""))

    return {
        "years": sorted_years,
        "revenue_segments": fmp_data.get("revenue_segments"),
    }


def _build_management(yf_data: dict) -> dict:
    """Build management overview from yfinance data."""
    officers = yf_data.get("officers", [])
    ceo = next((o for o in officers if "ceo" in (o.get("title") or "").lower()), None)
    cfo = next((o for o in officers if "cfo" in (o.get("title") or "").lower() or "chief financial" in (o.get("title") or "").lower()), None)

    return {
        "ceo": ceo,
        "cfo": cfo,
        "all_officers": officers,
        "major_holders": yf_data.get("major_holders", {}),
    }


async def generate_research(
    db: AsyncSession,
    ticker: str,
    progress=None,
) -> StockResearch:
    """Orchestrate all data fetching and build the research template for a ticker."""
    ticker = ticker.strip().upper()
    settings = get_settings()

    if progress:
        await progress.update(f"Fetching market data for {ticker}...", 5)

    # Phase 1: Fetch from all sources concurrently
    yf_task = asyncio.to_thread(_fetch_yfinance_data, ticker)
    fmp_task = _fetch_fmp_financials(ticker, settings.fmp_api_key)
    sec_task = _fetch_sec_auditor(ticker)
    dataroma_task = _fetch_dataroma(ticker)

    yf_data, fmp_data, auditor, superinvestors = await asyncio.gather(
        yf_task, fmp_task, sec_task, dataroma_task,
        return_exceptions=True,
    )

    # Handle exceptions gracefully
    if isinstance(yf_data, Exception):
        logger.error(f"yfinance failed for {ticker}: {yf_data}")
        yf_data = {}
    if isinstance(fmp_data, Exception):
        logger.error(f"FMP failed for {ticker}: {fmp_data}")
        fmp_data = {}
    if isinstance(auditor, Exception):
        logger.error(f"SEC EDGAR failed for {ticker}: {auditor}")
        auditor = None
    if isinstance(superinvestors, Exception):
        logger.error(f"Dataroma failed for {ticker}: {superinvestors}")
        superinvestors = []

    if progress:
        await progress.update("Analyzing earnings transcripts...", 50)

    # Phase 2: AI analysis of earnings transcript
    headwinds_tailwinds = None
    transcript = fmp_data.get("latest_transcript", "") if isinstance(fmp_data, dict) else ""
    if transcript and settings.gemini_api_key:
        company_name = yf_data.get("company", ticker) if isinstance(yf_data, dict) else ticker
        analyzer = HeadwindsTailwindsAnalyzer()
        try:
            ht = await asyncio.to_thread(analyzer.analyze, company_name, ticker, transcript)
            if ht:
                headwinds_tailwinds = {
                    "headwinds": ht.headwinds,
                    "tailwinds": ht.tailwinds,
                    "recent_catalysts": ht.recent_catalysts,
                    "transcript_date": fmp_data.get("transcript_date", ""),
                    "transcript_quarter": fmp_data.get("transcript_quarter", ""),
                    "transcript_year": fmp_data.get("transcript_year", ""),
                }
        except Exception as e:
            logger.error(f"Headwinds/tailwinds analysis failed for {ticker}: {e}")

    if progress:
        await progress.update("Building research template...", 80)

    # Phase 3: Assemble into model
    financials = _build_financials(fmp_data) if isinstance(fmp_data, dict) else None
    management = _build_management(yf_data) if isinstance(yf_data, dict) else None

    business_overview = None
    if isinstance(yf_data, dict):
        biz = {
            "summary": yf_data.get("summary", ""),
            "sector": yf_data.get("sector"),
            "industry": yf_data.get("industry"),
            "employees": yf_data.get("employees"),
        }
        if isinstance(fmp_data, dict) and fmp_data.get("revenue_segments"):
            biz["revenue_segments"] = fmp_data["revenue_segments"]
        business_overview = biz

    options_data = None
    if isinstance(yf_data, dict) and (yf_data.get("leap_dates") or yf_data.get("all_option_dates")):
        options_data = {
            "leap_dates": yf_data.get("leap_dates", []),
            "all_option_dates": yf_data.get("all_option_dates", []),
        }

    insider_activity = None
    if isinstance(yf_data, dict) and yf_data.get("insider_transactions"):
        insider_activity = yf_data["insider_transactions"]

    # Upsert into DB
    existing = await db.get(StockResearch, ticker)
    now = datetime.now(UTC)

    if existing:
        research = existing
    else:
        research = StockResearch(ticker=ticker)
        db.add(research)

    research.company = yf_data.get("company", ticker) if isinstance(yf_data, dict) else ticker
    research.share_price = yf_data.get("share_price") if isinstance(yf_data, dict) else None
    research.market_cap = yf_data.get("market_cap") if isinstance(yf_data, dict) else None
    research.enterprise_value = yf_data.get("enterprise_value") if isinstance(yf_data, dict) else None
    research.financials = financials
    research.price_history = yf_data.get("price_history") if isinstance(yf_data, dict) else None
    research.business_overview = business_overview
    research.management = management
    research.insider_activity = insider_activity
    research.superinvestors = superinvestors if isinstance(superinvestors, list) else None
    research.headwinds_tailwinds = headwinds_tailwinds
    research.options_data = options_data
    research.auditor = auditor if isinstance(auditor, str) else None
    research.last_refreshed = now

    await db.commit()
    await db.refresh(research)

    if progress:
        await progress.complete(f"Research generated for {ticker}")

    return research


async def get_research(db: AsyncSession, ticker: str) -> StockResearch | None:
    """Get cached research for a ticker."""
    return await db.get(StockResearch, ticker.strip().upper())
