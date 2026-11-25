import { Link } from 'react-router';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/States';
import { useMe } from '@/features/auth/api';
import { useT } from '@/features/i18n/i18n';
import type { MessageKey } from '@/features/i18n/messages';
import { useHome, useMarkRead, useRespondInvitation } from '@/features/member/api';
import { PnL } from '@/features/member/ui';
import { cn } from '@/lib/cn';
import { formatDateNpt, formatMonth, formatPercent, formatRs, formatTradeDate } from '@/lib/format';
import type { Notification } from '@/types/portfolio';

const NOTIFICATION_STATUS: Record<Notification['type'], 'good' | 'warning' | 'critical' | 'neutral'> = {
  PAYMENT_DUE: 'warning',
  DEPOSIT_APPROVED: 'good',
  DEPOSIT_REJECTED: 'critical',
  NEW_TRADE: 'neutral',
  EXIT_UPDATE: 'neutral',
  INVITATION: 'neutral',
  GENERAL: 'neutral',
};

export function MemberHomePage() {
  const { t } = useT();
  const me = useMe().data!;
  const home = useHome();
  const markRead = useMarkRead();
  const respond = useRespondInvitation();

  if (home.isPending) return <Skeleton className="h-96" />;
  if (home.error) return <ErrorState error={home.error} onRetry={() => void home.refetch()} />;
  const h = home.data;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">{t('home.title', { name: me.name.split(' ')[0] ?? me.name })}</h1>
          <p className="mt-1 text-sm text-ink-2">{t('home.netWorth')}</p>
          <p className="tabular mt-1 text-3xl font-semibold text-ink-1">{formatRs(h.netWorth)}</p>
        </div>
      </section>

      {h.invitations.length > 0 && (
        <Card>
          <CardHeader title={t('home.invitations')} />
          <ul className="divide-y divide-line">
            {h.invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-1">{inv.portfolioName}</p>
                  <p className="text-xs text-ink-3">
                    {t(`type.${inv.portfolioType}` as MessageKey)} · {t('home.invitedAs', { role: t(`role.${inv.role}` as MessageKey) })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => respond.mutate({ id: inv.id, accept: false })} disabled={respond.isPending}>{t('home.decline')}</Button>
                  <Button onClick={() => respond.mutate({ id: inv.id, accept: true })} busy={respond.isPending}>{t('home.accept')}</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-1">{t('home.portfolios')}</h2>
        {h.portfolios.length === 0 ? (
          <Card className="px-4 py-8 text-center text-sm text-ink-2">{t('home.noPortfolios', { email: me.email })}</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {h.portfolios.map((p) => (
              <Link key={p.portfolioId} to={`/app/portfolios/${p.portfolioId}`} className="group rounded-xl border border-line bg-surface-1 p-4 transition-colors hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-1 group-hover:text-accent">{p.name}</p>
                    <p className="text-xs text-ink-3">
                      {t(`type.${p.type}` as MessageKey)} · {t(`role.${p.role}` as MessageKey)}
                    </p>
                  </div>
                  {p.status === 'SUSPENDED' && <StatusBadge status="critical">Suspended</StatusBadge>}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-ink-3">{t('home.yourValue')}</dt>
                    <dd className="tabular font-semibold text-ink-1">{formatRs(p.mine.currentValue)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">{t('home.yourShare')}</dt>
                    <dd className="tabular font-semibold text-ink-1">{p.mine.ownershipPercent.toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">{t('home.groupValue')}</dt>
                    <dd className="tabular text-ink-1">{formatRs(p.group.currentValue)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">{t('dash.returns')}</dt>
                    <dd className="text-ink-1"><PnL value={p.mine.returns} /></dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] text-ink-3">
                  {t('dash.nav')} {p.group.navPerUnit.toFixed(4)} · {t('dash.profit')} {formatPercent(p.group.profitPercent)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader
          title={t('home.alerts')}
          actions={h.unreadCount > 0 ? <Button variant="ghost" onClick={() => markRead.mutate(undefined)} busy={markRead.isPending}>{t('home.markAllRead')}</Button> : undefined}
        />
        {h.paymentsDue.length === 0 && h.notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-2">{t('home.noAlerts')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {h.paymentsDue.map((d) => (
              <li key={`${d.portfolioId}-${d.period}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="space-y-1">
                  <StatusBadge status={d.late ? 'critical' : 'warning'}>
                    {t(d.late ? 'home.paymentLate' : 'home.paymentDue', { portfolio: d.portfolioName })}
                  </StatusBadge>
                  <p className="tabular text-sm text-ink-2">
                    {t('home.dueOn', { amount: d.amount.toLocaleString('en-IN'), month: formatMonth(d.period), date: formatTradeDate(d.dueDate) })}
                  </p>
                </div>
                <Link to={`/app/portfolios/${d.portfolioId}/deposit`} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">{t('home.payNow')}</Link>
              </li>
            ))}
            {h.notifications.map((n) => (
              <li key={n.id} className={cn('flex items-start justify-between gap-3 px-4 py-3', !n.read && 'bg-accent/5')}>
                <div className="min-w-0 space-y-1">
                  <StatusBadge status={NOTIFICATION_STATUS[n.type]}>{n.title}</StatusBadge>
                  {n.body && <p className="text-sm text-ink-2">{n.body}</p>}
                  <p className="text-[11px] text-ink-3">{formatDateNpt(n.createdAt)}</p>
                </div>
                {n.link?.startsWith('/') && (
                  <Link to={n.link} onClick={() => !n.read && markRead.mutate([n.id])} className="shrink-0 text-xs text-accent underline">{t('home.open')}</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
