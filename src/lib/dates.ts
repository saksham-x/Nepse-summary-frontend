/** Nepal uses a fixed UTC+05:45 offset with no daylight saving. */
const KATHMANDU_OFFSET_MS = (5 * 60 + 45) * 60_000;

/** Today's trading date in Kathmandu, 'YYYY-MM-DD'. */
export function kathmanduToday(now: Date = new Date()): string {
  return new Date(now.getTime() + KATHMANDU_OFFSET_MS).toISOString().slice(0, 10);
}

/** Calendar arithmetic on 'YYYY-MM-DD' strings, clamping to month ends (31 Mar − 1 month = 28/29 Feb). */
export function subtractMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 - months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export const RANGE_PRESETS = ['3M', '6M', '1Y', '3Y', 'ALL'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

const PRESET_MONTHS: Record<Exclude<RangePreset, 'ALL'>, number> = { '3M': 3, '6M': 6, '1Y': 12, '3Y': 36 };

/** The inclusive `from` date for a preset, or undefined for all history. */
export function presetFrom(preset: RangePreset, today: string = kathmanduToday()): string | undefined {
  return preset === 'ALL' ? undefined : subtractMonths(today, PRESET_MONTHS[preset]);
}
