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
