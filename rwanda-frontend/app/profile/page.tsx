'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { RwandaProtectedRoute } from '@/components/rwanda/auth/RwandaProtectedRoute';
import { RwandaTopBar } from '@/components/rwanda/layout/RwandaTopBar';
import { RwandaSidebar } from '@/components/rwanda/layout/RwandaSidebar';
import { RwandaFooter } from '@/components/rwanda/layout/RwandaFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  Clock,
  Shield,
  User,
} from 'lucide-react';
import type { UserResponse } from '@/lib/types/auth';

function initialsForUser(user: UserResponse | null | undefined): string {
  const name = user?.government_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  const u = user?.username?.trim();
  if (u && u.length >= 2) {
    return u.slice(0, 2).toUpperCase();
  }
  if (u?.[0]) {
    return u[0].toUpperCase();
  }
  return '?';
}

function ProfileContent() {
  const { user } = useAuth(true);
  const { t } = useLanguage();

  const dash = t('profile_page.no_value');
  const mfaOn = !!user?.two_fa_enabled;

  const fields = [
    {
      key: 'username',
      label: t('profile_page.username'),
      value: user?.username || dash,
      Icon: User,
      iconClass: 'bg-[var(--rw-blue)]/10 text-[var(--rw-blue-deep)] ring-1 ring-[var(--rw-blue)]/20',
    },
    {
      key: 'government',
      label: t('profile_page.government'),
      value: user?.government_name || t('app.ministry'),
      Icon: Building2,
      iconClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
    },
    {
      key: 'role',
      label: t('profile_page.role'),
      value: user?.role || t('profile_page.default_role'),
      Icon: BadgeCheck,
      iconClass: 'bg-[var(--rw-green)]/12 text-[var(--rw-green)] ring-1 ring-[var(--rw-green)]/20',
    },
    {
      key: '2fa',
      label: t('profile_page.two_factor'),
      value: mfaOn ? t('security_settings.mfa_on') : t('security_settings.mfa_off'),
      Icon: Shield,
      iconClass: mfaOn
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
        : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70',
    },
    {
      key: 'last_login',
      label: t('profile_page.last_login'),
      value: user?.last_login || dash,
      Icon: Clock,
      iconClass: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rw-blue-deep)]">
          {t('profile_page.eyebrow')}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t('profile_page.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {t('profile_page.subtitle')}
        </p>
        <div className="rw-flag-rule mt-3 h-1 w-20 rounded-full" aria-hidden />
      </header>

      <section
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]"
        aria-label={t('profile_page.title')}
      >
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          <div className="flex shrink-0 items-center gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--rw-navy)] text-2xl font-semibold tracking-wide text-white ring-4 ring-slate-100"
              aria-hidden
            >
              {initialsForUser(user ?? undefined)}
            </div>
            <div className="min-w-0 sm:hidden">
              <p className="truncate text-lg font-semibold text-slate-900">
                {user?.government_name || user?.username || t('profile_page.title')}
              </p>
              <p className="truncate text-sm text-slate-500">@{user?.username || '–'}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="hidden truncate text-xl font-semibold text-slate-900 sm:block">
              {user?.government_name || user?.username || t('profile_page.title')}
            </p>
            <p className="hidden truncate text-sm text-slate-500 sm:block">
              @{user?.username || dash}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  mfaOn
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
                    : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
                }`}
              >
                <Shield className="h-3.5 w-3.5" aria-hidden />
                {mfaOn ? t('security_settings.mfa_on') : t('security_settings.mfa_off')}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-900/[0.04] px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                {t('profile_page.role')}: {user?.role || t('profile_page.default_role')}
              </span>
            </div>
          </div>
        </div>

        <div className="-mb-px grid border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(({ key, label, value, Icon, iconClass }) => (
            <div
              key={key}
              className="flex gap-4 border-b border-slate-200 bg-white p-5 sm:border-r sm:even:border-r-0 lg:even:border-r lg:[&:nth-child(3n)]:border-r-0"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
                {key === '2fa' && (
                  <Link
                    href="/security"
                    className="mt-2 inline-flex items-center text-xs font-semibold text-[var(--rw-blue-deep)] underline-offset-2 hover:underline"
                  >
                    {t('profile_page.manage_security')}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/security"
        className="group flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rw-blue-deep)]"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--rw-blue)]/10 text-[var(--rw-blue-deep)] ring-1 ring-[var(--rw-blue)]/20">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{t('profile_page.manage_security')}</p>
            <p className="mt-1 text-sm text-slate-600">{t('profile_page.manage_security_hint')}</p>
          </div>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--rw-blue-deep)]"
          aria-hidden
        />
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RwandaProtectedRoute>
      <div className="relative flex min-h-screen flex-col bg-surface">
        <RwandaTopBar />
        <div className="relative flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex gap-6 lg:gap-8">
              <RwandaSidebar />
              <main className="min-w-0 flex-1">
                <ProfileContent />
              </main>
            </div>
          </div>
        </div>
        <RwandaFooter />
      </div>
    </RwandaProtectedRoute>
  );
}
