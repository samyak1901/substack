
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Article, Digest


async def _seed_digest(db: AsyncSession, date: str = "March 20, 2026") -> Digest:
    digest = Digest(date=date, overview="Test overview", article_count=2)
    db.add(digest)
    await db.flush()
    for i in range(2):
        db.add(
            Article(
                digest_id=digest.id,
                title=f"Article {i + 1}",
                author=f"Author {i + 1}",
                publication="TestPub",
                url=f"https://example.com/{i}",
                summary_html="<ul><li>point</li></ul>",
                summary_raw="- point",
                category="macro" if i == 0 else "tech",
                reading_time_minutes=3,
                word_count=600,
                position=i,
            )
        )
    await db.commit()
    await db.refresh(digest)
    return digest


async def test_list_digests(client: AsyncClient, db: AsyncSession):
    await _seed_digest(db, "March 20, 2026")
    await _seed_digest(db, "March 19, 2026")

    resp = await client.get("/api/digests")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["digests"]) == 2
    # Most recent first
    assert data["digests"][0]["date"] == "March 19, 2026"


async def test_get_digest_by_id(client: AsyncClient, db: AsyncSession):
    digest = await _seed_digest(db)

    resp = await client.get(f"/api/digests/{digest.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == digest.id
    assert len(data["articles"]) == 2
    assert data["articles"][0]["category"] == "macro"
    assert data["articles"][0]["reading_time_minutes"] == 3


async def test_get_digest_not_found(client: AsyncClient):
    resp = await client.get("/api/digests/999")
    assert resp.status_code == 404


async def test_latest_digest(client: AsyncClient, db: AsyncSession):
    await _seed_digest(db, "March 18, 2026")
    await _seed_digest(db, "March 19, 2026")

    resp = await client.get("/api/digests/latest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == "March 19, 2026"


async def test_latest_digest_empty(client: AsyncClient):
    resp = await client.get("/api/digests/latest")
    assert resp.status_code == 200
    assert resp.json() is None


async def test_search_articles(client: AsyncClient, db: AsyncSession):
    await _seed_digest(db)

    resp = await client.get("/api/digests/search", params={"q": "Article 1"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["articles"][0]["title"] == "Article 1"


async def test_search_articles_no_results(client: AsyncClient, db: AsyncSession):
    await _seed_digest(db)

    resp = await client.get("/api/digests/search", params={"q": "nonexistent"})
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


async def test_search_articles_query_too_short(client: AsyncClient):
    resp = await client.get("/api/digests/search", params={"q": "a"})
    assert resp.status_code == 422
