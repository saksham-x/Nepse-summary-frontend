import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiData, apiGet, apiSend } from '@/lib/api-client';
import type { AuditEntry } from '@/types/portfolio';

export interface PlatformStats {
  users: number;
  suspendedUsers: number;
  newUsers30d: number;
  portfolios: number;
  portfoliosByType: Partial<Record<'GROUP' | 'SOLO' | 'MANAGED', number>>;
  activeMemberships: number;
  aum: number;
  pendingDeposits: number;
  openReports: number;
  lastSync: { status: string; startedAt: string; finishedAt: string | null } | null;
}

export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  platformRole: 'USER' | 'PLATFORM_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  portfolios: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PlatformPortfolio {
  id: number;
  name: string;
  type: string;
  status: 'ACTIVE' | 'SUSPENDED';
  members: number;
  admins: { name: string; email: string }[];
  value: number;
  valueAsOf: string | null;
  createdAt: string;
}

export interface SyncRun {
  id: number;
  type: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  requested: number;
  processed: number;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  errorMessage: string | null;
}

export interface PriceData {
  symbol: string;
  name: string | null;
  quote: { lastTradedPrice: number; previousClose: number | null; businessDate: string; fetchedAt: string } | null;
  candles: { date: string; open: number; high: number; low: number; close: number; volume: number; provisional: boolean; source: string }[];
}

export interface AbuseReport {
  id: number;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolutionNote: string | null;
  reporter: { id: number; name: string; email: string } | null;
  reportedUser: { id: number; name: string; email: string } | null;
  portfolio: { id: number; name: string } | null;
  createdAt: string;
  resolvedAt: string | null;
}

const key = (...p: (string | number)[]) => ['platform', ...p] as const;

export const useStats = () => useQuery({ queryKey: key('stats'), queryFn: ({ signal }) => apiData<PlatformStats>('/platform/stats', { signal }) });
export const useUsers = (search: string) => useQuery({ queryKey: key('users', search), queryFn: ({ signal }) => apiData<PlatformUser[]>('/platform/users', { params: { search }, signal }) });
export const usePortfolios = (search: string) =>
  useQuery({ queryKey: key('portfolios', search), queryFn: ({ signal }) => apiData<PlatformPortfolio[]>('/platform/portfolios', { params: { search }, signal }) });
export const useSyncRuns = () =>
  useQuery({ queryKey: key('sync'), queryFn: ({ signal }) => apiData<{ running: boolean; runs: SyncRun[] }>('/platform/sync', { signal }), refetchInterval: (q) => (q.state.data?.running ? 5000 : false) });
export const usePrices = (symbol: string) =>
  useQuery({ queryKey: key('prices', symbol), queryFn: ({ signal }) => apiData<PriceData>(`/platform/prices/${encodeURIComponent(symbol)}`, { signal }), enabled: symbol.length > 0 });
export const useReports = (status: string) =>
  useQuery({ queryKey: key('reports', status), queryFn: ({ signal }) => apiData<AbuseReport[]>('/platform/reports', { params: { status: status || undefined }, signal }) });
export const useAudit = (action: string) =>
  useQuery({ queryKey: key('audit', action), queryFn: ({ signal }) => apiGet<{ data: AuditEntry[] }>('/platform/audit', { params: { action: action || undefined, limit: 100 }, signal }) });

/** One mutation hook for every platform write; refreshes all platform queries afterwards. */
export function usePlatformAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ method, path, body }: { method: 'POST' | 'PATCH' | 'DELETE'; path: string; body?: unknown }) => apiSend(method, `/platform${path}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
  });
}
