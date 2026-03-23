'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
import { PartnerLogo } from '@/components/rwanda/shared/PartnerLogo';
import akademiaLogo from '@/assets/partners/akademia2063_logo.png';
import ifpriLogo from '@/assets/partners/ifpri_logo.webp';
import mcgillLogo from '@/assets/partners/mcgill_logo.png';
import {
  ArrowRight,
  BarChart3,
  LineChart,
  Scale,
  Target,
  ArrowUpRight,
} from 'lucide-react';

export default function LandingPage() {
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
              <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
                {t('nav.about')}
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
      <section className="relative bg-[var(--rw-dark)] min-h-[80vh] flex items-center">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-3xl">
            <p className="text-[var(--rw-blue)] font-medium text-sm uppercase tracking-widest mb-6">
              {t('app.subtitle')}
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {t('landing.hero_title_1')}
              <span className="block text-[var(--rw-yellow)] mt-2">{t('landing.hero_title_2')}</span>
            </h1>

            <div className="mt-6 text-lg text-gray-400 max-w-2xl space-y-4">
              <p>{t('landing.hero_p1')}</p>
              <p>{t('landing.hero_p2')}</p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-4 text-base font-semibold text-[var(--rw-dark)] bg-white rounded-xl hover:bg-gray-100 transition-all shadow-lg group"
              >
                {t('landing.hero_cta_dashboard')}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-6 py-4 text-base font-semibold text-white/90 border border-white/20 rounded-xl hover:bg-white/10 transition-all"
              >
                {t('landing.hero_cta_about')}
                <ArrowUpRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platform capabilities (rwanda_backend) */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('landing.features_title')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-10 xl:gap-8">
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-md mx-auto sm:mx-0">
              <div className="w-14 h-14 bg-[var(--rw-blue)]/10 rounded-2xl flex items-center justify-center mb-4 shrink-0 sm:mx-0 mx-auto">
                <BarChart3 className="h-7 w-7 text-[var(--rw-blue)]" aria-hidden />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                {t('landing.feature1_title')}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('landing.feature1_desc')}
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-md mx-auto sm:mx-0">
              <div className="w-14 h-14 bg-[var(--rw-green)]/10 rounded-2xl flex items-center justify-center mb-4 shrink-0 sm:mx-0 mx-auto">
                <LineChart className="h-7 w-7 text-[var(--rw-green)]" aria-hidden />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                {t('landing.feature2_title')}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('landing.feature2_desc')}
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-md mx-auto sm:mx-0">
              <div className="w-14 h-14 bg-[var(--rw-yellow)]/20 rounded-2xl flex items-center justify-center mb-4 shrink-0 sm:mx-0 mx-auto">
                <Scale className="h-7 w-7 text-[var(--rw-yellow)]" aria-hidden />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                {t('landing.feature3_title')}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('landing.feature3_desc')}
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-md mx-auto sm:mx-0">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 shrink-0 sm:mx-0 mx-auto">
                <Target className="h-7 w-7 text-purple-600" aria-hidden />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                {t('landing.feature4_title')}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('landing.feature4_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Components Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('landing.components_title')}</h2>
              <p className="text-gray-600 mt-1">{t('landing.components_sub')}</p>
            </div>
            <Link
              href="/about"
              className="inline-flex items-center text-sm font-medium text-[var(--rw-blue)] hover:underline"
            >
              {t('landing.learn_more')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Crop Production', color: 'bg-green-500' },
              { name: 'Animal Systems', color: 'bg-pink-500' },
              { name: 'Post-Harvest', color: 'bg-yellow-500' },
              { name: 'Markets', color: 'bg-blue-500' },
              { name: 'Nutrition', color: 'bg-orange-500' },
              { name: 'Finance', color: 'bg-indigo-500' },
              { name: 'Research', color: 'bg-purple-500' },
              { name: 'Environment', color: 'bg-teal-500' },
            ].map((comp) => (
              <div
                key={comp.name}
                className="bg-white rounded-lg p-4 border border-gray-200 flex items-center gap-3"
              >
                <div className={`w-3 h-3 rounded-full ${comp.color}`} />
                <span className="text-sm font-medium text-gray-900">{comp.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership logos: static import so Next serves them from /_next/static/media/ */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 mb-10">{t('landing.partnership')}</p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-8 md:gap-x-16 md:gap-y-10">
            <PartnerLogo
              image={akademiaLogo}
              label="Akademiya2063"
              href="https://www.akademiya2063.org/"
            />
            <PartnerLogo image={ifpriLogo} label="IFPRI" href="https://www.ifpri.org/" />
            <PartnerLogo image={mcgillLogo} label="McGill University" href="https://www.mcgill.ca/" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('landing.cta_access_title')}
          </h2>
          <p className="text-lg text-white/80 mb-8">
            {t('landing.cta_access_body')}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-8 py-4 text-base font-semibold text-[var(--rw-blue)] bg-white rounded-xl hover:bg-gray-50 transition-colors shadow-lg"
          >
            {t('auth.sign_in')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--rw-dark)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <RwandaLogo size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{t('app.republic')}</p>
                <p className="text-xs text-gray-400">{t('app.ministry')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
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
