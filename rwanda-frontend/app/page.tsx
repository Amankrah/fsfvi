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
  Landmark,
  Layers,
} from 'lucide-react';

export default function LandingPage() {
  const { t } = useLanguage();

  const featureBlocks = [
    {
      Icon: BarChart3,
      iconClass: 'bg-[var(--rw-blue)]/12 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15',
      title: t('landing.feature1_title'),
      desc: t('landing.feature1_desc'),
    },
    {
      Icon: LineChart,
      iconClass: 'bg-[var(--rw-green)]/12 text-[var(--rw-green)] ring-1 ring-[var(--rw-green)]/15',
      title: t('landing.feature2_title'),
      desc: t('landing.feature2_desc'),
    },
    {
      Icon: Scale,
      iconClass: 'bg-[var(--rw-yellow)]/20 text-amber-900 ring-1 ring-[var(--rw-yellow)]/30',
      title: t('landing.feature3_title'),
      desc: t('landing.feature3_desc'),
    },
    {
      Icon: Target,
      iconClass: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200/90',
      title: t('landing.feature4_title'),
      desc: t('landing.feature4_desc'),
    },
  ];

  const componentItems = [
    { name: 'Crop Production', color: 'bg-green-500' },
    { name: 'Animal Systems', color: 'bg-pink-500' },
    { name: 'Post-Harvest', color: 'bg-yellow-500' },
    { name: 'Markets', color: 'bg-blue-500' },
    { name: 'Nutrition', color: 'bg-orange-500' },
    { name: 'Finance', color: 'bg-indigo-500' },
    { name: 'Research', color: 'bg-purple-500' },
    { name: 'Environment', color: 'bg-teal-500' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[var(--rw-dark)]/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md supports-[backdrop-filter]:bg-[var(--rw-dark)]/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-3 min-w-0 rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rw-blue)]">
              <RwandaLogo size="sm" />
              <div className="hidden sm:block min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">{t('app.platform_name')}</p>
                <p className="text-xs text-gray-400 leading-tight truncate">{t('app.ministry')}</p>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <Link
                href="/about"
                className="text-sm text-gray-300 hover:text-white transition-colors px-1 whitespace-nowrap"
              >
                {t('nav.about')}
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
      <section className="relative overflow-hidden bg-[var(--rw-dark)] min-h-[min(92vh,880px)] flex items-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 -right-24 h-[min(480px,55vw)] w-[min(480px,55vw)] rounded-full bg-[var(--rw-blue)]/[0.22] blur-[120px]" />
          <div className="absolute -bottom-32 left-[10%] h-[380px] w-[380px] rounded-full bg-[var(--rw-green)]/[0.18] blur-[100px]" />
          <div className="absolute top-1/3 right-[8%] h-[240px] w-[240px] rounded-full bg-[var(--rw-yellow)]/[0.12] blur-[72px]" />
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 30% 40%, black 20%, transparent 70%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#12141f] to-transparent opacity-80" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 xl:gap-14 items-center">
            <div className="lg:col-span-7 xl:col-span-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--rw-blue)]/35 bg-[var(--rw-blue)]/[0.12] px-3.5 py-1.5 sm:px-4 sm:py-2 mb-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
                <Landmark className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--rw-blue)] shrink-0" aria-hidden />
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rw-blue)]">
                  {t('landing.hero_kicker')}
                </span>
              </div>

              <h1 className="text-[2rem] leading-[1.12] sm:text-5xl sm:leading-[1.08] lg:text-6xl lg:leading-[1.05] xl:text-[3.5rem] font-bold tracking-tight text-white">
                <span className="block">{t('landing.hero_title_1')}</span>
                <span className="mt-3 sm:mt-4 block text-[var(--rw-yellow)] [text-shadow:0_2px_40px_rgba(250,210,1,0.18)]">
                  {t('landing.hero_title_2')}
                </span>
              </h1>

              <div className="mt-8 sm:mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)] p-5 sm:p-7 space-y-4 max-w-xl lg:max-w-none">
                <div className="flex items-start gap-4">
                  <span className="mt-1 hidden sm:block w-1 self-stretch min-h-[3rem] rounded-full bg-gradient-to-b from-[var(--rw-blue)] to-[var(--rw-green)] shrink-0" />
                  <div className="space-y-4 text-[15px] sm:text-base leading-relaxed text-gray-300">
                    <p className="text-pretty">{t('landing.hero_p1')}</p>
                    <p className="text-pretty text-gray-400/95">{t('landing.hero_p2')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-9 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center px-6 py-3.5 sm:py-4 text-base font-semibold text-[var(--rw-dark)] bg-white rounded-xl hover:bg-gray-50 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_40px_-12px_rgba(0,161,222,0.45)]"
                >
                  {t('landing.hero_cta_dashboard')}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center px-6 py-3.5 sm:py-4 text-base font-semibold text-white border border-white/18 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 transition-all backdrop-blur-sm"
                >
                  {t('landing.hero_cta_about')}
                  <ArrowUpRight className="ml-2 h-5 w-5 opacity-90" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-6 lg:justify-self-end w-full max-w-md lg:max-w-none">
              <div className="relative mx-auto lg:mr-0">
                <div
                  className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--rw-blue)]/20 via-transparent to-[var(--rw-yellow)]/10 blur-2xl opacity-90"
                  aria-hidden
                />
                <div className="relative rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 sm:p-8 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-6">
                    {t('landing.hero_panel_caption')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="rounded-xl border border-white/[0.06] bg-[var(--rw-dark)]/40 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" aria-hidden />
                        <span className="text-2xl sm:text-3xl font-bold tabular-nums text-white tracking-tight">37</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 leading-snug">{t('landing.hero_metric_indicators')}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-[var(--rw-dark)]/40 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Layers className="h-5 w-5 text-[var(--rw-green)]" aria-hidden />
                        <span className="text-2xl sm:text-3xl font-bold tabular-nums text-white tracking-tight">8</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 leading-snug">{t('landing.hero_metric_components')}</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-white/[0.08] flex flex-wrap gap-2">
                    {[
                      { label: 'PSTA 5', color: 'bg-[var(--rw-blue)]/25 text-[var(--rw-blue)] border-[var(--rw-blue)]/30' },
                      { label: 'FY 2018+', color: 'bg-white/5 text-gray-300 border-white/10' },
                      { label: 'FSFSI', color: 'bg-[var(--rw-yellow)]/15 text-[var(--rw-yellow)] border-[var(--rw-yellow)]/25' },
                    ].map((chip) => (
                      <span
                        key={chip.label}
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${chip.color}`}
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform capabilities */}
      <section className="relative py-20 sm:py-28 overflow-hidden border-t border-gray-200/60">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(0,161,222,0.07),transparent_55%),radial-gradient(ellipse_50%_40%_at_100%_50%,rgba(32,96,61,0.05),transparent_50%)]"
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rw-blue)] mb-3">FSFI</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-balance">
              {t('landing.features_title')}
            </h2>
            <div className="mx-auto mt-5 h-1 w-12 rounded-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)]" aria-hidden />
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {featureBlocks.map((item, i) => {
              const ItemIcon = item.Icon;
              return (
              <div
                key={item.title}
                className="group relative rounded-2xl border border-gray-200/90 bg-white p-6 sm:p-7 shadow-[0_2px_28px_-14px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-[var(--rw-blue)]/25 hover:shadow-[0_20px_50px_-24px_rgba(0,161,222,0.18)]"
              >
                <span className="absolute right-4 top-4 text-[11px] font-bold tabular-nums text-gray-200 transition-colors group-hover:text-[var(--rw-blue)]/25">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.iconClass} mb-5`}>
                  <ItemIcon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-lg leading-snug pr-8">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Components Preview */}
      <section className="relative py-20 sm:py-24 overflow-hidden bg-gradient-to-b from-slate-100/90 via-white to-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_20%_30%,rgba(0,161,222,0.08),transparent_45%),radial-gradient(circle_at_90%_70%,rgba(32,96,61,0.06),transparent_40%)]" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-10 lg:p-12 shadow-[0_4px_48px_-20px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-10 sm:mb-12">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--rw-green)]/25 bg-[var(--rw-green)]/8 px-3 py-1 mb-4">
                  <Layers className="h-3.5 w-3.5 text-[var(--rw-green)]" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--rw-green)]">
                    {t('landing.components_chip')}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 text-balance">
                  {t('landing.components_title')}
                </h2>
                <p className="text-gray-600 mt-3 text-[17px] leading-relaxed">{t('landing.components_sub')}</p>
              </div>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 self-start lg:self-auto px-5 py-2.5 text-sm font-semibold text-[var(--rw-blue)] bg-[var(--rw-blue)]/10 rounded-xl border border-[var(--rw-blue)]/25 hover:bg-[var(--rw-blue)]/15 hover:border-[var(--rw-blue)]/35 transition-all shrink-0"
              >
                {t('landing.learn_more')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
              {componentItems.map((comp) => (
                <div
                  key={comp.name}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200/90 bg-gray-50/50 px-3 py-3 sm:px-4 sm:py-3.5 transition-all hover:border-[var(--rw-blue)]/25 hover:bg-white hover:shadow-[0_8px_28px_-16px_rgba(0,161,222,0.12)]"
                >
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${comp.color} ring-2 ring-white shadow-sm`} />
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">{comp.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partnership */}
      <section className="relative py-20 sm:py-24 bg-white border-t border-gray-200/60 overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-[min(100%,72rem)] bg-gradient-to-r from-transparent via-gray-200 to-transparent" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 sm:mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-2">{t('landing.partnership')}</p>
            <div className="h-1 w-10 rounded-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] mx-auto" aria-hidden />
          </div>

          <div className="rounded-3xl border border-gray-200/90 bg-gradient-to-b from-gray-50/90 to-white px-6 py-12 sm:px-12 sm:py-14 shadow-[0_4px_40px_-20px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-10 md:gap-x-20 md:gap-y-12">
              <PartnerLogo
                image={akademiaLogo}
                label="Akademiya2063"
                href="https://www.akademiya2063.org/"
              />
              <PartnerLogo image={ifpriLogo} label="IFPRI" href="https://www.ifpri.org/" />
              <PartnerLogo image={mcgillLogo} label="McGill University" href="https://www.mcgill.ca/" />
            </div>
          </div>

          {/* Attribution */}
          <div className="mt-16 sm:mt-20 max-w-3xl mx-auto">
            <div className="rounded-3xl border border-gray-200/80 bg-white p-8 sm:p-10 shadow-[0_2px_32px_-16px_rgba(0,0,0,0.06)]">
              <p className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--rw-blue)] mb-4">
                About FSFI
              </p>
              <p className="text-center text-sm sm:text-base text-gray-600 leading-relaxed text-pretty">
                The <span className="font-semibold text-gray-800">Food Systems Financing Intelligence (FSFI)</span> initiative
                was established to help countries align their financial commitments and investments
                with food systems transformation goals.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-10">
                {[
                  {
                    name: 'John Ulimwengu',
                    affiliation: 'IFPRI',
                    href: 'https://www.ifpri.org/profile/john-ulimwengu/',
                    initials: 'JU',
                    color: 'bg-[var(--rw-blue)]/10 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15',
                  },
                  {
                    name: 'Emmanuel A. Kwofie',
                    affiliation: 'McGill University',
                    href: 'https://www.eakwofie.com/',
                    initials: 'EK',
                    color: 'bg-[var(--rw-green)]/10 text-[var(--rw-green)] ring-1 ring-[var(--rw-green)]/15',
                  },
                  {
                    name: 'Ebenezer M. Kwofie',
                    affiliation: 'McGill University',
                    href: 'https://www.mcgill.ca/bioeng/kwofie-ebenezer-miezah',
                    initials: 'EK',
                    color: 'bg-[var(--rw-yellow)]/20 text-amber-800 ring-1 ring-[var(--rw-yellow)]/25',
                  },
                ].map((person) => (
                  <a
                    key={person.name}
                    href={person.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center text-center rounded-2xl border border-gray-100 bg-gray-50/80 p-5 transition-all hover:border-[var(--rw-blue)]/25 hover:bg-white hover:shadow-[0_12px_36px_-20px_rgba(0,161,222,0.12)]"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold mb-3 ${person.color}`}>
                      {person.initials}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-[var(--rw-blue)] transition-colors leading-tight">
                      {person.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5">{person.affiliation}</p>
                  </a>
                ))}
              </div>

              <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed max-w-xl mx-auto">
                This platform was developed under an{' '}
                <span className="font-medium text-gray-600">IFAD grant</span> through{' '}
                <a
                  href="https://www.akademiya2063.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--rw-blue)] hover:underline underline-offset-2"
                >
                  AKADEMIYA2063
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)] py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden>
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-[var(--rw-yellow)]/25 blur-2xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight text-balance">
            {t('landing.cta_access_title')}
          </h2>
          <p className="text-base sm:text-lg text-white/85 mb-9 leading-relaxed max-w-lg mx-auto">
            {t('landing.cta_access_body')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-[var(--rw-blue)] bg-white rounded-xl hover:bg-gray-50 transition-all shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] w-full sm:w-auto"
            >
              {t('auth.sign_in')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border border-white/35 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-sm transition-all w-full sm:w-auto"
            >
              {t('nav.about')}
              <ArrowUpRight className="ml-2 h-5 w-5 opacity-95" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--rw-dark)] py-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <RwandaLogo size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{t('app.platform_name')}</p>
                <p className="text-xs text-gray-400">{t('app.ministry')}</p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-gray-400">
              <Link href="/about" className="hover:text-white transition-colors">{t('nav.about')}</Link>
              <Link href="/login" className="hover:text-white transition-colors">{t('auth.sign_in')}</Link>
            </nav>
          </div>
          <div className="mt-10 pt-8 border-t border-white/10 text-center space-y-3">
            <p className="text-xs text-gray-500">
              FSFI established by{' '}
              <a href="https://www.ifpri.org/profile/john-ulimwengu/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">John Ulimwengu</a>
              {' '}(IFPRI),{' '}
              <a href="https://www.eakwofie.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Emmanuel A. Kwofie</a>
              {' '}&amp;{' '}
              <a href="https://www.mcgill.ca/bioeng/kwofie-ebenezer-miezah" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Ebenezer M. Kwofie</a>
              {' '}(McGill University) — IFAD grant via{' '}
              <a href="https://www.akademiya2063.org/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">AKADEMIYA2063</a>.
            </p>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {t('app.platform_name')}. {t('app.ministry')}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
