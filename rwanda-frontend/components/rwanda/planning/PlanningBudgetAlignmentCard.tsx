'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AllocationSimulateResponse, PlanYearActualSummary, YearlyPlanOutput } from '@/lib/types/planning';
import { planningAPI } from '@/lib/api/planningApi';
import { formatRWFCompact } from '@/lib/utils/formatters';
import { formatScore } from '@/lib/utils/formatters';
import { formatPlanPeriodLabel } from '@/lib/utils/planningLabels';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, Save, Scale } from 'lucide-react';

function shareMap(yp: YearlyPlanOutput): Record<string, number> {
  const fromApi = yp.recommended_share_pct;
  if (fromApi && Object.keys(fromApi).length > 0) {
    return fromApi;
  }
  const rec = yp.recommended_allocations || {};
  const tot = Object.values(rec).reduce((s, v) => s + Math.abs(Number(v) || 0), 0);
  if (tot <= 0) return {};
  return Object.fromEntries(
    Object.entries(rec).map(([k, v]) => [k, ((Number(v) || 0) / tot) * 100]),
  );
}

function sortedComponentEntries(shares: Record<string, number>): [string, number][] {
  return Object.entries(shares).sort((a, b) => b[1] - a[1]);
}

interface Props {
  assessmentId: string;
  weightingMethod: string;
  scenario: string;
  yearlyPlans: YearlyPlanOutput[];
  /** If set (from plan JSON), simulate uses these weights so results match the chart even if the user changed the form. */
  planWeightingMethod?: string;
  planScenario?: string;
  /** Saved plan ID — required to save actuals. */
  planId?: string;
}

