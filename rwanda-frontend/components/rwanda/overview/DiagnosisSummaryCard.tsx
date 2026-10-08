'use client';

import Link from 'next/link';
import type { ElementType } from 'react';
import { Scale, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRWFCompact, formatScore } from '@/lib/utils/formatters';
import { DIAGNOSIS_AXIS, DIAGNOSIS_STYLE } from '@/lib/utils/diagnosis';
import { ImputedMarker } from '@/components/rwanda/shared/DiagnosisChip';
import type { DiagnosisBucket, DiagnosisSummary, StressDiagnosis } from '@/lib/types/assessment';
import { overviewPanelClass } from './panelStyles';

type Props = {
  summary: DiagnosisSummary;
  /** Fiscal-year label for the subtitle, e.g. "FY2024/25". */
  fiscalYearLabel?: string;
  /** Show the "see all indicators" link (overview only). */
  linkHref?: string;
  /** When provided, clicking a bucket header calls back (used to set the table filter). */
  onSelectDiagnosis?: (d: StressDiagnosis) => void;
  /** Currently selected bucket (highlighted). */
  selected?: StressDiagnosis | 'all';
  className?: string;
};

function pct(n: number): string {
  if (!Number.isFinite(n)) return '0%';
  return n < 1 && n > 0 ? '<1%' : `${Math.round(n)}%`;
}

