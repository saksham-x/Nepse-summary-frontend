import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePreferences } from '@/features/preferences/preferences-context';
import { useT } from '@/features/i18n/i18n';
import { apiData, apiSend } from '@/lib/api-client';
import type { CurrentUser } from '@/types/portfolio';

export const ME_KEY = ['auth', 'me'] as const;

/** The signed-in user, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    // /auth/session answers null (not 401) when signed out, so visitors see no error.
    queryFn: ({ signal }) => apiData<CurrentUser | null>('/auth/session', { signal }),
    staleTime: 60_000,
  });
}

/** Sets the cached user; everything user-specific is refetched for the new identity. */
function useSetMe() {
  const qc = useQueryClient();
  return (user: CurrentUser | null) => {
    qc.removeQueries({ predicate: (q) => q.queryKey[0] === 'member' || q.queryKey[0] === 'platform' });
    qc.setQueryData(ME_KEY, user);
  };
}

export function useLogin() {
  const setMe = useSetMe();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => apiSend<CurrentUser>('POST', '/auth/login', body),
    onSuccess: setMe,
  });
}

export function useRegister() {
  const setMe = useSetMe();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) => apiSend<CurrentUser>('POST', '/auth/register', body),
    onSuccess: setMe,
  });
}

export function useLogout() {
  const setMe = useSetMe();
  return useMutation({ mutationFn: () => apiSend('POST', '/auth/logout'), onSuccess: () => setMe(null) });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pick<CurrentUser, 'name' | 'phone' | 'language' | 'theme' | 'notificationPrefs'>>) => apiSend<CurrentUser>('PATCH', '/auth/me', body),
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: { currentPassword: string; newPassword: string }) => apiSend('POST', '/auth/me/password', body) });
}

/** "Sign in as admin": re-enter the password to unlock the platform admin area. */
export function useAdminSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => apiSend<CurrentUser>('POST', '/auth/admin-session', { password }),
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  });
}

export function useAdminSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend<CurrentUser>('DELETE', '/auth/admin-session'),
    onSuccess: (user) => {
      qc.removeQueries({ queryKey: ['platform'] });
      qc.setQueryData(ME_KEY, user);
    },
  });
}

/** Applies the account's saved theme and language once per sign-in. */
export function AccountPreferencesSync() {
  const me = useMe().data;
  const { setTheme } = usePreferences();
  const { setLang } = useT();
  const applied = useRef<number | null>(null);
  useEffect(() => {
    if (!me || applied.current === me.id) return;
    applied.current = me.id;
    setTheme(me.theme);
    setLang(me.language);
  }, [me, setTheme, setLang]);
  return null;
}
