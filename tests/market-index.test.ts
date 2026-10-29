import { describe, expect, it } from 'vitest';
import { applyIndexUpdate, nptDate, type IndexSnapshot, type IndexState } from '../src/features/market-index/lib';

const snapshot = (value: number): IndexSnapshot => ({
  name: 'NEPSE Index',
  value,
  previousClose: 2000,
  change: value - 2000,
  changePercent: null,
  high: null,
  low: null,
  fiftyTwoWeekHigh: null,
  fiftyTwoWeekLow: null,
  asOf: '2024-06-12T06:00:00.000Z',
  marketOpen: true,
});

// 2024-06-12 11:15 NPT
const T = Date.parse('2024-06-12T05:30:00Z') / 1000;
const state = (...values: number[]): IndexState => ({ snapshot: snapshot(values.at(-1) ?? 0), points: values.map((value, i) => ({ time: T + i * 10, value })) });

describe('applyIndexUpdate', () => {
  it('appends a newer point and replaces the snapshot', () => {
    const next = applyIndexUpdate(state(2001, 2002), { snapshot: snapshot(2003), point: { time: T + 20, value: 2003 } });
    expect(next.points.map((p) => p.value)).toEqual([2001, 2002, 2003]);
    expect(next.snapshot?.value).toBe(2003);
  });

  it('replaces the last point instead of going back in time', () => {
    const next = applyIndexUpdate(state(2001, 2002), { snapshot: snapshot(2005), point: { time: T + 5, value: 2005 } });
    expect(next.points).toEqual([{ time: T, value: 2001 }, { time: T + 10, value: 2005 }]);
  });

  it('starts a new series on a new trading day and keeps points for snapshot-only updates', () => {
    const tomorrow = T + 86_400;
    expect(applyIndexUpdate(state(2001), { snapshot: snapshot(2010), point: { time: tomorrow, value: 2010 } }).points).toEqual([{ time: tomorrow, value: 2010 }]);
    expect(applyIndexUpdate(state(2001, 2002), { snapshot: snapshot(2002), point: null }).points).toHaveLength(2);
  });

  it('uses the Kathmandu calendar date', () => {
    // 18:30 UTC is 00:15 the next day in Kathmandu.
    expect(nptDate(Date.parse('2024-06-12T18:30:00Z') / 1000)).toBe('2024-06-13');
  });
});
