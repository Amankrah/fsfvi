'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MtefPlan } from '@/lib/types/planning';
import { formatScore } from '@/lib/utils/formatters';
import { formatUSDCompact } from '@/lib/utils/formatters';
import { Calendar, TrendingDown, DollarSign } from 'lucide-react';

interface MtefSummaryCardsProps {
  plan: MtefPlan;
}

export function MtefSummaryCards({ plan }: MtefSummaryCardsProps) {
  const { year_1_plan, year_2_plan, year_3_plan, target_fsfvi_year_3, fiscal_implications } = plan;

  return (
    <div className="space-y-4">
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
            <p className="text-sm text-gray-700 mt-1">{formatUSDCompact(year_1_plan.total_budget)}</p>
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
            <p className="text-sm text-gray-700 mt-1">{formatUSDCompact(year_2_plan.total_budget)}</p>
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
            <p className="text-xs text-gray-500">Target FSFSI: {formatScore(target_fsfvi_year_3)}</p>
            <p className="text-sm text-gray-700 mt-1">{formatUSDCompact(year_3_plan.total_budget)}</p>
          </CardContent>
        </Card>
      </div>

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
