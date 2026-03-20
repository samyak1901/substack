import asyncio
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Query
from fastapi.responses import StreamingResponse

from app.database import async_session
from app.schemas.jobs import JobStartResponse
from app.services.digest import generate_and_store_digest
from app.services.progress import ProgressReporter, get_job_run
from app.services.watchlist import extract_and_store_watchlist, refresh_all_prices

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


async def _run_digest(progress: ProgressReporter):
    await progress.start()
    try:
        async with async_session() as db:
            result = await generate_and_store_digest(
                db, since_hours=24, all_subs=False, progress=progress
            )
        if result is None and not await progress.is_done():
            await progress.complete("No new articles found.")
    except Exception as e:
        logger.exception("Digest job failed")
        await progress.fail(str(e))


async def _run_watchlist(weeks: int, progress: ProgressReporter):
    await progress.start()
    try:
        async with async_session() as db:
            await extract_and_store_watchlist(db, weeks=weeks, progress=progress)
        if not await progress.is_done():
            await progress.complete("Watchlist extraction finished.")
    except Exception as e:
        logger.exception("Watchlist job failed")
        await progress.fail(str(e))


async def _run_price_refresh(progress: ProgressReporter):
    await progress.start()
    try:
        async with async_session() as db:
            await refresh_all_prices(db, progress=progress)
        if not await progress.is_done():
            await progress.complete("Price refresh finished.")
    except Exception as e:
        logger.exception("Price refresh job failed")
        await progress.fail(str(e))


@router.post("/digest", response_model=JobStartResponse)
async def api_trigger_digest(background_tasks: BackgroundTasks):
    progress = ProgressReporter("digest")
    background_tasks.add_task(_run_digest, progress)
    return JobStartResponse(
        job_id=progress.job_id, status="started", message="Digest generation started"
    )


@router.post("/watchlist", response_model=JobStartResponse)
async def api_trigger_watchlist(
    weeks: int = Query(1, ge=1, le=52),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    progress = ProgressReporter("watchlist")
    background_tasks.add_task(_run_watchlist, weeks, progress)
    return JobStartResponse(
        job_id=progress.job_id,
        status="started",
        message=f"Watchlist extraction started ({weeks} week(s))",
    )


@router.post("/price-refresh", response_model=JobStartResponse)
async def api_trigger_price_refresh(background_tasks: BackgroundTasks):
    progress = ProgressReporter("price_refresh")
    background_tasks.add_task(_run_price_refresh, progress)
    return JobStartResponse(
        job_id=progress.job_id, status="started", message="Price refresh started"
    )


@router.get("/{job_id}/progress")
async def api_job_progress(job_id: str):
    async def event_stream():
        while True:
            job = await get_job_run(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
                break
            payload = {
                "status": job.status,
                "progress_pct": job.progress_pct,
                "current_step": job.current_step,
                "result_message": job.result_message,
                "error_message": job.error_message,
            }
            yield f"data: {json.dumps(payload)}\n\n"
            if job.status in ("completed", "failed"):
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
