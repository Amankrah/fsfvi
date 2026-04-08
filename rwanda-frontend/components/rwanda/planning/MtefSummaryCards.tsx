'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MtefPlan } from '@/lib/types/planning';
import { formatScore } from '@/lib/utils/formatters';
import { formatRWFCompact } from '@/lib/utils/formatters';
import { Calendar, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';

interface MtefSummaryCardsProps {
  plan: MtefPlan;
}

export function MtefSummaryCards({ plan }: MtefSummaryCardsProps) {
  const { t } = useLanguage();
  const { year_1_plan, year_2_plan, year_3_plan, target_fsfvi_year_3, fiscal_implications } = plan;
  const curve = plan.operational_target_curve ?? 'linear';
  const rawCurve = String(curve).toLowerCase();
  const curveLabel =
    rawCurve === 'linear'
      ? t('planning.mtef_curve_linear')
      : rawCurve === 'smoothstep'
        ? t('planning.mtef_curve_smoothstep')
        : rawCurve === 'frontloaded'
          ? t('planning.mtef_curve_frontloaded')
          : String(curve);

  const policyTarget = (year: typeof year_1_plan) =>
    year.policy_target_fsfvi ?? year.target_fsfvi;

  const operationalTarget = (year: typeof year_1_plan) =>
    year.operational_target_fsfvi ?? policyTarget(year);

  const policyOnTrack = (year: typeof year_1_plan) =>
    year.on_track_policy ?? year.projected_fsfvi <= policyTarget(year);

  const operationalOnTrack = (year: typeof year_1_plan) =>
    year.on_track_operational ?? year.projected_fsfvi <= operationalTarget(year);

  const year3Off =
    !policyOnTrack(year_3_plan) ||
    !operationalOnTrack(year_3_plan);

  const fiscalExtraLines = useMemo(() => {
    const y1 = year_1_plan.total_budget;
    const y2 = year_2_plan.total_budget;
    const y3 = year_3_plan.total_budget;
    const growth13 = y1 > 0 ? ((y3 - y1) / y1) * 100 : 0;
    const growth12 = y1 > 0 ? ((y2 - y1) / y1) * 100 : 0;
    return [
      t('planning.fiscal_mtef_row_y1', { amt: formatRWFCompact(y1) }),
      t('planning.fiscal_mtef_row_y2', { amt: formatRWFCompact(y2) }),
      t('planning.fiscal_mtef_row_y3', { amt: formatRWFCompact(y3) }),
      t('planning.fiscal_mtef_row_yoy', {
        y1y2: growth12.toFixed(1),
        y1y3: growth13.toFixed(1),
      }),
    ];
  }, [year_1_plan.total_budget, year_2_plan.total_budget, year_3_plan.total_budget, t]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {t('planning.mtef_diff_note')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[var(--rw-blue)]/5 to-white border-[var(--rw-blue)]/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('planning.mtef_year_n', { n: 1 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--rw-blue)]">{formatScore(year_1_plan.projected_fsfvi)}</p>
            <p className="text-xs text-gray-500">{t('planning.mtef_projected_fsfsi')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('planning.mtef_policy_target')}: {formatScore(policyTarget(year_1_plan))}</p>
            <p className="text-xs text-gray-500">{t('planning.mtef_operational_target')}: {formatScore(operationalTarget(year_1_plan))}</p>
            <p className="text-[11px] mt-1">
              <span className={policyOnTrack(year_1_plan) ? 'text-green-700' : 'text-red-700'}>
                {t('planning.mtef_policy')}: {policyOnTrack(year_1_plan) ? t('planning.mtef_on_track') : t('planning.mtef_off_track')}
              </span>
              {' · '}
              <span className={operationalOnTrack(year_1_plan) ? 'text-green-700' : 'text-red-700'}>
                {t('planning.mtef_operational')}: {operationalOnTrack(year_1_plan) ? t('planning.mtef_on_track') : t('planning.mtef_off_track')}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-1">{formatRWFCompact(year_1_plan.total_budget)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[var(--rw-blue)]/5 to-white border-[var(--rw-blue)]/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('planning.mtef_year_n', { n: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--rw-blue)]">{formatScore(year_2_plan.projected_fsfvi)}</p>
            <p className="text-xs text-gray-500">{t('planning.mtef_projected_fsfsi')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('planning.mtef_policy_target')}: {formatScore(policyTarget(year_2_plan))}</p>
            <p className="text-xs text-gray-500">{t('planning.mtef_operational_target')}: {formatScore(operationalTarget(year_2_plan))}</p>
            <p className="text-[11px] mt-1">
              <span className={policyOnTrack(year_2_plan) ? 'text-green-700' : 'text-red-700'}>
                {t('planning.mtef_policy')}: {policyOnTrack(year_2_plan) ? t('planning.mtef_on_track') : t('planning.mtef_off_track')}
              </span>
              {' · '}
              <span className={operationalOnTrack(year_2_plan) ? 'text-green-700' : 'text-red-700'}>
                {t('planning.mtef_operational')}: {operationalOnTrack(year_2_plan) ? t('planning.mtef_on_track') : t('planning.mtef_off_track')}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-1">{formatRWFCompact(year_2_plan.total_budget)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[var(--rw-green)]/10 to-white border-[var(--rw-green)]/30">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[var(--rw-green)]" />
              {t('planning.mtef_year_n_target', { n: 3 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--rw-green)]">{formatScore(year_3_plan.projected_fsfvi)}</p>
            <p className="text-xs text-gray-500">{t('planning.mtef_year3_target_label')}: {formatScore(target_fsfvi_year_3)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('planning.mtef_policy_target')}: {formatScore(policyTarget(year_3_plan))}</p>
            <p className="text-xs text-gray-500">{t('planning.mtef_operational_target')}: {formatScore(operationalTarget(year_3_plan))}</p>
            <p className="text-[11px] mt-1">
              <span className={policyOnTrack(year_3_plan) ? 'text-green-700' : 'text-red-700'}>
                {t('planning.mtef_policy')}: {policyOnTrack(year_3_plan) ? t('planning.mtef_on_track') : t('planning.mtef_off_track')}
              </span>
              {' · '}
              <span className={operationalOnTrack(year_3_plan) ? 'text-green-700' : 'text-red-700'}>
                {t('planning.mtef_operational')}: {operationalOnTrack(year_3_plan) ? t('planning.mtef_on_track') : t('planning.mtef_off_track')}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-1">{formatRWFCompact(year_3_plan.total_budget)}</p>
          </CardContent>
        </Card>
      </div>

      {year3Off && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 flex gap-3"
          role="status"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-700 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold text-amber-950">{t('planning.mtef_year3_off_track_title')}</p>
            <p className="text-amber-900/95">
              {t('planning.mtef_year3_off_track_intro', {
                projected: formatScore(year_3_plan.projected_fsfvi),
                policy: formatScore(policyTarget(year_3_plan)),
                operational: formatScore(operationalTarget(year_3_plan)),
              })}
            </p>
            <p className="text-amber-900/95">{t('planning.mtef_year3_off_track_levers')}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        {t('planning.mtef_targets_curve_note', { curve: curveLabel })}
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('planning.fiscal_implications_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {fiscal_implications.map((imp, i) => (
              <li key={`api-${i}`} className="text-sm text-gray-700 flex gap-2">
                <span className="text-[var(--rw-blue)]">•</span>
                {imp}
              </li>
            ))}
            {fiscalExtraLines.map((line, i) => (
              <li key={`extra-${i}`} className="text-sm text-gray-700 flex gap-2">
                <span className="text-[var(--rw-blue)]">•</span>
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