/** Stacked 100% bar: one segment per bucket, hidden when the value is 0. */
function ShareBar({
  buckets,
  pick,
  label,
}: {
  buckets: DiagnosisBucket[];
  pick: (b: DiagnosisBucket) => number;
  label: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      </div>
      <div className="flex h-5 w-full overflow-hidden rounded-md ring-1 ring-slate-200/80">
        {buckets.map((b) => {
          const v = pick(b);
          if (v <= 0) return null;
          return (
            <div
              key={b.diagnosis}
              className={`flex h-full items-center justify-center overflow-hidden text-[10px] font-bold text-white ${DIAGNOSIS_STYLE[b.diagnosis].bar}`}
              style={{ width: `${v}%` }}
              title={`${pct(v)}`}
            >
              {v >= 8 ? pct(v) : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BucketPanel({
  bucket,
  total,
  onSelect,
  isSelected,
  dim,
}: {
  bucket: DiagnosisBucket;
  total: number;
  onSelect?: (d: StressDiagnosis) => void;
  isSelected: boolean;
  dim: boolean;
}) {
  const { t } = useLanguage();
  const style = DIAGNOSIS_STYLE[bucket.diagnosis];
  const axis = DIAGNOSIS_AXIS[bucket.diagnosis];
  const Wrapper: ElementType = onSelect ? 'button' : 'div';

  return (
    <div
      className={`flex h-full flex-col rounded-lg border p-4 transition-opacity ${style.panel} ${
        isSelected ? 'ring-2 ring-offset-1 ring-slate-900/70' : ''
      } ${dim ? 'opacity-50' : ''}`}
    >
      <Wrapper
        {...(onSelect ? { type: 'button', onClick: () => onSelect(bucket.diagnosis) } : {})}
        className={`text-left ${onSelect ? 'cursor-pointer rounded hover:opacity-90' : ''}`}
      >
        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${style.text}`}>
          {t(`diagnosis.axis_${axis}`)}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
          {t(`diagnosis.${bucket.diagnosis}`)}
        </p>
      </Wrapper>

      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
        {bucket.indicator_count}
        <span className="ml-1.5 text-sm font-medium text-slate-500">
          {t('diagnosis.of_indicators', { total })}
        </span>
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">{t('diagnosis.stress_share')}</dt>
        <dd className="text-right font-semibold tabular-nums text-slate-900">{pct(bucket.stress_share_percent)}</dd>
        <dt className="text-slate-500">{t('diagnosis.budget_share')}</dt>
        <dd className="text-right font-semibold tabular-nums text-slate-900">
          {pct(bucket.budget_share_percent)}
          <span className="ml-1 font-normal text-slate-500">
            ({formatRWFCompact(bucket.budget_lcu_bn * 1_000_000_000)})
          </span>
        </dd>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-slate-700">{t(`explainer.diag_${bucket.diagnosis}`)}</p>

      {bucket.indicators.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-3">
          {bucket.indicators.map((ind) => (
            <li key={ind.indicator_code} className="flex items-start justify-between gap-2 text-xs">
              <span className="min-w-0">
                <span className="font-semibold text-slate-900">{ind.indicator_code}</span>
                <span className="block truncate text-slate-600" title={ind.indicator_name}>
                  {ind.indicator_name}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="tabular-nums text-slate-700" title={t('diagnosis.stress_tooltip')}>
                  {formatScore(ind.stress_value)}
                </span>
                <span className="flex items-center gap-1">
                  {ind.financing_coverage != null ? (
                    <span className="text-[10px] tabular-nums text-slate-500">
                      {Math.round(ind.financing_coverage * 100)}% {t('diagnosis.covered_abbrev')}
                    </span>
                  ) : null}
                  {ind.delta_imputed ? <ImputedMarker /> : null}
                </span>
              </span>
            </li>
          ))}
          {bucket.indicator_count > bucket.indicators.length ? (
            <li className="text-[11px] text-slate-500">
              {t('diagnosis.and_more', { n: bucket.indicator_count - bucket.indicators.length })}
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3 border-t border-slate-200/70 pt-3 text-xs text-slate-500">{t('diagnosis.none_in_bucket')}</p>
      )}

      {bucket.imputed_count > 0 ? (
        <p className="mt-auto pt-3 text-[11px] text-slate-500">
          {t('diagnosis.bucket_imputed_note', { n: bucket.imputed_count, total: bucket.indicator_count })}
        </p>
      ) : null}
    </div>
  );
}

export function DiagnosisSummaryCard({
  summary,
  fiscalYearLabel,
  linkHref,
  onSelectDiagnosis,
  selected = 'all',
  className,
}: Props) {
  const { t } = useLanguage();
  const visible = summary.buckets.filter((b) => b.indicator_count > 0 || b.diagnosis !== 'at_benchmark');
  const money = summary.buckets.find((b) => b.diagnosis === 'unfunded_gap');
  const results = summary.buckets.find((b) => b.diagnosis === 'funded_gap');
  const framework = summary.framework_indicator_count ?? null;
  const defined = summary.defined_indicator_count ?? null;
  const notSeeded = framework != null && defined != null ? Math.max(framework - defined, 0) : 0;

  const cols =
    visible.length >= 4 ? 'lg:grid-cols-4' : visible.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

  return (
    <Card className={`${overviewPanelClass} ${className ?? ''}`}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--rw-blue)]/10 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15">
                <Scale className="h-5 w-5" />
              </span>
              <span>{t('diagnosis.card_title')}</span>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {t('diagnosis.card_subtitle', { fy: fiscalYearLabel ?? '' })}
            </p>
            {framework != null ? (
              <p className="mt-1 text-xs text-slate-500">
                {t('diagnosis.coverage_note', {
                  total: summary.total_indicators,
                  framework,
                  fy: fiscalYearLabel ?? '',
                })}
                {notSeeded > 0 ? ` ${t('diagnosis.coverage_note_not_seeded', { n: notSeeded })}` : ''}
              </p>
            ) : null}
          </div>
          {linkHref ? (
            <Link
              href={linkHref}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--rw-blue)] hover:underline"
            >
              {t('diagnosis.see_all')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Headline sentence: the mismatch in one line */}
        {money && results ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
            {t('diagnosis.headline', {
              money_n: money.indicator_count,
              money_stress: pct(money.stress_share_percent),
              money_budget: pct(money.budget_share_percent),
              results_n: results.indicator_count,
              results_budget: pct(results.budget_share_percent),
              results_stress: pct(results.stress_share_percent),
            })}
          </p>
        ) : null}

        {/* Two stacked bars: where the stress is vs where the money is */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ShareBar buckets={summary.buckets} pick={(b) => b.stress_share_percent} label={t('diagnosis.bar_stress')} />
          <ShareBar buckets={summary.buckets} pick={(b) => b.budget_share_percent} label={t('diagnosis.bar_budget')} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {summary.buckets.map((b) => (
            <span key={b.diagnosis} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${DIAGNOSIS_STYLE[b.diagnosis].dot}`} aria-hidden />
              {t(`diagnosis.${b.diagnosis}`)}
              <span className="tabular-nums text-slate-400">({b.indicator_count})</span>
            </span>
          ))}
        </div>

        {/* Bucket panels */}
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cols}`}>
          {visible.map((b) => (
            <BucketPanel
              key={b.diagnosis}
              bucket={b}
              total={summary.total_indicators}
              onSelect={onSelectDiagnosis}
              isSelected={selected === b.diagnosis}
              dim={selected !== 'all' && selected !== b.diagnosis}
            />
          ))}
        </div>

        {/* Caveat: how much of this rests on placeholder benchmarks */}
        {summary.imputed_indicator_count > 0 ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-slate-600">
            <ImputedMarker />
            <span>
              {t('diagnosis.imputed_footnote', {
                n: summary.imputed_indicator_count,
                total: summary.total_indicators,
              })}
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
