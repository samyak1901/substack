import logging

from fastapi import APIRouter, BackgroundTasks, Query

from app.api.schemas.jobs import JobResponse
from app.api.services.digest_service import generate_and_store_digest
from app.api.services.watchlist_service import extract_and_store_watchlist
from app.database import async_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


async def _run_digest():
    async with async_session() as db:
        await generate_and_store_digest(db, since_hours=24, all_subs=False)


async def _run_watchlist(weeks: int):
    async with async_session() as db:
        await extract_and_store_watchlist(db, weeks=weeks)


@router.post("/digest", response_model=JobResponse)
async def api_trigger_digest(background_tasks: BackgroundTasks):
    background_tasks.add_task(_run_digest)
    return JobResponse(status="started", message="Digest generation started in background")


@router.post("/watchlist", response_model=JobResponse)
async def api_trigger_watchlist(
    weeks: int = Query(1, ge=1, le=52),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    background_tasks.add_task(_run_watchlist, weeks)
    return JobResponse(status="started", message=f"Watchlist extraction started ({weeks} week(s))")
