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
      <nav className="bg-[var(--rw-dark)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <RwandaLogo size="sm" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-white leading-tight">{t('app.republic')}</h1>
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
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[var(--rw-blue)] rounded-lg hover:bg-[#008bbf] transition-colors"
              >
                {t('auth.sign_in')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--rw-dark)] to-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('about_page.back')}
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            {t('about_page.h1_about')}{' '}
            <span className="text-[var(--rw-yellow)]">{t('about_page.h1_fsfi')}</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t('about_page.hero_lead')}
          </p>
        </div>
      </section>

      {/* The Problem We Solve */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Target className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('about_page.challenge_title')}</h2>
          </div>
          <div className="prose prose-lg max-w-none text-gray-600">
            <p>{t('about_page.challenge_intro')}</p>
            <ul className="space-y-2 mt-4">
              <li className="flex items-start gap-3">
                <span className="text-red-500 mt-1">?</span>
                <span>{t('about_page.challenge_q1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-500 mt-1">?</span>
                <span>{t('about_page.challenge_q2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-500 mt-1">?</span>
                <span>{t('about_page.challenge_q3')}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* What FSFI Does */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--rw-blue)]/10 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-[var(--rw-blue)]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('about_page.provides_title')}</h2>
          </div>

          <p className="text-gray-600 mb-6">{t('about_page.provides_fsfsi')}</p>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
                {t('about_page.card_assess_title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t('about_page.card_assess_body')}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-[var(--rw-green)]" />
                {t('about_page.card_gaps_title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t('about_page.card_gaps_body')}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[var(--rw-yellow)]" />
                {t('about_page.card_invest_title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t('about_page.card_invest_body')}</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-[var(--rw-blue)]" />
                {t('about_page.card_track_title')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t('about_page.card_track_body')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* The 8 Indicator Components */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--rw-green)]/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-[var(--rw-green)]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">8 Indicator Components</h2>
          </div>

          <p className="text-gray-600 mb-8">
            Rwanda&apos;s food system is assessed across 8 indicator components identified
            in the country&apos;s context, aligned with PSTA 5 national priorities.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {INDICATOR_COMPONENTS.map((comp) => (
              <div
                key={comp.name}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center"
              >
                <div className={`w-4 h-4 rounded-full ${comp.color} mx-auto mb-3`} />
                <p className="text-sm font-medium text-gray-900">{comp.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Government Uses It */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--rw-yellow)]/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[var(--rw-yellow)]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('about_page.gov_title')}</h2>
          </div>

          <div className="space-y-6 mt-8">
            <div className="flex gap-4 items-start">
              <CheckCircle2 className="h-6 w-6 text-[var(--rw-green)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">{t('about_page.gov_budget_title')}</h4>
                <p className="text-gray-600 text-sm mt-1">{t('about_page.gov_budget_body')}</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <CheckCircle2 className="h-6 w-6 text-[var(--rw-green)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">{t('about_page.gov_perf_title')}</h4>
                <p className="text-gray-600 text-sm mt-1">{t('about_page.gov_perf_body')}</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <CheckCircle2 className="h-6 w-6 text-[var(--rw-green)] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">{t('about_page.gov_adv_title')}</h4>
                <p className="text-gray-600 text-sm mt-1">{t('about_page.gov_adv_body')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('about_page.partners_title')}</h2>
          </div>

          <p className="text-gray-600 mb-8">{t('about_page.partners_intro')}</p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-[var(--rw-blue)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-[var(--rw-blue)]" />
              </div>
              <h3 className="font-semibold text-gray-900">Akademiya2063</h3>
              <p className="text-sm text-gray-500 mt-2">
                Pan-African research organization
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-[var(--rw-green)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-[var(--rw-green)]" />
              </div>
              <h3 className="font-semibold text-gray-900">IFPRI</h3>
              <p className="text-sm text-gray-500 mt-2">
                International Food Policy Research Institute
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">McGill University</h3>
              <p className="text-sm text-gray-500 mt-2">
                Institute for the Study of International Development
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('about_page.cta_title')}
          </h2>
          <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
            {t('about_page.cta_body')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-[var(--rw-blue)] bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
            >
              {t('about_page.cta_signin')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
            >
              {t('about_page.cta_home')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--rw-dark)] py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <RwandaLogo size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{t('app.republic')}</p>
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
              &copy; {new Date().getFullYear()} {t('app.republic')}. {t('about_page.footer_line')}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
