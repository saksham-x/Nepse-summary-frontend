import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, Field, FormError, Input, Select } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { config } from '@/config/env';
import { ME_KEY, useAdminSignOut, useMe } from '@/features/auth/api';
import { AdminSignInDialog } from '@/features/auth/components';
import { StatTile, Table } from '@/features/member/ui';
import { useAudit, usePlatformAction, usePortfolios, usePrices, useReports, useStats, useSyncRuns, useUsers } from '@/features/platform/api';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { formatInstantNpt, formatPrice, formatRs } from '@/lib/format';

function useAdminSessionGuard(error: unknown) {
  const qc = useQueryClient();
  useEffect(() => {
    // The admin session timed out: refresh the user so the sign-in prompt shows.
    if (error instanceof ApiError && error.code === 'ADMIN_SESSION_REQUIRED') void qc.invalidateQueries({ queryKey: ME_KEY });
  }, [error, qc]);
}

function Q<T>({ q, children }: { q: { isPending: boolean; error: unknown; data?: T; refetch: () => unknown }; children: (d: T) => ReactNode }) {
  useAdminSessionGuard(q.error);
  if (q.isPending) return <Skeleton className="h-48" />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <>{children(q.data as T)}</>;
}

const TABS = [
  { to: '', label: 'Overview' },
  { to: 'users', label: 'Users' },
  { to: 'portfolios', label: 'Portfolios' },
  { to: 'prices', label: 'NEPSE prices' },
  { to: 'reports', label: 'Abuse reports' },
  { to: 'audit', label: 'Audit log' },
  { to: 'billing', label: 'Plans & billing' },
];

/** /platform-admin: platform admins only, after "Sign in as admin". */
export function PlatformLayout() {
  const me = useMe().data!;
  const signOut = useAdminSignOut();
  const [open, setOpen] = useState(false);

  if (!me.isPlatformAdmin) {
    return <Card><EmptyState title="Platform admins only">Your account doesn't have platform admin access.</EmptyState></Card>;
  }
  if (!me.adminSessionActive) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-ink-1">Platform admin</h1>
        <p className="mt-2 text-sm text-ink-2">Sign in as admin to continue. You'll be asked for your password again.</p>
        <Button className="mt-4" onClick={() => setOpen(true)}>Sign in as admin</Button>
        <AdminSignInDialog open={open} onClose={() => setOpen(false)} />
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-1">Platform admin</h1>
          <p className="text-xs text-ink-3">Admin session until {formatInstantNpt(me.adminUntil)}</p>
        </div>
        <Button variant="secondary" onClick={() => signOut.mutate()} busy={signOut.isPending}>Leave admin mode</Button>
      </div>
      <nav aria-label="Platform admin sections" className="-mx-4 overflow-x-auto border-b border-line px-4">
        <ul className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink end={t.to === ''} to={t.to} className={({ isActive }) => cn('-mb-px inline-block border-b-2 px-3 py-2 text-sm font-medium', isActive ? 'border-accent text-ink-1' : 'border-transparent text-ink-2 hover:text-ink-1')}>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}