export function PlanningBudgetAlignmentCard({
  assessmentId,
  weightingMethod,
  scenario,
  yearlyPlans,
  planWeightingMethod,
  planScenario,
  planId,
}: Props) {
  const { t } = useLanguage();
  const [openYear, setOpenYear] = useState<number | null>(null);
  /** plan year -> component -> bn RWF string */
  const [bnDraft, setBnDraft] = useState<Record<number, Record<string, string>>>({});
  const [simByYear, setSimByYear] = useState<Record<number, AllocationSimulateResponse | null>>({});
  const [loadingYear, setLoadingYear] = useState<number | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track saved actuals and save state
  const [savedActuals, setSavedActuals] = useState<Record<number, boolean>>({});
  const [savingYear, setSavingYear] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing actuals on mount
  useEffect(() => {
    if (!planId) return;
    planningAPI.listPlanActuals(planId).then((actuals) => {
      const map: Record<number, boolean> = {};
      for (const a of actuals) {
        map[a.plan_year] = true;
      }
      setSavedActuals(map);
    }).catch(() => {
      // Ignore errors loading actuals
    });
  }, [planId]);

  const saveAsActual = useCallback(
    async (yp: YearlyPlanOutput) => {
      if (!planId) return;
      const draft = bnDraft[yp.year];
      if (!draft) return;

      const compAllocs: Record<string, number> = {};
      let total = 0;
      for (const [k, v] of Object.entries(draft)) {
        const bn = parseFloat(v) || 0;
        compAllocs[k] = bn;
        total += bn;
      }
      if (total <= 0) return;

      setSavingYear(yp.year);
      setSaveError(null);
      try {
        const sim = simByYear[yp.year];
        await planningAPI.saveYearActual(planId, {
          plan_year: yp.year,
          fiscal_year: yp.fiscal_year ?? yp.year,
          total_budget_bn: total,
          component_allocations_bn: compAllocs,
          simulated_cumulative_fsfsi: sim?.user_projected_cumulative_fsfsi,
          simulated_component_stress: sim?.user_component_cumulative_stress,
          delta_vs_plan_fsfsi: sim?.delta_user_minus_plan_fsfsi,
        });
        setSavedActuals((prev) => ({ ...prev, [yp.year]: true }));
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: string } } };
        setSaveError(ax.response?.data?.error || t('planning.alignment_save_failed'));
      } finally {
        setSavingYear(null);
      }
    },
    [planId, bnDraft, simByYear, t],
  );

  const fillFromPlan = useCallback((yp: YearlyPlanOutput) => {
    const planBn = Number(yp.total_budget) / 1e9;
    const shares = shareMap(yp);
    const next: Record<string, string> = {};
    for (const [c, pct] of Object.entries(shares)) {
      // Use 6 decimal places to minimize rounding accumulation when re-deriving
      // percentages. The backend tolerance (0.5 pp) handles remaining precision loss.
      next[c] = ((planBn * pct) / 100).toFixed(6);
    }
    setBnDraft((prev) => ({ ...prev, [yp.year]: next }));
  }, []);

  const parseYearDraft = useCallback(
    (yp: YearlyPlanOutput) => {
      const shares = shareMap(yp);
      const keys = Object.keys(shares);
      const draft = bnDraft[yp.year] || {};
      const bnByComp: Record<string, number> = {};
      let sum = 0;
      for (const k of keys) {
        const raw = (draft[k] ?? '').trim();
        const v = raw === '' ? 0 : Number(raw);
        if (!Number.isFinite(v) || v < 0) return { ok: false as const, sum: 0, bnByComp: {}, keys };
        bnByComp[k] = v;
        sum += v;
      }
      if (sum <= 0) return { ok: false as const, sum: 0, bnByComp, keys };
      const pct: Record<string, number> = {};
      for (const k of keys) {
        pct[k] = (bnByComp[k] / sum) * 100;
      }
      return { ok: true as const, sum, bnByComp, pct, keys };
    },
    [bnDraft],
  );

  const runSim = useCallback(
    async (yp: YearlyPlanOutput) => {
      const parsed = parseYearDraft(yp);
      if (!parsed.ok || parsed.sum <= 0) {
        setSimByYear((s) => ({ ...s, [yp.year]: null }));
        return;
      }
      const prevRow = yearlyPlans.find((p) => p.year === yp.year - 1);
      const priorComp: Record<string, number> = {};
      if (yp.year > 1) {
        if (!prevRow?.component_projections) {
          setSimError(t('planning.alignment_prior_missing'));
          return;
        }
        for (const k of parsed.keys) {
          const v = prevRow.component_projections[k]?.cumulative_stress;
          if (v == null || !Number.isFinite(Number(v))) {
            setSimError(t('planning.alignment_prior_missing'));
            return;
          }
          priorComp[k] = Number(v);
        }
      }

      setLoadingYear(yp.year);
      setSimError(null);
      try {
        const planBn = Number(yp.total_budget) / 1e9;
        const body = {
          plan_year: yp.year,
          total_budget_bn: parsed.sum,
          component_shares_pct: parsed.pct,
          weighting_method: weightingMethod,
          scenario,
          plan_reference: {
            projected_cumulative_fsfsi: Number(yp.projected_fsfvi),
            year_target_fsfvi: Number(yp.year_target ?? yp.target_fsfvi),
            recommended_allocations: yp.recommended_allocations,
            plan_total_budget_bn: planBn,
            // Include component projections so backend can use exact plan values when matching
            ...(yp.component_projections ? { component_projections: yp.component_projections } : {}),
            ...(planWeightingMethod?.trim()
              ? { planning_weighting_method: planWeightingMethod.trim() }
              : {}),
            ...(planScenario?.trim() ? { planning_scenario: planScenario.trim() } : {}),
          },
          ...(yp.year > 1 && prevRow
            ? {
                prior_system_cumulative: Number(prevRow.projected_fsfvi),
                prior_component_cumulative: priorComp,
              }
            : {}),
        };
        const res = await planningAPI.simulateAllocation(assessmentId, body);
        if ((res as { error?: string }).error) {
          setSimError((res as { error: string }).error);
          setSimByYear((s) => ({ ...s, [yp.year]: null }));
        } else {
          setSimByYear((s) => ({ ...s, [yp.year]: res }));
        }
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: string } } };
        setSimError(ax.response?.data?.error || t('planning.alignment_sim_failed'));
        setSimByYear((s) => ({ ...s, [yp.year]: null }));
      } finally {
        setLoadingYear((ly) => (ly === yp.year ? null : ly));
      }
    },
    [
      assessmentId,
      weightingMethod,
      scenario,
      planWeightingMethod,
      planScenario,
      yearlyPlans,
      parseYearDraft,
      t,
    ],
  );

  useEffect(() => {
    if (openYear == null) return;
    const yp = yearlyPlans.find((y) => y.year === openYear);
    if (!yp) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSim(yp);
    }, 550);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [openYear, bnDraft, yearlyPlans, runSim]);

  const rows = useMemo(
    () =>
      yearlyPlans.map((yp) => {
        const planBn = Number(yp.total_budget) / 1e9;
        const parsed = parseYearDraft(yp);
        const userSum = parsed.ok ? parsed.sum : null;
        const deltaPct =
          userSum != null && planBn > 0 ? ((userSum - planBn) / planBn) * 100 : null;
        let band: 'none' | 'close' | 'mid' | 'far' = 'none';
        if (deltaPct != null) {
          const a = Math.abs(deltaPct);
          if (a <= 3) band = 'close';
          else if (a <= 15) band = 'mid';
          else band = 'far';
        }
        return { yp, planBn, deltaPct, band, userSum, parsed };
      }),
    [yearlyPlans, parseYearDraft],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-[var(--rw-blue)]" />
          {t('planning.alignment_title')}
        </CardTitle>
        <p className="text-sm text-gray-500 font-normal">{t('planning.alignment_help')}</p>
        <p className="text-xs text-blue-900/80 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-2">
          {t('planning.alignment_cumulative_note')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-2">{t('planning.alignment_col_period')}</th>
                <th className="py-2 pr-2">{t('planning.alignment_col_plan_bn')}</th>
                <th className="py-2 pr-2">{t('planning.alignment_col_yours_bn')}</th>
                <th className="py-2 pr-2">{t('planning.alignment_col_delta')}</th>
                <th className="py-2 pr-2">{t('planning.alignment_col_fit')}</th>
                <th className="py-2 pr-2">{t('planning.alignment_col_fsfsi')}</th>
                <th className="py-2 w-10" aria-label={t('planning.alignment_expand')} />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ yp, planBn, deltaPct, band, userSum, parsed }) => {
                const shares = shareMap(yp);
                const expanded = openYear === yp.year;
                const sim = simByYear[yp.year];
                return (
                  <Fragment key={yp.year}>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-2 font-medium text-gray-900">
                        {formatPlanPeriodLabel(yp)}
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs">{planBn.toFixed(3)}</td>
                      <td className="py-2 pr-2 font-mono text-xs">
                        {userSum != null ? userSum.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs">
                        {deltaPct != null ? `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 pr-2">
                        {band === 'none' && <span className="text-gray-400 text-xs">—</span>}
                        {band === 'close' && (
                          <span className="text-green-700 text-xs font-medium">
                            {t('planning.alignment_fit_close')}
                          </span>
                        )}
                        {band === 'mid' && (
                          <span className="text-amber-700 text-xs font-medium">
                            {t('planning.alignment_fit_mid')}
                          </span>
                        )}
                        {band === 'far' && (
                          <span className="text-red-700 text-xs font-medium">
                            {t('planning.alignment_fit_far')}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs">
                        {sim?.user_projected_cumulative_fsfsi != null
                          ? formatScore(sim.user_projected_cumulative_fsfsi)
                          : '—'}
                      </td>
                      <td className="py-2">
                        {expanded ? (
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-100 text-gray-600"
                            onClick={() => setOpenYear(null)}
                            aria-expanded="true"
                            aria-label={t('planning.alignment_expand')}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-100 text-gray-600"
                            onClick={() => {
                              setOpenYear(yp.year);
                              if (!bnDraft[yp.year]) {
                                fillFromPlan(yp);
                              }
                            }}
                            aria-expanded="false"
                            aria-label={t('planning.alignment_expand')}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-gray-50/80">
                        <td colSpan={7} className="px-3 py-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <p className="text-gray-700 font-medium">
                              {t('planning.alignment_mix_title')}
                            </p>
                            <button
                              type="button"
                              className="text-xs font-medium text-[var(--rw-blue)] hover:underline"
                              onClick={() => fillFromPlan(yp)}
                            >
                              {t('planning.alignment_fill_plan')}
                            </button>
                          </div>
                          <p className="text-gray-600 mb-2">{t('planning.alignment_mix_help')}</p>
                          <table className="w-full text-xs mb-3">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="py-1 pr-2">{t('planning.alignment_comp')}</th>
                                <th className="py-1 pr-2">{t('planning.alignment_plan_share')}</th>
                                <th className="py-1 pr-2">{t('planning.alignment_your_bn')}</th>
                                <th className="py-1 pr-2">{t('planning.alignment_your_share')}</th>
                                <th className="py-1 pr-2">{t('planning.alignment_implied')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedComponentEntries(shares).map(([comp, planPct]) => {
                                const yourBn =
                                  parsed.ok && parsed.bnByComp[comp] != null
                                    ? parsed.bnByComp[comp]
                                    : 0;
                                const yourPct =
                                  parsed.ok && parsed.sum > 0 ? (yourBn / parsed.sum) * 100 : null;
                                const label =
                                  COMPONENT_DISPLAY_NAMES[comp as IndicatorComponent] ?? comp;
                                return (
                                  <tr key={comp} className="border-b border-gray-100/80">
                                    <td className="py-1 pr-2">{label}</td>
                                    <td className="py-1 pr-2 font-mono">{planPct.toFixed(2)}%</td>
                                    <td className="py-1 pr-2">
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.0001}
                                        className="w-24 rounded border border-gray-300 px-1.5 py-0.5 font-mono"
                                        value={bnDraft[yp.year]?.[comp] ?? ''}
                                        onChange={(e) =>
                                          setBnDraft((prev) => ({
                                            ...prev,
                                            [yp.year]: {
                                              ...(prev[yp.year] || {}),
                                              [comp]: e.target.value,
                                            },
                                          }))
                                        }
                                        aria-label={`${label} bn`}
                                      />
                                    </td>
                                    <td className="py-1 pr-2 font-mono">
                                      {yourPct != null ? `${yourPct.toFixed(2)}%` : '—'}
                                    </td>
                                    <td className="py-1 pr-2 font-mono">
                                      {parsed.ok && yourBn > 0
                                        ? formatRWFCompact(yourBn * 1e9)
                                        : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                            <span className="font-semibold text-gray-800">
                              {t('planning.alignment_auto_total')}:{' '}
                              <span className="font-mono text-[var(--rw-blue)]">
                                {parsed.ok ? `${parsed.sum.toFixed(4)} bn RWF` : '—'}
                              </span>
                            </span>
                            {loadingYear === yp.year && (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {t('planning.alignment_sim_loading')}
                              </span>
                            )}
                          </div>
                          {simError && openYear === yp.year && (
                            <p className="text-red-600 text-xs mb-2">{simError}</p>
                          )}
                          {sim && openYear === yp.year && sim.user_projected_cumulative_fsfsi != null && (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                              <p className="text-xs font-semibold text-gray-800">
                                {t('planning.alignment_fsfsi_compare')}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-500">
                                    {t('planning.alignment_user_cumulative')}
                                  </span>{' '}
                                  <span className="font-mono font-semibold">
                                    {formatScore(sim.user_projected_cumulative_fsfsi)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    {t('planning.alignment_plan_cumulative')}
                                  </span>{' '}
                                  <span className="font-mono">
                                    {sim.plan_projected_cumulative_fsfsi != null
                                      ? formatScore(sim.plan_projected_cumulative_fsfsi)
                                      : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    {t('planning.alignment_plan_target')}
                                  </span>{' '}
                                  <span className="font-mono">
                                    {sim.plan_year_target_fsfvi != null
                                      ? formatScore(sim.plan_year_target_fsfvi)
                                      : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">{t('planning.alignment_delta')}</span>{' '}
                                  <span
                                    className={`font-mono ${
                                      (sim.delta_user_minus_plan_fsfsi ?? 0) > 0.002
                                        ? 'text-red-600'
                                        : 'text-green-700'
                                    }`}
                                  >
                                    {sim.delta_user_minus_plan_fsfsi != null
                                      ? `${sim.delta_user_minus_plan_fsfsi > 0 ? '+' : ''}${formatScore(sim.delta_user_minus_plan_fsfsi)}`
                                      : '—'}
                                  </span>
                                </div>
                              </div>
                              {sim.user_worse_than_plan_optimal && (
                                <p className="text-amber-800 text-xs">{t('planning.alignment_worse')}</p>
                              )}
                              {sim.user_on_track_vs_plan_target === false && (
                                <p className="text-red-700 text-xs">{t('planning.alignment_above_target')}</p>
                              )}
                              {/* Save as Actual button */}
                              {planId && parsed.ok && parsed.sum > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => void saveAsActual(yp)}
                                    disabled={savingYear === yp.year}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${
                                      savedActuals[yp.year]
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : 'bg-[var(--rw-blue)] text-white hover:opacity-90'
                                    } disabled:opacity-50`}
                                  >
                                    {savingYear === yp.year ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : savedActuals[yp.year] ? (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (
                                      <Save className="h-3.5 w-3.5" />
                                    )}
                                    {savedActuals[yp.year]
                                      ? t('planning.alignment_actual_saved')
                                      : t('planning.alignment_save_actual')}
                                  </button>
                                  {savedActuals[yp.year] && (
                                    <span className="text-xs text-gray-500">
                                      {t('planning.alignment_actual_hint')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {saveError && openYear === yp.year && (
                                <p className="text-red-600 text-xs mt-2">{saveError}</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">{t('planning.alignment_footnote')}</p>
      </CardContent>
    </Card>
  );
}
