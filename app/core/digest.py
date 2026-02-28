import logging
import re
from datetime import datetime, timezone

from app.client import SubstackClient
from app.config import get_settings
from app.services.summarizer import Summarizer

logger = logging.getLogger(__name__)


def _extract_author(post: dict) -> str:
    bylines = post.get("publishedBylines") or post.get("bylines") or []
    if bylines:
        return bylines[0].get("name", "Unknown")
    return "Unknown"


def _md_inline_to_html(text: str) -> str:
    """Convert inline markdown formatting to HTML."""
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", text)
    return text


def _markdown_summary_to_html(summary: str) -> str:
    """Convert markdown bullet points to simple HTML list."""
    lines = summary.strip().splitlines()
    bullet_lines = [line for line in lines if re.match(r"^\s*[-*•]\s+", line)]

    if bullet_lines:
        items = [_md_inline_to_html(re.sub(r"^\s*[-*•]\s+", "", line)) for line in bullet_lines]
        html = "<ul>" + "".join(f"<li>{item}</li>" for item in items) + "</ul>"
        return html

    return _md_inline_to_html(summary).replace("\n", "<br>")


def generate_digest(since_hours: int = 24, all_subs: bool = False) -> bool:
    """Run the full digest pipeline: fetch -> summarize -> print.

    Returns True if digest was generated.
    """
    s = get_settings()
    client = SubstackClient(s.substack_sid)
    summarizer = Summarizer(s.gemini_api_key)

    logger.info(f"Fetching posts from subscriptions (last {since_hours}h)...")
    posts = client.get_recent_posts(since_hours=since_hours, all_subs=all_subs)

    if not posts:
        logger.info("No new articles found. Skipping digest.")
        return False

    logger.info(f"Found {len(posts)} articles. Fetching content and summarizing...")

    article_summaries = []
    for i, post in enumerate(posts, 1):
        title = post.get("title", "Untitled")
        author = _extract_author(post)
        publication = post.get("_publication_name", "")

        logger.info(f"  [{i}/{len(posts)}] {title} — {author} ({publication})")

        content = client.get_post_content(post)
        summary = summarizer.summarize_article(title, author, content or "")

        article_summaries.append({
            "title": title,
            "author": author,
            "publication": publication,
            "url": post.get("canonical_url", ""),
            "summary": _markdown_summary_to_html(summary),
            "raw_summary": summary,
        })

    logger.info("Generating daily overview...")
    overview = summarizer.generate_daily_overview(article_summaries)

    today = datetime.now(timezone.utc).strftime("%B %d, %Y")

    print(f"\n{'='*60}")
    print(f"  DIGEST — {today}")
    print(f"  {len(article_summaries)} articles")
    print(f"{'='*60}\n")
    print(f"OVERVIEW: {overview}\n")
    for a in article_summaries:
        print(f"---\n{a['title']} — {a['author']}")
        if a['publication']:
            print(f"  ({a['publication']})")
        print(f"  {a['url']}")
        print(f"\n{a['raw_summary']}\n")
    return True
