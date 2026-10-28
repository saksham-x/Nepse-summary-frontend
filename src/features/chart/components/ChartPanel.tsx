import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Spinner';
import { Code, EmptyState, ErrorState } from '@/components/ui/States';
import { useCandleHistory } from '@/features/market-data/api';
import { usePreferences } from '@/features/preferences/preferences-context';
import { presetFrom, RANGE_PRESETS, type RangePreset } from '@/lib/dates';
import { describeError } from '@/lib/error-messages';
import { formatInstantNpt } from '@/lib/format';
import { INTERVALS, type IndicatorType, type Interval } from '@/types/api';
import { useIndicatorSeries } from '../hooks/use-indicator-series';
import { enabledIndicators, indicatorTitle } from '../lib/indicators';
import { mergePages } from '../lib/merge';
import { CandleTable } from './CandleTable';
import { ChartToolbar } from './ChartToolbar';
import { IndicatorSettingsPanel } from './IndicatorSettingsPanel';
import { PriceChart, type ChartType } from './PriceChart';

const CHART_TYPES = ['candles', 'line'] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Chart + controls for one symbol. Interval, range and chart type live in the
 * URL (?interval=1w&range=1Y&type=line) so a view can be bookmarked or shared.
 */
export function ChartPanel({ symbol }: { symbol: string }) {
  const [params, setParams] = useSearchParams();
  const interval = pick<Interval>(params.get('interval'), INTERVALS, '1d');
  const range = pick<RangePreset>(params.get('range'), RANGE_PRESETS, 'ALL');
  const chartType = pick<ChartType>(params.get('type'), CHART_TYPES, 'candles');
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const setParam = (key: string, value: string, fallback: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const from = useMemo(() => presetFrom(range), [range]);
  const history = useCandleHistory({ symbol, interval, from });
  const pages = history.data?.pages;
  const candles = useMemo(() => mergePages(pages?.map((p) => p.data) ?? []), [pages]);
  const newestMeta = pages?.[0]?.meta;

  const { indicators: settings, setIndicators } = usePreferences();
  const types = enabledIndicators(settings);
  const series = useIndicatorSeries({
    symbol,
    interval,
    from,
    pageParams: (history.data?.pageParams ?? []) as (string | undefined)[],
    types,
    settings,
  });
  const titles = useMemo(
    () => Object.fromEntries((['sma', 'ema', 'rsi', 'macd'] as IndicatorType[]).map((t) => [t, indicatorTitle(t, settings)])) as Record<IndicatorType, string>,
    [settings],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = history;
  const loadOlder = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const body = (() => {
    if (history.isLoading) return <Skeleton className="m-4 h-[440px]" />;
    if (history.error && !pages) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
    if (newestMeta?.dataStatus === 'NO_DATA') {
      return (
        <EmptyState title={`No candles stored for ${symbol} yet`}>
          History builds up from daily syncs. Run <Code>npm run sync -- --symbols {symbol}</Code> in nepse-api, or import history with{' '}
          <Code>npm run backfill</Code>.
        </EmptyState>
      );
    }
    if (newestMeta?.dataStatus === 'NO_DATA_IN_RANGE') {
      return (
        <EmptyState title="No candles in the selected range">
          <button type="button" className="text-accent underline" onClick={() => setParam('range', 'ALL', 'ALL')}>
            Show all history
          </button>
        </EmptyState>
      );
    }
    if (view === 'table') {
      return <CandleTable candles={candles} hasMore={!!hasNextPage} isLoadingOlder={isFetchingNextPage} onLoadOlder={loadOlder} />;
    }
    return (
      <PriceChart
        candles={candles}
        indicators={series}
        titles={titles}
        chartType={chartType}
        viewKey={`${symbol}|${interval}|${range}`}
        initialBars={range === 'ALL' ? 150 : Number.MAX_SAFE_INTEGER}
        hasMore={!!hasNextPage}
        isLoadingOlder={isFetchingNextPage}
        onLoadOlder={loadOlder}
      />
    );
  })();

  const notices = series.flatMap((s) => {
    const out: string[] = [];
    if (s.error) out.push(`${titles[s.type]}: ${describeError(s.error).description}`);
    else if (s.insufficientHistory) out.push(`${titles[s.type]}: not enough history yet (needs more than ${s.warmupBars} ${interval} candles).`);
    return out;
  });

  return (
    <Card>
      <div className="space-y-3 border-b border-line px-4 py-3">
        <ChartToolbar
          interval={interval}
          onInterval={(v) => setParam('interval', v, '1d')}
          range={range}
          onRange={(v) => setParam('range', v, 'ALL')}
          chartType={chartType}
          onChartType={(v) => setParam('type', v, 'candles')}
          view={view}
          onView={setView}
        />
        <IndicatorSettingsPanel value={settings} onChange={setIndicators} />
      </div>

      {body}

      <div className="space-y-1 border-t border-line px-4 py-2 text-[11px] text-ink-3">
        {notices.map((n) => (
          <p key={n} className="text-ink-2"><span aria-hidden className="mr-1 font-bold text-warning">!</span>{n}</p>
        ))}
        {history.error && pages && <p className="text-ink-2">Loading more candles failed: {describeError(history.error).description}</p>}
        <p>
          {candles.length} candles loaded{hasNextPage ? ' · scroll left for older history' : ''} · Prices unadjusted for corporate actions ·
          {interval === '1d' ? ' Daily sessions' : interval === '1w' ? ' Weekly, aggregated from daily (Sun–Sat)' : ' Monthly, aggregated from daily'} ·
          Dates on the Nepal trading calendar · Source {newestMeta?.source ?? 'nepalstock.com.np'}
          {newestMeta?.lastSuccessfulSyncAt ? ` · Last sync ${formatInstantNpt(newestMeta.lastSuccessfulSyncAt)}` : ''}
        </p>
        <p>Indicators are descriptive statistics, not buy or sell recommendations.</p>
      </div>
    </Card>
  );
}
