import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import digests, jobs, watchlist
from app.scheduler import create_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    logging.getLogger(__name__).info("Scheduler started.")
    yield
    scheduler.shutdown()


app = FastAPI(title="Substack Digest API", version="0.2.0", lifespan=lifespan)

origins = get_settings().cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(digests.router)
app.include_router(watchlist.router)
app.include_router(jobs.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
