import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesType,
  type Time,
} from 'lightweight-charts';
import { usePreferences } from '@/features/preferences/preferences-context';
import type { Candle, IndicatorType, MacdPoint, ValuePoint } from '@/types/api';
import { chartColors } from '../lib/chart-theme';
import type { IndicatorSeries } from '../hooks/use-indicator-series';
import { isMacdPoint } from '../lib/merge';
import { timeKey, toCloseLine, toMacdParts, toOhlc, toValue, toVolume, withAlpha } from '../lib/series-data';
import { ChartLegend } from './ChartLegend';

export type ChartType = 'candles' | 'line';

interface Props {
  candles: Candle[];
  indicators: IndicatorSeries[];
  titles: Record<IndicatorType, string>;
  chartType: ChartType;
  /** Changes whenever symbol/interval/range change, to reset the initial viewport. */
  viewKey: string;
  /** Show the newest N bars on first load instead of fitting everything. */
  initialBars?: number;
  hasMore: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
}

interface SeriesRefs {
  price: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>;
  markers: ISeriesMarkersPluginApi<Time>;
  volume: ISeriesApi<'Histogram'>;
  sma?: ISeriesApi<'Line'>;
  ema?: ISeriesApi<'Line'>;
  rsi?: ISeriesApi<'Line'>;
  macd?: { macd: ISeriesApi<'Line'>; signal: ISeriesApi<'Line'>; histogram: ISeriesApi<'Histogram'> };
}

const BASE_HEIGHT = 440;
const EXTRA_PANE_HEIGHT = 150;
/** Load the previous page when the user scrolls within this many bars of the oldest one. */
const LOAD_OLDER_THRESHOLD = 20;

/**
 * Interactive price chart: price pane (candles or close line, SMA/EMA overlays),
 * volume pane, and optional RSI and MACD panes. Volume and oscillators get their
 * own panes rather than a second y-axis on the price pane.
 */
