import { Card } from '@/components/ui/Card';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { Skeleton, Spinner } from '@/components/ui/Spinner';
import { Code, ErrorState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApiError } from '@/lib/api-client';
import { formatAge, formatCompact, formatInstantNpt, formatInteger, formatPrice, formatTradeDate } from '@/lib/format';
import type { QuoteMeta } from '@/types/api';
import { useQuote } from '../api';

function Freshness({ meta }: { meta: QuoteMeta }) {
  const f = meta.freshness;
  const refreshFailed = meta.refresh.attempted && meta.refresh.succeeded === false;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {refreshFailed ? (
        <StatusBadge status="serious" title={`On-demand refresh failed (${meta.refresh.errorCode}); showing stored data`}>
          Refresh failed · {formatAge(f.ageSeconds)}
        </StatusBadge>
      ) : f.isStale ? (
        <StatusBadge status="warning" title={`Older than ${f.maxAgeSeconds}s`}>Stale · {formatAge(f.ageSeconds)}</StatusBadge>
      ) : (
        <StatusBadge status="good">Updated {formatAge(f.ageSeconds)}</StatusBadge>
      )}
      <StatusBadge status="neutral" title="Market status when this quote was fetched">
        Market {f.marketOpenAtFetch ? 'open' : 'closed'}
      </StatusBadge>
    </div>
  );
}

/** Latest quote. Polls while the tab is visible; shows how old the data is. */
export function QuoteCard({ symbol }: { symbol: string }) {
  const { data, isLoading, error, isFetching, refetch } = useQuote(symbol);

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-64" />
      </Card>
    );
  }

  if (error && !data) {
    const noQuote = error instanceof ApiError && error.code === 'QUOTE_NOT_AVAILABLE';
    return (
      <Card>
        {noQuote ? (
          <div className="p-4 text-sm text-ink-2">
            <p className="font-semibold text-ink-1">No quote stored yet</p>
            <p className="mt-1">Run <Code>npm run sync '--' --symbols {symbol}</Code> in nepse-api.</p>
          </div>
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} compact />
        )}
      </Card>
    );
  }
  if (!data) return null;

  const q = data.data;
  const stats: [string, string][] = [
    ['Previous close', formatPrice(q.previousClose)],
    ['Volume', formatInteger(q.totalTradedQuantity)],
    ['Trades', formatInteger(q.totalTrades)],
    ['52-week high', formatPrice(q.fiftyTwoWeekHigh)],
    ['52-week low', formatPrice(q.fiftyTwoWeekLow)],
    ['Business date', formatTradeDate(q.businessDate)],
  ];

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-3">Last traded price (NPR)</p>
          <p className="tabular mt-0.5 text-3xl font-semibold text-ink-1">{formatPrice(q.lastTradedPrice)}</p>
          <ChangeIndicator change={q.change} percent={q.changePercent} className="mt-1 text-sm" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Freshness meta={data.meta} />
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            {isFetching && <Spinner className="size-3" label="Refreshing quote" />}
            Source time {formatInstantNpt(q.sourceUpdatedAt)}
          </span>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="tabular text-ink-1" title={label === 'Volume' ? formatCompact(q.totalTradedQuantity) : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
      {error && <p className="mt-2 text-xs text-ink-3">Latest refresh failed; showing the last successful response.</p>}
    </Card>
  );
}
