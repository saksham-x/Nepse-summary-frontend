/** Mirrors nepse-api's market-index types (socket events `index` and `index:subscribe`). */
export interface IndexSnapshot {
  name: string;
  value: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  asOf: string;
  marketOpen: boolean;
}

/** `time` is a UNIX timestamp in seconds. */
export interface IndexPoint {
  time: number;
  value: number;
}

export interface IndexState {
  snapshot: IndexSnapshot | null;
  points: IndexPoint[];
}

export interface IndexUpdate {
  snapshot: IndexSnapshot;
  point: IndexPoint | null;
}

/** Nepal is UTC+05:45 with no daylight saving. */
export const NPT_OFFSET_SECONDS = (5 * 60 + 45) * 60;

/** Kathmandu calendar date of a UNIX time in seconds. */
export const nptDate = (seconds: number): string => new Date((seconds + NPT_OFFSET_SECONDS) * 1000).toISOString().slice(0, 10);

/**
 * Applies a pushed update. A point from a new trading day starts a new series;
 * a point at or before the last one replaces it (the chart needs ascending times).
 */
export function applyIndexUpdate(state: IndexState, update: IndexUpdate): IndexState {
  const { point } = update;
  if (!point) return { ...state, snapshot: update.snapshot };
  const last = state.points[state.points.length - 1];
  if (!last || nptDate(last.time) !== nptDate(point.time)) return { snapshot: update.snapshot, points: [point] };
  if (point.time <= last.time) return { snapshot: update.snapshot, points: [...state.points.slice(0, -1), { ...point, time: last.time }] };
  return { snapshot: update.snapshot, points: [...state.points, point] };
}

export interface IndexCandle {
  /** Bucket start, UNIX seconds. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Intraday candle width for the index chart. */
export const INDEX_CANDLE_SECONDS = 5 * 60;

/**
 * Groups ascending index ticks into fixed-width OHLC candles. Each candle opens
 * at the previous candle's close (the index has no gaps between buckets), so
 * a bucket with a single tick still shows the move since the last one.
 */
export function toIndexCandles(points: readonly IndexPoint[], bucketSeconds = INDEX_CANDLE_SECONDS): IndexCandle[] {
  const candles: IndexCandle[] = [];
  for (const p of points) {
    const time = p.time - (p.time % bucketSeconds);
    const last = candles[candles.length - 1];
    if (last && last.time === time) {
      last.high = Math.max(last.high, p.value);
      last.low = Math.min(last.low, p.value);
      last.close = p.value;
    } else {
      const open = last?.close ?? p.value;
      candles.push({ time, open, high: Math.max(open, p.value), low: Math.min(open, p.value), close: p.value });
    }
  }
  return candles;
}
