import { apiFetch } from "./client";
import type { StockResearch, ResearchListResponse, JobResponse } from "../types";

export function fetchResearch(ticker: string): Promise<StockResearch> {
  return apiFetch(`/research/${encodeURIComponent(ticker)}`);
}

export function fetchResearchList(): Promise<ResearchListResponse> {
  return apiFetch("/research");
}

export function refreshResearch(ticker: string): Promise<JobResponse> {
  return apiFetch(`/research/${encodeURIComponent(ticker)}/refresh`, {
    method: "POST",
  });
}
