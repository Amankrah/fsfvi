'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function RwandaFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>&copy; {year} {t('app.platform_name')} — {t('app.ministry')}</p>
          <p>{t('app.subtitle')}</p>
        </div>
      </div>
    </footer>
  );
}
