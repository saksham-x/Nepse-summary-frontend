import { useEffect, useMemo, useRef, useState } from 'react';
import { ColorType, CrosshairMode, LineSeries, createChart, type IChartApi, type Time } from 'lightweight-charts';
import { chartColors } from '@/features/chart/lib/chart-theme';
import { usePreferences } from '@/features/preferences/preferences-context';
import { useT } from '@/features/i18n/i18n';
import { formatRs, formatTradeDate } from '@/lib/format';
import type { GrowthPoint } from '@/types/portfolio';

interface Line {
  label: string;
  color: string;
  values: { date: string; value: number }[];
}

/**
 * Value over time against money put in, on one Rs axis. Uses the validated
 * blue/orange series pair; the legend above names both lines and shows the
 * values under the crosshair.
 */
export function GrowthChart({ points, mode }: { points: GrowthPoint[]; mode: 'group' | 'mine' }) {
  const { t } = useT();
  const { resolvedTheme, candleScheme } = usePreferences();
  const colors = useMemo(() => chartColors(resolvedTheme, candleScheme), [resolvedTheme, candleScheme]);
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  const lines: Line[] = useMemo(
    () =>
      mode === 'group'
        ? [
            { label: t('dash.value'), color: colors.series1, values: points.map((p) => ({ date: p.date, value: p.totalValue })) },
            { label: t('dash.investedLine'), color: colors.series2, values: points.map((p) => ({ date: p.date, value: p.invested })) },
          ]
        : [{ label: t('dash.myValue'), color: colors.series1, values: points.map((p) => ({ date: p.date, value: p.myValue ?? 0 })) }],
    [points, mode, colors, t],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart: IChartApi = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: colors.surface }, textColor: colors.text, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: colors.grid } },
      crosshair: { mode: CrosshairMode.Magnet, vertLine: { color: colors.crosshair, labelBackgroundColor: colors.crosshair }, horzLine: { color: colors.crosshair, labelBackgroundColor: colors.crosshair } },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
      localization: { locale: 'en-IN', priceFormatter: (v: number) => formatRs(v).replace('.00', '') },
      handleScroll: false,
      handleScale: false,
    });
    for (const l of lines) {
      const s = chart.addSeries(LineSeries, { color: l.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      s.setData(l.values.map((v) => ({ time: v.date as Time, value: v.value })));
    }
    chart.timeScale().fitContent();
    const onMove = (p: { time?: Time }) => setHover(typeof p.time === 'string' ? p.time : null);
    chart.subscribeCrosshairMove(onMove);
    return () => {
      chart.unsubscribeCrosshairMove(onMove);
      chart.remove();
    };
  }, [lines, colors]);

  const at = hover ?? points[points.length - 1]?.date;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" aria-live="polite">
        {at && <span className="text-ink-3">{formatTradeDate(at)}</span>}
        {lines.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: l.color }} />
            {l.label} <span className="tabular font-medium text-ink-1">{formatRs(l.values.find((v) => v.date === at)?.value)}</span>
          </span>
        ))}
      </div>
      <div ref={ref} role="img" aria-label={`${lines.map((l) => l.label).join(' and ')} over ${points.length} days`} className="h-56 w-full" />
    </div>
  );
}

/**
 * Horizontal bars, one hue: bar length is the only encoding, and each bar is
 * labelled directly with its name, value and share.
 */
export function BreakdownBars({ items, total, label }: { items: { key: string; label: string; value: number }[]; total: number; label: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul aria-label={label} className="space-y-2.5">
      {items.map((i) => {
        const pct = total > 0 ? (i.value / total) * 100 : 0;
        return (
          <li key={i.key} title={`${i.label}: ${formatRs(i.value)} (${pct.toFixed(1)}%)`}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-ink-1">{i.label}</span>
              <span className="tabular shrink-0 text-ink-2">
                {formatRs(i.value)} <span className="text-ink-3">· {pct.toFixed(1)}%</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded bg-surface-2">
              <div className="h-2 rounded bg-accent" style={{ width: `${Math.max((i.value / max) * 100, 1.5)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
