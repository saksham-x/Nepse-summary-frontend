import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, Field, FormError, Input, Notice, Select, Textarea } from '@/components/ui/Form';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useT } from '@/features/i18n/i18n';
import type { MessageKey } from '@/features/i18n/messages';
import {
  fileUrl,
  useActivity,
  useBreakdown,
  useDepositInfo,
  useExitActions,
  useExitInfo,
  useGroupTracker,
  useGrowth,
  useHolding,
  useHoldings,
  useMembers,
  useMyContributions,
  useMyDeposits,
  useReportAbuse,
  useStatementMonths,
  useSubmitDeposit,
} from '@/features/member/api';
import { BreakdownBars, GrowthChart } from '@/features/member/charts';
import { ContributionBadge, DepositBadge, ExitBadge, PnL, StatTile, StatusCell, Table } from '@/features/member/ui';
import { formatDateNpt, formatInstantNpt, formatMonth, formatPercent, formatPrice, formatRs, formatTradeDate, formatUnits } from '@/lib/format';
import type { Transaction } from '@/types/portfolio';
import { usePortfolioOutlet } from './PortfolioLayout';

function Loading<T>({ q, children }: { q: { isPending: boolean; error: unknown; data?: T; refetch: () => unknown }; children: (data: T) => React.ReactNode }) {
  if (q.isPending) return <Skeleton className="h-64" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <>{children(q.data as T)}</>;
}

// --- dashboard -------------------------------------------------------------------

export function OverviewTab() {
  const { t } = useT();
  const { id, summary } = usePortfolioOutlet();
  const growth = useGrowth(id);
  const breakdown = useBreakdown(id);
  const [mode, setMode] = useState<'group' | 'mine'>('group');
  const [by, setBy] = useState<'asset' | 'sector'>('asset');
  const g = summary.totals;
  const m = summary.mine;

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-1">{t('dash.groupTotals')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatTile label={t('dash.invested')} value={formatRs(g.invested)} />
          <StatTile label={t('dash.currentValue')} value={formatRs(g.currentValue)} />
          <StatTile label={t('dash.profit')} value={<PnL value={g.profit} />} sub={formatPercent(g.profitPercent)} />
          <StatTile label={t('dash.cash')} value={formatRs(g.cash)} />
          <StatTile label={t('dash.nav')} value={formatUnits(g.navPerUnit)} sub={`${formatUnits(g.totalUnits)} ${t('dash.units').toLowerCase()}`} />
        </div>
      </section>
      {m && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink-1">{t('dash.yourNumbers')}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <StatTile label={t('dash.contributed')} value={formatRs(m.contributed)} />
            <StatTile label={t('dash.units')} value={formatUnits(m.units)} />
            <StatTile label={t('dash.ownership')} value={`${m.ownershipPercent.toFixed(2)}%`} />
            <StatTile label={t('dash.shareValue')} value={formatRs(m.currentValue)} />
            <StatTile label={t('dash.returns')} value={<PnL value={m.returns} />} sub={formatPercent(m.returnsPercent)} />
          </div>
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title={t('dash.growth')}
            subtitle={t('dash.growthHint')}
            actions={
              m && (
                <SegmentedControl
                  label={t('dash.growth')}
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'group', label: t('dash.groupView') },
                    { value: 'mine', label: t('dash.myView') },
                  ]}
                />
              )
            }
          />
          <div className="p-4">
            <Loading q={growth}>
              {(points) => (points.length < 2 ? <p className="py-16 text-center text-sm text-ink-2">{t('dash.notEnoughHistory')}</p> : <GrowthChart points={points} mode={mode} />)}
            </Loading>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('dash.breakdown')}
            actions={
              <SegmentedControl
                label={t('dash.breakdown')}
                value={by}
                onChange={setBy}
                options={[
                  { value: 'asset', label: t('dash.byAsset') },
                  { value: 'sector', label: t('dash.bySector') },
                ]}
              />
            }
          />
          <div className="p-4">
            <Loading q={breakdown}>
              {(b) => {
                const list = by === 'asset' ? b.byAssetType.map((i) => ({ ...i, label: t(`asset.${i.key}` as MessageKey) })) : b.bySector.map((i) => ({ ...i, label: i.key }));
                return list.length === 0 ? <p className="py-10 text-center text-sm text-ink-2">{t('dash.noHoldings')}</p> : <BreakdownBars items={list} total={b.total} label={t('dash.breakdown')} />;
              }}
            </Loading>
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- deposit ---------------------------------------------------------------------

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className="text-ink-3">{label}</dt>
      <dd className="select-all text-right font-medium text-ink-1">{value}</dd>
    </div>
  );
}

