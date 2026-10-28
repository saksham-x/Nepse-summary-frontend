import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/** Retry only failures that might succeed on retry; a 4xx answer will not change. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
    },
  });
}
