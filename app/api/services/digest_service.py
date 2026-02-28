import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.client import SubstackClient
from app.config import get_settings
from app.core.digest import _extract_author, _markdown_summary_to_html
from app.models import Article, Digest, ProcessedPost
from app.services.summarizer import Summarizer

logger = logging.getLogger(__name__)


async def generate_and_store_digest(
    db: AsyncSession,
    since_hours: int = 24,
    all_subs: bool = False,
) -> int | None:
    """Generate a digest and store it in the database. Returns digest ID or None."""
    settings = get_settings()
    if not settings.substack_sid or not settings.gemini_api_key:
        logger.error("Missing SUBSTACK_SID or GEMINI_API_KEY environment variables.")
        return None

    client = SubstackClient(settings.substack_sid)
    summarizer = Summarizer(settings.gemini_api_key)

    logger.info(f"Fetching posts (last {since_hours}h)...")
    posts = client.get_recent_posts(since_hours=since_hours, all_subs=all_subs)

    if not posts:
        logger.info("No new articles found.")
        return None

    logger.info(f"Found {len(posts)} articles. Summarizing...")

    article_summaries = []
    for i, post in enumerate(posts, 1):
        url = post.get("canonical_url", "")

        existing = await db.execute(
            select(ProcessedPost).where(ProcessedPost.canonical_url == url)
        )
        if existing.scalar_one_or_none():
            continue

        title = post.get("title", "Untitled")
        author = _extract_author(post)
        publication = post.get("_publication_name", "")

        logger.info(f"  [{i}/{len(posts)}] {title} — {author}")

        content = client.get_post_content(post)
        summary = summarizer.summarize_article(title, author, content or "")

        article_summaries.append({
            "title": title,
            "author": author,
            "publication": publication,
            "url": url,
            "summary_html": _markdown_summary_to_html(summary),
            "summary_raw": summary,
        })

        db.add(ProcessedPost(canonical_url=url))

    if not article_summaries:
        logger.info("All articles already processed.")
        return None

    logger.info("Generating daily overview...")
    overview_input = [
        {"title": a["title"], "author": a["author"], "raw_summary": a["summary_raw"]}
        for a in article_summaries
    ]
    overview = summarizer.generate_daily_overview(overview_input)

    today = datetime.now(timezone.utc).strftime("%B %d, %Y")

    existing_digest = await db.execute(
        select(Digest).options(selectinload(Digest.articles)).where(Digest.date == today)
    )
    digest = existing_digest.scalar_one_or_none()

    start_pos = 0
    if digest:
        digest.overview = overview
        digest.article_count = digest.article_count + len(article_summaries)
        if digest.articles:
            start_pos = max(a.position for a in digest.articles) + 1
    else:
        digest = Digest(date=today, overview=overview, article_count=len(article_summaries))
        db.add(digest)

    await db.flush()

    for i, a in enumerate(article_summaries):
        db.add(Article(
            digest_id=digest.id,
            title=a["title"],
            author=a["author"],
            publication=a["publication"],
            url=a["url"],
            summary_html=a["summary_html"],
            summary_raw=a["summary_raw"],
            position=start_pos + i,
        ))

    await db.commit()
    logger.info(f"Digest stored with {len(article_summaries)} articles (id={digest.id}).")
    return digest.id


async def get_digest_with_articles(db: AsyncSession, digest_id: int) -> Digest | None:
    result = await db.execute(
        select(Digest).options(selectinload(Digest.articles)).where(Digest.id == digest_id)
    )
    return result.scalar_one_or_none()


async def get_latest_digest(db: AsyncSession) -> Digest | None:
    result = await db.execute(
        select(Digest).options(selectinload(Digest.articles)).order_by(Digest.id.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def list_digests(db: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[Digest], int]:
    count_result = await db.execute(select(func.count(Digest.id)))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Digest).order_by(Digest.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), total
