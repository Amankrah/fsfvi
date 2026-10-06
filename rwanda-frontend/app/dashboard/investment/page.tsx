'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import { planningAPI } from '@/lib/api/planningApi';
import {
  COMPONENT_DISPLAY_NAMES,
  INDICATOR_COMPONENTS,
  type IndicatorComponent,
} from '@/lib/types/assessment';
import type { SavedAssessment, SavedIndicatorResult } from '@/lib/types/assessment';
import type {
  InvestmentScenarioResponse,
  PSTA5PriorityAreaAllocation,
  SavedStrategicPlanSummary,
} from '@/lib/types/planning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PiggyBank, AlertTriangle, LineChart, Search, Info, ChevronRight } from 'lucide-react';
import { formatScore } from '@/lib/utils/formatters';

function getPstaGapAlerts(rows: PSTA5PriorityAreaAllocation[] | undefined): PSTA5PriorityAreaAllocation[] {
  if (!rows?.length) return [];
  return rows.filter((r) => {
    if (r.target_pct < 1) return false;
    const gap = r.target_pct - r.actual_pct;
    if (r.actual_pct < 0.05 && r.target_pct >= 8) return true;
    if (gap > 10) return true;
    return false;
  });
}

function alignmentQualityBand(score: number): 'high' | 'mid' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

/** Positive ⇒ with-envelope FSFSI is lower (better) than plan reference: donor additionality. */
function formatAdditionalityPoints(x: number | undefined | null): string {
  if (x == null || Number.isNaN(x)) return '–';
  const s = formatScore(x);
  if (x > 0) return `+${s}`;
  return s;
}

