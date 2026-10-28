import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { Health } from '@/types/api';

/** /health answers 503 with a body when the database is down; that is data, not an error. */
export const getHealth = (signal?: AbortSignal) =>
  apiGet<{ data: Health }>('/health', { signal, acceptStatuses: [503] }).then((r) => r.data);

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 60_000,
    retry: false,
  });
}
