from pydantic import BaseModel


class ResearchOut(BaseModel):
    ticker: str
    company: str
    share_price: float | None = None
    market_cap: float | None = None
    enterprise_value: float | None = None
    financials: dict | None = None
    price_history: list | None = None
    business_overview: dict | None = None
    management: dict | None = None
    insider_activity: list | None = None
    superinvestors: list | None = None
    headwinds_tailwinds: dict | None = None
    options_data: dict | None = None
    auditor: str | None = None
    last_refreshed: str | None = None

    model_config = {"from_attributes": True}


class ResearchListItem(BaseModel):
    ticker: str
    company: str
    share_price: float | None = None
    market_cap: float | None = None
    last_refreshed: str | None = None

    model_config = {"from_attributes": True}


class ResearchListResponse(BaseModel):
    items: list[ResearchListItem]
    total: int
