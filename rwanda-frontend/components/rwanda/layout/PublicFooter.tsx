'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { RwandaBrand } from '@/components/rwanda/shared/RwandaLogo';
import { ALL_PHOTO_CREDITS } from '@/lib/photoCredits';

/** Footer for unauthenticated pages (landing, about). Carries the required photo attributions. */
export function PublicFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--rw-navy-900)] text-slate-300">
      <div className="rw-flag-rule h-[3px]" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <RwandaBrand title={t('app.platform_name')} subtitle={t('app.republic')} tone="dark" size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{t('app.ministry')}</p>
            <p className="mt-6 text-xs leading-relaxed text-slate-500">
              FSFI established by{' '}
              <a
                href="https://www.ifpri.org/profile/john-ulimwengu/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 underline-offset-2 hover:text-white hover:underline"
              >
                John Ulimwengu
              </a>{' '}
              (IFPRI),{' '}
              <a
                href="https://www.eakwofie.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 underline-offset-2 hover:text-white hover:underline"
              >
                Emmanuel A. Kwofie
              </a>{' '}
              &amp;{' '}
              <a
                href="https://www.mcgill.ca/bioeng/kwofie-ebenezer-miezah"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 underline-offset-2 hover:text-white hover:underline"
              >
                Ebenezer M. Kwofie
              </a>{' '}
              (McGill University), funded by an IFAD grant through{' '}
              <a
                href="https://www.akademiya2063.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 underline-offset-2 hover:text-white hover:underline"
              >
                AKADEMIYA2063
              </a>
              .
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t('app.footer_links')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm" role="list">
              <li>
                <Link href="/" className="hover:text-white">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  {t('auth.sign_in')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t('app.photo_credits_heading')}
            </h3>
            <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-slate-500" role="list">
              {ALL_PHOTO_CREDITS.map((p) => (
                <li key={p.src}>
                  <a
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 underline-offset-2 hover:text-white hover:underline"
                  >
                    {p.author}
                  </a>{' '}
                  · {p.license}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t('app.republic')} · {t('app.ministry')}
          </p>
          <p>{t('app.platform_name')}</p>
        </div>
      </div>
    </footer>
  );
}
