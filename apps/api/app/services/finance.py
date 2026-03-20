import logging
from dataclasses import dataclass
from datetime import datetime

import yfinance as yf

logger = logging.getLogger(__name__)


@dataclass
class PriceInfo:
    price_at_mention: float | None = None
    current_price: float | None = None
    sector: str | None = None
    market_cap: float | None = None


def get_prices(ticker: str, mention_date: datetime) -> PriceInfo:
    result = PriceInfo()
    ticker = ticker.strip().upper()
    if not ticker:
        return result

    try:
        stock = yf.Ticker(ticker)

        try:
            info = stock.info
            result.sector = info.get("sector")
            raw_cap = info.get("marketCap")
            if raw_cap is not None:
                result.market_cap = float(raw_cap)
        except Exception as e:
            logger.warning(f"Could not fetch info for {ticker}: {e}")

        try:
            hist_current = stock.history(period="1d")
            if not hist_current.empty:
                result.current_price = round(float(hist_current["Close"].iloc[-1]), 2)
        except Exception as e:
            logger.warning(f"Could not fetch current price for {ticker}: {e}")

        try:
            start_str = mention_date.strftime("%Y-%m-%d")
            hist_mention = stock.history(start=start_str, period="5d")
            if not hist_mention.empty:
                result.price_at_mention = round(float(hist_mention["Close"].iloc[0]), 2)
        except Exception as e:
            logger.warning(f"Could not fetch historical price for {ticker} at {mention_date}: {e}")

    except Exception as e:
        logger.error(f"Error initializing yfinance for {ticker}: {e}")

    return result
