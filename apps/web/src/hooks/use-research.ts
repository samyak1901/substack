import { useQuery } from "@tanstack/react-query";
import { fetchResearch, fetchResearchList } from "../api/research";

export function useResearch(ticker: string | undefined) {
  return useQuery({
    queryKey: ["research", ticker],
    queryFn: () => fetchResearch(ticker!),
    enabled: !!ticker,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useResearchList() {
  return useQuery({
    queryKey: ["research-list"],
    queryFn: fetchResearchList,
  });
}
