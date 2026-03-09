'use client';

import { useLanguage, type Locale } from '@/contexts/LanguageContext';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  rw: 'RW',
  fr: 'FR',
};

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
      {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            locale === loc
              ? 'bg-white text-[var(--rw-blue)] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
