import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet, symbolPath } from '@/lib/api-client';
import type { InstrumentDetails, InstrumentSummary } from '@/types/api';

export const searchInstruments = (search: string, limit: number, signal?: AbortSignal) =>
  apiGet<{ data: InstrumentSummary[] }>('/instruments', { params: { search, limit }, signal }).then((r) => r.data);

export const getInstrument = (symbol: string, signal?: AbortSignal) =>
  apiGet<{ data: InstrumentDetails }>(`/instruments/${symbolPath(symbol)}`, { signal }).then((r) => r.data);

export function useInstrumentSearch(search: string, limit = 20) {
  const term = search.trim();
  return useQuery({
    queryKey: ['instruments', 'search', term, limit],
    queryFn: ({ signal }) => searchInstruments(term, limit, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useInstrument(symbol: string) {
  return useQuery({
    queryKey: ['instruments', 'detail', symbol],
    queryFn: ({ signal }) => getInstrument(symbol, signal),
    staleTime: 60_000,
  });
}
