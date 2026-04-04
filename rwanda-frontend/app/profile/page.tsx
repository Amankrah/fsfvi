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
  Sparkles,
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
      iconClass:
        'bg-[var(--rw-blue)]/12 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15',
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
    <div className="space-y-8">
      <header className="relative">
        <div
          className="pointer-events-none absolute -left-6 -top-8 h-40 w-40 rounded-full bg-[var(--rw-blue)]/10 blur-3xl"
          aria-hidden
        />
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--rw-blue)]">
          <Sparkles className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t('profile_page.eyebrow')}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t('profile_page.title')}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {t('profile_page.subtitle')}
        </p>
        <div className="mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)]" />
      </header>

      <section
        className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.04]"
        aria-label={t('profile_page.title')}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--rw-blue)]/[0.06] via-transparent to-[var(--rw-green)]/[0.05]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-8 p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
          <div className="flex shrink-0 items-center gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--rw-blue)] to-[#006a8f] text-2xl font-bold tracking-wide text-white shadow-lg shadow-[var(--rw-blue)]/25 ring-4 ring-white/80"
              aria-hidden
            >
              {initialsForUser(user ?? undefined)}
            </div>
            <div className="min-w-0 sm:hidden">
              <p className="truncate text-lg font-semibold text-slate-900">
                {user?.government_name || user?.username || t('profile_page.title')}
              </p>
              <p className="truncate text-sm text-slate-500">@{user?.username || '—'}</p>
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

        <div className="relative grid gap-3 border-t border-slate-200/60 bg-slate-50/40 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {fields.map(({ key, label, value, Icon, iconClass }) => (
            <div
              key={key}
              className="group flex gap-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
                {key === '2fa' && (
                  <Link
                    href="/security"
                    className="mt-2 inline-flex items-center text-xs font-semibold text-[var(--rw-blue)] hover:underline"
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
        className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white to-slate-50/90 p-5 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.45)] transition-all hover:border-[var(--rw-blue)]/25 hover:shadow-[0_16px_48px_-24px_rgba(0,133,179,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rw-blue)]"
      >
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[var(--rw-blue)]/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--rw-blue)]/12 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15">
            <Shield className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{t('profile_page.manage_security')}</p>
            <p className="mt-1 text-sm text-slate-600">{t('profile_page.manage_security_hint')}</p>
          </div>
        </div>
        <ChevronRight
          className="relative h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--rw-blue)]"
          aria-hidden
        />
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RwandaProtectedRoute>
      <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100/90">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,133,179,0.12),transparent)]"
          aria-hidden
        />
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
