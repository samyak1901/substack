import uuid
from datetime import UTC, datetime

from app.database import async_session
from app.models import JobRun


class ProgressReporter:
    def __init__(self, job_type: str):
        self.job_id = str(uuid.uuid4())
        self.job_type = job_type

    async def start(self):
        async with async_session() as db:
            db.add(
                JobRun(
                    id=self.job_id,
                    job_type=self.job_type,
                    status="running",
                    current_step="Starting...",
                )
            )
            await db.commit()

    async def update(self, step: str, pct: int):
        async with async_session() as db:
            job = await db.get(JobRun, self.job_id)
            if job:
                job.current_step = step
                job.progress_pct = min(pct, 100)
                await db.commit()

    async def complete(self, message: str):
        async with async_session() as db:
            job = await db.get(JobRun, self.job_id)
            if job:
                job.status = "completed"
                job.progress_pct = 100
                job.current_step = "Done"
                job.result_message = message
                job.completed_at = datetime.now(UTC)
                await db.commit()

    async def is_done(self) -> bool:
        async with async_session() as db:
            job = await db.get(JobRun, self.job_id)
            return job is not None and job.status in ("completed", "failed")

    async def fail(self, error: str):
        async with async_session() as db:
            job = await db.get(JobRun, self.job_id)
            if job:
                job.status = "failed"
                job.current_step = "Failed"
                job.error_message = error
                job.completed_at = datetime.now(UTC)
                await db.commit()


async def get_job_run(job_id: str) -> JobRun | None:
    async with async_session() as db:
        return await db.get(JobRun, job_id)
