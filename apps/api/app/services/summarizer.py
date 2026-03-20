import logging
import time

from google import genai

logger = logging.getLogger(__name__)

MAX_ARTICLE_CHARS = 30_000
MODEL = "gemini-3-flash-preview"
MAX_RETRIES = 3
RETRY_WAIT = 35  # seconds — Gemini suggests ~34s on 429


class Summarizer:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    def _generate(self, prompt: str) -> str | None:
        """Call Gemini with retry on rate limit (429)."""
        for attempt in range(MAX_RETRIES):
            try:
                response = self.client.models.generate_content(model=MODEL, contents=prompt)
                return response.text
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = RETRY_WAIT * (attempt + 1)
                    logger.warning(f"Rate limited, waiting {wait}s before retry ({attempt + 1}/{MAX_RETRIES})...")
                    time.sleep(wait)
                else:
                    logger.error(f"Gemini API error: {e}")
                    return None
        logger.error("Exhausted retries for Gemini API")
        return None

    def summarize_article(self, title: str, author: str, text: str) -> str:
        """Summarize a single article into bullet points."""
        if not text or not text.strip():
            return "No content available to summarize."

        truncated = text[:MAX_ARTICLE_CHARS]
        prompt = (
            f"Article: \"{title}\" by {author}\n\n"
            f"{truncated}\n\n"
            "---\n"
            "Summarize this article in 3-5 concise bullet points. "
            "Include the key insights, arguments, and any actionable takeaways. "
            "Be specific — avoid vague statements. Use plain language."
        )

        result = self._generate(prompt)
        return result or "Failed to generate summary."

    def generate_daily_overview(self, article_summaries: list[dict]) -> str:
        """Generate an overall digest overview from all article summaries."""
        if not article_summaries:
            return "No articles to summarize today."

        summaries_text = "\n\n".join(
            f"- \"{a['title']}\" by {a['author']}: {a['raw_summary']}"
            for a in article_summaries
        )

        prompt = (
            "Here are today's article summaries from various Substack newsletters:\n\n"
            f"{summaries_text}\n\n"
            "---\n"
            "Write a 2-3 sentence overview of today's key themes and most interesting insights "
            "across all these articles. Be concise and highlight what's most noteworthy."
        )

        result = self._generate(prompt)
        return result or "Could not generate overview."
