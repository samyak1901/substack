import logging
import time

from google import genai
from pydantic import BaseModel, Field

from app.services.summarizer import MODEL, MAX_RETRIES, RETRY_WAIT, MAX_ARTICLE_CHARS

logger = logging.getLogger(__name__)


class StockPitch(BaseModel):
    company_name: str = Field(description="The name of the company being pitched or bought.")
    ticker_symbol: str = Field(description="The stock ticker symbol (e.g., AAPL).")
    sentiment_reasoning: str = Field(
        description="A brief 1-sentence explanation of why the author explicitly pitched/bought the stock."
    )
    conviction_level: str = Field(
        description="The author's conviction level: 'high' if they are very confident or have a large position, 'medium' for a standard recommendation, 'low' if they express significant uncertainty. Default to 'medium' if unclear.",
        default="medium",
    )
    target_price: float | None = Field(
        description="The author's explicit price target for the stock, if mentioned. null if no specific target is given.",
        default=None,
    )


class ExtractorResult(BaseModel):
    pitches: list[StockPitch] = Field(
        description="A list of explicit stock pitches or purchases found in the article, if any."
    )


class PitchExtractor:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    def extract_pitches(self, title: str, author: str, text: str) -> list[StockPitch]:
        """Extract actionable stock pitches from the article using structured output."""
        if not text or not text.strip():
            return []

        truncated = text[:MAX_ARTICLE_CHARS]
        prompt = (
            f"Article: \"{title}\" by {author}\n\n"
            f"{truncated}\n\n"
            "---\n"
            "Analyze the following article for actionable stock pitches or explicit indications "
            "that the author has bought or is recommending a stock. "
            "Ignore passing mentions, macroeconomic reviews, or general market commentary. "
            "ONLY extract a stock if the author is making a clear pitch, detailing a thesis, or announcing a buy."
        )

        for attempt in range(MAX_RETRIES):
            try:
                response = self.client.models.generate_content(
                    model=MODEL,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": ExtractorResult,
                    }
                )
                if response.parsed:
                    return response.parsed.pitches
                return []
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = RETRY_WAIT * (attempt + 1)
                    logger.warning(f"Rate limited, waiting {wait}s before retry ({attempt + 1}/{MAX_RETRIES})...")
                    time.sleep(wait)
                else:
                    logger.error(f"Gemini API structured extraction error: {e}")
                    return []

        logger.error("Exhausted retries for Gemini API structured extraction.")
        return []
