import type { Candle, MacdPoint, ValuePoint } from '@/types/api';

/**
 * Joins pages fetched newest-first into one ascending series. Pages from the
 * backend never overlap, but the chart library requires strictly increasing
 * times, so overlaps are resolved defensively: for a repeated time the value
 * from the newer page wins (it was fetched later, e.g. a finalized candle).
 */
export function mergePages<T extends { time: string }>(pagesNewestFirst: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  for (let p = pagesNewestFirst.length - 1; p >= 0; p--) {
    for (const item of pagesNewestFirst[p] ?? []) {
      const last = out[out.length - 1];
      if (!last || item.time > last.time) out.push(item);
      else if (item.time === last.time) out[out.length - 1] = item;
    }
  }
  return out;
}

export const isMacdPoint = (p: ValuePoint | MacdPoint): p is MacdPoint => 'macd' in p;

/** Close-to-close change for each candle, keyed by time (first candle has none). */
export function closeChanges(candles: readonly Candle[]): Map<string, { change: number; percent: number }> {
  const out = new Map<string, { change: number; percent: number }>();
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1]!;
    const cur = candles[i]!;
    const change = cur.close - prev.close;
    out.set(cur.time, { change, percent: (change / prev.close) * 100 });
  }
  return out;
}
