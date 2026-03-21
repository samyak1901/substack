import { apiFetch } from "./client";
import type {
  StockProfile,
  StockArticlesResponse,
  TickerSearchResponse,
  QuarterlyFinancials,
  AIAnalysis,
} from "../types";

export function fetchStockProfile(ticker: string): Promise<StockProfile> {
  return apiFetch(`/stock/${encodeURIComponent(ticker)}`);
}

export function fetchStockArticles(ticker: string): Promise<StockArticlesResponse> {
  return apiFetch(`/stock/${encodeURIComponent(ticker)}/articles`);
}

export function searchTickers(query: string): Promise<TickerSearchResponse> {
  return apiFetch(`/stock/search/tickers?q=${encodeURIComponent(query)}`);
}

export function addToWatchlist(body: {
  ticker: string;
  company?: string;
  conviction?: string;
  target_price?: number;
  notes?: string;
}): Promise<{ status: string; message: string }> {
  return apiFetch("/stock/watchlist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function removeFromWatchlist(
  ticker: string,
): Promise<{ status: string; message: string }> {
  return apiFetch(`/stock/watchlist/${encodeURIComponent(ticker)}`, {
    method: "DELETE",
  });
}

export function fetchQuarterlyFinancials(ticker: string): Promise<QuarterlyFinancials> {
  return apiFetch(`/stock/${encodeURIComponent(ticker)}/quarterly`);
}

export function fetchAIAnalysis(ticker: string): Promise<{ ai_analysis: AIAnalysis | null }> {
  return apiFetch(`/stock/${encodeURIComponent(ticker)}/ai-analysis`);
}

export function generateAIAnalysis(ticker: string): Promise<{ status: string; message: string }> {
  return apiFetch(`/stock/${encodeURIComponent(ticker)}/ai-analysis`, {
    method: "POST",
  });
}

export interface DashboardData {
  latest_digest: {
    id: number;
    date: string;
    overview: string;
    article_count: number;
  } | null;
  gainers: DashboardMover[];
  losers: DashboardMover[];
  recent_research: {
    ticker: string;
    company: string;
    share_price: number | null;
    market_cap: number | null;
    last_refreshed: string | null;
  }[];
  alerts: {
    id: number;
    ticker: string;
    alert_type: string;
    message: string;
    created_at: string;
  }[];
  watchlist_count: number;
}

export interface DashboardMover {
  ticker: string;
  company: string;
  current_price: number | null;
  price_change_pct: number | null;
  conviction: string | null;
}

export function fetchDashboard(): Promise<DashboardData> {
  return apiFetch("/stock/dashboard/summary");
}

export interface UnifiedSearchResult {
  stocks: {
    ticker: string;
    company_name: string;
    exchange: string | null;
    on_watchlist: boolean;
  }[];
  articles: {
    id: number;
    title: string;
    author: string;
    publication: string;
    url: string;
    category: string | null;
    reading_time_minutes: number;
  }[];
}

export function unifiedSearch(q: string): Promise<UnifiedSearchResult> {
  return apiFetch(`/stock/unified/search?q=${encodeURIComponent(q)}`);
}
