'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { PublicHeader } from '@/components/rwanda/layout/PublicHeader';
import { PublicFooter } from '@/components/rwanda/layout/PublicFooter';
import { PartnerLogo } from '@/components/rwanda/shared/PartnerLogo';
import { RwandaFlag } from '@/components/rwanda/shared/RwandaFlag';
import { PHOTOS } from '@/lib/photoCredits';
import akademiaLogo from '@/assets/partners/akademia2063_logo.png';
import ifpriLogo from '@/assets/partners/ifpri_logo.webp';
import mcgillLogo from '@/assets/partners/mcgill_logo.png';
import { ArrowRight, BarChart3, LineChart, Scale, Target, ArrowUpRight } from 'lucide-react';

/** Portrait files: place under public/team/ (e.g. john-ulimwengu.jpg). Falls back to initials if missing or broken. */
function TeamMemberAvatar({
  imageSrc,
  alt,
  fallbackInitials,
  fallbackClassName,
}: {
  imageSrc: string;
  alt: string;
  fallbackInitials: string;
  fallbackClassName: string;
}) {
  const [showImage, setShowImage] = useState(true);
  return (
    <div className="mb-3 h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
      {showImage ? (
        <img
          src={imageSrc}
          alt={alt}
          className="h-full w-full object-cover object-center"
          loading="lazy"
          onError={() => setShowImage(false)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center px-1 text-center text-xs font-bold leading-tight ${fallbackClassName}`}
        >
          {fallbackInitials}
        </div>
      )}
    </div>
  );
}

function PhotoCaption({ caption, author, className = '' }: { caption: string; author: string; className?: string }) {
  const { t } = useLanguage();
  return (
    <p className={`text-[11px] leading-4 tracking-wide ${className}`}>
      {caption} · {t('app.photo_credit')}: {author}
    </p>
  );
}

const COMPONENT_ITEMS = [
  { name: 'Crop Production', color: 'bg-green-600' },
  { name: 'Animal Systems', color: 'bg-rose-500' },
  { name: 'Post-Harvest', color: 'bg-amber-500' },
  { name: 'Markets', color: 'bg-sky-600' },
  { name: 'Nutrition', color: 'bg-orange-500' },
  { name: 'Finance', color: 'bg-indigo-600' },
  { name: 'Research', color: 'bg-violet-600' },
  { name: 'Environment', color: 'bg-teal-600' },
];

export default function LandingPage() {
  const { t } = useLanguage();

  const featureBlocks = [
    { Icon: BarChart3, title: t('landing.feature1_title'), desc: t('landing.feature1_desc') },
    { Icon: LineChart, title: t('landing.feature2_title'), desc: t('landing.feature2_desc') },
    { Icon: Scale, title: t('landing.feature3_title'), desc: t('landing.feature3_desc') },
    { Icon: Target, title: t('landing.feature4_title'), desc: t('landing.feature4_desc') },
  ];

  const stats = [
    { value: '37', label: t('landing.stat_indicators') },
    { value: '8', label: t('landing.stat_components') },
    { value: '5', label: t('landing.stat_provinces') },
    { value: '30', label: t('landing.stat_districts') },
    { value: '2018+', label: t('landing.stat_fiscal_years') },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader />

      {/* Hero */}
      <section className="relative isolate flex min-h-[min(88vh,820px)] items-end overflow-hidden bg-[var(--rw-navy-900)] text-white">
        <Image
          src={PHOTOS.heroTerraces.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_45%]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,20,40,0.92)_0%,rgba(7,20,40,0.78)_38%,rgba(7,20,40,0.35)_68%,rgba(7,20,40,0.15)_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[var(--rw-navy-900)] via-[var(--rw-navy-900)]/60 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-24 lg:pt-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2.5">
              <RwandaFlag className="h-4 w-6 rounded-[2px] ring-1 ring-white/30" title="" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 sm:text-xs">
                {t('landing.hero_kicker')} · {t('app.ministry_short')}
              </span>
            </div>

            <h1 className="font-display text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.01em] text-white sm:text-5xl lg:text-[3.6rem]">
              {t('landing.hero_title_1')}
              <br />
              <span className="text-slate-100/90">{t('landing.hero_title_2')}</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{t('landing.hero_p1')}</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-[var(--rw-navy)] shadow-[0_1px_2px_rgba(2,6,23,0.3)] transition-colors hover:bg-slate-100"
              >
                {t('landing.hero_cta_dashboard')}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/[0.06] px-6 py-3 text-base font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/[0.12]"
              >
                {t('landing.hero_cta_about')}
                <ArrowUpRight className="ml-2 h-5 w-5 opacity-90" aria-hidden />
              </Link>
            </div>
          </div>

          <PhotoCaption
            caption={t('landing.hero_photo_caption')}
            author={PHOTOS.heroTerraces.author}
            className="absolute bottom-4 right-4 hidden text-white/60 sm:block lg:right-8"
          />
        </div>
      </section>

      {/* Stats band */}
      <section className="border-b border-slate-200 bg-white" aria-label="Key figures">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 divide-x divide-slate-200 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`px-4 py-6 first:pl-0 sm:py-7 ${i >= 2 ? 'border-t border-slate-200 sm:border-t-0' : ''} ${
                  i === 3 ? 'sm:border-t sm:border-slate-200 lg:border-t-0' : ''
                } ${i === 4 ? 'col-span-2 border-t border-slate-200 sm:col-span-1 sm:border-t lg:border-t-0' : ''}`}
              >
                <dd className="font-display text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
                  {s.value}
                </dd>
                <dt className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* What FSFI helps you do */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rw-blue-deep)]">FSFI</p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {t('landing.features_title')}
            </h2>
            <div className="rw-flag-rule mt-5 h-1 w-16 rounded-full" aria-hidden />
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {featureBlocks.map((item) => {
              const ItemIcon = item.Icon;
              return (
                <article key={item.title} className="bg-white p-6 sm:p-7">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--rw-navy)] text-white">
                    <ItemIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Components: photo + list */}
      <section className="border-y border-slate-200 bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <figure className="relative lg:col-span-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg shadow-[0_20px_50px_-30px_rgba(2,6,23,0.5)] ring-1 ring-slate-900/10">
                <Image
                  src={PHOTOS.thousandHills.src}
                  alt={t('landing.components_photo_caption')}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3">
                <PhotoCaption
                  caption={t('landing.components_photo_caption')}
                  author={PHOTOS.thousandHills.author}
                  className="text-slate-500"
                />
              </figcaption>
            </figure>

            <div className="lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rw-green)]">
                {t('landing.components_chip')}
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {t('landing.components_title')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-[17px]">{t('landing.components_lead')}</p>

              <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3" role="list">
                {COMPONENT_ITEMS.map((comp) => (
                  <li key={comp.name} className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${comp.color}`} aria-hidden />
                    <span className="text-sm font-medium text-slate-800">{comp.name}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/about"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--rw-blue-deep)] underline-offset-4 hover:underline"
              >
                {t('landing.learn_more')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership + team */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t('landing.partnership')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 border-y border-slate-200 py-10 md:gap-x-20">
            <PartnerLogo image={ifpriLogo} label="IFPRI" href="https://www.ifpri.org/" />
            <PartnerLogo image={mcgillLogo} label="McGill University" href="https://www.mcgill.ca/" />
            <PartnerLogo image={akademiaLogo} label="Akademiya2063" href="https://www.akademiya2063.org/" />
          </div>

          <div className="mx-auto mt-16 max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rw-blue-deep)]">About FSFI</p>
            <p className="font-display mt-4 text-xl leading-relaxed text-slate-800 sm:text-2xl">
              Food Systems Financing Intelligence (FSFI) helps countries align public and partner finance with
              their food system goals.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  name: 'John Ulimwengu',
                  affiliation: 'IFPRI',
                  href: 'https://www.ifpri.org/profile/john-ulimwengu/',
                  imageSrc: '/team/john-ulimwengu.jpg',
                  imageAlt: 'John Ulimwengu, IFPRI',
                  fallbackInitials: 'JU',
                  fallbackClass: 'bg-[var(--rw-blue)]/10 text-[var(--rw-blue-deep)]',
                },
                {
                  name: 'Emmanuel A. Kwofie',
                  affiliation: 'McGill University',
                  href: 'https://www.eakwofie.com/',
                  imageSrc: '/team/emmanuel-kwofie.jpg',
                  imageAlt: 'Emmanuel A. Kwofie, McGill University',
                  fallbackInitials: 'EAK',
                  fallbackClass: 'bg-[var(--rw-green)]/10 text-[var(--rw-green)]',
                },
                {
                  name: 'Ebenezer M. Kwofie',
                  affiliation: 'McGill University',
                  href: 'https://www.mcgill.ca/bioeng/kwofie-ebenezer-miezah',
                  imageSrc: '/team/ebenezer-kwofie.jpg',
                  imageAlt: 'Ebenezer M. Kwofie, McGill University',
                  fallbackInitials: 'EMK',
                  fallbackClass: 'bg-[var(--rw-yellow)]/25 text-amber-900',
                },
              ].map((person) => (
                <a
                  key={person.name}
                  href={person.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center rounded-lg border border-slate-200 bg-white p-5 text-center transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <TeamMemberAvatar
                    imageSrc={person.imageSrc}
                    alt={person.imageAlt}
                    fallbackInitials={person.fallbackInitials}
                    fallbackClassName={person.fallbackClass}
                  />
                  <p className="text-sm font-semibold leading-tight text-slate-900 group-hover:text-[var(--rw-blue-deep)]">
                    {person.name}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">{person.affiliation}</p>
                </a>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-slate-500">
              This platform was developed under an <span className="font-medium text-slate-700">IFAD grant</span> through{' '}
              <a
                href="https://www.akademiya2063.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--rw-blue-deep)] underline-offset-2 hover:underline"
              >
                AKADEMIYA2063
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-[var(--rw-navy)] py-20 text-white sm:py-24">
        <Image
          src={PHOTOS.terracesClose.src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-[0.35] mix-blend-luminosity"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--rw-navy)_0%,rgba(11,31,58,0.9)_45%,rgba(11,31,58,0.45)_100%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="rw-flag-rule mb-6 h-1 w-16 rounded-full" aria-hidden />
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.cta_access_title')}</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">{t('landing.cta_access_body')}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-white px-7 py-3 text-base font-semibold text-[var(--rw-navy)] shadow-[0_1px_2px_rgba(2,6,23,0.3)] transition-colors hover:bg-slate-100"
              >
                {t('auth.sign_in')}
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/[0.06] px-7 py-3 text-base font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/[0.12]"
              >
                {t('nav.about')}
                <ArrowUpRight className="ml-2 h-5 w-5 opacity-90" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