export function DepositTab() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const info = useDepositInfo(id);
  const history = useMyDeposits(id);
  const submit = useSubmitDeposit(id);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    submit.mutate(new FormData(form), {
      onSuccess: () => {
        form.reset();
        setOpen(false);
        setDone(true);
      },
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Loading q={info}>
          {(d) => (
            <Card className="p-4">
              <p className="text-xs text-ink-3">{d.outstanding.length ? `${t('deposit.forMonth')}: ${formatMonth(d.period)}` : t('deposit.allPaid')}</p>
              <p className="tabular mt-1 text-3xl font-semibold text-ink-1">{formatRs(d.amount)}</p>
              {d.dueDate && <p className="mt-1 text-sm text-ink-2">{t('deposit.dueDate')}: {formatTradeDate(d.dueDate)}</p>}
              {d.lateFee > 0 && <p className="mt-1 text-xs text-ink-2">{t('deposit.lateFee', { fee: d.lateFee })}</p>}
              {d.status && <div className="mt-2"><ContributionBadge status={d.status} /></div>}
              {done && <div className="mt-3"><Notice>{t('deposit.submitted')}</Notice></div>}
              {d.canDeposit ? (
                !open && <Button className="mt-4 w-full" onClick={() => { setOpen(true); setDone(false); }}>{t('deposit.payThisMonth')}</Button>
              ) : (
                <p className="mt-3 text-sm text-ink-2">{t('deposit.cannotDeposit')}</p>
              )}

              {open && (
                <div className="mt-4 space-y-4 border-t border-line pt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-1">{t('deposit.payTo')}</h3>
                    {Object.values(d.paymentDetails).some(Boolean) ? (
                      <dl className="mt-1 divide-y divide-line">
                        <Detail label={t('deposit.bank')} value={d.paymentDetails.bankName} />
                        <Detail label={t('deposit.accountName')} value={d.paymentDetails.accountName} />
                        <Detail label={t('deposit.accountNumber')} value={d.paymentDetails.accountNumber} />
                        <Detail label={t('deposit.branch')} value={d.paymentDetails.branch} />
                        <Detail label={t('deposit.esewa')} value={[d.paymentDetails.esewaId, d.paymentDetails.esewaName].filter(Boolean).join(' · ') || null} />
                      </dl>
                    ) : (
                      <p className="mt-1 text-sm text-ink-2">{t('deposit.noPaymentDetails')}</p>
                    )}
                    {d.paymentDetails.instructions && <p className="mt-2 whitespace-pre-line text-xs text-ink-2">{d.paymentDetails.instructions}</p>}
                  </div>
                  <form onSubmit={onSubmit} className="space-y-3">
                    <h3 className="text-sm font-semibold text-ink-1">{t('deposit.uploadTitle')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t('deposit.amount')}>
                        <Input name="amount" type="number" min="1" step="0.01" defaultValue={d.amount} required />
                      </Field>
                      <Field label={t('deposit.forMonth')}>
                        <Input name="period" type="month" defaultValue={d.period} required />
                      </Field>
                    </div>
                    <Field label={t('deposit.method')}>
                      <Select name="method" defaultValue={d.paymentDetails.esewaId && !d.paymentDetails.accountNumber ? 'ESEWA' : 'BANK'}>
                        <option value="BANK">Bank transfer</option>
                        <option value="ESEWA">eSewa</option>
                        <option value="KHALTI">Khalti</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </Field>
                    <Field label={t('deposit.reference')}>
                      <Input name="reference" maxLength={120} />
                    </Field>
                    <Field label={t('deposit.screenshot')}>
                      <Input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" required className="file:mr-2 file:rounded file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-xs" />
                    </Field>
                    <Field label={t('deposit.note')}>
                      <Textarea name="note" maxLength={500} />
                    </Field>
                    <FormError error={submit.error} />
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                      <Button type="submit" className="flex-1" busy={submit.isPending}>{t('deposit.submit')}</Button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          )}
        </Loading>
        <Loading q={info}>
          {(d) =>
            d.outstanding.length > 1 ? (
              <Card>
                <CardHeader title={t('deposit.outstanding')} />
                <ul className="divide-y divide-line text-sm">
                  {d.outstanding.map((o) => (
                    <li key={o.period} className="flex items-center justify-between px-4 py-2">
                      <span>{formatMonth(o.period)}</span>
                      <span className="tabular flex items-center gap-2">
                        {formatRs(o.amount)}
                        <ContributionBadge status={o.late ? 'LATE' : 'DUE'} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null
          }
        </Loading>
      </div>

      <Card className="lg:col-span-3">
        <CardHeader title={t('deposit.history')} />
        <Loading q={history}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState title={t('deposit.noHistory')} />
            ) : (
              <ul className="divide-y divide-line">
                {rows.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div className="space-y-1">
                      <p className="tabular text-sm font-semibold text-ink-1">
                        {formatRs(d.amount)} <span className="font-normal text-ink-3">· {formatMonth(d.period)} · {d.method}</span>
                      </p>
                      <DepositBadge status={d.status} />
                      {d.status === 'REJECTED' && d.rejectionReason && <p className="text-sm text-ink-2">{t('deposit.reason', { reason: d.rejectionReason })}</p>}
                      {d.unitsIssued !== null && d.navAtApproval !== null && (
                        <p className="text-xs text-ink-2">{t('deposit.unitsAt', { units: formatUnits(d.unitsIssued), nav: formatUnits(d.navAtApproval) })}</p>
                      )}
                      <p className="text-[11px] text-ink-3">{formatInstantNpt(d.submittedAt)}{d.reference ? ` · ${d.reference}` : ''}</p>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {d.hasScreenshot && <a href={fileUrl(id, `/deposits/${d.id}/screenshot`)} target="_blank" rel="noreferrer" className="text-accent underline">{t('deposit.viewScreenshot')}</a>}
                      {d.status === 'APPROVED' && <a href={fileUrl(id, `/deposits/${d.id}/receipt`)} className="text-accent underline">{t('deposit.receipt')} (PDF)</a>}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </Loading>
      </Card>
    </div>
  );
}

// --- contributions ---------------------------------------------------------------

export function ContributionsTab() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const mine = useMyContributions(id);
  const group = useGroupTracker(id, mine.data?.canSeeGroup ?? false);
  return (
    <div className="space-y-4">
      <Card>
        <Loading q={mine}>
          {(c) => (
            <>
              <CardHeader title={t('contrib.mine')} subtitle={t('contrib.perMonth', { amount: c.contributionAmount.toLocaleString('en-IN'), day: c.dueDay })} />
              <ul className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
                {[...c.cells].reverse().map((cell) => (
                  <li key={cell.period} className="rounded-lg border border-line p-2.5">
                    <p className="text-xs font-medium text-ink-1">{formatMonth(cell.period)}</p>
                    <div className="mt-1.5"><ContributionBadge status={cell.status} /></div>
                    <p className="tabular mt-1.5 text-[11px] text-ink-3">
                      {cell.paid > 0 && `${formatRs(cell.paid)} · `}
                      {cell.outstanding > 0 ? `${formatRs(cell.outstanding)} due` : formatTradeDate(cell.dueDate)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Loading>
      </Card>
      {mine.data && (
        <Card>
          <CardHeader title={t('contrib.group')} />
          {!mine.data.canSeeGroup ? (
            <p className="px-4 py-6 text-center text-sm text-ink-2">{t('contrib.groupHidden')}</p>
          ) : (
            <Loading q={group}>
              {(tr) => (
                <Table>
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-surface-1">{t('contrib.member')}</th>
                      {tr.months.map((m) => <th key={m}>{formatMonth(m)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tr.rows.map((r) => (
                      <tr key={r.membershipId}>
                        <td className="sticky left-0 bg-surface-1 font-medium text-ink-1">{r.name}</td>
                        {r.cells.map((c) => (
                          <td key={c.period}>
                            <StatusCell status={c.status} title={`${r.name}, ${formatMonth(c.period)}: ${t(`contrib.status.${c.status}` as MessageKey)}`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Loading>
          )}
        </Card>
      )}
    </div>
  );
}

// --- holdings --------------------------------------------------------------------

export function HoldingsTab() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const q = useHoldings(id);
  return (
    <Card>
      <CardHeader title={t('hold.title')} />
      <Loading q={q}>
        {(d) => {
          const rows = d.holdings.filter((h) => h.quantity > 0 || !h.archived);
          return rows.length === 0 ? (
            <EmptyState title={t('hold.none')} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t('hold.asset')}</th>
                  <th className="text-right!">{t('hold.qty')}</th>
                  <th className="text-right!">{t('hold.buyPrice')}</th>
                  <th className="text-right!">{t('hold.price')}</th>
                  <th className="text-right!">{t('hold.value')}</th>
                  <th className="text-right!">{t('hold.pl')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <Link to={String(h.id)} className="font-medium text-ink-1 hover:text-accent hover:underline">{h.name}</Link>
                      <p className="text-[11px] text-ink-3">{[h.symbol, t(`asset.${h.assetType}` as MessageKey), h.sector].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="tabular text-right">{h.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</td>
                    <td className="tabular text-right">{formatPrice(h.avgCost)}</td>
                    <td className="tabular text-right">{formatPrice(h.currentPrice)}</td>
                    <td className="tabular text-right">{formatRs(h.marketValue)}</td>
                    <td className="text-right"><PnL value={h.unrealized} percent={h.unrealizedPercent} /></td>
                  </tr>
                ))}
                <tr>
                  <td className="text-ink-2">{t('hold.cash')}</td>
                  <td colSpan={3} />
                  <td className="tabular text-right">{formatRs(d.cash)}</td>
                  <td />
                </tr>
                <tr className="font-semibold">
                  <td>{t('hold.total')}</td>
                  <td colSpan={3} />
                  <td className="tabular text-right">{formatRs(d.totalValue)}</td>
                  <td />
                </tr>
              </tbody>
            </Table>
          );
        }}
      </Loading>
    </Card>
  );
}

function TxLine({ tx }: { tx: Transaction }) {
  const { t } = useT();
  const reversed = tx.status === 'REVERSED';
  const what = tx.quantity !== null
    ? `${tx.quantity.toLocaleString('en-IN')} ${tx.holdingSymbol ?? tx.holdingName ?? ''}${tx.price !== null ? ` @ ${formatPrice(tx.price)}` : ''}`
    : formatRs(tx.amount);
  return (
    <div className={reversed ? 'opacity-60' : undefined}>
      <p className="text-sm text-ink-1">
        <span className="font-semibold">{t(`tx.${tx.type}` as MessageKey)}</span>{' '}
        <span className={reversed ? 'line-through' : undefined}>{what}</span>
        {tx.quantity === null && tx.holdingName && <span className="text-ink-3"> · {tx.holdingName}</span>}
        {tx.fees > 0 && <span className="text-ink-3"> · fees {formatRs(tx.fees)}</span>}
        {reversed && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{t('act.reversed')}</span>}
      </p>
      <p className="mt-0.5 text-sm text-ink-2">“{tx.note}”</p>
      {reversed && tx.reverseNote && <p className="text-xs text-ink-3">{t('act.reversed')}: {tx.reverseNote}</p>}
    </div>
  );
}

export function HoldingDetailPage() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const holdingId = Number(useParams().holdingId);
  const q = useHolding(id, holdingId);
  return (
    <div className="space-y-4">
      <Link to=".." relative="path" className="text-sm text-accent underline">← {t('hold.back')}</Link>
      <Loading q={q}>
        {(h) => (
          <>
            <div>
              <h2 className="text-lg font-semibold text-ink-1">{h.name}</h2>
              <p className="text-xs text-ink-3">{[h.symbol, t(`asset.${h.assetType}` as MessageKey), h.sector].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label={t('hold.qty')} value={h.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })} />
              <StatTile label={t('hold.buyPrice')} value={formatPrice(h.avgCost)} />
              <StatTile label={t('hold.price')} value={formatPrice(h.currentPrice)} sub={t('hold.priceFrom', { source: h.priceSource === 'NEPSE' ? 'NEPSE' : 'manual', when: formatDateNpt(h.priceUpdatedAt) })} />
              <StatTile label={t('hold.value')} value={formatRs(h.marketValue)} sub={`${t('hold.weight')} ${h.weightPercent.toFixed(1)}%`} />
              <StatTile label={t('hold.pl')} value={<PnL value={h.unrealized} />} sub={formatPercent(h.unrealizedPercent)} />
              <StatTile label={t('hold.realized')} value={<PnL value={h.realized} />} />
              <StatTile label={t('hold.income')} value={formatRs(h.income)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title={t('hold.notes')} />
                <p className="whitespace-pre-line px-4 py-3 text-sm text-ink-1">{h.notes || <span className="text-ink-3">{t('hold.noNotes')}</span>}</p>
              </Card>
              <Card>
                <CardHeader title={t('hold.documents')} />
                {h.documents.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-ink-3">{t('hold.noDocuments')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {h.documents.map((d) => (
                      <li key={d.id} className="flex justify-between gap-3 px-4 py-2 text-sm">
                        <a href={fileUrl(id, `/holdings/${h.id}/documents/${d.id}`)} target="_blank" rel="noreferrer" className="truncate text-accent underline">{d.fileName}</a>
                        <span className="shrink-0 text-xs text-ink-3">{(d.size / 1024).toFixed(0)} KB · {formatDateNpt(d.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
            <Card>
              <CardHeader title={t('hold.history')} />
              <ul className="divide-y divide-line">
                {h.transactions.map((tx) => (
                  <li key={tx.id} className="flex gap-4 px-4 py-3">
                    <span className="w-24 shrink-0 text-xs text-ink-3">{formatTradeDate(tx.date)}</span>
                    <TxLine tx={tx} />
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </Loading>
    </div>
  );
}

// --- activity --------------------------------------------------------------------

export function ActivityTab() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const q = useActivity(id);
  if (q.isPending) return <Skeleton className="h-64" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const rows = q.data.pages.flatMap((p) => p.data);
  return (
    <Card>
      <CardHeader title={t('act.title')} subtitle={t('act.subtitle')} />
      {rows.length === 0 ? (
        <EmptyState title={t('act.none')} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((tx) => (
            <li key={tx.id} className="flex gap-4 px-4 py-3">
              <span className="w-24 shrink-0 text-xs text-ink-3">{formatTradeDate(tx.date)}</span>
              <TxLine tx={tx} />
            </li>
          ))}
        </ul>
      )}
      {q.hasNextPage && (
        <div className="border-t border-line p-3 text-center">
          <Button variant="secondary" onClick={() => void q.fetchNextPage()} busy={q.isFetchingNextPage}>{t('act.loadMore')}</Button>
        </div>
      )}
    </Card>
  );
}

// --- statements ------------------------------------------------------------------

export function StatementsTab() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const q = useStatementMonths(id);
  return (
    <Card>
      <CardHeader title={t('stmt.title')} subtitle={t('stmt.subtitle')} />
      <Loading q={q}>
        {(months) => (
          <ul className="divide-y divide-line">
            {months.map((m) => (
              <li key={m} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-ink-1">{formatMonth(m)}</span>
                <a href={fileUrl(id, `/statements/${m}`)} className="text-accent underline">{t('stmt.download')}</a>
              </li>
            ))}
          </ul>
        )}
      </Loading>
    </Card>
  );
}

// --- exit ------------------------------------------------------------------------

export function ExitTab() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const q = useExitInfo(id);
  const { request, cancel } = useExitActions(id);
  const [reason, setReason] = useState('');

  return (
    <Loading q={q}>
      {(e) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-ink-1">{t('exit.estimate')}</h2>
            <p className="tabular mt-2 text-3xl font-semibold text-ink-1">{formatRs(e.estimate.payout)}</p>
            <p className="tabular mt-1 text-sm text-ink-2">
              {formatUnits(e.estimate.units)} {t('dash.units').toLowerCase()} × {formatUnits(e.estimate.navPerUnit)}
            </p>
            <p className="mt-2 text-xs text-ink-3">{t('exit.estimateNote')}</p>
            {e.canRequest && (
              <form
                className="mt-4 space-y-3 border-t border-line pt-4"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (window.confirm(t('exit.confirm', { amount: e.estimate.payout.toLocaleString('en-IN') }))) request.mutate(reason);
                }}
              >
                <Field label={t('exit.reason')}>
                  <Textarea value={reason} onChange={(ev) => setReason(ev.target.value)} maxLength={500} />
                </Field>
                <FormError error={request.error} />
                <Button type="submit" variant="danger" busy={request.isPending}>{t('exit.request')}</Button>
              </form>
            )}
          </Card>
          <Card>
            <CardHeader title={t('exit.requests')} />
            {e.requests.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-3">—</p>
            ) : (
              <ul className="divide-y divide-line">
                {e.requests.map((r) => (
                  <li key={r.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <ExitBadge status={r.status} />
                      <span className="text-xs text-ink-3">{formatDateNpt(r.requestedAt)}</span>
                    </div>
                    {r.payoutAmount !== null && r.navAtApproval !== null && (
                      <p className="tabular text-sm text-ink-1">{t('exit.payout', { amount: r.payoutAmount.toLocaleString('en-IN'), nav: formatUnits(r.navAtApproval) })}</p>
                    )}
                    {r.reason && <p className="text-sm text-ink-2">{r.reason}</p>}
                    {r.rejectionReason && <p className="text-sm text-ink-2">{t('deposit.reason', { reason: r.rejectionReason })}</p>}
                    {r.paidReference && <p className="text-xs text-ink-3">Ref: {r.paidReference}</p>}
                    {r.status === 'REQUESTED' && (
                      <Button variant="secondary" onClick={() => cancel.mutate(r.id)} busy={cancel.isPending}>{t('exit.cancel')}</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </Loading>
  );
}

// --- members ---------------------------------------------------------------------

export function MembersTab() {
  const { t } = useT();
  const { id } = usePortfolioOutlet();
  const q = useMembers(id);
  const report = useReportAbuse();
  const [reporting, setReporting] = useState(false);
  const [form, setForm] = useState({ reason: '', details: '' });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t('members.title')} subtitle={q.data && !q.data.showShares ? t('members.sharesHidden') : undefined} />
        <Loading q={q}>
          {(d) => (
            <Table>
              <thead>
                <tr>
                  <th>{t('contrib.member')}</th>
                  <th>{t('common.type')}</th>
                  {d.showShares && <th className="text-right!">{t('dash.units')}</th>}
                  {d.showShares && <th className="text-right!">{t('dash.ownership')}</th>}
                  {d.showShares && <th className="text-right!">{t('hold.value')}</th>}
                </tr>
              </thead>
              <tbody>
                {d.members.map((m) => (
                  <tr key={m.membershipId}>
                    <td>
                      <span className="font-medium text-ink-1">{m.name}</span>
                      {m.isMe && <span className="ml-1.5 text-xs text-ink-3">({t('members.you')})</span>}
                      <p className="text-[11px] text-ink-3">{t('members.joined', { date: formatDateNpt(m.joinedAt) })}</p>
                    </td>
                    <td>{t(`role.${m.role}` as MessageKey)}</td>
                    {d.showShares && <td className="tabular text-right">{formatUnits(m.units)}</td>}
                    {d.showShares && <td className="tabular text-right">{m.ownershipPercent?.toFixed(2)}%</td>}
                    {d.showShares && <td className="tabular text-right">{formatRs(m.value)}</td>}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Loading>
      </Card>
      <div>
        {report.isSuccess ? (
          <Notice>{t('members.reportSent')}</Notice>
        ) : !reporting ? (
          <Button variant="ghost" onClick={() => setReporting(true)}>{t('members.report')}</Button>
        ) : (
          <Card className="max-w-lg p-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                report.mutate({ reason: form.reason, details: form.details || undefined, portfolioId: id });
              }}
            >
              <Field label={t('members.reportReason')}>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required minLength={3} maxLength={120} />
              </Field>
              <Field label={t('members.reportDetails')}>
                <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} maxLength={5000} />
              </Field>
              <FormError error={report.error} />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setReporting(false)}>{t('common.cancel')}</Button>
                <Button type="submit" busy={report.isPending}>{t('common.send')}</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
