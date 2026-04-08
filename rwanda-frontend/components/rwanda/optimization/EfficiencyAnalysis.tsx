'use client';

import { useMemo } from 'react';
import type { EfficiencyAnalysis as EfficiencyAnalysisType, ComponentEfficiency } from '@/lib/types/optimization';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import { formatScore, formatRWFCompact, formatEngineDurationMs } from '@/lib/utils/formatters';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react';

const EXTREME_GAP_PCT = 200;

export interface EfficiencyAnalysisContext {
  fiscalYearLabel: string;
  assessmentName?: string;
  weightingLabel: string;
  scenarioLabel: string;
  indicatorCount: number;
  cumulativeFsfsi?: number | null;
}

interface EfficiencyAnalysisProps {
  data: EfficiencyAnalysisType;
  context?: EfficiencyAnalysisContext;
}

function displayName(c: ComponentEfficiency): string {
  return COMPONENT_DISPLAY_NAMES[c.component_type as IndicatorComponent] || c.component_type;
}

export function EfficiencyAnalysis({ data, context }: EfficiencyAnalysisProps) {
  const efficiencyPercent = data.efficiency_index * 100;

  const sortedComponents = useMemo(() => {
    return [...data.components].sort((a, b) => {
      if (a.is_underfunded !== b.is_underfunded) {
        return a.is_underfunded ? -1 : 1;
      }
      return Math.abs(b.allocation_gap_lcu) - Math.abs(a.allocation_gap_lcu);
    });
  }, [data.components]);

  const underfundedRanking = useMemo(() => {
    const under = sortedComponents.filter((c) => c.is_underfunded);
    const byMag = [...under].sort(
      (a, b) => Math.abs(b.allocation_gap_pct) - Math.abs(a.allocation_gap_pct),
    );
    return new Map(byMag.map((c, i) => [c.component_type, { rank: i + 1, total: under.length }]));
  }, [sortedComponents]);

  const overfundedRanking = useMemo(() => {
    const over = sortedComponents.filter((c) => c.allocation_gap_lcu < -1000);
    const byMag = [...over].sort(
      (a, b) => Math.abs(b.allocation_gap_lcu) - Math.abs(a.allocation_gap_lcu),
    );
    return new Map(byMag.map((c, i) => [c.component_type, { rank: i + 1, total: over.length }]));
  }, [sortedComponents]);

  const tableTotals = useMemo(() => {
    let current = 0;
    let optimal = 0;
    for (const c of data.components) {
      current += c.current_allocation_lcu;
      optimal += c.optimal_allocation_lcu;
    }
    return { current, optimal, gap: optimal - current };
  }, [data.components]);

  const totalsReconciled =
    data.total_budget_lcu > 0 &&
    Math.abs(tableTotals.current - data.total_budget_lcu) / data.total_budget_lcu < 0.02;

  /** After backend envelope normalization, optimal totals should match current (redistributive mix only). */
  const optimalMatchesEnvelope =
    Math.abs(tableTotals.gap) < Math.max(data.total_budget_lcu * 1e-9, 1000);

  const policyNarrative = useMemo(() => {
    const under = [...data.components]
      .filter((c) => c.is_underfunded)
      .sort((a, b) => Math.abs(b.allocation_gap_lcu) - Math.abs(a.allocation_gap_lcu))
      .slice(0, 3);
    const over = [...data.components]
      .filter((c) => c.allocation_gap_lcu < -1000)
      .sort((a, b) => Math.abs(b.allocation_gap_lcu) - Math.abs(a.allocation_gap_lcu))
      .slice(0, 2);

    const parts: string[] = [];
    parts.push(
      `At mapped sector budgets totaling about ${formatRWFCompact(data.total_budget_lcu)}, the assessed point-in-time FSFSI is ${formatScore(data.current_fsfsi)}. `,
    );
    parts.push(
      `The engine’s closed-form optimal mix for the same total budget implies FSFSI near ${formatScore(data.optimal_fsfsi)} — about ${(data.waste_ratio * 100).toFixed(1)}% financing slack versus that benchmark. `,
    );
    if (under.length) {
      parts.push(
        `Largest modeled shortfalls vs optimal shares: ${under.map((c) => `${displayName(c)} (${formatRWFCompact(c.allocation_gap_lcu)})`).join('; ')}. `,
      );
    }
    if (over.length) {
      parts.push(
        `Largest modeled surpluses (reallocation sources): ${over.map((c) => `${displayName(c)} (${formatRWFCompact(Math.abs(c.allocation_gap_lcu))})`).join('; ')}.`,
      );
    }
    return parts.join('').trim();
  }, [data]);

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 0.75) return 'text-green-600';
    if (efficiency >= 0.5) return 'text-yellow-600';
    if (efficiency >= 0.25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getEfficiencyBarColor = (efficiency: number): string => {
    if (efficiency >= 0.75) return 'bg-green-500';
    if (efficiency >= 0.5) return 'bg-yellow-500';
    if (efficiency >= 0.25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {context ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-4 py-3 text-xs text-slate-700 leading-relaxed">
          <p className="font-medium text-slate-800 mb-1">FSFSI on this page</p>
          <p>
            <strong>Point-in-time FSFSI</strong> ({formatScore(data.current_fsfsi)}) comes from the saved assessment
            for <strong>{context.fiscalYearLabel}</strong>
            {context.assessmentName ? ` — ${context.assessmentName}` : ''} using{' '}
            <strong>{context.weightingLabel}</strong> and scenario <strong>{context.scenarioLabel}</strong> (
            {context.indicatorCount} indicators). National Overview may show <strong>cumulative</strong> stress
            (higher when persistence is enabled); that is not a data error.
            {context.cumulativeFsfsi != null ? (
              <>
                {' '}
                Cumulative FSFSI for this same save is about {formatScore(context.cumulativeFsfsi)}.
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current FSFSI</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatScore(data.current_fsfsi)}</p>
          <p className="text-xs text-gray-500 mt-1">Point-in-time stress (this assessment)</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Optimal FSFSI</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatScore(data.optimal_fsfsi)}</p>
          <p className="text-xs text-green-600 mt-1">Closed-form optimal mix, same budget total</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total budget (mapped)</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{formatRWFCompact(data.total_budget_lcu)}</p>
          <p className="text-xs text-blue-600 mt-1">
            Engine step: {formatEngineDurationMs(data.computing_time_ms)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Efficiency index</h3>
            <p className="text-xs text-gray-500">Optimal FSFSI ÷ actual FSFSI — 100% means allocations match benchmark mix</p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold ${getEfficiencyColor(data.efficiency_index)}`}>
              {efficiencyPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getEfficiencyBarColor(data.efficiency_index)}`}
            style={{ width: `${efficiencyPercent}%` }}
          />
        </div>

        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0% (far from optimal)</span>
          <span>100% (at optimal)</span>
        </div>

        {data.waste_ratio > 0.1 && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">
                {(data.waste_ratio * 100).toFixed(1)}% budget inefficiency vs optimal mix
              </p>
              <p className="text-amber-700 text-xs mt-0.5">
                Current mapped allocations could be rebalanced to reduce FSFSI further without changing total envelope.
              </p>
            </div>
          </div>
        )}
      </div>

      {policyNarrative ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Reading the results</p>
          <p className="text-sm text-slate-800 leading-relaxed">{policyNarrative}</p>
        </div>
      ) : null}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Component allocation (current vs optimal)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Percent gaps can be very large when current mapped spend in a sector is small; interpret with programme and
            data-mapping context — not as a literal single-year spending mandate.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Component
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Current
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Optimal
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Gap
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedComponents.map((item) => {
                const underR = underfundedRanking.get(item.component_type);
                const overR = overfundedRanking.get(item.component_type);
                const extremePct = Math.abs(item.allocation_gap_pct) >= EXTREME_GAP_PCT;
                return (
                  <tr key={item.component_type} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <span className="inline-flex items-center gap-1">
                        {displayName(item)}
                        {extremePct ? (
                          <span title="Large % often means a tiny baseline allocation in the model, not necessarily an actionable year-one increase.">
                            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {formatRWFCompact(item.current_allocation_lcu)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {formatRWFCompact(item.optimal_allocation_lcu)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-medium ${
                          item.allocation_gap_lcu > 0
                            ? 'text-red-600'
                            : item.allocation_gap_lcu < 0
                              ? 'text-green-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {item.allocation_gap_lcu > 0 ? '+' : ''}
                        {formatRWFCompact(item.allocation_gap_lcu)}
                        <span className="text-xs ml-1">
                          ({item.allocation_gap_pct > 0 ? '+' : ''}
                          {item.allocation_gap_pct.toFixed(1)}%)
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.is_underfunded ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-900 ring-1 ring-red-200/80"
                          style={{
                            opacity:
                              underR && underR.total > 1
                                ? 0.65 + (0.35 * (underR.total - underR.rank + 1)) / underR.total
                                : undefined,
                          }}
                        >
                          <TrendingDown className="h-3 w-3" />
                          Underfunded
                          {underR && underR.total > 1 ? (
                            <span className="text-[10px] font-normal text-red-800/90">
                              ({underR.rank}/{underR.total})
                            </span>
                          ) : null}
                        </span>
                      ) : item.allocation_gap_lcu < -1000 ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 ring-amber-200/80`}
                          style={{
                            opacity:
                              overR && overR.total > 1
                                ? 0.65 + (0.35 * (overR.total - overR.rank + 1)) / overR.total
                                : undefined,
                          }}
                        >
                          <TrendingUp className="h-3 w-3" />
                          Over-funded
                          {overR && overR.total > 1 ? (
                            <span className="text-[10px] font-normal text-amber-900/90">
                              ({overR.rank}/{overR.total})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          Near optimal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-200 font-semibold text-sm">
                <td className="px-4 py-3 text-slate-900">Total (sum of rows)</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                  {formatRWFCompact(tableTotals.current)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                  {formatRWFCompact(tableTotals.optimal)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                  <span className={tableTotals.gap > 0 ? 'text-red-700' : tableTotals.gap < 0 ? 'text-green-700' : ''}>
                    {tableTotals.gap > 0 ? '+' : ''}
                    {formatRWFCompact(tableTotals.gap)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs font-normal text-slate-600">
                  {totalsReconciled && optimalMatchesEnvelope ? (
                    <span title="Sums match headline; optimal mix uses the same envelope as current.">
                      ✓ Envelope balanced
                    </span>
                  ) : (
                    <span title="Verify assessment mapping if sums diverge.">Recheck totals</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-600 leading-relaxed">
          <strong className="text-gray-700">Reconciliation:</strong> the <em>current</em> and <em>optimal</em> columns
          are scaled to the same national envelope (
          {formatRWFCompact(data.total_budget_lcu)}
          {totalsReconciled ? '' : `; summed current ${formatRWFCompact(tableTotals.current)}`}), so aggregate
          reallocation is redistributive only (net zero at the total). Modeled shares correct per-row integer drift from
          the engine; implementation still follows MTEF and legal appropriation.
        </div>
      </div>
    </div>
  );
}
