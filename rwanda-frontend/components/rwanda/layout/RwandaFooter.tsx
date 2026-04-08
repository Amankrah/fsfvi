'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function RwandaFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <p className="text-sm font-medium text-slate-700">
            © {year} · {t('app.republic')} — {t('app.ministry')}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            {t('app.platform_name')} · {t('app.subtitle')}
          </p>
        </div>
      </div>
    </footer>
  );
}
