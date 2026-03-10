'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
import {
  ArrowRight,
  BarChart3,
  Shield,
  TrendingUp,
  DollarSign,
  Target,
  Sun,
  FileText,
  Wheat,
  Activity,
  Layers,
} from 'lucide-react';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'FSFI Assessment',
    description: 'National food system financial intelligence scoring at indicator level (37 indicators, 8 components).',
  },
  {
    icon: DollarSign,
    title: 'Budget Optimization',
    description: 'Data-driven budget allocation recommendations aligned to national priorities.',
  },
  {
    icon: TrendingUp,
    title: 'Performance Gap Analysis',
    description: 'Identify gaps, track progress, and benchmark against global and national targets.',
  },
  {
    icon: Target,
    title: 'PSTA 5 Alignment',
    description: 'Track progress toward Rwanda\'s Fifth Strategic Plan for Agriculture Transformation.',
  },
  {
    icon: Sun,
    title: 'Seasonal Intelligence',
    description: 'Season A, B, and C crop calendar integration with financial analytics.',
  },
];

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

      {/* Hero Section — FSFI rebrand */}
      <section className="relative overflow-hidden bg-[var(--rw-dark)] min-h-[85vh] flex items-center">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-[var(--rw-blue)]/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[60%] bg-gradient-to-tr from-[var(--rw-green)]/5 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Copy */}
            <div className="relative pl-0 lg:pl-4">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-[var(--rw-blue)] via-[var(--rw-yellow)] to-[var(--rw-green)] hidden lg:block" />

              <p className="text-[var(--rw-blue)] font-semibold text-sm uppercase tracking-widest mb-6">
                {t('app.ministry')} · Rwanda
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-6xl font-bold text-white leading-[1.08] tracking-tight">
                <span className="block whitespace-nowrap">Where budget meets</span>
                <span className="block text-[var(--rw-yellow)] whitespace-nowrap">food system impact</span>
              </h1>

              <p className="mt-5 text-lg text-gray-400 max-w-md">
                Scores, gaps, and recommendations from national budget and indicator data.
              </p>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[var(--rw-blue)]" />
                  37 indicators · 8 components
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-[var(--rw-green)]" />
                  PSTA 5
                </span>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-[var(--rw-dark)] bg-white rounded-xl hover:bg-gray-100 transition-all shadow-lg group"
                >
                  Sign in to dashboard
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white/90 border border-white/20 rounded-xl hover:bg-white/10 transition-all"
                >
                  See what it does
                </a>
              </div>
            </div>

            {/* Right: Product card */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-br from-[var(--rw-blue)]/15 to-[var(--rw-green)]/15 rounded-3xl blur-2xl" />
                <div className="relative bg-[var(--rw-dark)]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-semibold text-gray-300">FSFI at a glance</span>
                    <span className="text-xs text-gray-500 bg-white/5 px-2.5 py-1 rounded-md">National</span>
                  </div>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-5xl font-bold text-white tabular-nums">FSFI</span>
                    <span className="text-2xl font-semibold text-[var(--rw-yellow)]">score</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-5">
                    Scores · Gaps · Optimization
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: BarChart3, label: 'Assessment' },
                      { icon: TrendingUp, label: 'Gap analysis' },
                      { icon: DollarSign, label: 'Optimization' },
                    ].map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                      >
                        <Icon className="h-4 w-4 text-[var(--rw-blue)]" />
                        <span className="text-xs font-medium text-gray-400">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Intelligence for Better Decisions
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            A comprehensive platform designed for MINAGRI, MINECOFIN, RAB, and sector officials
            to make data-driven food system investment decisions at national and indicator level.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--rw-blue)]/30 transition-all group"
              >
                <div className="w-12 h-12 bg-[var(--rw-blue)]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--rw-blue)]/20 transition-colors">
                  <Icon className="h-6 w-6 text-[var(--rw-blue)]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stakeholders */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Built for Government
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Serving key stakeholders across Rwanda&apos;s agriculture and finance ecosystem.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'MINAGRI', role: 'Policy & budget decisions', color: 'var(--rw-blue)' },
              { name: 'MINECOFIN', role: 'Budget approval & fiscal oversight', color: 'var(--rw-green)' },
              { name: 'RAB', role: 'Implementation & monitoring', color: 'var(--rw-yellow)' },
              { name: 'NISR', role: 'Data provider & validation', color: 'var(--rw-blue)' },
              { name: 'District Mayors', role: 'Local-level decision making', color: 'var(--rw-green)' },
              { name: 'RDB', role: 'Investment & private sector', color: 'var(--rw-yellow)' },
            ].map((stakeholder) => (
              <div
                key={stakeholder.name}
                className="bg-white rounded-lg p-5 border border-gray-200 flex items-start space-x-4"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                  style={{ backgroundColor: stakeholder.color }}
                >
                  {stakeholder.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{stakeholder.name}</h3>
                  <p className="text-sm text-gray-600">{stakeholder.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Access the FSFI Dashboard?
          </h2>
          <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
            Sign in with your government credentials to explore Rwanda&apos;s food system financial intelligence data.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-[var(--rw-blue)] bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-lg group"
          >
            <Shield className="mr-2 h-5 w-5" />
            {t('auth.sign_in')}
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--rw-dark)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <RwandaLogo size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{t('app.republic')}</p>
                <p className="text-xs text-gray-400">{t('app.ministry')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <Link href="/login" className="hover:text-white transition-colors">{t('auth.sign_in')}</Link>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {t('app.republic')} — {t('app.subtitle')}
            </p>
            <p className="text-xs text-gray-500">
              <FileText className="inline h-3 w-3 mr-1" />
              Powered by FSFI Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
