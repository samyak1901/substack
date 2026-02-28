import { apiFetch } from "./client";
import type { DigestDetail, DigestListResponse } from "../types";

export function fetchDigests(page = 1): Promise<DigestListResponse> {
  return apiFetch(`/digests?page=${page}`);
}

export function fetchLatestDigest(): Promise<DigestDetail | null> {
  return apiFetch("/digests/latest");
}

export function fetchDigest(id: number): Promise<DigestDetail> {
  return apiFetch(`/digests/${id}`);
}
