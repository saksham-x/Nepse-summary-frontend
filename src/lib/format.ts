const priceFmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 });

/** Prices in NPR with 2 decimals, Indian digit grouping (1,23,456.00). */
export function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : priceFmt.format(value);
}

export function formatInteger(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : intFmt.format(value);
}

export function formatCompact(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : compactFmt.format(value);
}

/** '+2.50' / '−1.20' with a real minus sign; direction is also shown by an icon elsewhere. */
export function formatSigned(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${formatSigned(value)}%`;
}

export type Direction = 'up' | 'down' | 'flat';

export function direction(value: number | null | undefined): Direction {
  if (!value) return 'flat';
  return value > 0 ? 'up' : 'down';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats a 'YYYY-MM-DD' trading date without timezone conversion: '12 Jun 2024'. */
export function formatTradeDate(date: string | null | undefined): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** Formats an ISO instant in Nepal time: '12 Jun 2024, 15:00 NPT'. */
export function formatInstantNpt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const s = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${s} NPT`;
}

/** '45s ago', '12 min ago', '3 h ago', '2 d ago'. */
export function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86_400)} d ago`;
}

export function ageSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, (now - new Date(iso).getTime()) / 1000);
}
