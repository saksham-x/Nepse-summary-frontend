import { useMemo, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { config } from '@/config/env';
import { apiGet, symbolPath } from '@/lib/api-client';
import type { IndicatorResponse, IndicatorType, Interval, MacdPoint, ValuePoint } from '@/types/api';
import { indicatorParams, type IndicatorSettings } from '../lib/indicators';
import { isMacdPoint, mergePages } from '../lib/merge';

export interface IndicatorSeries {
  type: IndicatorType;
  points: (ValuePoint | MacdPoint)[];
  insufficientHistory: boolean;
  warmupBars: number;
  isLoading: boolean;
  error: unknown;
}

interface Args {
  symbol: string;
  interval: Interval;
  from?: string;
  /** The `before` cursors of the candle pages currently loaded, newest first. */
  pageParams: readonly (string | undefined)[];
  types: readonly IndicatorType[];
  settings: IndicatorSettings;
}

/**
 * Fetches each enabled indicator for exactly the same pages as the candles
 * (same interval/from/before/limit), so values line up with the chart.
 */
export function useIndicatorSeries({ symbol, interval, from, pageParams, types, settings }: Args): IndicatorSeries[] {
  const requests = types.flatMap((type) =>
    pageParams.map((before) => ({ type, before, params: indicatorParams(type, settings) })),
  );

  const results = useQueries({
    queries: requests.map((r) => ({
      queryKey: ['indicator', symbol, interval, from ?? 'all', r.type, r.params, r.before ?? 'latest'],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        apiGet<IndicatorResponse>(`/indicators/${symbolPath(symbol)}`, {
          params: { type: r.type, interval, from, before: r.before, limit: config.candlePageSize, ...r.params },
          signal,
        }),
      staleTime: 60_000,
    })),
  });

  // useQueries returns a new array every render; rebuild only when a query changed,
  // so the chart doesn't re-upload series data on unrelated re-renders.
  const changeKey = `${types.join(',')}#${results.map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`).join('|')}`;
  const latest = useRef(results);
  latest.current = results;

  return useMemo(
    () =>
      types.map((type) => {
        const mine = latest.current.filter((_, i) => requests[i]?.type === type);
        const pages = mine.map((q) => q.data?.data ?? []);
        const newest = mine[0]?.data?.meta;
        const points = mergePages(pages);
        return {
          type,
          points: type === 'macd' ? points.filter(isMacdPoint) : points,
          insufficientHistory: newest?.insufficientHistory ?? false,
          warmupBars: newest?.warmupBars ?? 0,
          isLoading: mine.some((q) => q.isLoading),
          error: mine.find((q) => q.error)?.error ?? null,
        };
      }),
    // changeKey summarizes the enabled types and every query's state.
    [changeKey],
  );
}
