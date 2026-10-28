import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { InstrumentTable } from '@/features/instruments/components/InstrumentTable';
import { SymbolSearch } from '@/features/instruments/components/SymbolSearch';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export function HomePage() {
  const [filter, setFilter] = useState('');
  const debounced = useDebouncedValue(filter, 250);

  return (
    <div className="space-y-6">
      <section className="mx-auto max-w-2xl py-6 text-center">
        <h1 className="text-2xl font-bold text-ink-1 sm:text-3xl">NEPSE charts and quotes</h1>
        <p className="mt-2 text-sm text-ink-2">
          Daily, weekly and monthly candles with SMA, EMA, RSI and MACD for every listed security.
        </p>
        <SymbolSearch autoFocus className="mt-5 text-left" />
      </section>

      <Card>
        <CardHeader
          title="Instruments"
          subtitle="Up to 50 shown. Names and sectors appear after the first sync."
          actions={
            <input
              type="search"
              aria-label="Filter instruments"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-48 rounded-md border border-line bg-surface-1 px-2.5 py-1 text-sm text-ink-1 placeholder:text-ink-3 focus:border-accent focus:outline-none"
            />
          }
        />
        <InstrumentTable filter={debounced.trim()} />
      </Card>
    </div>
  );
}
