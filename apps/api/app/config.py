from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: Literal["dev", "prod", "test"] = "dev"

    # Infrastructure
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/substack_digest"
    cors_origins: str = "http://localhost:5173"

    # API keys
    substack_sid: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"
    fmp_api_key: str = ""

    model_config = {"env_prefix": "", "extra": "ignore", "env_file": "../../.env"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
