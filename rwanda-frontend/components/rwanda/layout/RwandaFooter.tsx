'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { RwandaFlag } from '@/components/rwanda/shared/RwandaFlag';

export function RwandaFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <RwandaFlag className="h-5 w-[1.875rem] shrink-0 rounded-[2px] ring-1 ring-black/10" title="" />
          <div className="leading-tight">
            <p className="text-sm font-medium text-slate-800">
              {t('app.republic')} · {t('app.ministry')}
            </p>
            <p className="text-xs text-slate-500">
              {t('app.platform_name')} · {t('app.subtitle')}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">© {year} {t('app.ministry_short')}</p>
      </div>
    </footer>
  );
}
