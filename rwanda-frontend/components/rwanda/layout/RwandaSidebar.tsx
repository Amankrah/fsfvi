'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAlerts } from '@/contexts/AlertContext';
import {
  LayoutDashboard,
  FileCheck,
  BarChart3,
  DollarSign,
  Map,
  Building2,
  Target,
  Sun,
  FileText,
  Bell,
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
  const { unreadCount } = useAlerts();

  const navItems: NavItem[] = [
    { id: 'overview', labelKey: 'nav.overview', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'assessment', labelKey: 'nav.assessment', icon: FileCheck, href: '/dashboard/assessment' },
    { id: 'performance', labelKey: 'nav.performance', icon: BarChart3, href: '/dashboard/performance' },
    { id: 'budget', labelKey: 'nav.budget', icon: DollarSign, href: '/dashboard/budget' },
    { id: 'optimization', labelKey: 'nav.optimization', icon: Sparkles, href: '/dashboard/optimization' },
    { id: 'planning', labelKey: 'nav.planning', icon: CalendarRange, href: '/dashboard/planning' },
    { id: 'provinces', labelKey: 'nav.provinces', icon: Map, href: '/dashboard/provinces' },
    { id: 'districts', labelKey: 'nav.districts', icon: Building2, href: '/dashboard/districts' },
    { id: 'psta5', labelKey: 'nav.psta5', icon: Target, href: '/dashboard/psta5' },
    { id: 'seasonal', labelKey: 'nav.seasonal', icon: Sun, href: '/dashboard/seasonal' },
    { id: 'reports', labelKey: 'nav.reports', icon: FileText, href: '/dashboard/reports' },
    { id: 'alerts', labelKey: 'nav.alerts', icon: Bell, href: '/dashboard/alerts', badge: unreadCount },
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
        className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all mb-0.5 ${
          active
            ? 'bg-[var(--rw-blue)] text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100'
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
    <aside className="hidden lg:block lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-20">
        <div className="p-4 bg-gradient-to-r from-[var(--rw-blue)]/5 to-[var(--rw-green)]/5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm">Dashboard</h2>
        </div>

        <nav className="p-2 space-y-0.5">
          {navItems.map(renderNavItem)}
        </nav>

        <div className="border-t border-gray-200 p-2">
          {accountItems.map(renderNavItem)}
        </div>
      </div>
    </aside>
  );
}
