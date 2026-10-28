import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CandleScheme, ResolvedTheme } from '@/features/chart/lib/chart-theme';
import { DEFAULT_INDICATORS, isIndicatorSettings, type IndicatorSettings } from '@/features/chart/lib/indicators';
import { readStored, writeStored } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface Preferences {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  candleScheme: CandleScheme;
  indicators: IndicatorSettings;
  setTheme: (t: ThemePreference) => void;
  setCandleScheme: (s: CandleScheme) => void;
  setIndicators: (s: IndicatorSettings) => void;
}

const PreferencesContext = createContext<Preferences | null>(null);

const KEY = 'nepse-summary:preferences';

interface Stored {
  theme: ThemePreference;
  candleScheme: CandleScheme;
  indicators: IndicatorSettings;
}

const isStored = (v: unknown): v is Stored => {
  const s = v as Stored;
  return typeof s === 'object' && s !== null &&
    ['system', 'light', 'dark'].includes(s.theme) &&
    ['conventional', 'colorblind'].includes(s.candleScheme) &&
    isIndicatorSettings(s.indicators);
};

const defaults: Stored = { theme: 'system', candleScheme: 'conventional', indicators: DEFAULT_INDICATORS };

function useSystemTheme(): ResolvedTheme {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return dark ? 'dark' : 'light';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored>(() => readStored(KEY, defaults, isStored));
  const systemTheme = useSystemTheme();
  const resolvedTheme = stored.theme === 'system' ? systemTheme : stored.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => writeStored(KEY, stored), [stored]);

  const value = useMemo<Preferences>(
    () => ({
      ...stored,
      resolvedTheme,
      setTheme: (theme) => setStored((s) => ({ ...s, theme })),
      setCandleScheme: (candleScheme) => setStored((s) => ({ ...s, candleScheme })),
      setIndicators: (indicators) => setStored((s) => ({ ...s, indicators })),
    }),
    [stored, resolvedTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
