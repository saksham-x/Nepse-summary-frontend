import type { ReactNode } from 'react';
import { StatusBadge, type Status } from '@/components/ui/StatusBadge';
import { useT } from '@/features/i18n/i18n';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/cn';
import { direction, formatPercent, formatRsSigned } from '@/lib/format';
import type { ContributionStatus, DepositStatus, ExitRequest } from '@/types/portfolio';

export function StatTile({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-lg border border-line bg-surface-1 px-3 py-2.5', className)}>
      <p className="text-xs text-ink-3">{label}</p>
      <p className="tabular mt-0.5 truncate text-lg font-semibold text-ink-1">{value}</p>
      {sub && <div className="mt-0.5 text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

/** Profit/loss: arrow shape + sign carry direction, so it never depends on colour alone. */
export function PnL({ value, percent, className }: { value: number; percent?: number; className?: string }) {
  const dir = direction(value);
  return (
    <span className={cn('tabular inline-flex items-center gap-1', className)}>
      <span aria-hidden className={cn('text-[0.75em]', dir === 'up' ? 'text-good' : dir === 'down' ? 'text-critical' : 'text-ink-3')}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■'}
      </span>
      <span>{formatRsSigned(value)}</span>
      {percent !== undefined && <span className="text-ink-2">({formatPercent(percent)})</span>}
    </span>
  );
}

const CONTRIB_STATUS: Record<ContributionStatus, Status> = { PAID: 'good', PENDING: 'neutral', DUE: 'warning', LATE: 'critical', NOT_REQUIRED: 'neutral' };
const DEPOSIT_STATUS: Record<DepositStatus, Status> = { PENDING: 'warning', APPROVED: 'good', REJECTED: 'critical' };
const EXIT_STATUS: Record<ExitRequest['status'], Status> = { REQUESTED: 'warning', APPROVED: 'warning', PAID: 'good', REJECTED: 'critical', CANCELLED: 'neutral' };

export function ContributionBadge({ status }: { status: ContributionStatus }) {
  const { t } = useT();
  return <StatusBadge status={CONTRIB_STATUS[status]}>{t(`contrib.status.${status}` as MessageKey)}</StatusBadge>;
}

export function DepositBadge({ status }: { status: DepositStatus }) {
  const { t } = useT();
  return <StatusBadge status={DEPOSIT_STATUS[status]}>{t(`deposit.status.${status}` as MessageKey)}</StatusBadge>;
}

export function ExitBadge({ status }: { status: ExitRequest['status'] }) {
  const { t } = useT();
  return <StatusBadge status={EXIT_STATUS[status]}>{t(`exit.status.${status}` as MessageKey)}</StatusBadge>;
}

/** Compact grid cell for the contribution calendar: icon + short label, with full text in the tooltip. */
const CELL: Record<ContributionStatus, { icon: string; cls: string }> = {
  PAID: { icon: '✓', cls: 'bg-good text-white' },
  PENDING: { icon: '…', cls: 'bg-surface-2 text-ink-1 border border-line' },
  DUE: { icon: '!', cls: 'bg-warning text-black' },
  LATE: { icon: '✕', cls: 'bg-critical text-white' },
  NOT_REQUIRED: { icon: '–', cls: 'bg-surface-2 text-ink-3' },
};

export function StatusCell({ status, title }: { status: ContributionStatus; title: string }) {
  const { t } = useT();
  const c = CELL[status];
  return (
    <span title={title} className={cn('inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded px-1 text-[11px] font-semibold', c.cls)}>
      <span aria-hidden>{c.icon}</span>
      <span className="sr-only">{t(`contrib.status.${status}` as MessageKey)}</span>
    </span>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-ink-3 [&_tbody_tr]:border-t [&_tbody_tr]:border-line">
        {children}
      </table>
    </div>
  );
}
