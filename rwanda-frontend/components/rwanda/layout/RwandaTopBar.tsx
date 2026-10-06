'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaBrand } from '@/components/rwanda/shared/RwandaLogo';
import { RwandaFlag } from '@/components/rwanda/shared/RwandaFlag';
import { OfficialBanner } from '@/components/rwanda/shared/OfficialBanner';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  FileCheck,
  DollarSign,
  Target,
  FileText,
  Database,
  User,
  Shield,
  Sparkles,
  CalendarRange,
  PiggyBank,
} from 'lucide-react';

export function RwandaTopBar() {
  const { user, logout } = useAuth(true);
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileNavItems = [
    { label: t('nav.overview'), icon: LayoutDashboard, href: '/dashboard' },
    { label: t('nav.budget'), icon: DollarSign, href: '/dashboard/budget' },
    { label: t('nav.assessment'), icon: FileCheck, href: '/dashboard/assessment' },
    { label: t('nav.optimization'), icon: Sparkles, href: '/dashboard/optimization' },
    { label: t('nav.planning'), icon: CalendarRange, href: '/dashboard/planning' },
    { label: t('nav.investment'), icon: PiggyBank, href: '/dashboard/investment' },
    { label: t('nav.psta5'), icon: Target, href: '/dashboard/psta5' },
    { label: t('nav.reports'), icon: FileText, href: '/dashboard/reports' },
    { label: t('nav.data_entry'), icon: Database, href: '/dashboard/data-entry' },
    { label: t('nav.profile'), icon: User, href: '/profile' },
    { label: t('nav.security'), icon: Shield, href: '/security' },
  ];

  const initials = (user?.username || '?')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50">
      <OfficialBanner />

      <nav className="rw-navy-surface border-b border-white/10 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_6px_16px_-12px_rgba(2,6,23,0.6)]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-[3.75rem] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="-ml-2 rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link
                href="/dashboard"
                className="min-w-0 rounded-md outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <RwandaBrand title={t('app.platform_name')} shortTitle="FSFI" subtitle={t('app.ministry')} tone="dark" />
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <LanguageToggle tone="dark" />

              <div className="hidden items-center gap-3 border-l border-white/10 pl-4 md:flex">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold tracking-wide text-white ring-1 ring-white/15"
                  aria-hidden
                >
                  {initials}
                </span>
                <div className="text-left leading-tight">
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-[11px] text-slate-300/90">{user?.government_name || t('app.ministry_short')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-3 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('auth.sign_out')}</span>
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[var(--rw-navy-900)] lg:hidden">
            <div className="max-h-[70vh] space-y-0.5 overflow-y-auto px-3 py-3">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
                return (
                  <button
                    type="button"
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
              <div className="mt-2 flex items-center gap-2 border-t border-white/10 px-3 pt-3 text-[11px] text-slate-400">
                <RwandaFlag className="h-3 w-[1.125rem] rounded-[1px]" title="" />
                {t('app.republic')} · {t('app.ministry')}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
