import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { ChartPanel } from '@/features/chart/components/ChartPanel';
import { useInstrument } from '@/features/instruments/api';
import { InstrumentHeader } from '@/features/instruments/components/InstrumentHeader';
import { QuoteCard } from '@/features/market-data/components/QuoteCard';
import { ApiError } from '@/lib/api-client';

/** Reads the symbol from /instrument/*, accepting both NICD83%2F84 and NICD83/84. */
function useSymbolParam(): string {
  const params = useParams();
  const raw = params['*'] ?? '';
  try {
    return decodeURIComponent(raw).toUpperCase();
  } catch {
    return raw.toUpperCase();
  }
}

export function InstrumentPage() {
  const symbol = useSymbolParam();
  const instrument = useInstrument(symbol);

  useEffect(() => {
    document.title = `${symbol} · NEPSE Summary`;
    return () => {
      document.title = 'NEPSE Summary';
    };
  }, [symbol]);

  if (instrument.error) {
    const unknown = instrument.error instanceof ApiError && instrument.error.code === 'INSTRUMENT_NOT_FOUND';
    return (
      <Card>
        <ErrorState error={instrument.error} onRetry={unknown ? undefined : () => void instrument.refetch()} />
        {unknown && (
          <p className="pb-8 text-center text-sm">
            <Link to="/" className="text-accent underline">Back to all instruments</Link>
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <InstrumentHeader instrument={instrument.data} />
      <QuoteCard symbol={symbol} />
      <ChartPanel symbol={symbol} />
    </div>
  );
}
