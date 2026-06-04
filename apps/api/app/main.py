import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import digests, jobs, research, stock, watchlist
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


app = FastAPI(title="Signal Desk API", version="0.3.0", lifespan=lifespan)

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
app.include_router(research.router)
app.include_router(stock.router)
app.include_router(jobs.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "signal-desk", "version": "0.3.0"}


@app.get("/api/setup/status")
async def setup_status():
    settings = get_settings()
    return {
        "substack_connected": bool(settings.substack_sid),
        "gemini_configured": bool(settings.gemini_api_key),
        "market_data_configured": bool(settings.fmp_api_key),
    }
