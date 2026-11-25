import { useState, type FormEvent } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, Field, FormError, Input, Notice } from '@/components/ui/Form';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useChangePassword, useMe, useUpdateProfile } from '@/features/auth/api';
import { useT } from '@/features/i18n/i18n';
import type { MessageKey } from '@/features/i18n/messages';
import { usePreferences, type ThemePreference } from '@/features/preferences/preferences-context';
import type { Language, NotificationPrefs } from '@/types/portfolio';

export function SettingsPage() {
  const { t, setLang } = useT();
  const me = useMe().data!;
  const { theme, setTheme } = usePreferences();
  const update = useUpdateProfile();
  const changePassword = useChangePassword();
  const [profile, setProfile] = useState({ name: me.name, phone: me.phone ?? '' });
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    update.mutate({ name: profile.name, phone: profile.phone || null }, { onSuccess: () => setSaved(true) });
  };
  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    changePassword.mutate(pw, { onSuccess: () => setPw({ currentPassword: '', newPassword: '' }) });
  };
  const setLanguage = (language: Language) => {
    setLang(language);
    update.mutate({ language });
  };
  const setAppearance = (next: ThemePreference) => {
    setTheme(next);
    update.mutate({ theme: next });
  };
  const togglePref = (k: keyof NotificationPrefs) => update.mutate({ notificationPrefs: { ...me.notificationPrefs, [k]: !me.notificationPrefs[k] } });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-ink-1">{t('nav.settings')}</h1>

      <Card>
        <CardHeader title={t('settings.profile')} subtitle={me.email} />
        <form onSubmit={saveProfile} className="space-y-3 p-4">
          <Field label={t('auth.name')}>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required maxLength={120} />
          </Field>
          <Field label={t('settings.phone')}>
            <Input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={30} />
          </Field>
          {saved && <Notice>{t('settings.saved')}</Notice>}
          <Button type="submit" busy={update.isPending}>{t('settings.save')}</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('settings.password')} />
        <form onSubmit={savePassword} className="space-y-3 p-4">
          <Field label={t('settings.currentPassword')}>
            <Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
          </Field>
          <Field label={t('settings.newPassword')} hint={t('auth.passwordHint')}>
            <Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} />
          </Field>
          <FormError error={changePassword.error} />
          {changePassword.isSuccess && <Notice>{t('settings.passwordChanged')}</Notice>}
          <Button type="submit" busy={changePassword.isPending}>{t('settings.changePassword')}</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('settings.notifications')} />
        <ul className="divide-y divide-line">
          {(['paymentDue', 'depositUpdates', 'trades', 'exits'] as const).map((k) => (
            <li key={k} className="px-4 py-2.5">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink-1">
                {t(`settings.notif.${k}` as MessageKey)}
                <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={me.notificationPrefs[k]} onChange={() => togglePref(k)} disabled={update.isPending} />
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-ink-3">{t('settings.language')}</p>
          <SegmentedControl<Language>
            label={t('settings.language')}
            value={me.language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ne', label: 'नेपाली' },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-ink-3">{t('settings.appearance')}</p>
          <SegmentedControl<ThemePreference>
            label={t('settings.appearance')}
            value={theme}
            onChange={setAppearance}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
          />
        </div>
        <FormError error={update.error} />
      </Card>
    </div>
  );
}
