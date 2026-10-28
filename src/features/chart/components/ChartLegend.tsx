import { useMemo } from 'react';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { formatCompact, formatPrice, formatTradeDate } from '@/lib/format';
import type { Candle, IndicatorType, MacdPoint, ValuePoint } from '@/types/api';
import type { ChartColors } from '../lib/chart-theme';
import type { IndicatorSeries } from '../hooks/use-indicator-series';
import { closeChanges, isMacdPoint } from '../lib/merge';
import type { ChartType } from './PriceChart';

interface Props {
  candles: Candle[];
  indicators: IndicatorSeries[];
  titles: Record<IndicatorType, string>;
  hoverTime: string | null;
  colors: ChartColors;
  chartType: ChartType;
}

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return <span aria-hidden className="inline-block h-0.5 w-3.5 rounded-full" style={dashed ? { borderTop: `2px dashed ${color}` } : { background: color }} />;
}

/**
 * Values at the crosshair (or the latest candle when not hovering). Doubles as
 * the series legend: every line has a swatch, a name and its value.
 */
export function ChartLegend({ candles, indicators, titles, hoverTime, colors, chartType }: Props) {
  const index = useMemo(() => new Map(candles.map((c) => [c.time, c])), [candles]);
  const changes = useMemo(() => closeChanges(candles), [candles]);
  const indicatorMaps = useMemo(
    () => new Map(indicators.map((i) => [i.type, new Map<string, ValuePoint | MacdPoint>(i.points.map((p) => [p.time, p]))])),
    [indicators],
  );

  const candle = (hoverTime && index.get(hoverTime)) || candles[candles.length - 1];
  if (!candle) return null;
  const change = changes.get(candle.time);

  const indicatorColor: Record<IndicatorType, string> = { sma: colors.series1, ema: colors.series2, rsi: colors.series1, macd: colors.series1 };

  return (
    <div className="pointer-events-none absolute top-2 left-3 z-10 max-w-[calc(100%-5rem)] space-y-1 rounded-md bg-surface-1/85 px-2 py-1 text-xs backdrop-blur-sm">
      <div className="tabular flex flex-wrap items-center gap-x-3 gap-y-0.5 text-ink-2">
        <span className="font-medium text-ink-1">{formatTradeDate(candle.time)}</span>
        {chartType === 'candles' ? (
          <>
            <span>O <b className="font-medium text-ink-1">{formatPrice(candle.open)}</b></span>
            <span>H <b className="font-medium text-ink-1">{formatPrice(candle.high)}</b></span>
            <span>L <b className="font-medium text-ink-1">{formatPrice(candle.low)}</b></span>
            <span>C <b className="font-medium text-ink-1">{formatPrice(candle.close)}</b></span>
          </>
        ) : (
          <span className="flex items-center gap-1.5"><Swatch color={colors.text} /> Close <b className="font-medium text-ink-1">{formatPrice(candle.close)}</b></span>
        )}
        {change && <ChangeIndicator change={change.change} percent={change.percent} />}
        <span>Vol <b className="font-medium text-ink-1">{formatCompact(candle.volume)}</b></span>
        {candle.provisional && <span className="rounded border border-line px-1 text-[10px] uppercase tracking-wide text-ink-3">Provisional</span>}
      </div>
      {indicators.length > 0 && (
        <div className="tabular flex flex-wrap items-center gap-x-3 gap-y-0.5 text-ink-2">
          {indicators.map((ind) => {
            const p = indicatorMaps.get(ind.type)?.get(candle.time);
            if (ind.type === 'macd') {
              const m = p && isMacdPoint(p) ? p : undefined;
              return (
                <span key="macd" className="flex items-center gap-1.5">
                  {titles.macd}
                  <Swatch color={colors.series1} /> <b className="font-medium text-ink-1">{m ? m.macd.toFixed(2) : '—'}</b>
                  <Swatch color={colors.series2} /> <b className="font-medium text-ink-1">{m ? m.signal.toFixed(2) : '—'}</b>
                  <span>hist <b className="font-medium text-ink-1">{m ? m.histogram.toFixed(2) : '—'}</b></span>
                </span>
              );
            }
            const v = p && !isMacdPoint(p) ? p.value : undefined;
            return (
              <span key={ind.type} className="flex items-center gap-1.5">
                <Swatch color={indicatorColor[ind.type]} />
                {titles[ind.type]} <b className="font-medium text-ink-1">{v === undefined ? '—' : ind.type === 'rsi' ? v.toFixed(2) : formatPrice(v)}</b>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
