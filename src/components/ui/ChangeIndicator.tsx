import { usePreferences } from '@/features/preferences/preferences-context';
import { chartColors } from '@/features/chart/lib/chart-theme';
import { direction, formatPercent, formatSigned } from '@/lib/format';

/**
 * Price change: the arrow carries the up/down color, the numbers stay in text
 * ink, and the sign and arrow shape say the direction without relying on color.
 */
export function ChangeIndicator({ change, percent, className }: { change: number | null; percent: number | null; className?: string }) {
  const { resolvedTheme, candleScheme } = usePreferences();
  const colors = chartColors(resolvedTheme, candleScheme);
  const dir = direction(change);
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■';
  const color = dir === 'up' ? colors.up : dir === 'down' ? colors.down : colors.textMuted;
  const label = dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'unchanged';
  return (
    <span className={`tabular inline-flex items-center gap-1.5 text-ink-1 ${className ?? ''}`}>
      <span aria-hidden style={{ color }} className="text-[0.8em]">{arrow}</span>
      <span className="sr-only">{label}</span>
      <span>{formatSigned(change)}</span>
      <span className="text-ink-2">({formatPercent(percent)})</span>
    </span>
  );
}
