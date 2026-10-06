'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { RwandaFlag } from './RwandaFlag';

interface OfficialBannerProps {
  /** Max content width class; defaults to the dashboard width. */
  containerClassName?: string;
}

/**
 * Government identity strip shown above the main navigation on every screen:
 * tricolour rule + small flag + "official platform" statement. Mirrors the
 * convention used by national government web standards.
 */
export function OfficialBanner({ containerClassName = 'max-w-[1400px]' }: OfficialBannerProps) {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-100 text-slate-700">
      <div className="rw-flag-rule h-[3px]" aria-hidden />
      <div className={`mx-auto flex ${containerClassName} items-center gap-2.5 px-4 py-1.5 sm:px-6 lg:px-8`}>
        <RwandaFlag className="h-3.5 w-[1.3125rem] shrink-0 rounded-[1px] ring-1 ring-black/10" title="" />
        <p className="truncate text-[11px] leading-4 sm:text-xs">
          <span className="font-semibold text-slate-800">{t('app.official_banner')}</span>
          <span className="hidden text-slate-400 sm:inline" aria-hidden>
            {' '}
            ·{' '}
          </span>
          <span className="hidden sm:inline">{t('app.ministry')}</span>
        </p>
      </div>
    </div>
  );
}
