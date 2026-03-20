from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.digests import (
    ArticleOut,
    ArticleSearchResponse,
    DigestDetail,
    DigestListResponse,
    DigestSummary,
)
from app.services.digest import (
    get_digest_with_articles,
    get_latest_digest,
    list_digests,
    search_articles,
)

router = APIRouter(prefix="/api/digests", tags=["digests"])


def _serialize_summary(d) -> dict:
    return {
        "id": d.id,
        "date": d.date,
        "overview": d.overview,
        "article_count": d.article_count,
        "created_at": d.created_at.isoformat() if d.created_at else "",
    }


def _serialize_detail(d) -> dict:
    return {
        **_serialize_summary(d),
        "articles": [
            {
                "id": a.id,
                "title": a.title,
                "author": a.author,
                "publication": a.publication,
                "url": a.url,
                "summary_html": a.summary_html,
                "summary_raw": a.summary_raw,
                "category": a.category,
                "reading_time_minutes": a.reading_time_minutes,
                "word_count": a.word_count,
                "position": a.position,
            }
            for a in d.articles
        ],
    }


@router.get("", response_model=DigestListResponse)
async def api_list_digests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    digests, total = await list_digests(db, page, page_size)
    return DigestListResponse(
        digests=[DigestSummary(**_serialize_summary(d)) for d in digests],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=ArticleSearchResponse)
async def api_search_articles(
    q: str = Query(..., min_length=2, max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    articles, total = await search_articles(db, q, page, page_size)
    return ArticleSearchResponse(
        articles=[ArticleOut.model_validate(a) for a in articles],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/latest", response_model=DigestDetail | None)
async def api_latest_digest(db: AsyncSession = Depends(get_db)):
    d = await get_latest_digest(db)
    if not d:
        return None
    return DigestDetail(**_serialize_detail(d))


@router.get("/{digest_id}", response_model=DigestDetail)
async def api_get_digest(digest_id: int, db: AsyncSession = Depends(get_db)):
    d = await get_digest_with_articles(db, digest_id)
    if not d:
        raise HTTPException(status_code=404, detail="Digest not found")
    return DigestDetail(**_serialize_detail(d))
