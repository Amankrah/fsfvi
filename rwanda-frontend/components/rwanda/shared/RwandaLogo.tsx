'use client';

import { RwandaFlag } from './RwandaFlag';

interface RwandaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** National flag rendered as the platform's brand mark (3:2, hairline ring, slight depth). */
export function RwandaLogo({ size = 'md', className = '' }: RwandaLogoProps) {
  const sizeMap = {
    sm: 'h-7 w-[2.625rem] rounded-[4px]',
    md: 'h-9 w-[3.375rem] rounded-[5px]',
    lg: 'h-12 w-[4.5rem] rounded-md',
  };

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ring-1 ring-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${sizeMap[size]} ${className}`}
    >
      <RwandaFlag className="absolute inset-0 h-full w-full" />
      <span
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
        aria-hidden
      />
    </span>
  );
}

interface RwandaBrandProps {
  /** Primary line (platform name). */
  title: string;
  /** Compact title shown below the `sm` breakpoint (e.g. the acronym); subtitle is hidden there. */
  shortTitle?: string;
  /** Secondary line (ministry / sub-title). */
  subtitle?: string;
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
}

/** Flag + wordmark lockup used in headers and footers. */
export function RwandaBrand({
  title,
  shortTitle,
  subtitle,
  tone = 'dark',
  size = 'sm',
  className = '',
}: RwandaBrandProps) {
  const onDark = tone === 'dark';
  const titleClass = `block truncate font-semibold tracking-tight ${size === 'md' ? 'text-base' : 'text-sm'} ${
    onDark ? 'text-white' : 'text-slate-900'
  }`;
  return (
    <span className={`flex min-w-0 items-center gap-3 ${className}`}>
      <RwandaLogo size={size === 'md' ? 'md' : 'sm'} />
      <span className="min-w-0 leading-tight">
        {shortTitle ? (
          <>
            <span className={`${titleClass} sm:hidden`}>{shortTitle}</span>
            <span className={`${titleClass} hidden sm:block`}>{title}</span>
          </>
        ) : (
          <span className={titleClass}>{title}</span>
        )}
        {subtitle ? (
          <span
            className={`block truncate text-xs ${onDark ? 'text-slate-300/90' : 'text-slate-500'} ${
              shortTitle ? 'hidden sm:block' : ''
            }`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
