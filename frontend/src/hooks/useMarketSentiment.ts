import { useQuery } from "@tanstack/react-query";
import { MarketApiClient, marketKeys } from "@/lib/api/market-client";

export function useMarketSentiment(asset: string = "BTC/USDT") {
  const query = useQuery({
    queryKey: marketKeys.sentiment(asset),
    queryFn: () => MarketApiClient.getSentiment(asset),
    refetchInterval: 60_000,
  });

  return {
    sentiment: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to fetch sentiment data"
      : null,
    refresh: () => { query.refetch(); },
  };
}
