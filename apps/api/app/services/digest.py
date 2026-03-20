import logging
import re
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.clients.substack import SubstackClient, extract_author
from app.config import get_settings
from app.models import Article, Digest, ProcessedPost
from app.services.summarizer import Summarizer, estimate_reading_time

logger = logging.getLogger(__name__)


def _md_inline_to_html(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", text)
    return text


def markdown_summary_to_html(summary: str) -> str:
    lines = summary.strip().splitlines()
    bullet_lines = [line for line in lines if re.match(r"^\s*[-*•]\s+", line)]

    if bullet_lines:
        items = [_md_inline_to_html(re.sub(r"^\s*[-*•]\s+", "", line)) for line in bullet_lines]
        return "<ul>" + "".join(f"<li>{item}</li>" for item in items) + "</ul>"

    return _md_inline_to_html(summary).replace("\n", "<br>")


async def generate_and_store_digest(
    db: AsyncSession,
    since_hours: int = 24,
    all_subs: bool = False,
    progress=None,
) -> int | None:
    settings = get_settings()
    if not settings.substack_sid or not settings.gemini_api_key:
        logger.error("Missing SUBSTACK_SID or GEMINI_API_KEY.")
        return None

    async with SubstackClient(settings.substack_sid) as client:
        summarizer = Summarizer()

        logger.info(f"Fetching posts (last {since_hours}h)...")
        posts = await client.get_recent_posts(since_hours=since_hours, all_subs=all_subs)

        if not posts:
            logger.info("No new articles found.")
            if progress:
                await progress.complete("No new articles found.")
            return None

        logger.info(f"Found {len(posts)} articles. Summarizing...")
        if progress:
            await progress.update(f"Found {len(posts)} articles. Summarizing...", 10)

        article_summaries = []
        for i, post in enumerate(posts, 1):
            url = post.get("canonical_url", "")

            existing = await db.execute(
                select(ProcessedPost).where(ProcessedPost.canonical_url == url)
            )
            if existing.scalar_one_or_none():
                continue

            title = post.get("title", "Untitled")
            author = extract_author(post)
            publication = post.get("_publication_name", "")

            logger.info(f"  [{i}/{len(posts)}] {title} — {author}")
            if progress:
                pct = 10 + int((i / len(posts)) * 70)
                await progress.update(f"Summarizing {i}/{len(posts)}: {title[:60]}", pct)

            content = await client.get_post_content(post)
            result = summarizer.summarize_article(title, author, content or "")
            reading_time, wc = estimate_reading_time(content or "")

            summary_raw = "\n".join(f"- {b}" for b in result.bullets)
            summary_html = markdown_summary_to_html(summary_raw)

            article_summaries.append({
                "title": title,
                "author": author,
                "publication": publication,
                "url": url,
                "summary_html": summary_html,
                "summary_raw": summary_raw,
                "category": result.category,
                "reading_time_minutes": reading_time,
                "word_count": wc,
            })

            db.add(ProcessedPost(canonical_url=url))

    if not article_summaries:
        logger.info("All articles already processed.")
        return None

    logger.info("Generating daily overview...")
    if progress:
        await progress.update("Generating daily overview...", 85)
    overview_input = [
        {"title": a["title"], "author": a["author"], "raw_summary": a["summary_raw"]}
        for a in article_summaries
    ]
    overview = summarizer.generate_daily_overview(overview_input)

    today = datetime.now(UTC).strftime("%B %d, %Y")

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
        db.add(
            Article(
                digest_id=digest.id,
                title=a["title"],
                author=a["author"],
                publication=a["publication"],
                url=a["url"],
                summary_html=a["summary_html"],
                summary_raw=a["summary_raw"],
                category=a.get("category"),
                reading_time_minutes=a.get("reading_time_minutes", 0),
                word_count=a.get("word_count", 0),
                position=start_pos + i,
            )
        )

    await db.commit()
    logger.info(f"Digest stored with {len(article_summaries)} articles (id={digest.id}).")
    if progress:
        await progress.complete(f"Digest created with {len(article_summaries)} articles.")
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


async def list_digests(
    db: AsyncSession, page: int = 1, page_size: int = 20
) -> tuple[list[Digest], int]:
    count_result = await db.execute(select(func.count(Digest.id)))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Digest).order_by(Digest.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(result.scalars().all()), total


async def search_articles(
    db: AsyncSession, query: str, page: int = 1, page_size: int = 20
) -> tuple[list[Article], int]:
    pattern = f"%{query}%"
    base_filter = or_(
        Article.title.ilike(pattern),
        Article.author.ilike(pattern),
        Article.summary_raw.ilike(pattern),
    )

    count_result = await db.execute(select(func.count(Article.id)).where(base_filter))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Article)
        .where(base_filter)
        .order_by(Article.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total
