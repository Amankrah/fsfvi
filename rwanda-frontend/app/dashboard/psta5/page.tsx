'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { planningAPI } from '@/lib/api/planningApi';
import type { PSTA5TrackerData } from '@/lib/types/planning';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  BarChart3,
  Activity,
  Layers,
  ArrowRight,
  FileText,
  Wallet,
  PieChart,
} from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';

// 3 Priority Areas per official MINAGRI PSTA-5 structure
const PRIORITY_COLORS = [
  '#1d4ed8', // Blue - PA1: Modernization
  '#059669', // Emerald - PA2: Markets
  '#d97706', // Amber - PA3: Enablers
];

const PROGRESS_COLORS = {
  onTrack: '#059669',
  warning: '#d97706',
  atRisk: '#dc2626',
};

function componentLabel(key: string): string {
  const k = key as IndicatorComponent;
  return COMPONENT_DISPLAY_NAMES[k] ?? key.replace(/_/g, ' ');
}

function getProgressColor(percent: number): string {
  if (percent >= 70) return PROGRESS_COLORS.onTrack;
  if (percent >= 40) return PROGRESS_COLORS.warning;
  return PROGRESS_COLORS.atRisk;
}

export default function PSTA5Page() {
  const [data, setData] = useState<PSTA5TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [atRiskExpanded, setAtRiskExpanded] = useState(false);

  const yearlyChartData = useMemo(() => {
    const rows = data?.alignment_summary?.yearly_alignments;
    if (!rows?.length) return [];
    return rows.map((ya) => {
      const paImprov = ya.pa_indicator_improvements ?? {};
      const pa1 = paImprov['PA1'] ?? 0;
      const pa2 = paImprov['PA2'] ?? 0;
      const pa3 = paImprov['PA3'] ?? 0;
      const overallImprovement = pa1 * 0.58 + pa2 * 0.17 + pa3 * 0.24;
      return {
        year: `FY${ya.fiscal_year}`,
        fiscalYear: ya.fiscal_year,
        improvement: overallImprovement,
        pa1Improv: pa1,
        pa2Improv: pa2,
        pa3Improv: pa3,
        budget: ya.total_budget_bn,
        projectedFsfvi: ya.projected_fsfvi,
        yearTarget: ya.year_target,
      };
    });
  }, [data?.alignment_summary?.yearly_alignments]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const trackerData = await planningAPI.getPSTA5TrackerData();
        setData(trackerData);
      } catch (err) {
        console.error('[PSTA5] Failed to load tracker data:', err);
        setError('Unable to load PSTA-5 tracker data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredKPIs = useMemo(() => {
    if (!data) return [];
    if (!selectedPillar) return data.kpis;
    return data.kpis.filter((k) => k.pillar_code === selectedPillar);
  }, [data, selectedPillar]);

  const pillarChartData = useMemo(() => {
    if (!data?.alignment_summary) return [];
    return data.alignment_summary.pillar_scores.map((ps, idx) => ({
      name: ps.pillar_code,
      fullName: ps.pillar_name,
      indicatorImprovement: ps.indicator_improvement ?? 0,  // Projected indicator improvement from plan
      budgetAlignment: ps.budget_alignment_score ?? ps.score,  // Budget alignment score
      fill: PRIORITY_COLORS[idx % PRIORITY_COLORS.length],
      componentsCount: ps.components_count ?? 0,
      kpisTotal: ps.kpis_total,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)] mr-3" />
            <span className="text-gray-500">Loading PSTA-5 alignment data...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <p className="text-gray-600 mb-2">{error || 'No PSTA-5 data available'}</p>
            <p className="text-sm text-gray-400">
              Run the seed command to populate PSTA-5 reference data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { alignment_summary: summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-7 w-7 text-[var(--rw-blue)]" />
            PSTA-5 Alignment Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Strategic Plan for Agriculture Transformation (2024-2029) — KPI Progress & Budget Alignment
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 text-right max-w-md">
          <span className="inline-flex items-center justify-center sm:justify-end gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">
            <Activity className="h-3.5 w-3.5 opacity-90" />
            Projected outcomes · FY{summary.data_year} (final plan year)
          </span>
          <p className="text-xs text-gray-600 leading-snug">
            Figures below use the <strong>active strategic plan</strong> (modelled allocations and stress), not audited
            realized budgets or reported KPI outturns.
          </p>
        </div>
      </div>

      {/* Overall Scores Card - Budget Alignment + KPI Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
              PSTA-5 alignment (summary)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <p className="text-[11px] text-gray-600 text-center leading-snug mb-2 px-1">
                <strong>Weighted</strong> budget fit: each Priority Area gets a fit score, then averages using PSTA-5
                weights (58% · 17% · 24%). This can differ from the plan card gauge, which uses a single{' '}
                <strong>unweighted</strong> mix check — both are valid; they are not duplicates of the same number.
              </p>
              {/* Budget Alignment - Primary (what the plan controls) */}
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="100%"
                    barSize={10}
                    data={[{ value: summary.overall_score, fill: getProgressColor(summary.overall_score) }]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar dataKey="value" cornerRadius={6} background />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {summary.overall_score.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-gray-500 text-center leading-tight px-1">Weighted<br />budget fit</span>
                </div>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2 mb-3">Pillar scores combined with official PSTA-5 priority weights</p>

              {/* Projected Indicator Improvement - from plan allocations */}
              <div className="w-full pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Projected Indicator Improvement</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {(summary.overall_indicator_improvement ?? 0).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${summary.overall_indicator_improvement ?? 0}%`,
                      backgroundColor: getProgressColor(summary.overall_indicator_improvement ?? 0),
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Stress reduction in 33 indicators from plan allocations
                </p>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3 w-full text-center pt-3 border-t border-gray-200">
                <div>
                  <p className="text-[10px] text-gray-500">Areas</p>
                  <p className="text-base font-semibold text-gray-900">{data.pillars.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">KPIs</p>
                  <p className="text-base font-semibold text-gray-900">{data.kpis.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">At risk</p>
                  <button
                    type="button"
                    className={`text-base font-semibold w-full rounded underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-red-300 px-1 ${
                      summary.kpis_at_risk.length ? 'text-red-600' : 'text-gray-400 cursor-default no-underline'
                    }`}
                    disabled={!summary.kpis_at_risk.length}
                    aria-expanded={atRiskExpanded}
                    onClick={() => {
                      if (!summary.kpis_at_risk.length) return;
                      setAtRiskExpanded((e) => {
                        const next = !e;
                        if (next) {
                          setTimeout(() => {
                            document.getElementById('psta-priority-attention')?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }, 50);
                        }
                        return next;
                      });
                    }}
                  >
                    {summary.kpis_at_risk.length}
                  </button>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {summary.kpis_at_risk.length ? 'Tap to list' : 'None'}
                  </p>
                </div>
              </div>
              {atRiskExpanded && summary.kpis_at_risk.length > 0 && (
                <div
                  className="mt-3 w-full rounded-lg border border-red-100 bg-red-50/80 p-2 text-left max-h-48 overflow-y-auto"
                  id="psta-summary-at-risk-list"
                >
                  <p className="text-[10px] font-semibold text-red-900 mb-1">
                    KPIs projected below 40% driver improvement ({summary.kpis_at_risk.length})
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-red-950">
                    {summary.kpis_at_risk.map((k) => (
                      <li key={k.code} className="border-b border-red-100/80 pb-1 last:border-0">
                        <span className="font-mono font-semibold">{k.code}</span>
                        <span className="text-red-800/90"> · {k.name}</span>
                        <div className="text-[10px] text-red-800/80 mt-0.5">
                          {k.pillar_code} · projected {k.projected_improvement}%
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Priority Area Indicator Improvement */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-5 w-5 text-[var(--rw-blue)]" />
              Projected Indicator Improvement by Priority Area
            </CardTitle>
            <p className="text-xs text-gray-500">
              Stress reduction in FSFSI indicators from plan allocations → PSTA-5 KPI progress
            </p>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[248px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pillarChartData}
                  layout="vertical"
                  margin={{ top: 16, right: 20, left: 8, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 12, fill: '#4b5563' }}
                    tickMargin={8}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 13, fill: '#111827', fontWeight: 600 }}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium text-gray-900">{d.fullName}</p>
                          <p className="text-emerald-600">Indicator Improvement: {d.indicatorImprovement.toFixed(1)}%</p>
                          <p className="text-blue-600">Budget Alignment: {d.budgetAlignment.toFixed(1)}%</p>
                          <p className="text-gray-600 mt-1">
                            {d.componentsCount} FSFSI components → {d.kpisTotal} KPIs
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="indicatorImprovement" name="Indicator Improvement" radius={[0, 4, 4, 0]} barSize={22}>
                    {pillarChartData.map((entry) => (
                      <Cell key={entry.name} fill={getProgressColor(entry.indicatorImprovement)} />
                    ))}
                  </Bar>
                  {/* After <Bar> so the line layers above bar fills in this Recharts version */}
                  <ReferenceLine x={40} stroke="#0f172a" strokeWidth={2} strokeDasharray="6 4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs text-slate-700 leading-relaxed">
              <p>
                <span className="font-semibold text-slate-900">What the horizontal axis shows: </span>
                projected improvement in FSFSI-linked indicators (% reduction in financing stress vs baseline),
                driven by the active plan&apos;s allocations.
              </p>
              <p className="flex flex-wrap items-start gap-2">
                <span className="mt-0.5 inline-flex h-0 w-10 shrink-0 border-t-2 border-dashed border-slate-600" aria-hidden />
                <span>
                  <span className="font-semibold text-slate-900">Dashed vertical line at 40%</span>
                  — same cutoff as &quot;at risk&quot; KPIs; bars ending left of the line are in the attention band.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Plan Budget Alignment */}
      {summary.plan_used && summary.budget_alignment && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[var(--rw-blue)]" />
              Strategic plan budget mix check
            </CardTitle>
            <p className="text-xs text-gray-600">
              <FileText className="h-3 w-3 inline mr-1" />
              Active Plan: <span className="font-medium">{summary.plan_used.name}</span>
              {summary.plan_used.fiscal_year && (
                <span className="ml-2 text-gray-500">(FY{summary.plan_used.fiscal_year})</span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget Alignment Score — unweighted mix metric from API */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-[11px] text-gray-600 text-center leading-snug mb-2 max-w-xs">
                  <strong>Unweighted</strong> mix score: 100 minus twice the <em>simple average</em> of absolute
                  gaps between actual and target PSTA-5 shares (58% / 17% / 24%). The summary card uses the{' '}
                  <em>same gaps</em> but weights them by PSTA-5 priority — so the two percentages usually differ
                  slightly.
                </p>
                <div className="relative w-32 h-32 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="100%"
                      barSize={10}
                      data={[{
                        value: summary.budget_alignment.alignment_score,
                        fill: getProgressColor(summary.budget_alignment.alignment_score),
                      }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar dataKey="value" cornerRadius={5} background />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {summary.budget_alignment.alignment_score.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-gray-500 text-center leading-tight px-1">
                      Mean-gap<br />mix score
                    </span>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-600 max-w-xs">
                  How close the plan&apos;s mapped envelope is to the official PA budget shares (detail right →)
                </p>
              </div>

              {/* Priority Area Budget Distribution */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Budget Flow to Priority Areas
                </h4>
                {summary.budget_alignment.priority_area_allocations.map((pa: {
                  code: string;
                  name: string;
                  actual_pct: number;
                  target_pct: number;
                  deviation_ppt: number;
                  actual_bn?: number;
                }, idx: number) => {
                  const isAligned = Math.abs(pa.deviation_ppt) <= 5;
                  const isUnderAllocated = pa.deviation_ppt < -5;
                  return (
                    <div key={pa.code} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${PRIORITY_COLORS[idx]}20`,
                              color: PRIORITY_COLORS[idx],
                            }}
                          >
                            {pa.code}
                          </span>
                          <span className="text-sm text-gray-700 truncate">{pa.name}</span>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            isAligned
                              ? 'bg-emerald-100 text-emerald-700'
                              : isUnderAllocated
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {pa.deviation_ppt > 0 ? '+' : ''}{pa.deviation_ppt.toFixed(1)} pp
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Actual: {pa.actual_pct.toFixed(1)}%</span>
                            <span>Target: {pa.target_pct.toFixed(0)}%</span>
                          </div>
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            {/* Target marker */}
                            <div
                              className="absolute top-0 h-full w-0.5 bg-gray-600 z-10"
                              style={{ left: `${pa.target_pct}%` }}
                            />
                            {/* Actual bar */}
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, pa.actual_pct)}%`,
                                backgroundColor: PRIORITY_COLORS[idx],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-gray-700 space-y-1">
                  <p>
                    <strong>Mapped</strong> through FSFSI→PSTA-5 links:{' '}
                    <span className="font-mono font-semibold">
                      {summary.budget_alignment.total_mapped_bn?.toFixed(2) ?? '—'} Bn
                    </span>{' '}
                    RWF (only spend routed via mapped components).
                  </p>
                  <p>
                    Full plan envelope (final plan year):{' '}
                    <span className="font-mono font-semibold">
                      {summary.budget_alignment.total_budget_bn?.toFixed(2) ?? '—'} Bn
                    </span>{' '}
                    RWF · Not mapped to a PA with current bridges:{' '}
                    <span className="font-mono font-semibold">
                      {summary.budget_alignment.unmapped_bn?.toFixed(2) ?? '—'} Bn
                    </span>{' '}
                    RWF.
                  </p>
                  <p className="text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 text-[11px] leading-snug">
                    A small &quot;mapped&quot; total means much of the plan sits in lines not attributed to Priority Areas
                    in this mapping — it is <strong>not</strong> the full national agriculture budget (e.g. national
                    ~2.2T RWF). Treat this panel as a <strong>traceability slice</strong>, not complete coverage.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year-by-Year Indicator Improvement Trajectory */}
      {summary.yearly_alignments && summary.yearly_alignments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--rw-blue)]" />
              Projected Indicator Improvement (FY{summary.yearly_alignments[0]?.fiscal_year} - FY{summary.yearly_alignments[summary.yearly_alignments.length - 1]?.fiscal_year})
            </CardTitle>
            <p className="text-xs text-gray-500">
              Year-by-year projected improvement in FSFSI indicators from strategic plan allocations
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trajectory: improvement (%) separate from budget scale */}
              <div className="lg:col-span-2 space-y-3">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyChartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11 }}
                        label={{
                          value: 'Indicator improvement (% relative reduction in financing stress)',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fontSize: 9, fill: '#64748b' },
                          offset: 4,
                        }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                              <p className="font-medium text-gray-900 mb-2">{label}</p>
                              <p className="text-emerald-600 font-medium">
                                Weighted improvement: {d.improvement.toFixed(1)}%
                              </p>
                              <p className="text-gray-600 text-xs">Plan budget: {d.budget.toFixed(1)} Bn RWF</p>
                              {d.projectedFsfvi != null && (
                                <p className="text-blue-600 text-xs mt-1">
                                  Projected FSFSI: {Number(d.projectedFsfvi).toFixed(4)}
                                </p>
                              )}
                              <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                                <p className="text-gray-500 mb-1">By Priority Area:</p>
                                <p style={{ color: PRIORITY_COLORS[0] }}>PA1: {d.pa1Improv.toFixed(1)}%</p>
                                <p style={{ color: PRIORITY_COLORS[1] }}>PA2: {d.pa2Improv.toFixed(1)}%</p>
                                <p style={{ color: PRIORITY_COLORS[2] }}>PA3: {d.pa3Improv.toFixed(1)}%</p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="improvement"
                        name="Weighted improvement %"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ fill: '#059669', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pa1Improv"
                        name="PA1"
                        stroke={PRIORITY_COLORS[0]}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{ fill: PRIORITY_COLORS[0], r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pa2Improv"
                        name="PA2"
                        stroke={PRIORITY_COLORS[1]}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{ fill: PRIORITY_COLORS[1], r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pa3Improv"
                        name="PA3"
                        stroke={PRIORITY_COLORS[2]}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{ fill: PRIORITY_COLORS[2], r: 3 }}
                      />
                      <ReferenceLine
                        y={40}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{ value: '40% threshold', position: 'right', fill: '#64748b', fontSize: 10 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[120px] w-full">
                  <p className="text-[11px] text-gray-600 mb-1 font-medium">Plan envelope by year (Bn RWF)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) => `${v}`}
                        tick={{ fontSize: 11 }}
                        width={44}
                        label={{
                          value: 'Bn RWF',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fontSize: 9, fill: '#64748b' },
                          offset: -2,
                        }}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const n = Number(value);
                          if (!Number.isFinite(n)) return ['—', 'Budget'];
                          return [`${n.toFixed(1)} Bn RWF`, 'Budget'];
                        }}
                        labelFormatter={(l) => String(l)}
                      />
                      <Bar dataKey="budget" name="Plan budget" fill="#64748b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Year-by-Year Summary Table */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Yearly improvement details</h4>
                <p className="text-[11px] text-gray-600 mb-2 leading-snug">
                  Row shading uses the <strong>weighted</strong> PSTA-5 improvement (same green line in the chart):
                  green ≥50%, amber ≥25%, grey below 25%. It marks pace of projected stress reduction, not budget
                  adequacy.
                </p>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
                  {summary.yearly_alignments.map((ya) => {
                    const paImprov = ya.pa_indicator_improvements ?? {};
                    const pa1 = paImprov['PA1'] ?? 0;
                    const pa2 = paImprov['PA2'] ?? 0;
                    const pa3 = paImprov['PA3'] ?? 0;
                    const overallImprovement = pa1 * 0.58 + pa2 * 0.17 + pa3 * 0.24;
                    return (
                      <div
                        key={ya.fiscal_year}
                        className={`p-2 rounded-lg border ${
                          overallImprovement >= 50
                            ? 'bg-emerald-50 border-emerald-200'
                            : overallImprovement >= 25
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            FY{ya.fiscal_year}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              overallImprovement >= 50
                                ? 'text-emerald-700'
                                : overallImprovement >= 25
                                ? 'text-amber-700'
                                : 'text-gray-600'
                            }`}
                          >
                            {overallImprovement.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, overallImprovement)}%`,
                                backgroundColor: overallImprovement >= 50 ? '#059669' : overallImprovement >= 25 ? '#d97706' : '#6b7280',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{ya.total_budget_bn.toFixed(0)}B</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Static Budget Alignment Score */}
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Budget Alignment:</span>
                    <span className="font-bold text-blue-600">
                      {summary.overall_score?.toFixed(0) ?? '—'}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Structural compatibility with PSTA-5 targets (static metric)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Plan Warning */}
      {!summary.plan_used && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800">No Active Strategic Plan</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Budget alignment with PSTA-5 Priority Areas requires an active strategic plan.
                  Go to the Planning page to create and activate a plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Areas Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Priority Areas</CardTitle>
          <p className="text-xs text-gray-500">Click an area to filter KPIs</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.pillars.map((pillar, idx) => {
              const ps = summary.pillar_scores.find((p) => p.pillar_code === pillar.code);
              const isSelected = selectedPillar === pillar.code;
              const indicatorImprovement = ps?.indicator_improvement ?? 0;
              const budgetAlign = ps?.budget_alignment_score ?? ps?.score ?? 0;
              return (
                <button
                  type="button"
                  key={pillar.id}
                  onClick={() => setSelectedPillar(isSelected ? null : pillar.code)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-[var(--rw-blue)] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${PRIORITY_COLORS[idx]}20`, color: PRIORITY_COLORS[idx] }}
                    >
                      {pillar.code}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{pillar.name}</p>
                  {/* Indicator Improvement */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Indicator Improvement</span>
                      <span className="font-medium" style={{ color: getProgressColor(indicatorImprovement) }}>
                        {indicatorImprovement.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${indicatorImprovement}%`,
                          backgroundColor: getProgressColor(indicatorImprovement),
                        }}
                      />
                    </div>
                  </div>
                  {/* Budget Alignment */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Budget Aligned</span>
                      <span className="font-medium text-blue-600">
                        {budgetAlign.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${budgetAlign}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {ps?.components_count ?? 0} components → {ps?.kpis_total ?? 0} KPIs
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Priority Areas Requiring Attention — surfaced before the full KPI table for executive scan */}
      {(() => {
        const atRiskPAs = summary.pillar_scores.filter((ps) => (ps.indicator_improvement ?? 0) < 40);
        if (atRiskPAs.length === 0) return null;
        return (
          <Card className="border-amber-200 bg-amber-50/50 scroll-mt-4" id="psta-priority-attention">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Priority Areas Requiring Attention
              </CardTitle>
              <p className="text-xs text-amber-600">
                These Priority Areas have projected indicator improvement below 40%
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {atRiskPAs.map((pa, idx) => {
                  const pillarIdx = data.pillars.findIndex((p) => p.code === pa.pillar_code);
                  const paKpis = data.kpis.filter((k) => k.pillar_code === pa.pillar_code);
                  const improvement = pa.indicator_improvement ?? 0;
                  const barColor = getProgressColor(improvement);
                  return (
                    <div
                      key={pa.pillar_code}
                      className="p-4 rounded-lg bg-white border border-amber-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${PRIORITY_COLORS[pillarIdx >= 0 ? pillarIdx : idx]}20`,
                            color: PRIORITY_COLORS[pillarIdx >= 0 ? pillarIdx : idx],
                          }}
                        >
                          {pa.pillar_code}
                        </span>
                        <span className="text-sm font-bold" style={{ color: barColor }}>
                          {improvement.toFixed(0)}% improvement
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">{pa.pillar_name}</p>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${improvement}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">{paKpis.length} KPIs</span> in this area:
                        </p>
                        <div className="text-xs text-gray-600 max-h-20 overflow-y-auto space-y-0.5">
                          {paKpis.slice(0, 5).map((kpi) => (
                            <p key={kpi.code} className="truncate">
                              • {kpi.code}: {kpi.name}
                            </p>
                          ))}
                          {paKpis.length > 5 && (
                            <p className="text-gray-400 italic">+{paKpis.length - 5} more in table below</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">FSFSI components:</p>
                        <p className="text-xs text-gray-700">
                          {pa.components?.map((c) => componentLabel(c)).join(', ') || 'None mapped'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-amber-600 mt-4">
                Consider increasing budget allocation to the components driving these Priority Areas
                to improve projected indicator outcomes.
              </p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Projected KPI Impact Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--rw-blue)]" />
              Projected KPI Impact
              {selectedPillar && (
                <span className="text-xs font-normal text-gray-500 ml-2">
                  Filtered by {selectedPillar}
                </span>
              )}
            </CardTitle>
            {selectedPillar && (
              <button
                type="button"
                onClick={() => setSelectedPillar(null)}
                className="text-xs text-[var(--rw-blue)] hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            KPI-specific projected improvements based on driving component stress reductions
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">KPI</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Area</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Baseline ({data.kpis[0]?.baseline_year ?? 2023})</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Target ({data.kpis[0]?.target_year ?? 2029})</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Projected Improvement</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Impact</th>
                </tr>
              </thead>
              <tbody>
                {filteredKPIs.map((kpi) => {
                  // Get KPI-specific projected improvement (not PA average)
                  const kpiImprovements = summary.kpi_improvements ?? {};
                  const projectedImprovement = kpiImprovements[kpi.code] ?? 0;
                  const isHighImpact = projectedImprovement >= 50;
                  const isMediumImpact = projectedImprovement >= 25;
                  // Show driving components for this KPI
                  const drivingComponents = kpi.driving_components ?? [];
                  return (
                    <tr key={kpi.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-medium text-gray-900">{kpi.code}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">{kpi.name}</p>
                          {drivingComponents.length > 0 && (
                            <p className="text-xs font-medium text-slate-800 mt-1.5 leading-snug">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                FSFSI drivers
                              </span>
                              <br />
                              {drivingComponents
                                .map((c: { component: string; weight: number }) => componentLabel(c.component))
                                .join(' · ')}
                            </p>
                          )}
                          {!kpi.higher_is_better && (
                            <p className="text-[11px] text-blue-900 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mt-1.5 inline-block">
                              Lower values are better for this KPI (direction encoded in PSTA-5 reference data).
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-medium text-gray-600">{kpi.pillar_code}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {kpi.baseline_value.toLocaleString()} {kpi.unit}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {kpi.target_value.toLocaleString()} {kpi.unit}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-center gap-1.5 min-w-[7rem]">
                          <span
                            className="inline-flex items-center justify-center rounded-md px-2.5 py-1 text-sm font-bold tabular-nums"
                            style={{
                              backgroundColor: `${getProgressColor(projectedImprovement)}22`,
                              color: getProgressColor(projectedImprovement),
                              border: `1px solid ${getProgressColor(projectedImprovement)}55`,
                            }}
                          >
                            {projectedImprovement.toFixed(0)}%
                          </span>
                          <div className="w-full max-w-[120px] h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, projectedImprovement))}%`,
                                backgroundColor: getProgressColor(projectedImprovement),
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isHighImpact ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                        ) : isMediumImpact ? (
                          <TrendingUp className="h-5 w-5 text-amber-500 mx-auto" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Each KPI&apos;s projected improvement is computed from its specific driving components.
            For example, &quot;Crop productivity&quot; uses crop_production stress reduction, while &quot;Livestock productivity&quot; uses animal_systems.
          </p>
        </CardContent>
      </Card>

      {/* Component-to-Priority Area Mapping with Projected Improvements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-[var(--rw-blue)]" />
            FSFSI Component to Priority Area Mapping
          </CardTitle>
          <p className="text-xs text-gray-500">
            How budget allocations to FSFSI components contribute to PSTA-5 priority areas
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.pillars.map((pillar, idx) => {
              const mappings = data.component_mappings.filter((m) => m.pillar_code === pillar.code);
              const paScore = summary.pillar_scores.find((ps) => ps.pillar_code === pillar.code);
              return (
                <div
                  key={pillar.id}
                  className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${PRIORITY_COLORS[idx]}20`, color: PRIORITY_COLORS[idx] }}
                    >
                      {pillar.code}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">{pillar.name}</span>
                  </div>
                  <div className="space-y-2">
                    {mappings.map((m) => {
                      // Get component improvement from summary
                      const compImprovement = summary.component_alignment?.find(
                        (c) => c.component === m.component
                      )?.improvement_pct ?? 0;
                      return (
                        <div key={m.component} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">{componentLabel(m.component)}</span>
                            <span className="text-gray-400 text-xs">
                              ({(m.contribution_weight * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <span
                            className="font-medium text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: getProgressColor(compImprovement) + '20',
                              color: getProgressColor(compImprovement),
                            }}
                          >
                            {compImprovement > 0 ? `+${compImprovement.toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      );
                    })}
                    {mappings.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No direct mappings</p>
                    )}
                  </div>
                  {/* PA Summary */}
                  <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">PA Improvement:</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: getProgressColor(paScore?.indicator_improvement ?? 0) }}
                    >
                      {(paScore?.indicator_improvement ?? 0).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
