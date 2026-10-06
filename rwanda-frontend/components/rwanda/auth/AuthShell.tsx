'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaBrand } from '@/components/rwanda/shared/RwandaLogo';
import { RwandaFlag } from '@/components/rwanda/shared/RwandaFlag';
import { OfficialBanner } from '@/components/rwanda/shared/OfficialBanner';
import { PHOTOS } from '@/lib/photoCredits';

interface AuthShellProps {
  children: React.ReactNode;
  /** Hide the "back to home" link (e.g. forced password change). */
  hideBackLink?: boolean;
}

/**
 * Two-pane shell for authentication screens: a photographic identity panel on the left
 * (collapses to a compact header on small screens) and a plain form column on the right.
 */
export function AuthShell({ children, hideBackLink = false }: AuthShellProps) {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const photo = PHOTOS.thousandHills;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <OfficialBanner containerClassName="max-w-none" />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Identity panel */}
        <aside className="relative isolate overflow-hidden bg-[var(--rw-navy-900)] text-white lg:sticky lg:top-0 lg:flex lg:h-[calc(100vh-1.9rem)] lg:w-[46%] lg:max-w-[760px] lg:flex-col lg:justify-between">
          <Image
            src={photo.src}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="object-cover object-[50%_60%]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,20,40,0.55)_0%,rgba(7,20,40,0.35)_40%,rgba(7,20,40,0.92)_100%)]"
            aria-hidden
          />

          <div className="relative flex items-center justify-between px-6 py-5 sm:px-8 lg:px-10">
            <Link href="/" className="rounded-md outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              <RwandaBrand title={t('app.platform_name')} subtitle={t('app.republic')} tone="dark" />
            </Link>
          </div>

          <div className="relative px-6 pb-8 pt-10 sm:px-8 lg:px-10 lg:pb-10">
            <div className="hidden lg:block">
              <div className="mb-4 inline-flex items-center gap-2.5">
                <RwandaFlag className="h-3.5 w-[1.3125rem] rounded-[1px] ring-1 ring-white/30" title="" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                  {t('auth.panel_kicker')}
                </span>
              </div>
              <h2 className="font-display max-w-md text-3xl font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.4rem]">
                {t('auth.panel_title')}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-200/90">{t('auth.panel_lead')}</p>
            </div>
            <p className="mt-6 text-[11px] leading-4 tracking-wide text-white/55 lg:mt-10">
              {t('auth.panel_photo_caption')} · {t('app.photo_credit')}: {photo.author}
            </p>
          </div>
        </aside>

        {/* Form column */}
        <main className="flex flex-1 flex-col">
          <div className="flex items-center justify-between px-6 py-4 sm:px-10">
            {hideBackLink ? (
              <span />
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('auth.back_home')}
              </Link>
            )}
            <LanguageToggle />
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
            <div className="w-full max-w-[26rem]">{children}</div>
          </div>

          <footer className="px-6 py-5 text-xs text-slate-500 sm:px-10">
            © {year} {t('app.republic')} · {t('app.ministry')}
          </footer>
        </main>
      </div>
    </div>
  );
}
