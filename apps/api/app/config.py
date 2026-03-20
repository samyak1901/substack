from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Infrastructure
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/substack_digest"
    cors_origins: str = "http://localhost:5173"

    # API keys (loaded from environment)
    substack_sid: str = ""
    gemini_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
