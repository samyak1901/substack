import { useQuery } from "@tanstack/react-query";
import { fetchQuarterlyFinancials } from "../api/stock";

export function useQuarterlyFinancials(ticker: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["quarterly-financials", ticker],
    queryFn: () => fetchQuarterlyFinancials(ticker!),
    enabled: !!ticker && enabled,
    staleTime: 10 * 60_000,
  });
}
