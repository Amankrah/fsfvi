'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  FileCheck,
  DollarSign,
  Target,
  FileText,
  Database,
  User,
  Shield,
  ChevronRight,
  Sparkles,
  CalendarRange,
  PiggyBank,
} from 'lucide-react';

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

export function RwandaSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const navItems: NavItem[] = [
    { id: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'budget', labelKey: 'nav.budget', icon: DollarSign, href: '/dashboard/budget' },
    { id: 'assessment', labelKey: 'nav.assessment', icon: FileCheck, href: '/dashboard/assessment' },
    { id: 'optimization', labelKey: 'nav.optimization', icon: Sparkles, href: '/dashboard/optimization' },
    { id: 'planning', labelKey: 'nav.planning', icon: CalendarRange, href: '/dashboard/planning' },
    { id: 'investment', labelKey: 'nav.investment', icon: PiggyBank, href: '/dashboard/investment' },
    { id: 'psta5', labelKey: 'nav.psta5', icon: Target, href: '/dashboard/psta5' },
    { id: 'reports', labelKey: 'nav.reports', icon: FileText, href: '/dashboard/reports' },
    { id: 'data_entry', labelKey: 'nav.data_entry', icon: Database, href: '/dashboard/data-entry' },
  ];

  const accountItems: NavItem[] = [
    { id: 'profile', labelKey: 'nav.profile', icon: User, href: '/profile' },
    { id: 'security', labelKey: 'nav.security', icon: Shield, href: '/security' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => router.push(item.href)}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex w-full items-center justify-between rounded-md py-2 pl-3 pr-2 text-left transition-colors duration-150 ${
          active
            ? 'bg-[var(--rw-blue)]/[0.09] text-[var(--rw-blue-ink)]'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {active ? (
          <span
            className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[var(--rw-blue-deep)]"
            aria-hidden
          />
        ) : null}
        <span className="flex min-w-0 items-center gap-3">
          <Icon
            className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--rw-blue-deep)]' : 'text-slate-400 group-hover:text-slate-600'}`}
            aria-hidden
          />
          <span className={`truncate text-[13.5px] ${active ? 'font-semibold' : 'font-medium'}`}>
            {t(item.labelKey)}
          </span>
        </span>
        <span className="flex items-center gap-1">
          {item.badge && item.badge > 0 ? (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
              {item.badge}
            </span>
          ) : null}
          <ChevronRight
            className={`h-3.5 w-3.5 text-slate-300 transition-opacity ${active ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
            aria-hidden
          />
        </span>
      </button>
    );
  };

  return (
    <aside className="hidden shrink-0 lg:block lg:w-60 lg:self-start">
      <div className="sticky top-[6.1rem] flex max-h-[calc(100vh-6.6rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('nav.dashboard')}</h2>
          <p className="mt-0.5 text-sm font-medium leading-snug text-slate-900">{t('app.platform_name')}</p>
        </div>

        <nav className="min-h-0 flex-1 space-y-px overflow-y-auto overscroll-y-contain p-2" aria-label={t('nav.dashboard')}>
          {navItems.map(renderNavItem)}
        </nav>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50/70">
          <p className="px-4 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t('nav.account_section')}
          </p>
          <div className="space-y-px p-2 pt-0">{accountItems.map(renderNavItem)}</div>
        </div>
      </div>
    </aside>
  );
}
