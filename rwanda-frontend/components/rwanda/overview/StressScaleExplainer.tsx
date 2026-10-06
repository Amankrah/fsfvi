'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { overviewPanelClass } from '@/components/rwanda/overview/panelStyles';
import type { StressThreshold, StressThresholds } from '@/lib/types/assessment';

const LEVEL_DOT: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'bg-emerald-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-600',
};

const DIAG_DOT: Record<'at_benchmark' | 'unfunded_gap' | 'partially_funded_gap' | 'funded_gap', string> = {
  at_benchmark: 'bg-emerald-500',
  unfunded_gap: 'bg-red-600',
  partially_funded_gap: 'bg-yellow-500',
  funded_gap: 'bg-sky-500',
};

const f3 = (v: number | null | undefined) => (v == null ? '–' : v.toFixed(3));
const pct = (v: number | null | undefined) => (v == null ? '–' : `${Math.round(v * 100)}%`);

/** "≤ a", "a – b", "> b" ranges for one threshold set. */
function ranges(t: StressThreshold | null | undefined) {
  if (!t) return null;
  const hi = t.high_max ?? t.medium_max;
  return {
    low: `≤ ${f3(t.low_max)}`,
    medium: `${f3(t.low_max)} – ${f3(t.medium_max)}`,
    high: `${f3(t.medium_max)} – ${f3(hi)}`,
    critical: `> ${f3(hi)}`,
  };
}

function yearSpan(t: StressThreshold | null | undefined) {
  const ys = t?.calibration_years ?? [];
  if (ys.length === 0) return '–';
  return ys.length === 1 ? `${ys[0]}` : `${ys[0]}–${ys[ys.length - 1]}`;
}

/**
 * Plain-language explanation of what the stress number measures, how the four
 * levels are derived (natural breaks in Rwanda's own record), and how the
 * "why" diagnosis separates an unfunded gap from a funded one. Every number
 * shown comes from the backend's active threshold configuration.
 */
export function StressScaleExplainer({ thresholds }: { thresholds?: StressThresholds | null }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);

  const system = thresholds?.system ?? null;
  const component = thresholds?.component ?? null;
  const indicator = thresholds?.indicator ?? null;
  const coverage = thresholds?.coverage ?? null;

  const sysR = ranges(system);
  const compR = ranges(component);
  const indR = ranges(indicator);
  const calibrated = Boolean(system?.is_calibrated || component?.is_calibrated);
  const sameScale =
    !!system && !!component && system.low_max === component.low_max && system.medium_max === component.medium_max;

  const levels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
  const diags: Array<'unfunded_gap' | 'partially_funded_gap' | 'funded_gap' | 'at_benchmark'> = [
    'unfunded_gap',
    'partially_funded_gap',
    'funded_gap',
    'at_benchmark',
  ];
  const covRange: Record<(typeof diags)[number], string> = {
    unfunded_gap: coverage ? `< ${pct(coverage.low_max)}` : '–',
    partially_funded_gap: coverage ? `${pct(coverage.low_max)} – ${pct(coverage.medium_max)}` : '–',
    funded_gap: coverage ? `> ${pct(coverage.medium_max)}` : '–',
    at_benchmark: indicator ? `${t('explainer.gap_below')} ${f3(indicator.low_max)}` : '–',
  };

  return (
    <Card className={overviewPanelClass}>
      <CardContent className="p-5 sm:p-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--rw-blue)]/10 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15">
              <BookOpen className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold text-slate-900">{t('explainer.title')}</span>
              <span className="block text-sm text-slate-600">{t('explainer.subtitle')}</span>
            </span>
          </span>
          <span className="shrink-0 text-slate-500">{open ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}</span>
        </button>

        {open && (
          <div className="mt-5 space-y-6 text-sm leading-relaxed text-slate-700">
            {/* 1. What the number measures */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('explainer.what_title')}</h4>
              <p className="mt-2">{t('explainer.what_p1')}</p>
              <p className="mt-2">{t('explainer.what_p2')}</p>
            </section>

            {/* 2. How the four levels are set */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('explainer.levels_title')}</h4>
              {calibrated ? (
                <>
                  <p className="mt-2">
                    {t('explainer.levels_p1', {
                      years: yearSpan(component ?? system),
                      n: component?.n_observations ?? system?.n_observations ?? 0,
                    })}
                  </p>
                  <p className="mt-2">{t('explainer.levels_p2')}</p>
                </>
              ) : (
                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  {t('explainer.levels_uncalibrated')}
                </p>
              )}

              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t('explainer.col_level')}</th>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">
                        {sameScale ? t('explainer.col_system_component') : t('explainer.col_system')}
                      </th>
                      {!sameScale && <th className="px-3 py-2 font-medium whitespace-nowrap">{t('explainer.col_component')}</th>}
                      <th className="px-3 py-2 font-medium whitespace-nowrap">{t('explainer.col_indicator')}</th>
                      <th className="px-3 py-2 font-medium">{t('explainer.col_meaning')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((lvl) => (
                      <tr key={lvl} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                            <span className={`h-2.5 w-2.5 rounded-full ${LEVEL_DOT[lvl]}`} aria-hidden />
                            {t(lvl === 'medium' ? 'risk.moderate' : `risk.${lvl}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{sysR ? sysR[lvl] : '–'}</td>
                        {!sameScale && <td className="px-3 py-2 tabular-nums whitespace-nowrap">{compR ? compR[lvl] : '–'}</td>}
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{indR ? indR[lvl] : '–'}</td>
                        <td className="px-3 py-2 text-slate-600">{t(`explainer.meaning_${lvl}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {calibrated && (
                <p className="mt-2 text-xs text-slate-500">
                  {t('explainer.fit_note', {
                    comp_n: component?.n_observations ?? 0,
                    comp_gvf: f3(component?.gvf),
                    ind_n: indicator?.n_observations ?? 0,
                    ind_gvf: f3(indicator?.gvf),
                  })}
                  {sameScale && system ? ` ${t('explainer.system_inherits', { n: system.n_observations })}` : ''}
                </p>
              )}
            </section>

            {/* 3. Headline vs this year */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('explainer.headline_title')}</h4>
              <p className="mt-2">{t('explainer.headline_p1')}</p>
            </section>

            {/* 4. Why: unfunded vs funded gap */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('explainer.why_title')}</h4>
              <p className="mt-2">{t('explainer.why_p1')}</p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t('explainer.col_diagnosis')}</th>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">{t('explainer.col_coverage')}</th>
                      <th className="px-3 py-2 font-medium">{t('explainer.col_read_as')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diags.map((d) => (
                      <tr key={d} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                            <span className={`h-2.5 w-2.5 rounded-full ${DIAG_DOT[d]}`} aria-hidden />
                            {t(`diagnosis.${d}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{covRange[d]}</td>
                        <td className="px-3 py-2 text-slate-600">{t(`explainer.diag_${d}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {coverage?.is_calibrated && (
                <p className="mt-2 text-xs text-slate-500">
                  {t('explainer.coverage_note', { n: coverage.n_observations, years: yearSpan(coverage) })}
                </p>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
