import type { IndicatorType } from '@/types/api';

export interface PeriodSetting {
  enabled: boolean;
  period: number;
}

export interface MacdSetting {
  enabled: boolean;
  fast: number;
  slow: number;
  signal: number;
}

export interface IndicatorSettings {
  sma: PeriodSetting;
  ema: PeriodSetting;
  rsi: PeriodSetting;
  macd: MacdSetting;
}

export const DEFAULT_INDICATORS: IndicatorSettings = {
  sma: { enabled: true, period: 20 },
  ema: { enabled: false, period: 50 },
  rsi: { enabled: false, period: 14 },
  macd: { enabled: false, fast: 12, slow: 26, signal: 9 },
};

export const INDICATOR_LABELS: Record<IndicatorType, string> = {
  sma: 'SMA',
  ema: 'EMA',
  rsi: 'RSI',
  macd: 'MACD',
};

/** Query parameters the backend expects for each indicator. */
export function indicatorParams(type: IndicatorType, s: IndicatorSettings): Record<string, number> {
  switch (type) {
    case 'sma':
    case 'ema':
    case 'rsi':
      return { period: s[type].period };
    case 'macd':
      return { fast: s.macd.fast, slow: s.macd.slow, signal: s.macd.signal };
  }
}

export function indicatorTitle(type: IndicatorType, s: IndicatorSettings): string {
  const p = indicatorParams(type, s);
  return `${INDICATOR_LABELS[type]} (${Object.values(p).join(', ')})`;
}

export function enabledIndicators(s: IndicatorSettings): IndicatorType[] {
  return (Object.keys(s) as IndicatorType[]).filter((k) => s[k].enabled);
}

/** Mirrors the backend's validation so invalid settings are never sent. */
export function validateSettings(s: IndicatorSettings): string | null {
  const ok = (n: number, min: number) => Number.isInteger(n) && n >= min && n <= 500;
  if (!ok(s.sma.period, 1) || !ok(s.ema.period, 1)) return 'SMA/EMA periods must be whole numbers from 1 to 500';
  if (!ok(s.rsi.period, 2)) return 'RSI period must be a whole number from 2 to 500';
  if (!ok(s.macd.fast, 1) || !ok(s.macd.slow, 2) || !ok(s.macd.signal, 1)) return 'MACD periods must be whole numbers up to 500';
  if (s.macd.fast >= s.macd.slow) return 'MACD fast period must be shorter than slow';
  return null;
}

export function isIndicatorSettings(v: unknown): v is IndicatorSettings {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as IndicatorSettings;
  return ['sma', 'ema', 'rsi', 'macd'].every((k) => typeof (s as unknown as Record<string, { enabled?: unknown }>)[k]?.enabled === 'boolean') &&
    validateSettings(s) === null;
}
