from pydantic import computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    substack_sid: str
    gemini_api_key: str
    resend_api_key: str
    email_from: str
    email_to: str  # comma-separated in env var

    @computed_field  # type: ignore[prop-decorator]
    @property
    def email_recipients(self) -> list[str]:
        return [e.strip() for e in self.email_to.split(",")]


settings = Settings()  # type: ignore[call-arg]
