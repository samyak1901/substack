from pydantic import BaseModel


class WatchlistEntryOut(BaseModel):
    ticker: str
    company: str
    price_at_mention: float | None
    current_price: float | None
    reasoning: str
    article_url: str
    article_title: str
    publication: str
    author: str
    mention_date: str
    sector: str | None = None
    market_cap: float | None = None
    conviction: str | None = None
    target_price: float | None = None
    notes: str | None = None
    price_updated_at: str | None = None
    price_change_pct: float | None = None

    model_config = {"from_attributes": True}


class WatchlistEntryUpdate(BaseModel):
    notes: str | None = None
    conviction: str | None = None


class WatchlistResponse(BaseModel):
    entries: list[WatchlistEntryOut]
    total: int


class AlertOut(BaseModel):
    id: int
    ticker: str
    alert_type: str
    message: str
    is_read: bool
    triggered_price: float | None = None
    target_price: float | None = None
    created_at: str

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: list[AlertOut]
    unread_count: int


class MarkAlertsReadRequest(BaseModel):
    alert_ids: list[int]
