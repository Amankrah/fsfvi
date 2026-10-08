'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { diagnosisTranslationKey, getDiagnosisChipClass } from '@/lib/utils/formatters';

/**
 * Gap × financing-coverage diagnosis pill.
 *
 * Shows the label (unfunded / partly funded / funded gap / at benchmark), the share of the
 * gap absorbed by financing, and, when `imputed`, a marker that the underlying
 * benchmark and observed values are placeholders, so the "results" side of the
 * diagnosis is an assumption rather than data.
 */
export function DiagnosisChip({
  diagnosis,
  coverage,
  imputed = false,
  size = 'sm',
}: {
  diagnosis?: string | null;
  coverage?: number | null;
  imputed?: boolean;
  size?: 'sm' | 'md';
}) {
  const { t } = useLanguage();
  if (!diagnosis) return null;
  const pct = coverage != null ? ` · ${Math.round(coverage * 100)}%` : '';
  const sizing = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]';
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center whitespace-nowrap rounded border font-medium ${sizing} ${getDiagnosisChipClass(diagnosis)}`}
        title={t('diagnosis.coverage_hint')}
      >
        {t(diagnosisTranslationKey(diagnosis))}
        {pct}
      </span>
      {imputed ? <ImputedMarker /> : null}
    </span>
  );
}

/** Small "placeholder benchmark" flag; tooltip explains what it means. */
export function ImputedMarker({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border border-dashed border-slate-400 bg-white px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ${className}`}
      title={t('diagnosis.imputed_hint')}
      aria-label={t('diagnosis.imputed_hint')}
    >
      {t('diagnosis.imputed_abbrev')}
    </span>
  );
}
