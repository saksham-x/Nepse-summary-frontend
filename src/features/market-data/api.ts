import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { config } from '@/config/env';
import { apiGet, symbolPath } from '@/lib/api-client';
import type { CandlesResponse, Interval, QuoteResponse } from '@/types/api';

export interface CandleQuery {
  symbol: string;
  interval: Interval;
  /** Inclusive start date, or undefined for all stored history. */
  from?: string;
  limit?: number;
}

export const getCandles = (q: CandleQuery & { before?: string }, signal?: AbortSignal) =>
  apiGet<CandlesResponse>(`/market-data/${symbolPath(q.symbol)}/candles`, {
    params: { interval: q.interval, from: q.from, before: q.before, limit: q.limit ?? config.candlePageSize },
    signal,
  });

export const getQuote = (symbol: string, signal?: AbortSignal) =>
  apiGet<QuoteResponse>(`/market-data/${symbolPath(symbol)}/quote`, { signal });

export const candleQueryKey = (q: CandleQuery) => ['candles', q.symbol, q.interval, q.from ?? 'all', q.limit ?? config.candlePageSize] as const;

/**
 * Candle history as pages, newest page first. The page param is the backend's
 * `before` cursor (undefined for the newest page); `fetchNextPage` loads the
 * next older page.
 */
export function useCandleHistory(q: CandleQuery) {
  return useInfiniteQuery({
    queryKey: candleQueryKey(q),
    queryFn: ({ pageParam, signal }) => getCandles({ ...q, before: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.meta.hasMore && last.meta.nextBefore ? last.meta.nextBefore : undefined),
    staleTime: 60_000,
  });
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: ({ signal }) => getQuote(symbol, signal),
    // Polls only while the tab is visible (refetchIntervalInBackground defaults to false).
    refetchInterval: config.quotePollMs,
    staleTime: 15_000,
  });
}
