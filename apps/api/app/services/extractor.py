import logging

from google import genai
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception_message, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_ARTICLE_CHARS = 30_000


class StockPitch(BaseModel):
    company_name: str = Field(description="The name of the company being pitched or bought.")
    ticker_symbol: str = Field(description="The stock ticker symbol (e.g., AAPL).")
    sentiment_reasoning: str = Field(
        description="A brief 1-sentence explanation of why the author explicitly pitched/bought the stock."
    )
    conviction_level: str = Field(
        description=(
            "The author's conviction level: 'high' if very confident or large position, "
            "'medium' for a standard recommendation, 'low' if significant uncertainty. "
            "Default to 'medium' if unclear."
        ),
        default="medium",
    )
    target_price: float | None = Field(
        description="The author's explicit price target, if mentioned. null if not given.",
        default=None,
    )


class ExtractorResult(BaseModel):
    pitches: list[StockPitch] = Field(
        description="A list of explicit stock pitches or purchases found in the article, if any."
    )


class PitchExtractor:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self.client = genai.Client(api_key=api_key or settings.gemini_api_key)
        self.model = model or settings.gemini_model

    @retry(
        retry=retry_if_exception_message(match="429|RESOURCE_EXHAUSTED"),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=10, min=10, max=120),
        reraise=True,
    )
    def _extract(self, prompt: str) -> list[StockPitch]:
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": ExtractorResult,
            },
        )
        if response.parsed:
            return response.parsed.pitches
        return []

    def extract_pitches(self, title: str, author: str, text: str) -> list[StockPitch]:
        if not text or not text.strip():
            return []

        truncated = text[:MAX_ARTICLE_CHARS]
        prompt = (
            f'Article: "{title}" by {author}\n\n'
            f"{truncated}\n\n"
            "---\n"
            "Analyze this article for actionable stock pitches or explicit indications "
            "that the author has bought or is recommending a stock. "
            "Ignore passing mentions, macroeconomic reviews, or general market commentary. "
            "ONLY extract a stock if the author is making a clear pitch, detailing a thesis, "
            "or announcing a buy."
        )

        try:
            return self._extract(prompt)
        except Exception as e:
            logger.error(f"Gemini structured extraction error: {e}")
            return []
