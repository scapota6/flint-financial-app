import { useQuery } from "@tanstack/react-query";

interface MarketData {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  marketCap: number;
  company_name?: string;
  logo_url?: string;
}

// Hook for single symbol market data with real-time updates
export function useMarketData(symbol: string, enabled: boolean = true) {
  const query = useQuery({
    queryKey: ["/api/market-data", symbol],
    queryFn: async (): Promise<MarketData> => {
      const response = await fetch(`/api/market-data?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch market data for ${symbol}`);
      }
      return response.json();
    },
    enabled: enabled && !!symbol,
    staleTime: 500, // Live data: Consider stale after 0.5 seconds
    refetchInterval: 1000, // Live data: Refetch every second (React Query handles polling)
    retry: 2,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook for multiple symbols market data
export function useBulkMarketData(symbols: string[], enabled: boolean = true) {
  const query = useQuery({
    queryKey: ["/api/market-data/bulk", symbols.sort().join(",")],
    queryFn: async (): Promise<{[symbol: string]: MarketData | null}> => {
      const response = await fetch("/api/market-data/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch bulk market data");
      }
      
      return response.json();
    },
    enabled: enabled && symbols.length > 0,
    staleTime: 500, // Live data: Consider stale after 0.5 seconds
    refetchInterval: 1000, // Live data: Refetch every second (React Query handles polling)
    retry: 2,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook for watchlist with enriched market data
export function useWatchlistMarketData() {
  const query = useQuery({
    queryKey: ["/api/market-data/watchlist"],
    queryFn: async () => {
      const response = await fetch("/api/market-data/watchlist");
      if (!response.ok) {
        throw new Error("Failed to fetch watchlist market data");
      }
      return response.json();
    },
    staleTime: 500, // Live data: Consider stale after 0.5 seconds
    refetchInterval: 1000, // Live data: Refetch every second (React Query handles polling)
    retry: 2,
  });

  return {
    watchlist: query.data?.watchlist || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export type { MarketData };