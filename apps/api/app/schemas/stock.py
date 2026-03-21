from pydantic import BaseModel


class StockProfileResponse(BaseModel):
    ticker: str
    company: str
    share_price: float | None = None
    market_cap: float | None = None
    enterprise_value: float | None = None
    overview: dict | None = None
    price_history: list | None = None
    has_research: bool = False
    research: dict | None = None
    watchlist: dict | None = None


class StockSearchResult(BaseModel):
    ticker: str
    company_name: str
    exchange: str | None = None


class StockSearchResponse(BaseModel):
    results: list[StockSearchResult]


class WatchlistAddRequest(BaseModel):
    ticker: str
    company: str | None = None
    conviction: str | None = None
    target_price: float | None = None
    notes: str | None = None
