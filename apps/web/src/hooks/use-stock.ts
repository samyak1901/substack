import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStockProfile,
  fetchStockArticles,
  searchTickers,
  addToWatchlist,
  removeFromWatchlist,
  fetchAIAnalysis,
  generateAIAnalysis,
} from "../api/stock";
import { refreshResearch } from "../api/research";

export function useStockProfile(ticker: string | undefined) {
  return useQuery({
    queryKey: ["stock-profile", ticker],
    queryFn: () => fetchStockProfile(ticker!),
    enabled: !!ticker,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useStockArticles(ticker: string | undefined) {
  return useQuery({
    queryKey: ["stock-articles", ticker],
    queryFn: () => fetchStockArticles(ticker!),
    enabled: !!ticker,
    staleTime: 5 * 60_000,
  });
}

export function useTickerSearch(query: string) {
  return useQuery({
    queryKey: ["ticker-search", query],
    queryFn: () => searchTickers(query),
    enabled: query.length >= 1,
    staleTime: 30_000,
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addToWatchlist,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-profile", variables.ticker] });
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: (_data, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["stock-profile", ticker] });
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

export function useGenerateResearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshResearch,
    onSuccess: (_data, ticker) => {
      queryClient.invalidateQueries({ queryKey: ["research", ticker] });
    },
  });
}

export function useAIAnalysis(ticker: string | undefined) {
  return useQuery({
    queryKey: ["ai-analysis", ticker],
    queryFn: () => fetchAIAnalysis(ticker!),
    enabled: !!ticker,
    staleTime: 5 * 60_000,
  });
}

export function useGenerateAIAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateAIAnalysis,
    onSuccess: (_data, ticker) => {
      // Delay refetch to give background task time
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["ai-analysis", ticker] });
      }, 3000);
    },
  });
}
