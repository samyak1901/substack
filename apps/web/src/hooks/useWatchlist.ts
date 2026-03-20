import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWatchlist, updateEntry } from "../api/watchlist";
import type { WatchlistResponse, WatchlistEntry } from "../types";

export function useWatchlist(sortBy = "mention_date", order = "desc") {
  return useQuery({
    queryKey: ["watchlist", sortBy, order],
    queryFn: () => fetchWatchlist(sortBy, order),
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticker,
      data,
    }: {
      ticker: string;
      data: { notes?: string; conviction?: string };
    }) => updateEntry(ticker, data),
    onMutate: async ({ ticker, data }) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });

      const previousQueries = queryClient.getQueriesData<WatchlistResponse>({
        queryKey: ["watchlist"],
      });

      queryClient.setQueriesData<WatchlistResponse>(
        { queryKey: ["watchlist"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            entries: old.entries.map((e: WatchlistEntry) =>
              e.ticker === ticker ? { ...e, ...data } : e,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}
