import type { Time } from 'lightweight-charts';
import type { Candle, MacdPoint, ValuePoint } from '@/types/api';

/** Converts a hex color to rgba() with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Normalizes a chart Time back to the API's 'YYYY-MM-DD' key. The library may
 * hand back the original string, a BusinessDay object, or a UTC timestamp.
 */
export function timeKey(t: Time): string {
  if (typeof t === 'string') return t;
  if (typeof t === 'number') return new Date(t * 1000).toISOString().slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.year}-${pad(t.month)}-${pad(t.day)}`;
}

export const toOhlc = (c: Candle) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close });
export const toCloseLine = (c: Candle) => ({ time: c.time as Time, value: c.close });
export const toVolume = (c: Candle) => ({ time: c.time as Time, value: c.volume });
export const toValue = (p: ValuePoint) => ({ time: p.time as Time, value: p.value });

export function toMacdParts(points: readonly MacdPoint[], positive: string, negative: string) {
  return {
    macd: points.map((p) => ({ time: p.time as Time, value: p.macd })),
    signal: points.map((p) => ({ time: p.time as Time, value: p.signal })),
    histogram: points.map((p) => ({ time: p.time as Time, value: p.histogram, color: p.histogram >= 0 ? positive : negative })),
  };
}
