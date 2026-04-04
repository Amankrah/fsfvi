'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
import { Button } from '@/components/ui/button';
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
    { label: t('nav.psta5'), icon: Target, href: '/dashboard/psta5' },
    { label: t('nav.reports'), icon: FileText, href: '/dashboard/reports' },
    { label: t('nav.data_entry'), icon: Database, href: '/dashboard/data-entry' },
    { label: t('nav.profile'), icon: User, href: '/profile' },
    { label: t('nav.security'), icon: Shield, href: '/security' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--rw-dark)]/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--rw-dark)]/90">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Title */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <RwandaLogo size="sm" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white leading-tight">
                {t('app.platform_name')}
              </h1>
              <p className="text-xs text-gray-400 leading-tight">
                {t('app.ministry')}
              </p>
            </div>
          </div>

          {/* Right: Language + User + Logout */}
          <div className="flex items-center space-x-3">
            <LanguageToggle />

            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-gray-400">{user?.government_name || t('app.ministry')}</p>
            </div>

            <Button onClick={logout} variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline text-xs">{t('auth.sign_out')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[var(--rw-dark)]">
          <div className="px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
              return (
                <button
                  type="button"
                  key={item.href}
                  onClick={() => { router.push(item.href); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive ? 'bg-[var(--rw-blue)] text-white' : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
