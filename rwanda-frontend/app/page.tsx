'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/rwanda/shared/LanguageToggle';
import { RwandaLogo } from '@/components/rwanda/shared/RwandaLogo';
import {
  ArrowRight,
  BarChart3,
  Shield,
  Map,
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
    description: 'Comprehensive food system financial intelligence scoring across all 30 districts.',
  },
  {
    icon: Map,
    title: 'Geographic Drill-Down',
    description: 'Province and district-level analysis with interactive mapping of vulnerability.',
  },
  {
    icon: DollarSign,
    title: 'Budget Optimization',
    description: 'Data-driven budget allocation recommendations aligned to national priorities.',
  },
  {
    icon: TrendingUp,
    title: 'Performance Gap Analysis',
    description: 'Identify gaps, track progress, and benchmark against peer districts.',
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

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--rw-dark)] min-h-[90vh] flex items-center">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--rw-blue)]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--rw-green)]/10 blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-[var(--rw-yellow)]/5 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text content */}
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm border border-white/10 text-[var(--rw-blue)] px-4 py-2 rounded-full text-sm font-medium mb-8">
                <div className="w-2 h-2 rounded-full bg-[var(--rw-blue)] animate-pulse" />
                <span className="text-gray-300">{t('app.ministry')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                Food Systems
                <br />
                <span className="bg-gradient-to-r from-[var(--rw-blue)] via-[var(--rw-yellow)] to-[var(--rw-green)] bg-clip-text text-transparent">
                  Financial Intelligence
                </span>
              </h1>

              <p className="mt-6 text-lg text-gray-400 leading-relaxed max-w-xl">
                Transforming how Rwanda invests in food security. Real-time analytics
                across every province, district, and season — powering PSTA 5 goals
                with evidence-based decisions.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-[var(--rw-dark)] bg-white rounded-xl hover:bg-gray-100 transition-all shadow-2xl shadow-white/10 group"
                >
                  Access Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-gray-300 border border-white/15 rounded-xl hover:bg-white/5 hover:text-white transition-all backdrop-blur-sm"
                >
                  Explore Platform
                </a>
              </div>
            </div>

            {/* Right: Visual dashboard preview */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Outer glow */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[var(--rw-blue)]/20 via-transparent to-[var(--rw-green)]/20 rounded-3xl blur-2xl" />

                {/* Main card */}
                <div className="relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-5">
                  {/* Mock top bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--risk-low)]" />
                      <span className="text-xs text-gray-500 font-medium">National FSFI Score</span>
                    </div>
                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-1 rounded">FY 2025/2026</span>
                  </div>

                  {/* Score display */}
                  <div className="flex items-end space-x-4">
                    <span className="text-6xl font-bold text-white tracking-tight">0.42</span>
                    <div className="pb-2">
                      <span className="inline-flex items-center text-emerald-400 text-sm font-semibold">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        -3.2%
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">vs last year</p>
                    </div>
                  </div>

                  {/* Province mini bars */}
                  <div className="space-y-3 pt-2">
                    {[
                      { name: 'Kigali City', score: 0.28, color: 'var(--risk-low)' },
                      { name: 'Eastern', score: 0.51, color: 'var(--risk-high)' },
                      { name: 'Northern', score: 0.38, color: 'var(--risk-moderate)' },
                      { name: 'Southern', score: 0.55, color: 'var(--risk-high)' },
                      { name: 'Western', score: 0.47, color: 'var(--risk-moderate)' },
                    ].map((prov) => (
                      <div key={prov.name} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{prov.name}</span>
                          <span className="text-xs font-mono font-semibold text-gray-300">{prov.score.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${prov.score * 100}%`, backgroundColor: prov.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom pills */}
                  <div className="flex items-center gap-2 pt-2">
                    {[
                      { icon: Wheat, label: 'Season B Active', color: 'text-[var(--rw-yellow)]' },
                      { icon: Activity, label: '2 Critical Alerts', color: 'text-red-400' },
                      { icon: Layers, label: '8 Components', color: 'text-[var(--rw-blue)]' },
                    ].map((pill) => {
                      const Icon = pill.icon;
                      return (
                        <div key={pill.label} className="flex items-center space-x-1.5 bg-white/5 border border-white/5 rounded-full px-3 py-1.5">
                          <Icon className={`h-3 w-3 ${pill.color}`} />
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{pill.label}</span>
                        </div>
                      );
                    })}
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
            A comprehensive platform designed for MINAGRI, MINECOFIN, RAB, and district officials
            to make data-driven food system investment decisions.
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
