import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Card } from '@/components/ui/Card';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { chartColors } from '@/features/chart/lib/chart-theme';
import { withAlpha } from '@/features/chart/lib/series-data';
import { usePreferences } from '@/features/preferences/preferences-context';
import { ageSince, formatAge, formatInstantNpt, formatPrice } from '@/lib/format';
import { NPT_OFFSET_SECONDS, toIndexCandles, type IndexCandle, type IndexPoint, type IndexSnapshot } from '../lib';
import { useNepseIndex, type ConnectionStatus } from '../use-nepse-index';

const CHART_HEIGHT = 300;

/** lightweight-charts shows times as UTC, so candles are shifted to read as Nepal time. */
const toChartCandle = (c: IndexCandle) => ({ ...c, time: (c.time + NPT_OFFSET_SECONDS) as UTCTimestamp });

function LiveBadge({ status, snapshot }: { status: ConnectionStatus; snapshot: IndexSnapshot | null }) {
  if (status === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
        <Spinner className="size-3" label="Connecting" /> Connecting…
      </span>
    );
  }
  if (status === 'reconnecting') return <StatusBadge status="warning" title="Connection lost; retrying">Reconnecting…</StatusBadge>;
  if (status === 'error') return <StatusBadge status="serious">Live feed unavailable</StatusBadge>;
  if (snapshot && !snapshot.marketOpen) return <StatusBadge status="neutral">Market closed</StatusBadge>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-good" />
      </span>
      Live
    </span>
  );
}

/** Seconds since `iso`, re-rendered every second so "updated Xs ago" keeps counting. */
function useAge(iso: string | undefined): number | null {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return iso ? ageSince(iso, now) : null;
}

function IndexChart({ points, previousClose }: { points: IndexPoint[]; previousClose: number | null }) {
  const { resolvedTheme, candleScheme } = usePreferences();
  const colors = useMemo(() => chartColors(resolvedTheme, candleScheme), [resolvedTheme, candleScheme]);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  /** What the series currently holds, to update the newest candle instead of resetting. */
  const renderedRef = useRef<{ first: number; count: number } | null>(null);
  const candles = useMemo(() => toIndexCandles(points), [points]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: colors.surface },
        textColor: colors.text,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.crosshair },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.crosshair },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false, rightOffset: 4 },
      localization: { locale: 'en-GB' },
      handleScroll: false,
      handleScale: false,
    });
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      borderUpColor: colors.up,
      borderDownColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });
    chartRef.current = chart;
    renderedRef.current = null;
    priceLineRef.current = null;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [colors]);

  // Dashed reference line at the previous close.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (priceLineRef.current) series.removePriceLine(priceLineRef.current);
    priceLineRef.current =
      previousClose !== null
        ? series.createPriceLine({ price: previousClose, color: colors.reference, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Prev close' })
        : null;
  }, [previousClose, colors]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const rendered = renderedRef.current;
    const last = candles[candles.length - 1];
    const sameSeries = rendered && last && candles[0]?.time === rendered.first;
    // Newest candle changed or one was appended: update in place so it ticks live.
    if (sameSeries && (candles.length === rendered.count + 1 || candles.length === rendered.count)) {
      series.update(toChartCandle(last));
    } else {
      series.setData(candles.map(toChartCandle));
      chart.timeScale().fitContent();
    }
    renderedRef.current = candles.length ? { first: candles[0]!.time, count: candles.length } : null;
  }, [candles, colors]);

  const summary = candles.length
    ? `NEPSE Index intraday chart with ${candles.length} five-minute candles, latest ${formatPrice(candles[candles.length - 1]!.close)}`
    : 'NEPSE Index chart with no data yet';
  return <div ref={containerRef} role="img" aria-label={summary} style={{ height: CHART_HEIGHT }} className="w-full" />;
}

/** Headline value that briefly flashes up/down colour whenever it changes. */
function FlashingValue({ value }: { value: number }) {
  const { resolvedTheme, candleScheme } = usePreferences();
  const colors = chartColors(resolvedTheme, candleScheme);
  const prev = useRef(value);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (value === prev.current) return;
    setFlash(withAlpha(value > prev.current ? colors.up : colors.down, 0.22));
    prev.current = value;
    const id = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(id);
  }, [value, colors.up, colors.down]);
  return (
    <span
      className="tabular -mx-1 rounded px-1 text-3xl font-semibold text-ink-1 transition-colors duration-700"
      style={{ backgroundColor: flash ?? 'transparent' }}
    >
      {formatPrice(value)}
    </span>
  );
}

/** Dashboard card: live NEPSE Index value and today's intraday chart, pushed over Socket.IO. */
export function NepseIndexCard() {
  const { snapshot, points, status, error } = useNepseIndex();
  const age = useAge(snapshot?.asOf);

  const stats: [string, string][] = snapshot
    ? [
        ['Previous close', formatPrice(snapshot.previousClose)],
        ['Day high', formatPrice(snapshot.high)],
        ['Day low', formatPrice(snapshot.low)],
        ['52-week high', formatPrice(snapshot.fiftyTwoWeekHigh)],
        ['52-week low', formatPrice(snapshot.fiftyTwoWeekLow)],
      ]
    : [];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div>
          <p className="text-xs text-ink-3">{snapshot?.name ?? 'NEPSE Index'}</p>
          {snapshot ? (
            <>
              <p className="mt-0.5">
                <FlashingValue value={snapshot.value} />
              </p>
              <ChangeIndicator change={snapshot.change} percent={snapshot.changePercent} className="mt-1 text-sm" />
            </>
          ) : (
            <>
              <Skeleton className="mt-1 h-9 w-40" />
              <Skeleton className="mt-2 h-4 w-28" />
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <LiveBadge status={status} snapshot={snapshot} />
          {snapshot && (
            <span className="text-[11px] text-ink-3" title={formatInstantNpt(snapshot.asOf)}>
              Updated {age !== null ? formatAge(age) : '—'}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 px-1">
        {points.length > 0 ? (
          <IndexChart points={points} previousClose={snapshot?.previousClose ?? null} />
        ) : (
          <div className="grid place-items-center text-sm text-ink-3" style={{ height: CHART_HEIGHT }}>
            {status === 'error' ? (error ?? 'The live feed is unavailable.') : 'Waiting for the first NEPSE update…'}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line px-4 py-3 text-sm sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-ink-3">{label}</dt>
              <dd className="tabular text-ink-1">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
