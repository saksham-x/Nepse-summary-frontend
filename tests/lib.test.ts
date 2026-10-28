import { describe, expect, it } from 'vitest';
import { kathmanduToday, presetFrom, subtractMonths } from '../src/lib/dates';
import { formatAge, formatPrice, formatSigned, formatTradeDate } from '../src/lib/format';
import { closeChanges, mergePages } from '../src/features/chart/lib/merge';
import { timeKey, withAlpha } from '../src/features/chart/lib/series-data';
import { DEFAULT_INDICATORS, enabledIndicators, indicatorParams, validateSettings } from '../src/features/chart/lib/indicators';
import type { Candle } from '../src/types/api';

const c = (time: string, close: number): Candle => ({ time, open: close, high: close, low: close, close, volume: 1, provisional: false });

describe('mergePages', () => {
  it('joins newest-first pages into one ascending series', () => {
    const newest = [c('2024-06-10', 3), c('2024-06-11', 4)];
    const older = [c('2024-06-06', 1), c('2024-06-09', 2)];
    expect(mergePages([newest, older]).map((x) => x.time)).toEqual(['2024-06-06', '2024-06-09', '2024-06-10', '2024-06-11']);
  });

  it('drops duplicate or out-of-order times the chart would reject', () => {
    expect(mergePages([[c('2024-06-10', 3)], [c('2024-06-09', 2), c('2024-06-10', 9)]]).map((x) => x.close)).toEqual([2, 3]);
  });
});

describe('closeChanges', () => {
  it('computes close-to-close change and percent', () => {
    const m = closeChanges([c('2024-06-09', 100), c('2024-06-10', 110)]);
    expect(m.get('2024-06-09')).toBeUndefined();
    expect(m.get('2024-06-10')).toEqual({ change: 10, percent: 10 });
  });
});

describe('dates', () => {
  it('uses the Kathmandu calendar day', () => {
    expect(kathmanduToday(new Date('2024-06-12T18:14:00Z'))).toBe('2024-06-12');
    expect(kathmanduToday(new Date('2024-06-12T18:15:00Z'))).toBe('2024-06-13');
  });

  it('subtracts months, clamping to the month end', () => {
    expect(subtractMonths('2024-03-31', 1)).toBe('2024-02-29');
    expect(subtractMonths('2024-01-15', 3)).toBe('2023-10-15');
    expect(presetFrom('1Y', '2024-06-12')).toBe('2023-06-12');
    expect(presetFrom('ALL', '2024-06-12')).toBeUndefined();
  });
});

describe('format', () => {
  it('formats prices, signs and dates without timezone shifts', () => {
    expect(formatPrice(123456.5)).toBe('1,23,456.50');
    expect(formatPrice(null)).toBe('—');
    expect(formatSigned(2.5)).toBe('+2.50');
    expect(formatSigned(-1.2)).toBe('−1.20');
    expect(formatTradeDate('2024-06-01')).toBe('1 Jun 2024');
    expect(formatAge(45)).toBe('45s ago');
    expect(formatAge(7200)).toBe('2 h ago');
  });
});

describe('chart helpers', () => {
  it('normalizes every chart Time form to YYYY-MM-DD', () => {
    expect(timeKey('2024-06-12')).toBe('2024-06-12');
    expect(timeKey({ year: 2024, month: 6, day: 2 })).toBe('2024-06-02');
    expect(timeKey(Date.UTC(2024, 5, 12) / 1000 as never)).toBe('2024-06-12');
    expect(withAlpha('#2a78d6', 0.5)).toBe('rgba(42, 120, 214, 0.5)');
  });
});

describe('indicator settings', () => {
  it('mirrors the backend validation rules', () => {
    expect(validateSettings(DEFAULT_INDICATORS)).toBeNull();
    expect(validateSettings({ ...DEFAULT_INDICATORS, macd: { enabled: true, fast: 26, slow: 12, signal: 9 } })).toMatch(/fast/);
    expect(validateSettings({ ...DEFAULT_INDICATORS, rsi: { enabled: true, period: 1 } })).toMatch(/RSI/);
    expect(validateSettings({ ...DEFAULT_INDICATORS, sma: { enabled: true, period: 2.5 } })).toMatch(/SMA/);
  });

  it('builds the query params the API expects', () => {
    expect(indicatorParams('macd', DEFAULT_INDICATORS)).toEqual({ fast: 12, slow: 26, signal: 9 });
    expect(indicatorParams('rsi', DEFAULT_INDICATORS)).toEqual({ period: 14 });
    expect(enabledIndicators(DEFAULT_INDICATORS)).toEqual(['sma']);
  });
});