export function PlatformOverview() {
  return (
    <Q q={useStats()}>
      {(s) => (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Users" value={s.users.toLocaleString('en-IN')} sub={`${s.newUsers30d} new in 30 days · ${s.suspendedUsers} suspended`} />
          <StatTile label="Portfolios" value={s.portfolios.toLocaleString('en-IN')} sub={Object.entries(s.portfoliosByType).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · ') || '—'} />
          <StatTile label="AUM tracked" value={formatRs(s.aum)} sub="Sum of each portfolio's latest value" />
          <StatTile label="Active memberships" value={s.activeMemberships.toLocaleString('en-IN')} />
          <StatTile label="Pending deposits" value={s.pendingDeposits} sub="Across all portfolios" />
          <StatTile label="Open abuse reports" value={s.openReports} />
          <StatTile label="Last NEPSE sync" value={s.lastSync?.status ?? 'Never'} sub={s.lastSync ? formatInstantNpt(s.lastSync.startedAt) : undefined} className="col-span-2" />
        </div>
      )}
    </Q>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <Input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-56" />;
}

export function PlatformUsers() {
  const me = useMe().data!;
  const [search, setSearch] = useState('');
  const q = useUsers(useDebouncedValue(search, 250).trim());
  const act = usePlatformAction();
  return (
    <Card>
      <CardHeader title="Users" actions={<SearchBox value={search} onChange={setSearch} placeholder="Search name or email" />} />
      <FormError error={act.error} />
      <Q q={q}>
        {(users) => (
          <Table>
            <thead>
              <tr><th>User</th><th>Role</th><th>Status</th><th>Portfolios</th><th>Last login</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><p className="font-medium text-ink-1">{u.name}</p><p className="text-xs text-ink-3">{u.email}</p></td>
                  <td>{u.platformRole === 'PLATFORM_ADMIN' ? 'Platform admin' : 'User'}</td>
                  <td><StatusBadge status={u.status === 'ACTIVE' ? 'good' : 'critical'}>{u.status.toLowerCase()}</StatusBadge></td>
                  <td className="tabular">{u.portfolios}</td>
                  <td className="text-xs text-ink-2">{u.lastLoginAt ? formatInstantNpt(u.lastLoginAt) : '—'}</td>
                  <td>
                    {u.id !== me.id && (
                      <div className="flex justify-end gap-1.5">
                        <Button variant="secondary" onClick={() => act.mutate({ method: 'PATCH', path: `/users/${u.id}`, body: { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}>
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </Button>
                        <Button variant="ghost" onClick={() => act.mutate({ method: 'PATCH', path: `/users/${u.id}`, body: { platformRole: u.platformRole === 'USER' ? 'PLATFORM_ADMIN' : 'USER' } })}>
                          {u.platformRole === 'USER' ? 'Make admin' : 'Remove admin'}
                        </Button>
                        <Button variant="danger" onClick={() => window.confirm(`Delete ${u.email}? This can't be undone.`) && act.mutate({ method: 'DELETE', path: `/users/${u.id}` })}>Delete</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Q>
    </Card>
  );
}

export function PlatformPortfolios() {
  const [search, setSearch] = useState('');
  const q = usePortfolios(useDebouncedValue(search, 250).trim());
  const act = usePlatformAction();
  return (
    <Card>
      <CardHeader title="Portfolios" subtitle="View as admin opens the admin portal read-only." actions={<SearchBox value={search} onChange={setSearch} placeholder="Search portfolio name" />} />
      <FormError error={act.error} />
      <Q q={q}>
        {(rows) => (
          <Table>
            <thead>
              <tr><th>Portfolio</th><th>Admins</th><th>Members</th><th className="text-right!">Value</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><p className="font-medium text-ink-1">{p.name}</p><p className="text-xs text-ink-3">#{p.id} · {p.type.toLowerCase()}</p></td>
                  <td className="text-xs text-ink-2">{p.admins.map((a) => a.email).join(', ') || '—'}</td>
                  <td className="tabular">{p.members}</td>
                  <td className="tabular text-right">{formatRs(p.value)}<p className="text-[11px] text-ink-3">{p.valueAsOf ?? ''}</p></td>
                  <td><StatusBadge status={p.status === 'ACTIVE' ? 'good' : 'critical'}>{p.status.toLowerCase()}</StatusBadge></td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <a href={`${config.adminAppUrl}/portfolios/${p.id}`} target="_blank" rel="noreferrer" className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-1 hover:bg-surface-2">View as admin ↗</a>
                      <Button variant="secondary" onClick={() => act.mutate({ method: 'PATCH', path: `/portfolios/${p.id}`, body: { status: p.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}>
                        {p.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          const typed = window.prompt(`Permanently delete "${p.name}" and all its records? Type the name to confirm.`);
                          if (typed !== null) act.mutate({ method: 'DELETE', path: `/portfolios/${p.id}`, body: { confirmName: typed } });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Q>
    </Card>
  );
}

function CandleEditor({ symbol, c, onDone }: { symbol: string; c: { date: string; open: number; high: number; low: number; close: number; volume: number }; onDone: () => void }) {
  const act = usePlatformAction();
  const [v, setV] = useState({ open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
  const num = (k: keyof typeof v) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) }), type: 'number', step: 'any', className: 'w-24' });
  return (
    <form
      className="flex flex-wrap items-end gap-2 bg-surface-2 p-3"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        act.mutate({ method: 'PATCH', path: `/prices/${encodeURIComponent(symbol)}/candles/${c.date}`, body: v }, { onSuccess: onDone });
      }}
    >
      {(['open', 'high', 'low', 'close', 'volume'] as const).map((k) => (
        <Field key={k} label={k}><Input {...num(k)} /></Field>
      ))}
      <Button type="submit" busy={act.isPending}>Save correction</Button>
      <Button variant="ghost" onClick={onDone}>Cancel</Button>
      <div className="basis-full"><FormError error={act.error} /></div>
    </form>
  );
}

export function PlatformPrices() {
  const sync = useSyncRuns();
  const act = usePlatformAction();
  const [symbols, setSymbols] = useState('');
  const [sym, setSym] = useState('');
  const [lookup, setLookup] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [ltp, setLtp] = useState('');
  const prices = usePrices(lookup);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="NEPSE price sync" subtitle="Runs in the background. Leave symbols empty to sync every active instrument." />
        <form
          className="flex flex-wrap items-end gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const list = symbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
            act.mutate({ method: 'POST', path: '/sync', body: { symbols: list.length ? list : undefined } });
          }}
        >
          <Field label="Symbols (comma-separated)"><Input value={symbols} onChange={(e) => setSymbols(e.target.value)} placeholder="NABIL, HRL" className="w-64" /></Field>
          <Button type="submit" busy={act.isPending} disabled={sync.data?.running}>{sync.data?.running ? 'Sync running…' : 'Start sync'}</Button>
        </form>
        <div className="px-4 pb-2"><FormError error={act.error} /></div>
        <Q q={sync}>
          {(s) => (
            <Table>
              <thead><tr><th>Run</th><th>Status</th><th>Started</th><th>Processed</th><th>Inserted / updated</th><th>Failed</th><th>Error</th></tr></thead>
              <tbody>
                {s.runs.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id} {r.type.toLowerCase()}</td>
                    <td><StatusBadge status={r.status === 'SUCCEEDED' ? 'good' : r.status === 'RUNNING' ? 'neutral' : r.status === 'PARTIAL' ? 'warning' : 'critical'}>{r.status.toLowerCase()}</StatusBadge></td>
                    <td className="text-xs">{formatInstantNpt(r.startedAt)}</td>
                    <td className="tabular">{r.processed}/{r.requested}</td>
                    <td className="tabular">{r.inserted} / {r.updated}</td>
                    <td className="tabular">{r.failed}</td>
                    <td className="max-w-xs truncate text-xs text-ink-2" title={r.errorMessage ?? ''}>{r.errorMessage ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Q>
      </Card>

      <Card>
        <CardHeader title="Fix bad prices" subtitle="Corrections are final and recorded in the audit log." />
        <form className="flex items-end gap-2 p-4" onSubmit={(e) => { e.preventDefault(); setLookup(sym.trim().toUpperCase()); setEditing(null); }}>
          <Field label="Symbol"><Input value={sym} onChange={(e) => setSym(e.target.value)} placeholder="NABIL" className="w-40" required /></Field>
          <Button type="submit" variant="secondary">Look up</Button>
        </form>
        {lookup && (
          <Q q={prices}>
            {(p) => (
              <div>
                <div className="flex flex-wrap items-end gap-3 border-t border-line px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink-1">{p.symbol} <span className="font-normal text-ink-3">{p.name}</span></p>
                    <p className="text-xs text-ink-2">Stored last price: {p.quote ? `${formatPrice(p.quote.lastTradedPrice)} (${formatInstantNpt(p.quote.fetchedAt)})` : 'none'}</p>
                  </div>
                  {p.quote && (
                    <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); act.mutate({ method: 'PATCH', path: `/prices/${encodeURIComponent(p.symbol)}/quote`, body: { lastTradedPrice: Number(ltp) } }); }}>
                      <Field label="Correct last price"><Input type="number" step="any" min="0" value={ltp} onChange={(e) => setLtp(e.target.value)} required className="w-28" /></Field>
                      <Button type="submit" variant="secondary" busy={act.isPending}>Save</Button>
                    </form>
                  )}
                </div>
                <Table>
                  <thead><tr><th>Date</th><th className="text-right!">Open</th><th className="text-right!">High</th><th className="text-right!">Low</th><th className="text-right!">Close</th><th className="text-right!">Volume</th><th>Source</th><th /></tr></thead>
                  <tbody>
                    {p.candles.map((c) => (
                      editing === c.date ? (
                        <tr key={c.date}><td colSpan={8} className="p-0!"><CandleEditor symbol={p.symbol} c={c} onDone={() => setEditing(null)} /></td></tr>
                      ) : (
                        <tr key={c.date}>
                          <td>{c.date}{c.provisional && <span className="ml-1 text-[11px] text-ink-3">provisional</span>}</td>
                          <td className="tabular text-right">{formatPrice(c.open)}</td>
                          <td className="tabular text-right">{formatPrice(c.high)}</td>
                          <td className="tabular text-right">{formatPrice(c.low)}</td>
                          <td className="tabular text-right">{formatPrice(c.close)}</td>
                          <td className="tabular text-right">{c.volume.toLocaleString('en-IN')}</td>
                          <td className="text-xs text-ink-3">{c.source === 'CSV_IMPORT' ? 'manual/CSV' : 'NEPSE'}</td>
                          <td><Button variant="ghost" onClick={() => setEditing(c.date)}>Fix</Button></td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Q>
        )}
      </Card>
    </div>
  );
}

export function PlatformReports() {
  const [status, setStatus] = useState('OPEN');
  const q = useReports(status);
  const act = usePlatformAction();
  return (
    <Card>
      <CardHeader
        title="Abuse reports"
        actions={
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="">All</option>
          </Select>
        }
      />
      <FormError error={act.error} />
      <Q q={q}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState title="No reports" />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-1">#{r.id} {r.reason}</p>
                    <StatusBadge status={r.status === 'OPEN' ? 'warning' : r.status === 'RESOLVED' ? 'good' : 'neutral'}>{r.status.toLowerCase()}</StatusBadge>
                  </div>
                  {r.details && <p className="whitespace-pre-line text-sm text-ink-2">{r.details}</p>}
                  <p className="text-xs text-ink-3">
                    From {r.reporter?.email ?? 'unknown'} · {formatInstantNpt(r.createdAt)}
                    {r.portfolio && <> · about portfolio <a className="text-accent underline" href={`${config.adminAppUrl}/portfolios/${r.portfolio.id}`} target="_blank" rel="noreferrer">{r.portfolio.name}</a></>}
                    {r.reportedUser && <> · about {r.reportedUser.email}</>}
                  </p>
                  {r.resolutionNote && <p className="text-xs text-ink-2">Resolution: {r.resolutionNote}</p>}
                  {r.status === 'OPEN' && (
                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => { const note = window.prompt('Resolution note'); if (note !== null) act.mutate({ method: 'PATCH', path: `/reports/${r.id}`, body: { status: 'RESOLVED', resolutionNote: note } }); }}>Resolve</Button>
                      <Button variant="secondary" onClick={() => act.mutate({ method: 'PATCH', path: `/reports/${r.id}`, body: { status: 'DISMISSED' } })}>Dismiss</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </Q>
    </Card>
  );
}

export function PlatformAudit() {
  const [action, setAction] = useState('');
  const q = useAudit(useDebouncedValue(action, 300).trim());
  return (
    <Card>
      <CardHeader title="Audit log" subtitle="Every recorded action across the platform. Entries can't be edited or deleted." actions={<SearchBox value={action} onChange={setAction} placeholder="Action prefix, e.g. deposit." />} />
      <Q q={q}>
        {(r) => (
          <Table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Portfolio</th><th>What</th></tr></thead>
            <tbody>
              {r.data.map((a) => (
                <tr key={a.id}>
                  <td className="text-xs whitespace-nowrap">{formatInstantNpt(a.createdAt)}</td>
                  <td>{a.actorName ?? '—'}</td>
                  <td className="font-mono text-xs">{a.action}</td>
                  <td className="tabular">{a.portfolioId ?? '—'}</td>
                  <td className="max-w-md text-sm whitespace-normal text-ink-2">{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Q>
    </Card>
  );
}

export function PlatformBilling() {
  return (
    <Card>
      <EmptyState title="No paid plans yet">
        Every portfolio is on the free tier. Plans, limits and billing will live here once paid tiers exist.
      </EmptyState>
    </Card>
  );
}
