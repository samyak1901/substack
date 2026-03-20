from datetime import UTC, datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert, WatchlistEntry


async def _seed_entry(db: AsyncSession, ticker: str = "AAPL", **kwargs) -> WatchlistEntry:
    defaults = {
        "ticker": ticker,
        "company": "Apple Inc.",
        "price_at_mention": 150.0,
        "current_price": 160.0,
        "reasoning": "Strong momentum",
        "article_url": "https://example.com/article",
        "article_title": "Why AAPL",
        "publication": "TestPub",
        "author": "Analyst",
        "mention_date": "2026-03-01",
        "sector": "Technology",
        "conviction": "high",
        "target_price": 200.0,
        "price_updated_at": datetime.now(UTC),
    }
    defaults.update(kwargs)
    entry = WatchlistEntry(**defaults)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def test_list_watchlist(client: AsyncClient, db: AsyncSession):
    await _seed_entry(db, "AAPL")
    await _seed_entry(db, "GOOG", company="Alphabet Inc.")

    resp = await client.get("/api/watchlist")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["entries"]) == 2


async def test_list_watchlist_sorted(client: AsyncClient, db: AsyncSession):
    await _seed_entry(db, "AAPL")
    await _seed_entry(db, "GOOG", company="Alphabet Inc.")

    resp = await client.get("/api/watchlist", params={"sort_by": "ticker", "order": "asc"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["entries"][0]["ticker"] == "AAPL"
    assert data["entries"][1]["ticker"] == "GOOG"


async def test_update_entry(client: AsyncClient, db: AsyncSession):
    await _seed_entry(db, "AAPL")

    resp = await client.patch(
        "/api/watchlist/AAPL", json={"notes": "Updated note", "conviction": "low"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["notes"] == "Updated note"
    assert data["conviction"] == "low"


async def test_update_entry_not_found(client: AsyncClient):
    resp = await client.patch("/api/watchlist/FAKE", json={"notes": "test"})
    assert resp.status_code == 404


async def test_price_change_pct(client: AsyncClient, db: AsyncSession):
    await _seed_entry(db, "AAPL", price_at_mention=100.0, current_price=110.0)

    resp = await client.get("/api/watchlist")
    assert resp.status_code == 200
    entry = resp.json()["entries"][0]
    assert entry["price_change_pct"] == 10.0


async def test_get_alerts(client: AsyncClient, db: AsyncSession):
    await _seed_entry(db, "AAPL")
    db.add(
        Alert(
            ticker="AAPL",
            alert_type="target_reached",
            message="AAPL reached target $200.00",
            triggered_price=201.0,
            target_price=200.0,
        )
    )
    await db.commit()

    resp = await client.get("/api/watchlist/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["alerts"]) == 1
    assert data["unread_count"] == 1


async def test_get_alerts_unread_only(client: AsyncClient, db: AsyncSession):
    await _seed_entry(db, "AAPL")
    db.add(
        Alert(
            ticker="AAPL",
            alert_type="target_reached",
            message="Alert 1",
            is_read=True,
        )
    )
    db.add(
        Alert(
            ticker="AAPL",
            alert_type="target_reached",
            message="Alert 2",
            is_read=False,
        )
    )
    await db.commit()

    resp = await client.get("/api/watchlist/alerts", params={"unread_only": True})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["alerts"]) == 1
    assert data["alerts"][0]["message"] == "Alert 2"


async def test_mark_alerts_read(client: AsyncClient, db: AsyncSession):
    await _seed_entry(db, "AAPL")
    alert = Alert(
        ticker="AAPL",
        alert_type="target_reached",
        message="Test alert",
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    resp = await client.post(
        "/api/watchlist/alerts/mark-read", json={"alert_ids": [alert.id]}
    )
    assert resp.status_code == 200

    # Verify it's marked as read
    resp = await client.get("/api/watchlist/alerts")
    data = resp.json()
    assert data["unread_count"] == 0
