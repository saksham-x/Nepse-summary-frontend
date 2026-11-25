import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiData, apiGet, apiSend, buildUrl } from '@/lib/api-client';
import type {
  Breakdown,
  DepositInfo,
  Deposit,
  ExitInfo,
  GrowthPoint,
  Holding,
  HoldingDetail,
  MemberHome,
  MembersList,
  MyContributions,
  Notification,
  PortfolioSummary,
  Tracker,
  Transaction,
} from '@/types/portfolio';

/** Every member query key starts with 'member' so signing out clears them all. */
const key = (...parts: (string | number)[]) => ['member', ...parts] as const;
const base = (id: number) => `/portfolios/${id}`;

/** Same-origin URL for files (PDFs, screenshots): links and <img> send the session cookie. */
export const fileUrl = (portfolioId: number, path: string) => buildUrl(`${base(portfolioId)}${path}`);

export const useHome = () => useQuery({ queryKey: key('home'), queryFn: ({ signal }) => apiData<MemberHome>('/me/home', { signal }) });

export const useNotifications = () => useQuery({ queryKey: key('notifications'), queryFn: ({ signal }) => apiData<Notification[]>('/me/notifications', { signal }) });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) => apiSend('POST', '/me/notifications/read', ids ? { ids } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('home') }),
  });
}

export function useRespondInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) => apiSend('POST', `/me/invitations/${id}/${accept ? 'accept' : 'decline'}`),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const usePortfolio = (id: number) => useQuery({ queryKey: key('p', id), queryFn: ({ signal }) => apiData<PortfolioSummary>(base(id), { signal }) });
export const useGrowth = (id: number) => useQuery({ queryKey: key('p', id, 'growth'), queryFn: ({ signal }) => apiData<GrowthPoint[]>(`${base(id)}/growth`, { signal }) });
export const useBreakdown = (id: number) => useQuery({ queryKey: key('p', id, 'breakdown'), queryFn: ({ signal }) => apiData<Breakdown>(`${base(id)}/breakdown`, { signal }) });

export const useDepositInfo = (id: number) => useQuery({ queryKey: key('p', id, 'deposit-info'), queryFn: ({ signal }) => apiData<DepositInfo>(`${base(id)}/deposit-info`, { signal }) });
export const useMyDeposits = (id: number) => useQuery({ queryKey: key('p', id, 'deposits'), queryFn: ({ signal }) => apiData<Deposit[]>(`${base(id)}/deposits`, { signal }) });

export function useSubmitDeposit(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => apiSend<Deposit>('POST', `${base(id)}/deposits`, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: key('p', id) }),
  });
}

export const useMyContributions = (id: number) => useQuery({ queryKey: key('p', id, 'contrib'), queryFn: ({ signal }) => apiData<MyContributions>(`${base(id)}/contributions`, { signal }) });
export const useGroupTracker = (id: number, enabled: boolean) =>
  useQuery({ queryKey: key('p', id, 'contrib-group'), queryFn: ({ signal }) => apiData<Tracker>(`${base(id)}/contributions/group`, { signal }), enabled });

export const useHoldings = (id: number) =>
  useQuery({ queryKey: key('p', id, 'holdings'), queryFn: ({ signal }) => apiData<{ holdings: Holding[]; cash: number; totalValue: number; marketValue: number }>(`${base(id)}/holdings`, { signal }) });
export const useHolding = (id: number, holdingId: number) =>
  useQuery({ queryKey: key('p', id, 'holding', holdingId), queryFn: ({ signal }) => apiData<HoldingDetail>(`${base(id)}/holdings/${holdingId}`, { signal }) });

export function useActivity(id: number) {
  return useInfiniteQuery({
    queryKey: key('p', id, 'activity'),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      apiGet<{ data: Transaction[]; meta: { hasMore: boolean; nextBefore: number | null } }>(`${base(id)}/activity`, { params: { before: pageParam }, signal }),
    getNextPageParam: (last) => (last.meta.hasMore ? (last.meta.nextBefore ?? undefined) : undefined),
  });
}

export const useStatementMonths = (id: number) => useQuery({ queryKey: key('p', id, 'statements'), queryFn: ({ signal }) => apiData<string[]>(`${base(id)}/statements`, { signal }) });

export const useExitInfo = (id: number) => useQuery({ queryKey: key('p', id, 'exit'), queryFn: ({ signal }) => apiData<ExitInfo>(`${base(id)}/exit`, { signal }) });

export function useExitActions(id: number) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: key('p', id) });
  return {
    request: useMutation({ mutationFn: (reason: string) => apiSend('POST', `${base(id)}/exit`, { reason: reason || undefined }), onSuccess: done }),
    cancel: useMutation({ mutationFn: (exitId: number) => apiSend('POST', `${base(id)}/exit/${exitId}/cancel`), onSuccess: done }),
  };
}

export const useMembers = (id: number) => useQuery({ queryKey: key('p', id, 'members'), queryFn: ({ signal }) => apiData<MembersList>(`${base(id)}/members`, { signal }) });

export const useReportAbuse = () =>
  useMutation({ mutationFn: (body: { reason: string; details?: string; portfolioId?: number; reportedUserId?: number }) => apiSend('POST', '/me/reports', body) });