export function PriceChart({ candles, indicators, titles, chartType, viewKey, initialBars = 150, hasMore, isLoadingOlder, onLoadOlder }: Props) {
  const { resolvedTheme, candleScheme } = usePreferences();
  const colors = useMemo(() => chartColors(resolvedTheme, candleScheme), [resolvedTheme, candleScheme]);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SeriesRefs | null>(null);
  const [seriesVersion, setSeriesVersion] = useState(0);
  const [hoverTime, setHoverTime] = useState<string | null>(null);

  const types = indicators.map((i) => i.type);
  const structureKey = `${chartType}|${types.join(',')}|${resolvedTheme}|${candleScheme}`;
  const extraPanes = (types.includes('rsi') ? 1 : 0) + (types.includes('macd') ? 1 : 0);
  const height = BASE_HEIGHT + extraPanes * EXTRA_PANE_HEIGHT;

  // Set when the viewport should jump to the newest bars on the next data push.
  const initialViewPending = useRef(true);

  // Latest paging state, read from chart event handlers without resubscribing.
  const pagingRef = useRef({ hasMore, isLoadingOlder, onLoadOlder });
  pagingRef.current = { hasMore, isLoadingOlder, onLoadOlder };

  // --- build the chart whenever its structure changes -------------------------
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
        panes: { separatorColor: colors.border, separatorHoverColor: colors.grid, enableResize: true },
      },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.crosshair },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.crosshair },
      },
      rightPriceScale: { borderColor: colors.border },
      // rightOffset leaves room for the "Provisional" marker label on the newest bar.
      timeScale: { borderColor: colors.border, rightOffset: 10, minBarSpacing: 0.5 },
      localization: { locale: 'en-GB', dateFormat: 'dd MMM yyyy' },
    });
    chartRef.current = chart;

    const priceFormat = { type: 'price' as const, precision: 2, minMove: 0.01 };
    const price =
      chartType === 'candles'
        ? chart.addSeries(CandlestickSeries, {
            // Rising candles are hollow, falling candles filled: direction never depends on color alone.
            upColor: 'rgba(0, 0, 0, 0)',
            downColor: colors.down,
            borderUpColor: colors.up,
            borderDownColor: colors.down,
            wickUpColor: colors.up,
            wickDownColor: colors.down,
            priceFormat,
          })
        : chart.addSeries(LineSeries, { color: colors.text, lineWidth: 2, priceFormat });

    const refs: SeriesRefs = {
      price,
      markers: createSeriesMarkers(price as ISeriesApi<SeriesType, Time>, []),
      volume: chart.addSeries(HistogramSeries, { color: colors.volume, priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false }, 1),
    };

    const overlay = { lineWidth: 2 as const, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
    if (types.includes('sma')) refs.sma = chart.addSeries(LineSeries, { ...overlay, color: colors.series1 }, 0);
    if (types.includes('ema')) refs.ema = chart.addSeries(LineSeries, { ...overlay, color: colors.series2 }, 0);

    let pane = 2;
    if (types.includes('rsi')) {
      const rsi = chart.addSeries(LineSeries, {
        color: colors.series1,
        lineWidth: 2,
        priceLineVisible: false,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
      }, pane++);
      // Keep the axis close to the fixed 0–100 range so labels don't collide with the guides.
      rsi.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.06 } });
      for (const level of [70, 30]) {
        rsi.createPriceLine({ price: level, color: colors.reference, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' });
      }
      refs.rsi = rsi;
    }
    if (types.includes('macd')) {
      const macdPane = pane++;
      refs.macd = {
        histogram: chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, macdPane),
        macd: chart.addSeries(LineSeries, { ...overlay, color: colors.series1 }, macdPane),
        signal: chart.addSeries(LineSeries, { ...overlay, color: colors.series2 }, macdPane),
      };
    }

    // Price pane gets most of the height.
    const panes = chart.panes();
    panes[0]?.setStretchFactor(3);
    panes[1]?.setStretchFactor(0.9);
    for (let i = 2; i < panes.length; i++) panes[i]?.setStretchFactor(1.1);

    seriesRef.current = refs;
    initialViewPending.current = true;
    setSeriesVersion((v) => v + 1);

    const onCrosshair = (param: { time?: Time }) => setHoverTime(param.time !== undefined ? timeKey(param.time) : null);
    const onRange = (range: { from: number; to: number } | null) => {
      const p = pagingRef.current;
      if (range && range.from < LOAD_OLDER_THRESHOLD && p.hasMore && !p.isLoadingOlder) p.onLoadOlder();
    };
    chart.subscribeCrosshairMove(onCrosshair);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshair);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // structureKey captures every input that requires rebuilding the chart.
  }, [structureKey]);

  // --- reset the initial viewport when symbol/interval/range change ------------
  useEffect(() => {
    initialViewPending.current = true;
  }, [viewKey]);

  // --- push data into the series --------------------------------------------
  useEffect(() => {
    const refs = seriesRef.current;
    const chart = chartRef.current;
    if (!refs || !chart) return;

    if (chartType === 'candles') (refs.price as ISeriesApi<'Candlestick'>).setData(candles.map(toOhlc));
    else (refs.price as ISeriesApi<'Line'>).setData(candles.map(toCloseLine));
    refs.volume.setData(candles.map(toVolume));

    const last = candles[candles.length - 1];
    refs.markers.setMarkers(
      last?.provisional
        ? [{ time: last.time as Time, position: 'aboveBar', shape: 'circle', color: colors.textMuted, text: 'Provisional' }]
        : [],
    );

    const byType = (t: IndicatorType) => indicators.find((i) => i.type === t)?.points ?? [];
    refs.sma?.setData((byType('sma') as ValuePoint[]).map(toValue));
    refs.ema?.setData((byType('ema') as ValuePoint[]).map(toValue));
    refs.rsi?.setData((byType('rsi') as ValuePoint[]).map(toValue));
    if (refs.macd) {
      const parts = toMacdParts(byType('macd').filter(isMacdPoint) as MacdPoint[], withAlpha(colors.up, 0.55), withAlpha(colors.down, 0.55));
      refs.macd.macd.setData(parts.macd);
      refs.macd.signal.setData(parts.signal);
      refs.macd.histogram.setData(parts.histogram);
    }

    if (initialViewPending.current && candles.length > 0) {
      initialViewPending.current = false;
      const n = candles.length;
      if (n > initialBars) chart.timeScale().setVisibleLogicalRange({ from: n - initialBars, to: n + 3 });
      else chart.timeScale().fitContent();
    }
  }, [candles, indicators, chartType, colors, seriesVersion, initialBars]);

  const summary = candles.length
    ? `Price chart with ${candles.length} candles from ${candles[0]!.time} to ${candles[candles.length - 1]!.time}. Use the data table below for exact values.`
    : 'Price chart with no data';

  return (
    <div className="relative">
      <ChartLegend candles={candles} indicators={indicators} titles={titles} hoverTime={hoverTime} colors={colors} chartType={chartType} />
      {isLoadingOlder && (
        <span className="absolute bottom-10 left-3 z-10 rounded-md border border-line bg-surface-1 px-2 py-1 text-xs text-ink-2 shadow-sm">
          Loading older candles…
        </span>
      )}
      <div ref={containerRef} role="img" aria-label={summary} style={{ height }} className="w-full" />
    </div>
  );
}
