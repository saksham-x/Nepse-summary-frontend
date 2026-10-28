import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Spinner';
import { formatInstantNpt, formatInteger, formatTradeDate } from '@/lib/format';
import type { InstrumentDetails } from '@/types/api';

export function InstrumentHeader({ instrument }: { instrument: InstrumentDetails | undefined }) {
  if (!instrument) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
    );
  }
  const c = instrument.dailyCandles;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-mono text-2xl font-bold text-ink-1">{instrument.symbol}</h1>
        <p className="truncate text-base text-ink-2">{instrument.name ?? 'Name not synced yet'}</p>
      </div>
      <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        {instrument.sector && <Item label="Sector">{instrument.sector}</Item>}
        {instrument.instrumentType && <Item label="Type">{instrument.instrumentType}</Item>}
        <Item label="History">
          {c.count > 0 ? `${formatInteger(c.count)} sessions · ${formatTradeDate(c.firstDate)} – ${formatTradeDate(c.lastDate)}` : 'none stored'}
        </Item>
        <Item label="Last synced">{formatInstantNpt(instrument.lastSyncedAt)}</Item>
        {!instrument.isActive && <Item label="Status">Inactive</Item>}
      </dl>
    </div>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1">
      <dt>{label}:</dt>
      <dd className="text-ink-2">{children}</dd>
    </div>
  );
}
