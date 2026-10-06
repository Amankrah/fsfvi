'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaBrand } from '@/components/rwanda/shared/RwandaLogo';
import { OfficialBanner } from '@/components/rwanda/shared/OfficialBanner';

/** Header for unauthenticated pages (landing, about). */
export function PublicHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const links = [
    { href: '/', label: t('nav.home') },
    { href: '/about', label: t('nav.about') },
  ];

  return (
    <header className="sticky top-0 z-50">
      <OfficialBanner containerClassName="max-w-7xl" />
      <nav className="rw-navy-surface border-b border-white/10 text-white shadow-[0_6px_16px_-12px_rgba(2,6,23,0.6)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[3.75rem] items-center justify-between gap-4">
            <Link
              href="/"
              className="min-w-0 rounded-md outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <RwandaBrand title={t('app.platform_name')} shortTitle="FSFI" subtitle={t('app.ministry')} tone="dark" />
            </Link>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <ul className="hidden items-center gap-1 md:flex" role="list">
                {links.map((l) => {
                  const active = pathname === l.href;
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={active ? 'page' : undefined}
                        className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active ? 'text-white' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {l.label}
                        {active ? (
                          <span className="absolute inset-x-3 -bottom-[1.05rem] h-[2px] rounded-full bg-[var(--rw-yellow)]" aria-hidden />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <span className="mx-1 hidden h-5 w-px bg-white/15 md:block" aria-hidden />
              <LanguageToggle tone="dark" />
              <Link
                href="/login"
                className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-sm font-semibold text-[var(--rw-navy)] shadow-[0_1px_2px_rgba(2,6,23,0.3)] transition-colors hover:bg-slate-100 sm:ml-2"
              >
                {t('auth.sign_in')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
