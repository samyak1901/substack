import logging

from google import genai
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_exception_message, stop_after_attempt, wait_exponential

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_ARTICLE_CHARS = 30_000

VALID_CATEGORIES = [
    "macro",
    "tech",
    "energy",
    "healthcare",
    "financials",
    "crypto",
    "real-estate",
    "consumer",
    "industrials",
    "other",
]


class ArticleSummaryResult(BaseModel):
    bullets: list[str] = Field(
        description=(
            "3-5 concise bullet points. Each should contain a specific insight, "
            "data point, or actionable takeaway. Avoid vague statements."
        )
    )
    category: str = Field(
        description=(
            "Single category from: macro, tech, energy, healthcare, financials, "
            "crypto, real-estate, consumer, industrials, other. "
            "Choose the best fit for the article's primary topic."
        )
    )
    key_takeaway: str = Field(
        description=(
            "One sentence: the single most important insight a financial "
            "professional should know from this article."
        )
    )


def estimate_reading_time(text: str, wpm: int = 200) -> tuple[int, int]:
    """Returns (reading_time_minutes, word_count)."""
    words = len(text.split())
    minutes = max(1, round(words / wpm))
    return minutes, words


class Summarizer:
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
    def _generate(self, prompt: str) -> str | None:
        try:
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return response.text
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                logger.warning(f"Rate limited, will retry: {e}")
                raise
            logger.error(f"Gemini API error: {e}")
            return None

    @retry(
        retry=retry_if_exception_message(match="429|RESOURCE_EXHAUSTED"),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=10, min=10, max=120),
        reraise=True,
    )
    def _generate_structured(self, prompt: str) -> ArticleSummaryResult | None:
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ArticleSummaryResult,
                },
            )
            return response.parsed
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                logger.warning(f"Rate limited, will retry: {e}")
                raise
            logger.error(f"Gemini structured API error: {e}")
            return None

    def summarize_article(self, title: str, author: str, text: str) -> ArticleSummaryResult:
        if not text or not text.strip():
            return ArticleSummaryResult(
                bullets=["No content available to summarize."],
                category="other",
                key_takeaway="No content available.",
            )

        truncated = text[:MAX_ARTICLE_CHARS]
        prompt = (
            f'Article: "{title}" by {author}\n\n'
            f"{truncated}\n\n"
            "---\n"
            "Analyze this article and provide:\n"
            "1. BULLETS: 3-5 specific, actionable bullet points. Include concrete data "
            "(numbers, percentages, dates) where available. Each bullet should stand alone "
            "as a useful insight. Avoid generic statements like 'the author discusses...' "
            "— instead state the insight directly.\n"
            "2. CATEGORY: Classify into exactly one of: macro, tech, energy, healthcare, "
            "financials, crypto, real-estate, consumer, industrials, other.\n"
            "3. KEY_TAKEAWAY: The single most important sentence from this article "
            "for an investor or financial professional."
        )

        result = self._generate_structured(prompt)
        if result:
            if result.category not in VALID_CATEGORIES:
                result.category = "other"
            return result

        return ArticleSummaryResult(
            bullets=["Failed to generate summary."],
            category="other",
            key_takeaway="Summary unavailable.",
        )

    def generate_daily_overview(self, article_summaries: list[dict]) -> str:
        if not article_summaries:
            return "No articles to summarize today."

        summaries_text = "\n\n".join(
            f'- "{a["title"]}" by {a["author"]}: {a["raw_summary"]}'
            for a in article_summaries
        )

        prompt = (
            "You are writing the morning brief for a financial newsletter.\n\n"
            "Today's articles:\n\n"
            f"{summaries_text}\n\n"
            "---\n"
            "Write a 3-4 sentence overview of today's digest. Structure it as:\n"
            "- Sentence 1: The dominant theme or narrative across articles.\n"
            "- Sentence 2-3: The most notable specific insights or data points.\n"
            "- Sentence 4 (optional): Any contrarian or surprising takes worth highlighting.\n"
            "Be specific. Name authors and reference concrete data where possible."
        )

        result = self._generate(prompt)
        return result or "Could not generate overview."
