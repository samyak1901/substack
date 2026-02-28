import logging
from datetime import datetime

import yfinance as yf

logger = logging.getLogger(__name__)


def get_prices(ticker: str, mention_date: datetime) -> dict[str, float | str | None]:
    """
    Fetch the historical (at mention_date) and current price for a stock ticker,
    plus sector and market cap from yfinance info.
    """
    result: dict[str, float | str | None] = {
        "price_at_mention": "N/A",
        "current_price": "N/A",
        "sector": None,
        "market_cap": None,
    }

    try:
        ticker = ticker.strip().upper()
        if not ticker:
            return result

        stock = yf.Ticker(ticker)

        try:
            info = stock.info
            result["sector"] = info.get("sector")
            raw_cap = info.get("marketCap")
            if raw_cap is not None:
                result["market_cap"] = float(raw_cap)
        except Exception as e:
            logger.warning(f"Could not fetch info for {ticker}: {e}")

        try:
            hist_current = stock.history(period="1d")
            if not hist_current.empty:
                result["current_price"] = round(float(hist_current["Close"].iloc[-1]), 2)
        except Exception as e:
            logger.warning(f"Could not fetch current price for {ticker}: {e}")

        try:
            start_str = mention_date.strftime("%Y-%m-%d")
            hist_mention = stock.history(start=start_str, period="5d")
            if not hist_mention.empty:
                result["price_at_mention"] = round(float(hist_mention["Close"].iloc[0]), 2)
        except Exception as e:
            logger.warning(f"Could not fetch historical price for {ticker} at {mention_date}: {e}")

    except Exception as e:
        logger.error(f"Error initializing yfinance for {ticker}: {e}")

    return result
