'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MtefPlan } from '@/lib/types/planning';
import { formatScore } from '@/lib/utils/formatters';
import { formatRWFCompact } from '@/lib/utils/formatters';
import { Calendar, TrendingDown, DollarSign } from 'lucide-react';

interface MtefSummaryCardsProps {
  plan: MtefPlan;
}

export function MtefSummaryCards({ plan }: MtefSummaryCardsProps) {
  const { t } = useLanguage();
  const { year_1_plan, year_2_plan, year_3_plan, target_fsfvi_year_3, fiscal_implications } = plan;
  const curve = plan.operational_target_curve ?? 'linear';

  const policyTarget = (year: typeof year_1_plan) =>
    year.policy_target_fsfvi ?? year.target_fsfvi;

  const operationalTarget = (year: typeof year_1_plan) =>
    year.operational_target_fsfvi ?? policyTarget(year);

  const policyOnTrack = (year: typeof year_1_plan) =>
    year.on_track_policy ?? year.projected_fsfvi <= policyTarget(year);

  const operationalOnTrack = (year: typeof year_1_plan) =>
    year.on_track_operational ?? year.projected_fsfvi <= operationalTarget(year);

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
              Year 1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--rw-blue)]">{formatScore(year_1_plan.projected_fsfvi)}</p>
            <p className="text-xs text-gray-500">Projected FSFSI</p>
            <p className="text-xs text-gray-500 mt-1">Policy target: {formatScore(policyTarget(year_1_plan))}</p>
            <p className="text-xs text-gray-500">Operational target: {formatScore(operationalTarget(year_1_plan))}</p>
            <p className="text-[11px] mt-1">
              <span className={policyOnTrack(year_1_plan) ? 'text-green-700' : 'text-amber-700'}>
                Policy: {policyOnTrack(year_1_plan) ? 'On track' : 'Off track'}
              </span>
              {' · '}
              <span className={operationalOnTrack(year_1_plan) ? 'text-green-700' : 'text-amber-700'}>
                Operational: {operationalOnTrack(year_1_plan) ? 'On track' : 'Off track'}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-1">{formatRWFCompact(year_1_plan.total_budget)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[var(--rw-blue)]/5 to-white border-[var(--rw-blue)]/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Year 2
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--rw-blue)]">{formatScore(year_2_plan.projected_fsfvi)}</p>
            <p className="text-xs text-gray-500">Projected FSFSI</p>
            <p className="text-xs text-gray-500 mt-1">Policy target: {formatScore(policyTarget(year_2_plan))}</p>
            <p className="text-xs text-gray-500">Operational target: {formatScore(operationalTarget(year_2_plan))}</p>
            <p className="text-[11px] mt-1">
              <span className={policyOnTrack(year_2_plan) ? 'text-green-700' : 'text-amber-700'}>
                Policy: {policyOnTrack(year_2_plan) ? 'On track' : 'Off track'}
              </span>
              {' · '}
              <span className={operationalOnTrack(year_2_plan) ? 'text-green-700' : 'text-amber-700'}>
                Operational: {operationalOnTrack(year_2_plan) ? 'On track' : 'Off track'}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-1">{formatRWFCompact(year_2_plan.total_budget)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[var(--rw-green)]/10 to-white border-[var(--rw-green)]/30">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[var(--rw-green)]" />
              Year 3 (Target)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[var(--rw-green)]">{formatScore(year_3_plan.projected_fsfvi)}</p>
            <p className="text-xs text-gray-500">{t('planning.mtef_year3_target_label')}: {formatScore(target_fsfvi_year_3)}</p>
            <p className="text-xs text-gray-500 mt-1">Policy target: {formatScore(policyTarget(year_3_plan))}</p>
            <p className="text-xs text-gray-500">Operational target: {formatScore(operationalTarget(year_3_plan))}</p>
            <p className="text-[11px] mt-1">
              <span className={policyOnTrack(year_3_plan) ? 'text-green-700' : 'text-amber-700'}>
                Policy: {policyOnTrack(year_3_plan) ? 'On track' : 'Off track'}
              </span>
              {' · '}
              <span className={operationalOnTrack(year_3_plan) ? 'text-green-700' : 'text-amber-700'}>
                Operational: {operationalOnTrack(year_3_plan) ? 'On track' : 'Off track'}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-1">{formatRWFCompact(year_3_plan.total_budget)}</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-gray-500">
        Policy target follows a linear 3-year fiscal commitment line; operational target uses the selected `{curve}` pacing curve.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Fiscal Implications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {fiscal_implications.map((imp, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-[var(--rw-blue)]">•</span>
                {imp}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
