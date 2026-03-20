import { apiFetch } from "./client";
import type { ArticleSearchResponse, DigestDetail, DigestListResponse } from "../types";

export function fetchDigests(page = 1): Promise<DigestListResponse> {
  return apiFetch(`/digests?page=${page}`);
}

export function fetchLatestDigest(): Promise<DigestDetail | null> {
  return apiFetch("/digests/latest");
}

export function fetchDigest(id: number): Promise<DigestDetail> {
  return apiFetch(`/digests/${id}`);
}

export function searchArticles(
  q: string,
  page = 1,
): Promise<ArticleSearchResponse> {
  return apiFetch(`/digests/search?q=${encodeURIComponent(q)}&page=${page}`);
}
