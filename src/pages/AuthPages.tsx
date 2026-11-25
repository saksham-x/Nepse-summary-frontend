import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Card } from '@/components/ui/Card';
import { Button, Field, FormError, Input } from '@/components/ui/Form';
import { AdminSignInDialog } from '@/features/auth/components';
import { useLogin, useMe, useRegister } from '@/features/auth/api';
import { useT } from '@/features/i18n/i18n';
import type { CurrentUser } from '@/types/portfolio';

/** Only same-site paths are honoured as ?next=, never a full URL. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/app');

function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-sm py-8">
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-ink-1">{title}</h1>
        <div className="mt-5">{children}</div>
      </Card>
      <p className="mt-4 text-center text-sm text-ink-2">{footer}</p>
      <p className="mt-2 text-center text-xs">
        <Link to="/" className="text-ink-3 underline">{t('auth.publicSite')}</Link>
      </p>
    </div>
  );
}

/**
 * After logging in, platform admins are offered "Sign in as admin" alongside
 * going to their portfolios; everyone else goes straight on.
 */
function SignedIn({ user, next }: { user: CurrentUser; next: string }) {
  const { t } = useT();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  if (!user.isPlatformAdmin) return <Navigate to={next} replace />;
  return (
    <AuthShell title={t('home.title', { name: user.name })} footer={null}>
      <div className="space-y-3">
        <Button className="w-full" onClick={() => navigate(next)}>{t('nav.myPortfolios')}</Button>
        <Button className="w-full" variant="secondary" onClick={() => (user.adminSessionActive ? navigate('/platform-admin') : setAdminOpen(true))}>
          {t('nav.signInAsAdmin')}
        </Button>
      </div>
      <AdminSignInDialog open={adminOpen} onClose={() => setAdminOpen(false)} />
    </AuthShell>
  );
}

export function LoginPage() {
  const { t } = useT();
  const me = useMe();
  const login = useLogin();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (me.data) return <SignedIn user={me.data} next={next} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };
  return (
    <AuthShell
      title={t('auth.loginTitle')}
      footer={<>{t('auth.noAccount')} <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-accent underline">{t('nav.signUp')}</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.email')}>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label={t('auth.password')}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <FormError error={login.error} />
        <Button type="submit" className="w-full" busy={login.isPending}>{t('auth.submitLogin')}</Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { t } = useT();
  const me = useMe();
  const register = useRegister();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  if (me.data) return <SignedIn user={me.data} next={next} />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };
  return (
    <AuthShell title={t('auth.registerTitle')} footer={<>{t('auth.haveAccount')} <Link to="/login" className="text-accent underline">{t('nav.logIn')}</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.name')}>
          <Input autoComplete="name" value={form.name} onChange={set('name')} required maxLength={120} autoFocus />
        </Field>
        <Field label={t('auth.email')}>
          <Input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label={t('auth.password')} hint={t('auth.passwordHint')}>
          <Input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
        </Field>
        <FormError error={register.error} />
        <Button type="submit" className="w-full" busy={register.isPending}>{t('auth.submitRegister')}</Button>
      </form>
    </AuthShell>
  );
}
