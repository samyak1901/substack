"""AI-powered stock analysis using Gemini."""

import logging

from google import genai
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception_message, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)


class MetricCommentary(BaseModel):
    metric: str = Field(description="Name of the metric (e.g. P/E, EV/EBITDA, Gross Margin)")
    commentary: str = Field(description="1-sentence context on whether this metric is attractive, concerning, or neutral")


class StockAIAnalysis(BaseModel):
    investment_summary: str = Field(description="1 paragraph (2-3 sentences) investment summary")
    bull_case: list[str] = Field(description="3-5 bullet points for the bull case")
    bear_case: list[str] = Field(description="3-5 bullet points for the bear case")
    risk_rating: str = Field(description="One of: Low, Medium, High")
    risk_factors: list[str] = Field(description="3-5 specific risk factors")
    key_metrics_commentary: list[MetricCommentary] = Field(
        description="Commentary on 6 key metrics: P/E, EV/EBITDA, Gross Margin, Revenue Growth, Debt/Equity, FCF Yield"
    )


@retry(
    retry=retry_if_exception_message(match="429|RESOURCE_EXHAUSTED"),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=10, min=10, max=120),
    reraise=True,
)
def _call_gemini(prompt: str) -> StockAIAnalysis | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": StockAIAnalysis,
            },
        )
        return response.parsed
    except Exception as e:
        logger.error(f"Gemini AI analysis error: {e}")
        return None


def generate_ai_analysis(
    ticker: str,
    company: str,
    overview_data: dict,
    transcript: str = "",
) -> dict | None:
    """Generate AI analysis for a stock using Gemini structured output."""
    stats = overview_data.get("statistics", {})
    margins = overview_data.get("margins", {})
    valuation = overview_data.get("valuation", {})
    growth = overview_data.get("growth", {})
    health = overview_data.get("financial_health", {})
    profile = overview_data.get("profile", {})

    financials_summary = ""
    fin = overview_data.get("financials")
    if fin and fin.get("years"):
        years = fin["years"]
        latest = years[-1] if years else {}
        financials_summary = (
            f"Latest year ({latest.get('year', 'N/A')}): "
            f"Revenue={latest.get('revenue')}, EBITDA={latest.get('ebitda')}, "
            f"Net Income={latest.get('net_income')}, EPS={latest.get('eps')}, "
            f"FCF={latest.get('fcf')}"
        )

    prompt = f"""Company: {company} ({ticker})
Sector: {profile.get("sector", "N/A")} | Industry: {profile.get("industry", "N/A")}

Market Cap: {stats.get("market_cap")} | EV: {stats.get("enterprise_value")}
Price: {stats.get("price")} | Beta: {stats.get("beta")}

Margins - Gross: {margins.get("gross")}, EBITDA: {margins.get("ebitda")}, Net: {margins.get("net")}
Valuation - P/E: {valuation.get("pe")}, EV/EBITDA: {valuation.get("ev_to_ebitda")}, P/FCF: {valuation.get("pfcf")}
Growth - Rev YoY: {growth.get("revenue_growth_yoy")}, EPS YoY: {growth.get("eps_growth_yoy")}, Rev 3yr: {growth.get("revenue_growth_3yr")}
Health - D/E: {health.get("debt_to_equity")}, Current: {health.get("current_ratio")}, Interest Coverage: {health.get("interest_coverage")}

{financials_summary}

{f"Earnings Transcript Excerpt:{chr(10)}{transcript[:15000]}" if transcript else "No transcript available."}

---
Based on the above data, provide a comprehensive investment analysis. Include:
1. INVESTMENT_SUMMARY: A concise 2-3 sentence investment thesis
2. BULL_CASE: 3-5 specific reasons the stock could outperform
3. BEAR_CASE: 3-5 specific reasons the stock could underperform
4. RISK_RATING: Overall risk level (Low/Medium/High)
5. RISK_FACTORS: 3-5 specific risk factors
6. KEY_METRICS_COMMENTARY: For each key metric (P/E, EV/EBITDA, Gross Margin, Revenue Growth, Debt/Equity, FCF Yield), provide 1 sentence of context explaining if it's attractive, concerning, or neutral relative to the company's sector and growth profile.

Be specific and data-driven. Avoid generic statements."""

    result = _call_gemini(prompt)
    if not result:
        return None

    return {
        "investment_summary": result.investment_summary,
        "bull_case": result.bull_case,
        "bear_case": result.bear_case,
        "risk_rating": result.risk_rating,
        "risk_factors": result.risk_factors,
        "key_metrics_commentary": {m.metric: m.commentary for m in result.key_metrics_commentary},
    }
