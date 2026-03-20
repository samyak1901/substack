import { apiFetch } from "./client";
import type { AlertListResponse, WatchlistResponse, WatchlistEntry, JobResponse } from "../types";

export function fetchWatchlist(
  sortBy = "mention_date",
  order = "desc",
): Promise<WatchlistResponse> {
  return apiFetch(`/watchlist?sort_by=${sortBy}&order=${order}`);
}

export function refreshPrices(): Promise<JobResponse> {
  return apiFetch("/watchlist/refresh", { method: "POST" });
}

export function fetchAlerts(unreadOnly = false): Promise<AlertListResponse> {
  return apiFetch(`/watchlist/alerts?unread_only=${unreadOnly}`);
}

export function markAlertsRead(alertIds: number[]): Promise<void> {
  return apiFetch("/watchlist/alerts/mark-read", {
    method: "POST",
    body: JSON.stringify({ alert_ids: alertIds }),
  });
}

export function updateEntry(
  ticker: string,
  data: { notes?: string; conviction?: string },
): Promise<WatchlistEntry> {
  return apiFetch(`/watchlist/${encodeURIComponent(ticker)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
