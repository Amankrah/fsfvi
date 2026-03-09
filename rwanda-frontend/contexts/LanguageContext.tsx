'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import en from '@/translations/en.json';
import rw from '@/translations/rw.json';
import fr from '@/translations/fr.json';

export type Locale = 'en' | 'rw' | 'fr';

type TranslationData = typeof en;

const translations: Record<Locale, TranslationData> = { en, rw, fr };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = useCallback(
    (key: string): string => {
      const result = getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
      if (result === key && locale !== 'en') {
        return getNestedValue(translations.en as unknown as Record<string, unknown>, key);
      }
      return result;
    },
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
