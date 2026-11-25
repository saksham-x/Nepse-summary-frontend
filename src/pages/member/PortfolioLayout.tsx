import { NavLink, Outlet, useOutletContext, useParams } from 'react-router';
import { Skeleton } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/States';
import { config } from '@/config/env';
import { useT } from '@/features/i18n/i18n';
import type { MessageKey } from '@/features/i18n/messages';
import { usePortfolio } from '@/features/member/api';
import { cn } from '@/lib/cn';
import type { PortfolioSummary } from '@/types/portfolio';

export interface PortfolioOutlet {
  id: number;
  summary: PortfolioSummary;
}

export const usePortfolioOutlet = () => useOutletContext<PortfolioOutlet>();

const TABS: { to: string; key: MessageKey; memberOnly?: boolean }[] = [
  { to: '', key: 'tab.overview' },
  { to: 'deposit', key: 'tab.deposit', memberOnly: true },
  { to: 'contributions', key: 'tab.contributions', memberOnly: true },
  { to: 'holdings', key: 'tab.holdings' },
  { to: 'activity', key: 'tab.activity' },
  { to: 'statements', key: 'tab.statements', memberOnly: true },
  { to: 'exit', key: 'tab.exit', memberOnly: true },
  { to: 'members', key: 'tab.members' },
];

export function PortfolioLayout() {
  const { t } = useT();
  const id = Number(useParams().portfolioId);
  const summary = usePortfolio(id);

  if (summary.isPending) return <Skeleton className="h-96" />;
  if (summary.error) return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  const s = summary.data;
  const isMember = s.membershipId !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-ink-1">{s.portfolio.name}</h1>
          <p className="text-xs text-ink-3">
            {t(`type.${s.portfolio.type}` as MessageKey)} · {t(`role.${s.role}` as MessageKey)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s.readOnly && <StatusBadge status="warning">{t('dash.readOnly')}</StatusBadge>}
          {s.role !== 'MEMBER' && !s.readOnly && (
            <a href={`${config.adminAppUrl}/portfolios/${id}`} className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink-1 hover:bg-surface-2">
              {t('nav.adminPortal')} ↗
            </a>
          )}
        </div>
      </div>
      {s.portfolio.status === 'SUSPENDED' && <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-ink-1">{t('dash.suspended')}</p>}
      <nav aria-label="Portfolio sections" className="-mx-4 overflow-x-auto border-b border-line px-4">
        <ul className="flex min-w-max gap-1">
          {TABS.filter((tab) => isMember || !tab.memberOnly).map((tab) => (
            <li key={tab.to}>
              <NavLink
                end={tab.to === ''}
                to={tab.to}
                className={({ isActive }) =>
                  cn('-mb-px inline-block border-b-2 px-3 py-2 text-sm font-medium', isActive ? 'border-accent text-ink-1' : 'border-transparent text-ink-2 hover:text-ink-1')
                }
              >
                {t(tab.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet context={{ id, summary: s } satisfies PortfolioOutlet} />
    </div>
  );
}
