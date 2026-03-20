from pydantic import BaseModel


class JobStartResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobProgress(BaseModel):
    status: str
    progress_pct: int
    current_step: str
    result_message: str | None = None
    error_message: str | None = None
