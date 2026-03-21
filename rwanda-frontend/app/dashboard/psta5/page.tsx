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
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Data Year: FY{summary.data_year}</span>
        </div>
      </div>

      {/* Overall Scores Card - Budget Alignment + KPI Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
              PSTA-5 Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
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
                  <span className="text-[10px] text-gray-500">Budget Aligned</span>
                </div>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2 mb-3">
                How well the strategic plan&apos;s budget matches PSTA-5 targets
              </p>

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
                  <p className="text-[10px] text-gray-500">At Risk</p>
                  <p className="text-base font-semibold text-red-600">{summary.kpis_at_risk.length}</p>
                </div>
              </div>
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
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pillarChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={40} />
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
                  <Bar dataKey="indicatorImprovement" name="Indicator Improvement" radius={[0, 4, 4, 0]}>
                    {pillarChartData.map((entry) => (
                      <Cell key={entry.name} fill={getProgressColor(entry.indicatorImprovement)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
              Strategic Plan Budget Alignment
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
              {/* Budget Alignment Score */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-gray-200">
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
                    <span className="text-xs text-gray-500">budget aligned</span>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-600 max-w-xs">
                  Measures how well the strategic plan&apos;s budget allocations match
                  PSTA-5 Priority Area targets (PA1: 58%, PA2: 17%, PA3: 24%)
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
                <p className="text-xs text-gray-500 mt-2">
                  Total mapped: {summary.budget_alignment.total_mapped_bn?.toFixed(1) ?? '—'} Bn RWF
                </p>
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
              {/* Trajectory Chart */}
              <div className="lg:col-span-2 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={summary.yearly_alignments.map((ya) => {
                      // Compute overall indicator improvement as weighted avg of PA improvements
                      const paImprov = ya.pa_indicator_improvements ?? {};
                      const pa1 = paImprov['PA1'] ?? 0;
                      const pa2 = paImprov['PA2'] ?? 0;
                      const pa3 = paImprov['PA3'] ?? 0;
                      // Weight by PSTA-5 budget targets (58%, 17%, 24%)
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
                    })}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 'auto']}
                      tickFormatter={(v) => `${v.toFixed(0)}B`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                            <p className="font-medium text-gray-900 mb-2">{label}</p>
                            <p className="text-emerald-600 font-medium">
                              Overall Improvement: {d.improvement.toFixed(1)}%
                            </p>
                            <p className="text-gray-600">
                              Budget: {d.budget.toFixed(1)} Bn RWF
                            </p>
                            {d.projectedFsfvi && (
                              <p className="text-blue-600 text-xs mt-1">
                                Projected FSFVI: {d.projectedFsfvi.toFixed(4)}
                              </p>
                            )}
                            <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                              <p className="text-gray-500 mb-1">By Priority Area:</p>
                              <p style={{ color: PRIORITY_COLORS[0] }}>PA1: {d.pa1Improv.toFixed(1)}% improvement</p>
                              <p style={{ color: PRIORITY_COLORS[1] }}>PA2: {d.pa2Improv.toFixed(1)}% improvement</p>
                              <p style={{ color: PRIORITY_COLORS[2] }}>PA3: {d.pa3Improv.toFixed(1)}% improvement</p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="improvement"
                      name="Indicator Improvement %"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ fill: '#059669', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pa1Improv"
                      name="PA1 (Modernization)"
                      stroke={PRIORITY_COLORS[0]}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={{ fill: PRIORITY_COLORS[0], r: 2 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pa2Improv"
                      name="PA2 (Markets)"
                      stroke={PRIORITY_COLORS[1]}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={{ fill: PRIORITY_COLORS[1], r: 2 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pa3Improv"
                      name="PA3 (Enablers)"
                      stroke={PRIORITY_COLORS[2]}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={{ fill: PRIORITY_COLORS[2], r: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="budget"
                      name="Budget (Bn)"
                      stroke="#6b7280"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      dot={{ fill: '#6b7280', r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Year-by-Year Summary Table */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Yearly Improvement Details</h4>
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
                          <p className="text-xs text-gray-500 line-clamp-1">{kpi.name}</p>
                          {drivingComponents.length > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              ← {drivingComponents.map((c: { component: string; weight: number }) => componentLabel(c.component)).join(', ')}
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
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.max(0, projectedImprovement))}%`,
                                backgroundColor: getProgressColor(projectedImprovement),
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">
                            {projectedImprovement.toFixed(0)}%
                          </span>
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

      {/* Priority Areas Requiring Attention */}
      {(() => {
        // Group at-risk KPIs by Priority Area
        const atRiskPAs = summary.pillar_scores.filter((ps) => (ps.indicator_improvement ?? 0) < 40);
        if (atRiskPAs.length === 0) return null;
        return (
          <Card className="border-amber-200 bg-amber-50/50">
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
                        <span className="text-sm font-bold text-amber-600">
                          {improvement.toFixed(0)}% improvement
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">{pa.pillar_name}</p>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full transition-all bg-amber-500"
                          style={{ width: `${improvement}%` }}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">{paKpis.length} KPIs</span> affected:
                        </p>
                        <div className="text-xs text-gray-600 max-h-16 overflow-y-auto">
                          {paKpis.slice(0, 3).map((kpi) => (
                            <p key={kpi.code} className="truncate">• {kpi.code}: {kpi.name}</p>
                          ))}
                          {paKpis.length > 3 && (
                            <p className="text-gray-400 italic">+{paKpis.length - 3} more</p>
                          )}
                        </div>
                      </div>
                      {/* Components driving this PA */}
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Components:</p>
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
    </div>
  );
}
