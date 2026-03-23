'use client';

import { useState, type ReactNode } from 'react';
import type { StaticImageData } from 'next/image';

type Tier = 'svg' | 'png' | 'jpg' | 'webp' | 'fail';

const NEXT: Record<Exclude<Tier, 'fail'>, Tier | 'fail'> = {
  svg: 'png',
  png: 'jpg',
  jpg: 'webp',
  webp: 'fail',
};

function srcFor(slug: string, tier: Exclude<Tier, 'fail'>): string {
  return `/partners/${slug}.${tier}`;
}

function Fallback({ label }: { label: string }) {
  return <span className="font-semibold text-gray-700 text-sm text-center px-2">{label}</span>;
}

type Props = {
  /**
   * Bundled asset from `import x from '@/assets/partners/...'` (or any path outside `public/`).
   * Prefer this so the URL is emitted by Next (`/_next/static/media/...`) and always resolves.
   */
  image?: StaticImageData;
  /** Base name without extension when `image` is omitted (tries .svg, .png, .jpg, .webp). */
  slug?: string;
  label: string;
  href?: string;
  className?: string;
};

/** Fixed box per partner: `object-contain` scales each mark up or down to the same visual footprint. */
const SLOT_CLASS =
  'block h-[5.5rem] w-[11.5rem] shrink-0 sm:h-24 sm:w-[14rem] md:h-[6.5rem] md:w-[17rem]';

const IMG_IN_SLOT = 'block h-full w-full object-contain object-center';

/**
 * Partner mark: pass `image` from a static import, or `slug` for files in `public/partners/`.
 */
export function PartnerLogo({ image, slug, label, href, className = '' }: Props) {
  const [tier, setTier] = useState<Tier>('svg');
  const [bundleFailed, setBundleFailed] = useState(false);

  const imgCls = `${IMG_IN_SLOT} ${className}`.trim();

  let inner: ReactNode;

  if (image) {
    inner = bundleFailed ? (
      <div className={`${SLOT_CLASS} flex items-center justify-center`}>
        <Fallback label={label} />
      </div>
    ) : (
      <div className={SLOT_CLASS}>
        <img
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          className={imgCls}
          onError={() => setBundleFailed(true)}
        />
      </div>
    );
  } else if (slug) {
    inner =
      tier === 'fail' ? (
        <div className={`${SLOT_CLASS} flex items-center justify-center`}>
          <Fallback label={label} />
        </div>
      ) : (
        <div className={SLOT_CLASS}>
          <img
            src={srcFor(slug, tier as Exclude<Tier, 'fail'>)}
            alt=""
            width={220}
            height={80}
            className={imgCls}
            onError={() => setTier((t) => (t === 'fail' ? t : NEXT[t as Exclude<Tier, 'fail'>]))}
          />
        </div>
      );
  } else {
    inner = (
      <div className={`${SLOT_CLASS} flex items-center justify-center`}>
        <Fallback label={label} />
      </div>
    );
  }

  const wrapClass = 'flex items-center justify-center rounded-lg p-2';

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={`${wrapClass} hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rw-blue)]`}
      >
        {inner}
      </a>
    );
  }

  return <div className={wrapClass}>{inner}</div>;
}
