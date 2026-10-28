import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/Spinner';
import { Code, EmptyState, ErrorState } from '@/components/ui/States';
import { instrumentPath } from '@/app/routes';
import { useInstrumentSearch } from '../api';

/** Browsable instrument list for the home page, filtered by the search box. */
export function InstrumentTable({ filter }: { filter: string }) {
  const { data, isLoading, error, refetch } = useInstrumentSearch(filter, 50);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-8" />)}
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data || data.length === 0) {
    return filter ? (
      <EmptyState title="No matching instruments" />
    ) : (
      <EmptyState title="No instruments yet">
        Seed the instrument list in nepse-api with <Code>npm run db:seed</Code>, then run <Code>npm run sync</Code>.
      </EmptyState>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th scope="col" className="px-4 py-2 font-medium">Symbol</th>
            <th scope="col" className="px-4 py-2 font-medium">Name</th>
            <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Sector</th>
            <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Type</th>
          </tr>
        </thead>
        <tbody>
          {data.map((i) => (
            <tr key={i.symbol} className="border-b border-line last:border-0 hover:bg-surface-2">
              <td className="px-4 py-2">
                <Link to={instrumentPath(i.symbol)} className="font-mono font-semibold text-accent hover:underline">
                  {i.symbol}
                </Link>
              </td>
              <td className="max-w-xs truncate px-4 py-2 text-ink-1">{i.name ?? <span className="text-ink-3">Not synced yet</span>}</td>
              <td className="hidden px-4 py-2 text-ink-2 md:table-cell">{i.sector ?? '—'}</td>
              <td className="hidden px-4 py-2 text-ink-2 lg:table-cell">{i.instrumentType ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