export default function InvestmentStrategyPage() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<SavedStrategicPlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [projectFiscalYears, setProjectFiscalYears] = useState<number[]>([]);
  /** bn RWF per implementation fiscal year (strings for controlled inputs) */
  const [investByYear, setInvestByYear] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<SavedAssessment | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [programName, setProgramName] = useState('');
  const [indicatorFilter, setIndicatorFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState<'all' | IndicatorComponent>('all');
  const [persona, setPersona] = useState<'ministry' | 'donor' | 'partner'>('donor');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  /** Per selected code: true = higher values better for gap semantics */
  const [higherBetterByCode, setHigherBetterByCode] = useState<Record<string, boolean>>({});
  const [weightingMethod, setWeightingMethod] = useState('hybrid');
  const [scenario, setScenario] = useState('normal_operations');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestmentScenarioResponse | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingPlans(true);
      setError(null);
      setSelectedPlanId(null);
      setAssessmentId(null);
      setProjectFiscalYears([]);
      setInvestByYear({});
      try {
        const list = await planningAPI.listSavedPlans();
        if (cancel) return;
        setPlans(list);
        const active = list.find((p) => p.is_active);
        const first = active ?? list[0];
        if (first) {
          setSelectedPlanId(first.id);
          setAssessmentId(first.assessment_id);
        }
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancel) setLoadingPlans(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlanId) {
      setProjectFiscalYears([]);
      setInvestByYear({});
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const full = await planningAPI.getSavedPlan(selectedPlanId);
        if (cancel) return;
        const yp = full.plan_json?.yearly_plans ?? [];
        const fys = yp
          .map((y) => (y.fiscal_year != null ? Number(y.fiscal_year) : null))
          .filter((n): n is number => n != null && Number.isFinite(n));
        const uniq = [...new Set(fys)].sort((a, b) => a - b);
        setProjectFiscalYears(uniq);
        setWeightingMethod(full.weighting_method || 'hybrid');
        setScenario(full.scenario || 'normal_operations');
        setInvestByYear((prev) => {
          const next: Record<string, string> = {};
          for (const fy of uniq) next[String(fy)] = prev[String(fy)] ?? '';
          return next;
        });
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selectedPlanId]);

  useEffect(() => {
    if (!assessmentId) {
      setDetail(null);
      setSelectedCodes(new Set());
      setHigherBetterByCode({});
      return;
    }
    let cancel = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const d = await assessmentAPI.getAssessment(assessmentId);
        if (!cancel) {
          setDetail(d);
          setSelectedCodes(new Set());
          setHigherBetterByCode({});
        }
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancel) setLoadingDetail(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [assessmentId]);

  const indicators = useMemo((): SavedIndicatorResult[] => {
    const raw = detail?.indicator_results;
    if (!raw?.length) return [];
    return [...raw].sort((a, b) => a.indicator_code.localeCompare(b.indicator_code));
  }, [detail]);

  const filteredIndicators = useMemo(() => {
    let rows = indicators;
    if (componentFilter !== 'all') {
      rows = rows.filter((r) => r.component === componentFilter);
    }
    const q = indicatorFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.indicator_code.toLowerCase().includes(q) ||
        r.indicator_name.toLowerCase().includes(q) ||
        r.component.toLowerCase().includes(q),
    );
  }, [indicators, componentFilter, indicatorFilter]);

  const catalogDirectionVaries = useMemo(() => {
    if (indicators.length === 0) return false;
    const senses = new Set(indicators.map((r) => (r.higher_is_better === false ? 'lower' : 'higher')));
    return senses.size > 1;
  }, [indicators]);
  const showDirectionColumn = catalogDirectionVaries || selectedCodes.size > 0;

  const scheduleNeedsInnerScroll = projectFiscalYears.length > 10;

  const parseBn = useCallback((raw: string) => {
    const x = parseFloat(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(x) && x >= 0 ? x : 0;
  }, []);

  const toggleIndicator = useCallback(
    (row: SavedIndicatorResult, checked: boolean) => {
      const code = row.indicator_code;
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(code);
        } else {
          next.delete(code);
        }
        return next;
      });
      setHigherBetterByCode((prev) => {
        const next = { ...prev };
        if (checked) {
          next[code] = row.higher_is_better !== false;
        } else {
          delete next[code];
        }
        return next;
      });
    },
    [],
  );

  const setDirection = useCallback((code: string, higherIsBetter: boolean) => {
    setHigherBetterByCode((prev) => ({ ...prev, [code]: higherIsBetter }));
  }, []);

  const runScenario = useCallback(async () => {
    if (!assessmentId) {
      setError(t('investment.no_plan'));
      return;
    }
    if (projectFiscalYears.length === 0) {
      setError(t('investment.no_horizon'));
      return;
    }
    const codes = Array.from(selectedCodes);
    if (codes.length === 0) {
      setError(t('investment.need_indicators'));
      return;
    }
    const schedule: Record<string, number> = {};
    let sumBn = 0;
    for (const fy of projectFiscalYears) {
      const x = parseBn(investByYear[String(fy)] ?? '');
      if (x > 0) {
        schedule[String(fy)] = x;
        sumBn += x;
      }
    }
    if (sumBn <= 0) {
      setError(t('investment.need_schedule_amount'));
      return;
    }
    const hib: Record<string, boolean> = {};
    for (const c of codes) {
      hib[c] = higherBetterByCode[c] !== false;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await planningAPI.investmentScenario(assessmentId, {
        program_name: programName.trim() || undefined,
        indicator_codes: codes,
        investment_by_fiscal_year: schedule,
        higher_is_better_by_indicator: hib,
        strategic_plan_id: selectedPlanId ?? undefined,
        weighting_method: weightingMethod,
        scenario,
      });
      if (res.error) setError(res.error);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }, [
    assessmentId,
    selectedPlanId,
    projectFiscalYears,
    investByYear,
    selectedCodes,
    higherBetterByCode,
    programName,
    weightingMethod,
    scenario,
    parseBn,
    t,
  ]);

  const touchedIndicators = useMemo(() => {
    if (!result?.indicator_deltas) return [];
    return result.indicator_deltas.filter((r) => r.additional_weighted_bn > 0).slice(0, 25);
  }, [result]);

  const selectAllFiltered = useCallback(() => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      for (const r of filteredIndicators) next.add(r.indicator_code);
      return next;
    });
    setHigherBetterByCode((prev) => {
      const next = { ...prev };
      for (const r of filteredIndicators) {
        next[r.indicator_code] = r.higher_is_better !== false;
      }
      return next;
    });
  }, [filteredIndicators]);

  const clearSelection = useCallback(() => {
    setSelectedCodes(new Set());
    setHigherBetterByCode({});
  }, []);

  const selectedPlanSummary = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const scheduleTotalBn = useMemo(() => {
    let s = 0;
    for (const fy of projectFiscalYears) {
      s += parseBn(investByYear[String(fy)] ?? '');
    }
    return s;
  }, [projectFiscalYears, investByYear, parseBn]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <PiggyBank className="h-7 w-7 text-[var(--rw-blue)]" aria-hidden />
            {t('investment.title')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{t('investment.subtitle')}</p>
          <p className="mt-2 max-w-3xl text-xs text-slate-500">{t('investment.baseline_year_hint_short')}</p>
        </div>
      </div>

      {error ? (
        <div
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/90 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              {t('investment.program_card')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs font-medium text-slate-600">{t('investment.persona_label')}</span>
              <p className="mt-0.5 text-[11px] text-slate-500">{t('investment.persona_help')}</p>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={t('investment.persona_label')}
              >
                {(['ministry', 'donor', 'partner'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={persona === p}
                    onClick={() => setPersona(p)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      persona === p
                        ? 'border-[var(--rw-blue)] bg-sky-50 text-[var(--rw-blue)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t(`investment.persona_${p}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600">{t('investment.strategic_plan')}</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={selectedPlanId ?? ''}
                disabled={loadingPlans || plans.length === 0}
                onChange={(e) => {
                  const pid = e.target.value || null;
                  setSelectedPlanId(pid);
                  const p = plans.find((x) => x.id === pid);
                  setAssessmentId(p?.assessment_id ?? null);
                }}
              >
                {plans.length === 0 ? (
                  <option value="">{t('investment.no_plans_any')}</option>
                ) : (
                  plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan_name || `Plan ${p.id.slice(0, 8)}`}
                      {p.is_active ? ` · ${t('investment.plan_active')}` : ''} · FY{p.fiscal_year}
                    </option>
                  ))
                )}
              </select>
              {selectedPlanSummary ? (
                <p className="mt-1 text-xs text-slate-600">
                  {t('investment.plan_baseline_line', {
                    fy: selectedPlanSummary.fiscal_year,
                    fsfsi: formatScore(selectedPlanSummary.baseline_fsfsi),
                  })}
                </p>
              ) : null}
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600">{t('investment.implementation_schedule')}</span>
              <p className="mt-0.5 text-xs text-slate-500">{t('investment.schedule_help')}</p>
              {projectFiscalYears.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">{t('investment.no_horizon')}</p>
              ) : (
                <div
                  className={
                    scheduleNeedsInnerScroll
                      ? 'mt-2 max-h-[280px] overflow-auto rounded-lg border border-slate-100'
                      : 'mt-2 rounded-lg border border-slate-100'
                  }
                >
                  <table className="w-full text-left text-xs">
                    <thead
                      className={
                        scheduleNeedsInnerScroll
                          ? 'sticky top-0 z-[1] bg-slate-50 text-slate-600'
                          : 'bg-slate-50 text-slate-600'
                      }
                    >
                      <tr>
                        <th className="px-2 py-2 font-medium">{t('investment.fiscal_year_col')}</th>
                        <th className="px-2 py-2 font-medium">{t('investment.amount_bn_col')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectFiscalYears.map((fy) => (
                        <tr key={fy} className="border-t border-slate-100">
                          <td className="px-2 py-1.5 tabular-nums font-medium text-slate-800">FY{fy}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full min-w-[6rem] rounded border border-slate-200 bg-white px-2 py-1 tabular-nums"
                              placeholder="0"
                              value={investByYear[String(fy)] ?? ''}
                              onChange={(e) =>
                                setInvestByYear((prev) => ({
                                  ...prev,
                                  [String(fy)]: e.target.value,
                                }))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {projectFiscalYears.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-slate-700">
                  {t('investment.schedule_total')}: {formatScore(scheduleTotalBn)} {t('investment.bn_rwf_suffix')}
                </p>
              ) : null}
            </div>

            <div>
              <span className="text-xs font-medium text-slate-600">{t('investment.program_name')}</span>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder={t('investment.program_name_placeholder')}
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
              />
            </div>

            <p className="text-xs text-slate-500">{t('investment.split_note')}</p>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div>
                <span className="text-xs font-medium text-slate-600">{t('investment.filter_indicators_heading')}</span>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  <div className="relative sm:col-span-2">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm"
                      placeholder={t('investment.filter_placeholder')}
                      value={indicatorFilter}
                      onChange={(e) => setIndicatorFilter(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="sr-only" htmlFor="invest-component-filter">
                      {t('investment.component_filter_label')}
                    </label>
                    <select
                      id="invest-component-filter"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={componentFilter}
                      onChange={(e) =>
                        setComponentFilter(
                          e.target.value === 'all' ? 'all' : (e.target.value as IndicatorComponent),
                        )
                      }
                    >
                      <option value="all">{t('investment.component_filter_all')}</option>
                      {(Object.entries(INDICATOR_COMPONENTS) as [string, IndicatorComponent][]).map(([, comp]) => (
                        <option key={comp} value={comp}>
                          {COMPONENT_DISPLAY_NAMES[comp]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600">
                  {t('investment.selected_count', { count: selectedCodes.size })}
                </span>
                <Button type="button" variant="default" size="sm" className="h-8 text-xs" onClick={selectAllFiltered}>
                  {t('investment.select_filtered')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-red-200 text-xs text-red-700 hover:bg-red-50"
                  onClick={clearSelection}
                >
                  {t('investment.clear_selection')}
                </Button>
              </div>
            </div>

            <div className="max-h-[min(420px,50vh)] overflow-auto rounded-lg border border-slate-100">
              {loadingDetail ? (
                <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('investment.loading_indicators')}
                </div>
              ) : indicators.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">{t('investment.no_indicators')}</p>
              ) : (
                <table className="w-full min-w-0 text-left text-xs">
                  <thead className="sticky top-0 z-[1] bg-slate-50 text-slate-600">
                    <tr>
                      <th className="w-8 px-2 py-2" />
                      <th className="px-2 py-2 font-medium">{t('investment.code')}</th>
                      <th className="px-2 py-2 font-medium">{t('investment.indicator')}</th>
                      {showDirectionColumn ? (
                        <th className="px-2 py-2 font-medium">{t('investment.direction')}</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndicators.map((r) => {
                      const on = selectedCodes.has(r.indicator_code);
                      const hib = on
                        ? higherBetterByCode[r.indicator_code] !== false
                        : r.higher_is_better !== false;
                      return (
                        <tr
                          key={r.id}
                          className={`border-t border-slate-100 ${on ? 'bg-sky-50/50' : ''}`}
                        >
                          <td className="px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) => toggleIndicator(r, e.target.checked)}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[11px]">{r.indicator_code}</td>
                          <td className="px-2 py-1.5 text-slate-800">
                            <span className="line-clamp-2">{r.indicator_name}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-500">
                              {COMPONENT_DISPLAY_NAMES[r.component as IndicatorComponent] ?? r.component}
                            </span>
                          </td>
                          {showDirectionColumn ? (
                            <td className="px-2 py-1.5">
                              {on ? (
                                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setDirection(r.indicator_code, true)}
                                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                      hib
                                        ? 'bg-[var(--rw-blue)] text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {t('investment.higher_better_abbr')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDirection(r.indicator_code, false)}
                                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                                      !hib
                                        ? 'bg-[var(--rw-blue)] text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {t('investment.lower_better_abbr')}
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`text-[10px] font-medium ${
                                    r.higher_is_better === false ? 'text-amber-800' : 'text-slate-600'
                                  }`}
                                >
                                  {r.higher_is_better === false
                                    ? t('investment.lower_better_abbr')
                                    : t('investment.higher_better_abbr')}
                                </span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs text-slate-600">{t('assessment_page.detail_weighting')}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={weightingMethod}
                  onChange={(e) => setWeightingMethod(e.target.value)}
                >
                  <option value="hybrid">{t('planning.weight_method_hybrid')}</option>
                  <option value="equal">{t('planning.weight_method_equal')}</option>
                  <option value="expert">{t('planning.weight_method_expert')}</option>
                  <option value="financial">{t('planning.weight_method_financial')}</option>
                  <option value="network">{t('planning.weight_method_network')}</option>
                </select>
              </div>
              <div>
                <span className="text-xs text-slate-600">{t('assessment_page.detail_scenario')}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="normal_operations">{t('assessment_page.scenario_normal_operations')}</option>
                  <option value="climate_shock">{t('assessment_page.scenario_climate_shock')}</option>
                  <option value="financial_crisis">{t('assessment_page.scenario_financial_crisis')}</option>
                  <option value="supply_chain_disruption">{t('investment.scenario_supply_chain')}</option>
                </select>
              </div>
            </div>

            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void runScenario()}
              disabled={running || !assessmentId || loadingDetail || projectFiscalYears.length === 0}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('investment.running')}
                </>
              ) : (
                <>
                  <LineChart className="mr-2 h-4 w-4" />
                  {t('investment.run')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              {t('investment.results_card')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!result && !running ? (
              <div className="space-y-3">
                <p className="text-slate-600">{t('investment.results_placeholder')}</p>
                <div
                  className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500"
                  aria-hidden
                >
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t('investment.results_preview_label')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400">{t('investment.baseline_fsfsi')}</div>
                      <div className="tabular-nums text-slate-500">0.32</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">{t('investment.scenario_fsfsi')}</div>
                      <div className="tabular-nums text-slate-500">0.28</div>
                    </div>
                  </div>
                  <div className="mt-2 rounded border border-emerald-100 bg-emerald-50/50 px-2 py-1.5 text-emerald-800">
                    <span className="text-[10px] font-medium">{t('investment.delta_fsfsi')}</span>
                    <span className="ml-2 tabular-nums">0.04</span>
                  </div>
                </div>
              </div>
            ) : null}
            {result ? (
              <>
                {result.disclaimer ? (
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-3 text-xs text-amber-950">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                    <p className="font-medium leading-snug">{result.disclaimer}</p>
                  </div>
                ) : null}
                <p className="text-xs text-slate-600">{t(`investment.results_framing_${persona}`)}</p>
                {result.program_name?.trim() ? (
                  <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {t('investment.program_name')}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{result.program_name.trim()}</div>
                  </div>
                ) : null}
                {result.indicator_selection?.per_indicator_bn != null ? (
                  <p className="text-xs text-slate-600">
                    {t('investment.per_indicator_bn_note', {
                      amt: formatScore(result.indicator_selection.per_indicator_bn),
                    })}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50/90 p-4">
                  <div>
                    <div className="text-xs font-medium text-slate-500">{t('investment.baseline_fsfsi')}</div>
                    <div className="text-lg font-semibold tabular-nums text-slate-900">
                      {formatScore(result.baseline_fsfsi)}
                    </div>
                    <div className="text-xs capitalize text-slate-500">{result.baseline_risk_level}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">{t('investment.scenario_fsfsi')}</div>
                    <div className="text-lg font-semibold tabular-nums text-slate-900">
                      {formatScore(result.scenario_fsfsi)}
                    </div>
                    <div className="text-xs capitalize text-slate-500">{result.scenario_risk_level}</div>
                  </div>
                </div>
                {result.strategic_plan_context ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-xs text-slate-700">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{t('investment.vs_strategic_plan')}</div>
                      <p className="mt-1 text-xs text-slate-600">
                        {t('investment.additionality_panel_subtitle', {
                          fy: result.comparison_fiscal_year ?? result.strategic_plan_context.project_fiscal_year,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                      {(
                        [
                          {
                            title: t('investment.step_assessment_baseline'),
                            hint: t('investment.step_assessment_hint'),
                            val: result.baseline_fsfsi,
                            emphasis: false as const,
                          },
                          {
                            title: t('investment.step_plan_trajectory'),
                            hint: t('investment.step_plan_trajectory_hint'),
                            val: result.strategic_plan_context.plan_projected_fsfsi,
                            sub: t('investment.step_plan_milestone_short', {
                              val: formatScore(result.strategic_plan_context.plan_target_fsfsi),
                            }),
                            emphasis: false as const,
                          },
                          {
                            title: t('investment.step_with_envelope'),
                            hint: t('investment.step_with_envelope_hint'),
                            val:
                              result.strategic_plan_context.donor_scenario_fsfsi ?? result.scenario_fsfsi,
                            emphasis: true as const,
                          },
                        ] as const
                      ).map((step, i, arr) => (
                        <div key={step.title} className="flex min-w-0 flex-1 items-stretch gap-2">
                          <div
                            className={`flex min-w-0 flex-1 flex-col rounded-lg border px-3 py-3 ${
                              step.emphasis
                                ? 'border-emerald-300 bg-emerald-50/90 shadow-sm'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              {step.title}
                            </div>
                            <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{step.hint}</p>
                            <div
                              className={`mt-2 text-xl font-bold tabular-nums ${
                                step.emphasis ? 'text-emerald-900' : 'text-slate-900'
                              }`}
                            >
                              {formatScore(step.val)}
                            </div>
                            {'sub' in step && step.sub ? (
                              <p className="mt-1 text-[10px] text-slate-500">{step.sub}</p>
                            ) : null}
                          </div>
                          {i < arr.length - 1 ? (
                            <div
                              className="hidden shrink-0 flex-col justify-center text-slate-400 sm:flex"
                              aria-hidden
                            >
                              <ChevronRight className="h-6 w-6" />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-600">{t('investment.step_flow_caption')}</p>
                    {(() => {
                      const addP = result.strategic_plan_context.additional_fsfsi_reduction_vs_plan_projected;
                      const addT = result.strategic_plan_context.additional_fsfsi_reduction_vs_plan_target;
                      const worse = addP != null && addP < 0;
                      return (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-3">
                            <dt className="text-[11px] font-semibold text-emerald-900">
                              {t('investment.additional_reduction_vs_trajectory')}
                            </dt>
                            <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
                              {formatAdditionalityPoints(addP)}
                            </dd>
                            <p className="mt-1 text-[10px] text-emerald-900/85">
                              {t('investment.additional_reduction_vs_trajectory_hint')}
                            </p>
                          </div>
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-3">
                            <dt className="text-[11px] font-semibold text-emerald-900">
                              {t('investment.additional_reduction_vs_milestone')}
                            </dt>
                            <dd className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
                              {formatAdditionalityPoints(addT)}
                            </dd>
                            <p className="mt-1 text-[10px] text-emerald-900/85">
                              {t('investment.additional_reduction_vs_milestone_hint')}
                            </p>
                          </div>
                          {worse ? (
                            <p className="sm:col-span-2 text-[11px] text-amber-900">
                              {t('investment.additionality_worse_than_plan')}
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                    <div className="space-y-2 rounded-lg border border-slate-100 bg-white/80 px-3 py-3 text-sm text-slate-700">
                      <p>
                        {t('investment.additionality_lead', {
                          fy: result.comparison_fiscal_year ?? result.strategic_plan_context.project_fiscal_year,
                          plan_proj: formatScore(result.strategic_plan_context.plan_projected_fsfsi),
                          total_bn:
                            result.indicator_selection?.total_investment_bn != null
                              ? formatScore(result.indicator_selection.total_investment_bn)
                              : '–',
                          with_env: formatScore(
                            result.strategic_plan_context.donor_scenario_fsfsi ?? result.scenario_fsfsi,
                          ),
                        })}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {t('investment.additionality_extra', {
                          vs_traj: formatAdditionalityPoints(
                            result.strategic_plan_context.additional_fsfsi_reduction_vs_plan_projected,
                          ),
                          vs_mil: formatAdditionalityPoints(
                            result.strategic_plan_context.additional_fsfsi_reduction_vs_plan_target,
                          ),
                        })}
                      </p>
                    </div>
                    {result.strategic_plan_context.comparison_note ? (
                      <p className="text-[11px] text-slate-500">{result.strategic_plan_context.comparison_note}</p>
                    ) : null}
                    <p className="text-[11px] text-slate-600">
                      {t('investment.baseline_vs_plan_explainer', {
                        fy: result.baseline_assessment_fiscal_year ?? '',
                      })}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3">
                  <div className="text-xs font-medium text-emerald-800">{t('investment.delta_fsfsi')}</div>
                  <div className="text-2xl font-bold tabular-nums text-emerald-900">
                    {formatScore(result.delta_fsfsi)}
                  </div>
                  <p className="mt-1 text-xs text-emerald-800/90">{t('investment.delta_fsfsi_note')}</p>
                </div>
                <p className="text-xs text-slate-500">{result.methodology_note}</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {result?.psta5_envelope_alignment ? (
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              {t('investment.psta_envelope')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="mb-3 text-slate-600">{t('investment.psta_envelope_note')}</p>
            {(() => {
              const score = result.psta5_envelope_alignment!.alignment_score ?? 0;
              const band = alignmentQualityBand(score);
              return (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-semibold tabular-nums text-slate-900">
                      {formatScore(score)}
                      <span className="text-sm font-normal text-slate-500"> / 100</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        band === 'high'
                          ? 'bg-emerald-100 text-emerald-900'
                          : band === 'mid'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-red-100 text-red-900'
                      }`}
                    >
                      {t(`investment.alignment_band_${band}`)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {t('investment.alignment_score_explainer')}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">{t('investment.alignment_scale_note')}</p>
                </div>
              );
            })()}
            {getPstaGapAlerts(result.psta5_envelope_alignment.priority_area_allocations).length > 0 ? (
              <div
                className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3 py-3 text-xs text-red-950"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">{t('investment.psta_gap_alert_title')}</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {getPstaGapAlerts(result.psta5_envelope_alignment.priority_area_allocations).map((row) => (
                      <li key={row.code}>
                        {t('investment.psta_gap_alert_item', {
                          code: row.code,
                          actual: formatScore(row.actual_pct),
                          target: formatScore(row.target_pct),
                          gap: formatScore(Math.max(0, row.target_pct - row.actual_pct)),
                        })}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-red-900/90">{t('investment.psta_gap_footer')}</p>
                </div>
              </div>
            ) : null}
            <div className="w-full overflow-x-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap px-2 py-2 font-medium">{t('investment.pa_code')}</th>
                    <th className="min-w-[8rem] px-2 py-2 font-medium">{t('investment.pa_name')}</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium">{t('investment.actual_pct')}</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium">{t('investment.target_pct')}</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium">{t('investment.deviation_pp')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.psta5_envelope_alignment.priority_area_allocations ?? []).map((row) => {
                    const gap = row.target_pct - row.actual_pct;
                    const hot =
                      row.actual_pct < 0.05 && row.target_pct >= 8 ? true : gap > 10;
                    return (
                      <tr
                        key={row.code}
                        className={`border-t border-slate-100 ${hot ? 'bg-red-50/70' : ''}`}
                      >
                        <td className="px-2 py-2 font-mono">{row.code}</td>
                        <td className="px-2 py-2 break-words text-slate-700">{row.name}</td>
                        <td className="px-2 py-2 tabular-nums">{formatScore(row.actual_pct)}%</td>
                        <td className="px-2 py-2 tabular-nums">{formatScore(row.target_pct)}%</td>
                        <td
                          className={`px-2 py-2 tabular-nums ${hot ? 'font-semibold text-red-800' : ''}`}
                        >
                          {formatScore(row.deviation_ppt)} pp
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                {t('investment.component_deltas')}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-0 text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 pr-3 font-medium">{t('investment.component')}</th>
                    <th className="py-2 pr-3 font-medium">{t('investment.delta_avg_stress')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.component_deltas.map((r) => (
                    <tr key={r.component} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-medium text-slate-800">
                        {COMPONENT_DISPLAY_NAMES[r.component as IndicatorComponent] ?? r.component}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-emerald-800">
                        {formatScore(r.delta_average_stress)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="w-full border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                {t('investment.indicator_moves')}
              </CardTitle>
              <p className="text-xs font-normal text-slate-500">{t('investment.indicator_moves_caption')}</p>
            </CardHeader>
            <CardContent className="w-full overflow-x-auto">
              {touchedIndicators.length === 0 ? (
                <p className="text-xs text-slate-500">{t('investment.no_indicator_touch')}</p>
              ) : (
                <table className="w-full min-w-[36rem] table-fixed text-left text-xs sm:min-w-full">
                  <thead className="border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="w-[28%] py-2 pr-2 font-medium">{t('investment.code')}</th>
                      <th className="w-[24%] py-2 pr-2 font-medium">{t('investment.add_bn')}</th>
                      <th className="w-[24%] py-2 pr-2 font-medium" title={t('investment.delta_stress_hint')}>
                        {t('investment.delta_stress_col')}
                      </th>
                      <th className="w-[24%] py-2 font-medium" title={t('investment.delta_weighted_hint')}>
                        {t('investment.delta_weighted_col')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {touchedIndicators.map((r) => (
                      <tr key={r.indicator_code} className="border-b border-slate-50">
                        <td className="break-words py-2 pr-2 font-mono text-[11px]">{r.indicator_code}</td>
                        <td className="py-2 pr-2 tabular-nums">{formatScore(r.additional_weighted_bn)}</td>
                        <td className="py-2 pr-2 tabular-nums text-emerald-800">{formatScore(r.delta_stress)}</td>
                        <td className="py-2 tabular-nums text-emerald-800">{formatScore(r.delta_weighted_stress)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
