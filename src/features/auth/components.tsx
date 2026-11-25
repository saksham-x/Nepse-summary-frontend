import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Button, Field, FormError, Input } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { config } from '@/config/env';
import { useT } from '@/features/i18n/i18n';
import { useAdminSignIn, useLogout, useMe } from './api';

/** Member routes: sends signed-out visitors to /login and back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <Skeleton className="h-[400px]" />;
  if (me.error) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  if (!me.data) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/** Password prompt behind "Sign in as admin". */
export function AdminSignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const navigate = useNavigate();
  const signIn = useAdminSignIn();
  const [password, setPassword] = useState('');
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn.mutate(password, {
      onSuccess: () => {
        setPassword('');
        onClose();
        navigate('/platform-admin');
      },
    });
  };

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(92vw,380px)] rounded-xl border border-line bg-surface-1 p-0 text-ink-1 backdrop:bg-black/40">
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold">{t('nav.signInAsAdmin')}</h2>
          <p className="mt-1 text-sm text-ink-2">Re-enter your password to open the platform admin area. It stays unlocked for a limited time.</p>
        </div>
        <Field label={t('auth.password')}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        </Field>
        <FormError error={signIn.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" busy={signIn.isPending}>{t('nav.signInAsAdmin')}</Button>
        </div>
      </form>
    </dialog>
  );
}

/** Header account control: Log in for visitors; a menu for signed-in users. */
export function UserMenu() {
  const { t } = useT();
  const me = useMe().data;
  const logout = useLogout();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => menu.current?.removeAttribute('open');

  if (!me) {
    return (
      <Link to="/login" className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-ink hover:opacity-90">
        {t('nav.logIn')}
      </Link>
    );
  }
  const manages = me.memberships.some((m) => m.role !== 'MEMBER');
  const item = 'block w-full rounded-md px-3 py-1.5 text-left text-sm text-ink-1 hover:bg-surface-2';
  return (
    <>
      <details ref={menu} className="relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink-1 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-ink">{me.name.slice(0, 1).toUpperCase()}</span>
          <span className="hidden max-w-32 truncate sm:inline">{me.name}</span>
        </summary>
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-lg border border-line bg-surface-1 p-1.5 shadow-lg" onClick={close}>
          <p className="truncate px-3 py-1.5 text-xs text-ink-3">{me.email}</p>
          <Link to="/app" className={item}>{t('nav.myPortfolios')}</Link>
          <Link to="/app/settings" className={item}>{t('nav.settings')}</Link>
          {manages && <a href={config.adminAppUrl} className={item}>{t('nav.adminPortal')} ↗</a>}
          {me.isPlatformAdmin && (
            <button type="button" className={item} onClick={() => (me.adminSessionActive ? navigate('/platform-admin') : setAdminOpen(true))}>
              {me.adminSessionActive ? t('nav.platformAdmin') : t('nav.signInAsAdmin')}
            </button>
          )}
          <hr className="my-1 border-line" />
          <button type="button" className={item} onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/') })}>{t('nav.logOut')}</button>
        </div>
      </details>
      {me.isPlatformAdmin && <AdminSignInDialog open={adminOpen} onClose={() => setAdminOpen(false)} />}
    </>
  );
}
