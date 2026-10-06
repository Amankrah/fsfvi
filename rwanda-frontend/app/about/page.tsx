'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PublicHeader } from '@/components/rwanda/layout/PublicHeader';
import { PublicFooter } from '@/components/rwanda/layout/PublicFooter';
import { RwandaFlag } from '@/components/rwanda/shared/RwandaFlag';
import { PartnerLogo } from '@/components/rwanda/shared/PartnerLogo';
import { useLanguage } from '@/contexts/LanguageContext';
import { PHOTOS } from '@/lib/photoCredits';
import akademiaLogo from '@/assets/partners/akademia2063_logo.png';
import ifpriLogo from '@/assets/partners/ifpri_logo.webp';
import mcgillLogo from '@/assets/partners/mcgill_logo.png';
import {
  ArrowRight,
  ArrowLeft,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';

// The 8 indicator components identified in Rwanda's context
const INDICATOR_COMPONENTS = [
  { name: 'Crop Production', color: 'bg-green-600' },
  { name: 'Animal Systems', color: 'bg-rose-500' },
  { name: 'Post-Harvest', color: 'bg-amber-500' },
  { name: 'Markets', color: 'bg-sky-600' },
  { name: 'Nutrition', color: 'bg-orange-500' },
  { name: 'Finance', color: 'bg-indigo-600' },
  { name: 'Research', color: 'bg-violet-600' },
  { name: 'Environment', color: 'bg-teal-600' },
];

function SectionHeading({
  eyebrow,
  title,
  eyebrowClass = 'text-[var(--rw-blue-deep)]',
}: {
  eyebrow: string;
  title: string;
  eyebrowClass?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${eyebrowClass}`}>{eyebrow}</p>
      <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      <div className="rw-flag-rule mt-5 h-1 w-16 rounded-full" aria-hidden />
    </div>
  );
}

export default function AboutPage() {
  const { t } = useLanguage();
  const photo = PHOTOS.hillsideVillage;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader />

      {/* Hero */}
      <section className="relative isolate flex min-h-[min(64vh,620px)] items-end overflow-hidden bg-[var(--rw-navy-900)] text-white">
        <Image src={photo.src} alt="" fill priority sizes="100vw" className="object-cover object-[50%_55%]" />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,20,40,0.92)_0%,rgba(7,20,40,0.75)_45%,rgba(7,20,40,0.3)_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[var(--rw-navy-900)] to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-20 sm:px-6 sm:pb-16 sm:pt-24 lg:px-8">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            {t('about_page.back')}
          </Link>

          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2.5">
              <RwandaFlag className="h-4 w-6 rounded-[2px] ring-1 ring-white/30" title="" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 sm:text-xs">
                {t('landing.hero_kicker')}
              </span>
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t('about_page.h1_about')} {t('about_page.h1_fsfi')}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{t('about_page.hero_lead')}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[var(--rw-navy)] shadow-[0_1px_2px_rgba(2,6,23,0.3)] transition-colors hover:bg-slate-100"
              >
                {t('about_page.cta_signin')}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#about-challenge"
                className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/[0.12]"
              >
                {t('about_page.challenge_title')}
                <ArrowUpRight className="ml-2 h-4 w-4 opacity-90" aria-hidden />
              </a>
            </div>
          </div>

          <p className="absolute bottom-4 right-4 hidden text-[11px] tracking-wide text-white/60 sm:block lg:right-8">
            {photo.location} · {t('app.photo_credit')}: {photo.author}
          </p>
        </div>
      </section>

      {/* The challenge */}
      <section id="about-challenge" className="scroll-mt-28 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="01" title={t('about_page.challenge_title')} eyebrowClass="text-slate-400" />
          <p className="mt-8 max-w-3xl text-[17px] leading-relaxed text-slate-600 sm:text-lg">{t('about_page.challenge_intro')}</p>

          <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200" role="list">
            {[t('about_page.challenge_q1'), t('about_page.challenge_q2'), t('about_page.challenge_q3')].map((q) => (
              <li key={q} className="flex gap-4 py-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <HelpCircle className="h-4.5 w-4.5" aria-hidden />
                </span>
                <p className="pt-1 text-[15px] leading-relaxed text-slate-800 sm:text-base">{q}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What FSFI provides */}
      <section className="border-y border-slate-200 bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="02" title={t('about_page.provides_title')} eyebrowClass="text-slate-400" />
          <p className="mt-8 max-w-3xl text-[17px] leading-relaxed text-slate-600 sm:text-lg">{t('about_page.provides_fsfsi')}</p>

          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-2">
            {[
              { icon: BarChart3, title: t('about_page.card_assess_title'), body: t('about_page.card_assess_body') },
              { icon: TrendingDown, title: t('about_page.card_gaps_title'), body: t('about_page.card_gaps_body') },
              { icon: DollarSign, title: t('about_page.card_invest_title'), body: t('about_page.card_invest_body') },
              { icon: Target, title: t('about_page.card_track_title'), body: t('about_page.card_track_body') },
            ].map(({ icon: Icon, title, body }) => (
              <article key={title} className="bg-white p-6 sm:p-7">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--rw-navy)] text-white">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 8 components */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="03" title={t('about_page.components_title')} eyebrowClass="text-slate-400" />
          <p className="mt-8 max-w-3xl text-[17px] leading-relaxed text-slate-600 sm:text-lg">{t('about_page.components_intro')}</p>

          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4" role="list">
            {INDICATOR_COMPONENTS.map((comp) => (
              <li key={comp.name} className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${comp.color}`} aria-hidden />
                <span className="text-sm font-medium text-slate-800">{comp.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How government uses it: with photo */}
      <section className="border-y border-slate-200 bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <SectionHeading eyebrow="04" title={t('about_page.gov_title')} eyebrowClass="text-slate-400" />
              <ol className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
                {[
                  { title: t('about_page.gov_budget_title'), body: t('about_page.gov_budget_body') },
                  { title: t('about_page.gov_perf_title'), body: t('about_page.gov_perf_body') },
                  { title: t('about_page.gov_adv_title'), body: t('about_page.gov_adv_body') },
                ].map(({ title, body }) => (
                  <li key={title} className="flex items-start gap-4 py-6">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--rw-green)]/10 text-[var(--rw-green)] ring-1 ring-[var(--rw-green)]/20">
                      <CheckCircle2 className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="font-semibold text-slate-900">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <figure className="lg:col-span-5 lg:pt-16">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-[0_20px_50px_-30px_rgba(2,6,23,0.5)] ring-1 ring-slate-900/10 sm:aspect-[4/3] lg:aspect-[3/4]">
                <Image
                  src={PHOTOS.terracesClose.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-[11px] tracking-wide text-slate-500">
                {PHOTOS.terracesClose.location} · {t('app.photo_credit')}: {PHOTOS.terracesClose.author}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Partnership */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="05" title={t('about_page.partners_title')} eyebrowClass="text-slate-400" />
          <p className="mt-8 max-w-3xl text-[17px] leading-relaxed text-slate-600 sm:text-lg">{t('about_page.partners_intro')}</p>

          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-3">
            {[
              { image: akademiaLogo, name: 'Akademiya2063', sub: 'Pan-African research organization', href: 'https://www.akademiya2063.org/' },
              { image: ifpriLogo, name: 'IFPRI', sub: 'International Food Policy Research Institute', href: 'https://www.ifpri.org/' },
              { image: mcgillLogo, name: 'McGill University', sub: 'Institute for the Study of International Development', href: 'https://www.mcgill.ca/' },
            ].map(({ image, name, sub, href }) => (
              <div key={name} className="flex flex-col items-center bg-white px-6 py-8 text-center">
                <PartnerLogo image={image} label={name} href={href} />
                <h3 className="mt-4 font-semibold text-slate-900">{name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="rw-navy-surface border-t border-white/10 py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="rw-flag-rule mb-5 h-1 w-16 rounded-full" aria-hidden />
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('about_page.cta_title')}</h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">{t('about_page.cta_body')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-white px-7 py-3 text-base font-semibold text-[var(--rw-navy)] shadow-[0_1px_2px_rgba(2,6,23,0.3)] transition-colors hover:bg-slate-100"
            >
              {t('about_page.cta_signin')}
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/[0.06] px-7 py-3 text-base font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/[0.12]"
            >
              {t('about_page.cta_home')}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
