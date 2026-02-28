import { useQuery } from "@tanstack/react-query";
import { fetchDigests, fetchDigest, fetchLatestDigest } from "../api/digests";

export function useDigests(page = 1) {
  return useQuery({
    queryKey: ["digests", page],
    queryFn: () => fetchDigests(page),
  });
}

export function useDigest(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["digest", id],
    queryFn: () => fetchDigest(id),
    enabled: options?.enabled ?? true,
  });
}

export function useLatestDigest() {
  return useQuery({
    queryKey: ["digest", "latest"],
    queryFn: fetchLatestDigest,
  });
}
