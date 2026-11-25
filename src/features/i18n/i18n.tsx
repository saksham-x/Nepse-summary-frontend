import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readStored, writeStored } from '@/lib/storage';
import type { Language } from '@/types/portfolio';
import { MESSAGES, type MessageKey } from './messages';

const KEY = 'nepse-summary:language';
const isLanguage = (v: unknown): v is Language => v === 'en' || v === 'ne';

type Params = Record<string, string | number>;

interface I18n {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: MessageKey, params?: Params) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => readStored(KEY, 'en', isLanguage));
  useEffect(() => {
    writeStored(KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: MessageKey, params?: Params) => {
      const template: string = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
      return params ? template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : template;
    },
    [lang],
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used inside <LanguageProvider>');
  return ctx;
}
