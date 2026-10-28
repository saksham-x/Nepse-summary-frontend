/**
 * Response shapes of nepse-api /api/v1. Keep in sync with the backend README.
 * Candle `time` values are trading dates 'YYYY-MM-DD' (Asia/Kathmandu calendar);
 * other timestamps are ISO-8601 UTC strings.
 */

export const INTERVALS = ['1d', '1w', '1mo'] as const;
export type Interval = (typeof INTERVALS)[number];

export interface ApiSuccess<TData, TMeta = undefined> {
  data: TData;
  meta: TMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: { issues?: { path: string; message: string }[] } & Record<string, unknown>;
    requestId?: string;
  };
}

// --- health ------------------------------------------------------------------

export interface Health {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  uptimeSeconds: number;
  lastSuccessfulSyncAt?: string | null;
}

// --- instruments ---------------------------------------------------------------

export interface InstrumentSummary {
  symbol: string;
  name: string | null;
  sector: string | null;
  instrumentType: string | null;
}

export interface InstrumentDetails extends InstrumentSummary {
  isActive: boolean;
  lastSyncedAt: string | null;
  dailyCandles: { count: number; firstDate: string | null; lastDate: string | null };
  supportedIntervals: Interval[];
}

// --- market data ---------------------------------------------------------------

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  provisional: boolean;
}

export type DataStatus = 'OK' | 'NO_DATA_IN_RANGE' | 'NO_DATA';

export interface SeriesMeta {
  symbol: string;
  interval: Interval;
  source: string;
  adjusted: boolean;
  timezone: string;
  timeFormat: string;
  count: number;
  hasMore: boolean;
  nextBefore: string | null;
  dataStatus: DataStatus;
  latestCandleProvisional: boolean;
  instrumentLastSyncedAt: string | null;
  lastSuccessfulSyncAt: string | null;
}

export type CandlesResponse = ApiSuccess<Candle[], SeriesMeta & { format: 'ohlcv' }>;

export interface Quote {
  symbol: string;
  businessDate: string;
  lastTradedPrice: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  totalTradedQuantity: number | null;
  totalTrades: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
}

export interface QuoteMeta {
  source: string;
  freshness: {
    fetchedAt: string;
    ageSeconds: number;
    maxAgeSeconds: number;
    isStale: boolean;
    marketOpenAtFetch: boolean;
  };
  refresh: { attempted: boolean; succeeded?: boolean; errorCode?: string };
}

export type QuoteResponse = ApiSuccess<Quote, QuoteMeta>;

// --- indicators ----------------------------------------------------------------

export type IndicatorType = 'sma' | 'ema' | 'rsi' | 'macd';

export interface ValuePoint {
  time: string;
  value: number;
}

export interface MacdPoint {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface IndicatorMeta extends SeriesMeta {
  indicator: IndicatorType;
  params: Record<string, number>;
  warmupBars: number;
  historyBars?: number;
  insufficientHistory: boolean;
  precision?: number;
}

export type IndicatorResponse = ApiSuccess<(ValuePoint | MacdPoint)[], IndicatorMeta>;
