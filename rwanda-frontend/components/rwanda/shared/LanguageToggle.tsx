'use client';

import { useLanguage, type Locale } from '@/contexts/LanguageContext';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  rw: 'RW',
  fr: 'FR',
};

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  fr: 'Français',
};

interface LanguageToggleProps {
  /** `dark` renders a translucent control for navy headers; `light` for white surfaces. */
  tone?: 'light' | 'dark';
}

export function LanguageToggle({ tone = 'light' }: LanguageToggleProps) {
  const { locale, setLocale } = useLanguage();
  const onDark = tone === 'dark';

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-md p-0.5 ${
        onDark ? 'bg-white/[0.08] ring-1 ring-white/10' : 'bg-slate-100 ring-1 ring-slate-200/70'
      }`}
    >
      {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            aria-pressed={active}
            aria-label={LOCALE_NAMES[loc]}
            title={LOCALE_NAMES[loc]}
            className={`rounded-[5px] px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
              active
                ? onDark
                  ? 'bg-white text-[var(--rw-navy)] shadow-sm'
                  : 'bg-white text-[var(--rw-blue-deep)] shadow-sm'
                : onDark
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {LOCALE_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
