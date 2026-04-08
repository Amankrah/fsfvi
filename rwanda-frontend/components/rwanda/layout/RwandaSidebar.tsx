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
        className={`w-full group mb-0.5 flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 ${
          active
            ? 'bg-[var(--rw-blue)] text-white shadow-md shadow-[var(--rw-blue)]/25'
            : 'text-gray-700 hover:bg-slate-100/90'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`h-4.5 w-4.5 ${active ? 'text-white' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-800'}`}>
            {t(item.labelKey)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {item.badge && item.badge > 0 ? (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
            }`}>
              {item.badge}
            </span>
          ) : null}
          <ChevronRight className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`} />
        </div>
      </button>
    );
  };

  return (
    <aside className="hidden shrink-0 lg:block lg:w-64 lg:self-start">
      <div className="sticky top-20 flex max-h-[calc(100vh-5.25rem)] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/[0.04] backdrop-blur-xl">
        <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-[var(--rw-blue)]/[0.08] via-white/50 to-[var(--rw-green)]/[0.06] p-4">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">{t('nav.dashboard')}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('app.platform_name')}</p>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-y-contain p-2">
          {navItems.map(renderNavItem)}
        </nav>

        <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/50">
          <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t('nav.account_section')}
          </p>
          <div className="space-y-0.5 p-2 pt-0">{accountItems.map(renderNavItem)}</div>
        </div>
      </div>
    </aside>
  );
}
