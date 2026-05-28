import { useQuery } from "@tanstack/react-query";
import { MarketApiClient, marketKeys } from "@/lib/api/market-client";

export function useMarketTickers() {
  const query = useQuery({
    queryKey: marketKeys.tickers(),
    queryFn: () => MarketApiClient.getTickers(),
    refetchInterval: 4000,
  });

  return {
    tickers: query.data?.items ?? [],
    asOf: query.data?.as_of ?? null,
    isLoading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to fetch market data"
      : null,
    refresh: () => { query.refetch(); },
  };
}
