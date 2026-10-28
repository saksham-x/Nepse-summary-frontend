import { useMemo } from 'react';
import { ChangeIndicator } from '@/components/ui/ChangeIndicator';
import { formatInteger, formatPrice, formatTradeDate } from '@/lib/format';
import type { Candle } from '@/types/api';
import { closeChanges } from '../lib/merge';

/** Table view of the loaded candles, newest first: the accessible alternative to the chart. */
export function CandleTable({ candles, hasMore, isLoadingOlder, onLoadOlder }: { candles: Candle[]; hasMore: boolean; isLoadingOlder: boolean; onLoadOlder: () => void }) {
  const rows = useMemo(() => [...candles].reverse(), [candles]);
  const changes = useMemo(() => closeChanges(candles), [candles]);

  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="tabular w-full text-sm">
        <caption className="sr-only">Candles, newest first</caption>
        <thead className="sticky top-0 bg-surface-1">
          <tr className="border-b border-line text-right text-xs text-ink-3">
            <th scope="col" className="px-4 py-2 text-left font-medium">Date</th>
            <th scope="col" className="px-3 py-2 font-medium">Open</th>
            <th scope="col" className="px-3 py-2 font-medium">High</th>
            <th scope="col" className="px-3 py-2 font-medium">Low</th>
            <th scope="col" className="px-3 py-2 font-medium">Close</th>
            <th scope="col" className="px-3 py-2 font-medium">Change</th>
            <th scope="col" className="px-4 py-2 font-medium">Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const ch = changes.get(c.time);
            return (
              <tr key={c.time} className="border-b border-line text-right last:border-0 hover:bg-surface-2">
                <th scope="row" className="px-4 py-1.5 text-left font-normal text-ink-1">
                  {formatTradeDate(c.time)}
                  {c.provisional && <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-3">provisional</span>}
                </th>
                <td className="px-3 py-1.5 text-ink-1">{formatPrice(c.open)}</td>
                <td className="px-3 py-1.5 text-ink-1">{formatPrice(c.high)}</td>
                <td className="px-3 py-1.5 text-ink-1">{formatPrice(c.low)}</td>
                <td className="px-3 py-1.5 font-medium text-ink-1">{formatPrice(c.close)}</td>
                <td className="px-3 py-1.5 text-xs">{ch ? <ChangeIndicator change={ch.change} percent={ch.percent} /> : <span className="text-ink-3">—</span>}</td>
                <td className="px-4 py-1.5 text-ink-2">{formatInteger(c.volume)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasMore && (
        <div className="flex justify-center border-t border-line p-3">
          <button
            type="button"
            disabled={isLoadingOlder}
            onClick={onLoadOlder}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-1 hover:bg-surface-2 disabled:opacity-50"
          >
            {isLoadingOlder ? 'Loading…' : 'Load older candles'}
          </button>
        </div>
      )}
    </div>
  );
}
