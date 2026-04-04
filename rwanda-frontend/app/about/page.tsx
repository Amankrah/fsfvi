'use client';

import Link from 'next/link';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowRight,
  ArrowLeft,
  TrendingDown,
  DollarSign,
  Target,
  Layers,
  BarChart3,
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  Lightbulb,
  CheckCircle2,
  Landmark,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';

// The 8 indicator components identified in Rwanda's context
const INDICATOR_COMPONENTS = [
  { name: 'Crop Production', color: 'bg-green-500' },
  { name: 'Animal Systems', color: 'bg-pink-500' },
  { name: 'Post-Harvest', color: 'bg-yellow-500' },
  { name: 'Markets', color: 'bg-blue-500' },
  { name: 'Nutrition', color: 'bg-orange-500' },
  { name: 'Finance', color: 'bg-indigo-500' },
  { name: 'Research', color: 'bg-purple-500' },
  { name: 'Environment', color: 'bg-teal-500' },
];

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-[var(--rw-dark)] border-b border-white/[0.06] sticky top-0 z-50 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <RwandaLogo size="sm" />
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-white leading-tight">{t('app.platform_name')}</p>
                <p className="text-xs text-gray-400 leading-tight">{t('app.ministry')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
                {t('nav.home')}
              </Link>
              <LanguageToggle />
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[var(--rw-blue)] rounded-xl hover:bg-[#008bbf] transition-colors shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
              >
                {t('auth.sign_in')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--rw-dark)] text-white min-h-[min(72vh,720px)] flex items-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 -right-20 h-[min(420px,50vw)] w-[min(420px,50vw)] rounded-full bg-[var(--rw-blue)]/[0.2] blur-[100px]" />
          <div className="absolute bottom-0 left-[5%] h-[300px] w-[300px] rounded-full bg-[var(--rw-green)]/[0.16] blur-[90px]" />
          <div className="absolute top-1/4 right-[15%] h-[200px] w-[200px] rounded-full bg-[var(--rw-yellow)]/[0.1] blur-[64px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(ellipse 75% 65% at 50% 35%, black 15%, transparent 72%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#12141f]/90 to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 w-full">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-sm text-gray-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white transition-all mb-8 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {t('about_page.back')}
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--rw-blue)]/35 bg-[var(--rw-blue)]/[0.12] px-3.5 py-1.5 sm:px-4 sm:py-2 mb-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
            <Landmark className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--rw-blue)] shrink-0" aria-hidden />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rw-blue)]">
              {t('landing.hero_kicker')}
            </span>
          </div>

          <h1 className="text-[2rem] leading-[1.15] sm:text-5xl sm:leading-[1.08] lg:text-6xl font-bold tracking-tight text-white max-w-4xl">
            {t('about_page.h1_about')}{' '}
            <span className="text-[var(--rw-yellow)] [text-shadow:0_2px_40px_rgba(250,210,1,0.18)]">
              {t('about_page.h1_fsfi')}
            </span>
          </h1>

          <div className="mt-8 sm:mt-10 max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md p-5 sm:p-7 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)]">
            <div className="flex items-start gap-4">
              <span className="mt-1 hidden sm:block w-1 self-stretch min-h-[4.5rem] rounded-full bg-gradient-to-b from-[var(--rw-blue)] to-[var(--rw-green)] shrink-0" />
              <p className="text-base sm:text-lg text-gray-300 leading-relaxed text-pretty">
                {t('about_page.hero_lead')}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-[var(--rw-dark)] bg-white rounded-xl hover:bg-gray-50 transition-all shadow-[0_12px_36px_-12px_rgba(0,161,222,0.5)]"
            >
              {t('about_page.cta_signin')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a
              href="#about-challenge"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white border border-white/18 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all backdrop-blur-sm"
            >
              {t('about_page.challenge_title')}
              <ArrowUpRight className="ml-2 h-4 w-4 opacity-90" />
            </a>
          </div>
        </div>
      </section>

      {/* The Problem We Solve */}
      <section id="about-challenge" className="py-16 sm:py-20 bg-white scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50 to-white shadow-sm">
              <Target className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{t('about_page.challenge_title')}</h2>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed max-w-3xl text-[17px] sm:text-lg mb-8 sm:mb-10">{t('about_page.challenge_intro')}</p>

          <div className="grid gap-3 sm:gap-4">
            {[t('about_page.challenge_q1'), t('about_page.challenge_q2'), t('about_page.challenge_q3')].map((q) => (
              <div
                key={q}
                className="group flex gap-4 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-gray-50/80 to-white p-4 sm:p-5 shadow-[0_2px_24px_-12px_rgba(0,0,0,0.06)] transition-colors hover:border-[var(--rw-blue)]/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                  <HelpCircle className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-gray-800 text-[15px] sm:text-base leading-relaxed pt-0.5">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What FSFI Does */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-slate-50 via-gray-50/80 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--rw-blue)]/25 bg-[var(--rw-blue)]/10 shadow-sm">
              <Lightbulb className="h-6 w-6 text-[var(--rw-blue)]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{t('about_page.provides_title')}</h2>
          </div>

          <p className="text-gray-600 leading-relaxed max-w-3xl text-[17px] sm:text-lg mb-10">{t('about_page.provides_fsfsi')}</p>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
            {[
              { icon: BarChart3, iconClass: 'text-[var(--rw-blue)]', title: t('about_page.card_assess_title'), body: t('about_page.card_assess_body') },
              { icon: TrendingDown, iconClass: 'text-[var(--rw-green)]', title: t('about_page.card_gaps_title'), body: t('about_page.card_gaps_body') },
              { icon: DollarSign, iconClass: 'text-[var(--rw-yellow)]', title: t('about_page.card_invest_title'), body: t('about_page.card_invest_body') },
              { icon: Target, iconClass: 'text-[var(--rw-blue)]', title: t('about_page.card_track_title'), body: t('about_page.card_track_body') },
            ].map(({ icon: Icon, iconClass, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_2px_28px_-14px_rgba(0,0,0,0.08)] transition-all hover:border-[var(--rw-blue)]/25 hover:shadow-[0_12px_40px_-20px_rgba(0,161,222,0.12)]"
              >
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
                    <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden />
                  </span>
                  {title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The 8 Indicator Components */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--rw-green)]/25 bg-[var(--rw-green)]/10 shadow-sm">
              <Layers className="h-6 w-6 text-[var(--rw-green)]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{t('about_page.components_title')}</h2>
          </div>

          <p className="text-gray-600 leading-relaxed max-w-3xl text-[17px] sm:text-lg mb-10">
            {t('about_page.components_intro')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {INDICATOR_COMPONENTS.map((comp) => (
              <div
                key={comp.name}
                className="group rounded-2xl border border-gray-200/80 bg-gradient-to-b from-gray-50/90 to-white p-4 sm:p-5 text-center shadow-[0_2px_20px_-12px_rgba(0,0,0,0.06)] transition-all hover:border-[var(--rw-green)]/30 hover:shadow-[0_8px_28px_-12px_rgba(32,96,61,0.12)]"
              >
                <div className={`w-3.5 h-3.5 rounded-full ${comp.color} mx-auto mb-3 ring-2 ring-white shadow-sm`} />
                <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">{comp.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Government Uses It */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-slate-50/90">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-10 shadow-[0_4px_40px_-16px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 sm:mb-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--rw-yellow)]/35 bg-[var(--rw-yellow)]/15 shadow-sm">
                <Building2 className="h-6 w-6 text-[var(--rw-yellow)]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{t('about_page.gov_title')}</h2>
            </div>

            <div className="space-y-0 divide-y divide-gray-100">
              {[
                { title: t('about_page.gov_budget_title'), body: t('about_page.gov_budget_body') },
                { title: t('about_page.gov_perf_title'), body: t('about_page.gov_perf_body') },
                { title: t('about_page.gov_adv_title'), body: t('about_page.gov_adv_body') },
              ].map(({ title, body }) => (
                <div key={title} className="flex gap-4 py-6 first:pt-0 last:pb-0 items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--rw-green)]/10">
                    <CheckCircle2 className="h-5 w-5 text-[var(--rw-green)]" aria-hidden />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h4 className="font-semibold text-gray-900">{title}</h4>
                    <p className="text-gray-600 text-sm mt-2 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partnership */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-200/80 bg-indigo-50 shadow-sm">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{t('about_page.partners_title')}</h2>
          </div>

          <p className="text-gray-600 leading-relaxed max-w-3xl text-[17px] sm:text-lg mb-10">{t('about_page.partners_intro')}</p>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: Building2, iconWrap: 'bg-[var(--rw-blue)]/10 text-[var(--rw-blue)]', name: 'Akademiya2063', sub: 'Pan-African research organization' },
              { icon: BookOpen, iconWrap: 'bg-[var(--rw-green)]/10 text-[var(--rw-green)]', name: 'IFPRI', sub: 'International Food Policy Research Institute' },
              { icon: GraduationCap, iconWrap: 'bg-purple-100 text-purple-600', name: 'McGill University', sub: 'Institute for the Study of International Development' },
            ].map(({ icon: Icon, iconWrap, name, sub }) => (
              <div
                key={name}
                className="rounded-2xl border border-gray-200/80 bg-gradient-to-b from-gray-50/80 to-white p-6 sm:p-7 text-center shadow-[0_2px_24px_-14px_rgba(0,0,0,0.06)] transition-all hover:border-[var(--rw-blue)]/20 hover:shadow-[0_12px_36px_-18px_rgba(0,161,222,0.1)]"
              >
                <div className={`w-16 h-16 ${iconWrap} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="h-8 w-8" aria-hidden />
                </div>
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-[var(--rw-yellow)]/20 blur-2xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">
            {t('about_page.cta_title')}
          </h2>
          <p className="text-base sm:text-lg text-white/85 max-w-xl mx-auto mb-9 leading-relaxed">
            {t('about_page.cta_body')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-[var(--rw-blue)] bg-white rounded-xl hover:bg-gray-50 transition-all shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]"
            >
              {t('about_page.cta_signin')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border border-white/35 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-sm transition-all"
            >
              {t('about_page.cta_home')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--rw-dark)] py-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <RwandaLogo size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{t('app.platform_name')}</p>
                <p className="text-xs text-gray-400">{t('app.ministry')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">{t('nav.home')}</Link>
              <Link href="/login" className="hover:text-white transition-colors">{t('auth.sign_in')}</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {t('app.platform_name')}. {t('app.ministry')}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
