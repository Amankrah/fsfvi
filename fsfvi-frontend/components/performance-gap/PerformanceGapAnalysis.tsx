'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, TrendingDown, Info } from 'lucide-react';
import { govPerformanceGapAPI } from '@/lib/fsfviApi/performanceGapApi';
import type { PerformanceGapAnalysisReport, ComponentGap } from '@/lib/types/performanceGap';
import { COMPONENT_DISPLAY_NAMES, SEVERITY_COLORS } from '@/lib/types/performanceGap';

export function PerformanceGapAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PerformanceGapAnalysisReport | null>(null);
  const [fiscalYear, setFiscalYear] = useState<number>(2025);

  /**
   * Load real government data from database
   * CRITICAL: No mock data - fetches from demo_gov_backend database
   */
  const loadAnalysisData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[PerformanceGapAnalysis] Fetching data for FY ${fiscalYear} from government database...`);

      // Fetch real data from government database via backend API
      const response = await govPerformanceGapAPI.analyzePerformanceGaps(fiscalYear);

      console.log(`[PerformanceGapAnalysis] Analysis complete:`, response.data);
      console.log(`[PerformanceGapAnalysis] Component gaps count:`, response.data?.component_gaps?.length || 0);
      console.log(`[PerformanceGapAnalysis] Component gaps:`, response.data?.component_gaps);
      setReport(response.data);
    } catch (err: any) {
      console.error('[PerformanceGapAnalysis] Failed to analyze performance gaps:', err);

      // Check if it's a validation error (no data in database)
      if (err.response?.data?.message?.includes('No validated data')) {
        setError('No validated data found for FY ' + fiscalYear + '. Please ensure data is entered and validated in the system.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load analysis from database');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear]);

  if (isLoading && !report) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Analyzing Performance Gaps</p>
              <p className="text-sm text-gray-600">Fetching real-time data from government database...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !report) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg animate-in fade-in duration-300">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="font-medium text-base">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards - Enhanced Design */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Overall Status
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 capitalize flex items-center gap-2">
              <span className={`inline-block w-3 h-3 rounded-full ${
                report.overall_status.includes('critical') ? 'bg-red-500 animate-pulse' :
                report.overall_status.includes('attention') ? 'bg-orange-500' :
                'bg-green-500'
              }`}></span>
              {report.overall_status.replace(/_/g, ' ')}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-orange-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3" />
              Average Gap
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800">
              {(report.average_gap * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-orange-700 mt-1 font-medium">Performance shortfall</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
          {report.critical_gaps > 0 && (
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500 opacity-10 rounded-full blur-2xl"></div>
          )}
          <CardHeader className="pb-3 relative">
            <CardDescription className="text-xs font-bold text-red-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3 animate-pulse" />
              Critical Gaps
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-bold text-red-800">
              {report.critical_gaps}
            </div>
            <p className="text-xs font-semibold text-red-700 mt-1.5 uppercase tracking-wide">Immediate Action Required</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              Total Components
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {report.total_components}
            </div>
            <p className="text-xs text-blue-700 mt-1 font-medium">Under analysis</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Priorities - Enhanced Visibility */}
      {report.top_priorities.length > 0 && (
        <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="border-b border-orange-200 bg-gradient-to-r from-orange-100/50 to-amber-100/50">
            <CardTitle className="flex items-center gap-3 text-orange-950">
              <div className="p-2 bg-orange-600 rounded-lg shadow-md">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">Top Priorities</div>
                <div className="text-sm font-normal text-orange-800">Immediate Attention Required</div>
              </div>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-orange-900 mt-2">
              <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></div>
              These areas need urgent government intervention
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {report.top_priorities.map((priority, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <span className="text-base font-semibold text-gray-900 leading-relaxed pt-1">
                    {priority}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Component Performance Gaps - Enhanced Design */}
      <Card className="border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
              Component Performance Gaps
            </CardTitle>
            <CardDescription className="text-base font-semibold text-gray-700">
              <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                LIVE DATA
              </span>
              Real data from government database (FY {fiscalYear})
            </span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalysisData}
            disabled={isLoading}
            className="border-2 border-gray-300 font-semibold hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </CardHeader>
        <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50/30">
          <div className="space-y-5">
            {report.component_gaps.map((gap) => (
              <div
                key={gap.component_type}
                className="animate-in fade-in slide-in-from-bottom-2"
              >
                <ComponentGapCard gap={gap} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComponentGapCard({ gap }: { gap: ComponentGap }) {
  const [expanded, setExpanded] = useState(false);
  const colors = SEVERITY_COLORS[gap.severity] || SEVERITY_COLORS.low;

  // Determine severity styling
  const getSeverityGradient = () => {
    switch (gap.severity) {
      case 'critical':
        return 'from-red-50 to-red-100 border-red-400';
      case 'high':
        return 'from-orange-50 to-orange-100 border-orange-400';
      case 'medium':
        return 'from-yellow-50 to-yellow-100 border-yellow-400';
      default:
        return 'from-green-50 to-green-100 border-green-400';
    }
  };

  return (
    <div className={`group border-2 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${getSeverityGradient()} hover:scale-[1.01] relative overflow-hidden`}>
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>

      <div className="space-y-5 relative">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-1.5 h-8 rounded-full ${
                gap.severity === 'critical' ? 'bg-red-600 animate-pulse' :
                gap.severity === 'high' ? 'bg-orange-600' :
                gap.severity === 'medium' ? 'bg-yellow-600' :
                'bg-green-600'
              }`}></div>
              <h3 className="text-xl font-bold text-gray-900">
                {COMPONENT_DISPLAY_NAMES[gap.component_type] || gap.component_type}
              </h3>
            </div>

            {/* CRITICAL DATA - Enhanced Design */}
            <div className="grid grid-cols-3 gap-3">
              <div className="group/card bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3 rounded-xl border-2 border-blue-300 hover:border-blue-500 transition-all duration-200 hover:shadow-lg">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Observed
                </div>
                <div className="text-2xl font-bold text-blue-950">
                  {gap.observed_value.toFixed(1)}%
                </div>
              </div>

              <div className="group/card bg-gradient-to-br from-green-50 to-green-100 px-4 py-3 rounded-xl border-2 border-green-300 hover:border-green-500 transition-all duration-200 hover:shadow-lg">
                <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Benchmark
                </div>
                <div className="text-2xl font-bold text-green-950">
                  {gap.benchmark_value.toFixed(1)}%
                </div>
              </div>

              <div className="group/card bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-3 rounded-xl border-2 border-purple-300 hover:border-purple-500 transition-all duration-200 hover:shadow-lg">
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  Achievement
                </div>
                <div className="text-2xl font-bold text-purple-950">
                  {gap.achievement_rate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Gap Display - Enhanced Prominence */}
          <div className="flex items-center gap-4">
            <div className="text-center bg-gradient-to-br from-orange-100 to-orange-200 px-6 py-4 rounded-2xl border-3 border-orange-400 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="text-4xl font-black text-orange-900">
                {(gap.performance_gap * 100).toFixed(1)}%
              </div>
              <div className="text-xs font-bold text-orange-800 uppercase tracking-wider mt-1.5">
                Performance Gap
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span
                className={`px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider ${colors.bg} ${colors.text} ${colors.border} border-2 shadow-lg text-center min-w-[100px]`}
              >
                {gap.severity}
              </span>
              {gap.severity === 'critical' && (
                <span className="text-xs font-semibold text-red-700 text-center animate-pulse">
                  ⚠️ Urgent
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar - Enhanced Visualization */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              Achievement Progress
            </span>
            <span className="text-lg font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
              {gap.achievement_rate.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <div className="overflow-hidden h-6 flex rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 border-2 border-gray-400 shadow-inner">
              <div
                data-achievement={Math.min(gap.achievement_rate, 100)}
                className={`shadow-lg flex items-center justify-center text-xs font-bold text-white transition-all duration-700 ease-out relative overflow-hidden ${
                  gap.achievement_rate >= 100
                    ? 'bg-gradient-to-r from-green-600 to-green-500'
                    : gap.achievement_rate >= 75
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                    : gap.achievement_rate >= 50
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-500'
                    : 'bg-gradient-to-r from-red-600 to-red-500'
                }`}
                style={{ width: `${Math.min(gap.achievement_rate, 100)}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
              </div>
            </div>
            {/* Benchmark marker */}
            <div className="flex justify-between text-xs font-medium text-gray-600 mt-2">
              <span>0%</span>
              <span className="text-green-700 font-bold">Target: 100%</span>
            </div>
          </div>
        </div>

        {/* Recommendations - Enhanced Design */}
        {gap.recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-300 shadow-lg">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-base font-bold text-blue-950 hover:text-blue-700 flex items-center gap-3 w-full group/btn transition-all duration-200"
            >
              <div className={`p-2 rounded-lg bg-blue-600 text-white shadow-md group-hover/btn:bg-blue-700 transition-all duration-200 ${expanded ? 'rotate-90' : ''}`}>
                <span className="text-sm">▶</span>
              </div>
              <div className="flex-1 text-left">
                <span className="block text-lg">{gap.recommendations.length} Recommended Actions</span>
                <span className="block text-xs text-blue-700 font-semibold mt-0.5">
                  Click to {expanded ? 'hide' : 'view'} strategic interventions
                </span>
              </div>
              <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                {gap.recommendations.length}
              </div>
            </button>
            {expanded && (
              <ul className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {gap.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="group/item flex items-start gap-3 bg-white p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-6 w-6 text-green-600 group-hover/item:scale-110 transition-transform duration-200" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900 leading-relaxed">
                        {rec}
                      </span>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                      <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        #{idx + 1}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
