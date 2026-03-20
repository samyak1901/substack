from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient


def _mock_progress():
    """Create a mock ProgressReporter that doesn't touch the real DB."""
    p = MagicMock()
    p.job_id = "test-job-id"
    p.start = AsyncMock()
    p.update = AsyncMock()
    p.complete = AsyncMock()
    p.fail = AsyncMock()
    return p


@patch("app.routers.jobs.ProgressReporter")
async def test_trigger_digest(mock_pr_cls, client: AsyncClient):
    mock_pr_cls.return_value = _mock_progress()
    resp = await client.post("/api/jobs/digest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == "test-job-id"
    assert data["status"] == "started"


@patch("app.routers.jobs.ProgressReporter")
async def test_trigger_watchlist(mock_pr_cls, client: AsyncClient):
    mock_pr_cls.return_value = _mock_progress()
    resp = await client.post("/api/jobs/watchlist", params={"weeks": 2})
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == "test-job-id"
    assert "2 week" in data["message"]


@patch("app.routers.jobs.ProgressReporter")
async def test_trigger_price_refresh(mock_pr_cls, client: AsyncClient):
    mock_pr_cls.return_value = _mock_progress()
    resp = await client.post("/api/jobs/price-refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == "test-job-id"


@patch("app.routers.jobs.get_job_run", new_callable=AsyncMock, return_value=None)
async def test_job_progress_not_found(mock_get, client: AsyncClient):
    resp = await client.get("/api/jobs/nonexistent-id/progress")
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    assert "Job not found" in resp.text


@patch("app.routers.jobs.get_job_run")
async def test_job_progress_completed(mock_get, client: AsyncClient):
    job = MagicMock()
    job.status = "completed"
    job.progress_pct = 100
    job.current_step = "Done"
    job.result_message = "Created 5 articles"
    job.error_message = None
    mock_get.return_value = job

    resp = await client.get("/api/jobs/test-job-123/progress")
    assert resp.status_code == 200
    assert "completed" in resp.text
    assert "Created 5 articles" in resp.text
