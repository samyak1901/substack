import { apiFetch } from "./client";
import type { JobResponse } from "../types";

export function triggerDigest(): Promise<JobResponse> {
  return apiFetch("/jobs/digest", { method: "POST" });
}

export function triggerWatchlist(weeks = 1): Promise<JobResponse> {
  return apiFetch(`/jobs/watchlist?weeks=${weeks}`, { method: "POST" });
}

export function triggerPriceRefresh(): Promise<JobResponse> {
  return apiFetch("/jobs/price-refresh", { method: "POST" });
}
