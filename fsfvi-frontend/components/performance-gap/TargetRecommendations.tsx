/**
 * Target Recommendations Component
 * =================================
 * CRITICAL: Provides evidence-based, achievable targets for government planning
 * Uses REAL data from database - NO MOCK DATA
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, RefreshCw, Target, Lightbulb, TrendingUp, Calendar, Users } from 'lucide-react';
import { govPerformanceGapAPI } from '@/lib/fsfviApi/performanceGapApi';
import type { TargetRecommendationReport, ComponentTarget } from '@/lib/types/performanceGap';
import { COMPONENT_DISPLAY_NAMES } from '@/lib/types/performanceGap';

export function TargetRecommendations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TargetRecommendationReport | null>(null);

  // Configuration
  const [fiscalYear, setFiscalYear] = useState<number>(2025);
  const [timelineMonths, setTimelineMonths] = useState<number>(60); // Default: 5 years
  const [includePeers, setIncludePeers] = useState<boolean>(true);

  // Calculate target year
  const targetYear = fiscalYear + Math.round(timelineMonths / 12);

  /**
   * Load real target recommendations from database
   * CRITICAL: Uses government data to generate realistic, achievable targets
   */
  const loadTargetRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[TargetRecommendations] Generating targets for FY ${fiscalYear}, timeline: ${timelineMonths} months...`);

      // Define peer countries if requested
      const peerCountries = includePeers ? ['Rwanda', 'Ghana', 'Kenya'] : undefined;

      // Fetch real target recommendations from government database
      const response = await govPerformanceGapAPI.recommendTargets(
        timelineMonths,
        peerCountries,
        fiscalYear
      );

      console.log(`[TargetRecommendations] Recommendations generated:`, response.data);
      setReport(response.data);
    } catch (err: any) {
      console.error('[TargetRecommendations] Failed to load target recommendations:', err);

      if (err.response?.data?.message?.includes('No validated data')) {
        setError(`No validated data found for FY ${fiscalYear}. Please ensure data is entered and validated in the system.`);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load target recommendations from database');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTargetRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear, timelineMonths, includePeers]);

  if (isLoading && !report) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-emerald-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Generating Target Recommendations</p>
              <p className="text-sm text-gray-600">Creating evidence-based strategic targets...</p>
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
      {/* Configuration Controls - Enhanced */}
      <Card className="border-2 border-emerald-300 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
        <CardHeader className="border-b border-emerald-200 bg-gradient-to-r from-emerald-100/50 to-green-100/50">
          <CardTitle className="flex items-center gap-3 text-emerald-950">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Target Planning Configuration</div>
              <div className="text-sm font-normal text-emerald-800">Set timeline and benchmarking preferences</div>
            </div>
          </CardTitle>
          <CardDescription className="text-sm font-semibold text-emerald-900 mt-2">
            Configure parameters for evidence-based target generation
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-3 h-3 text-emerald-500" />
                Base Fiscal Year
              </label>
              <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
                <SelectTrigger className="border-2 border-emerald-300 font-semibold hover:border-emerald-500 transition-all text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2021">FY 2021</SelectItem>
                  <SelectItem value="2022">FY 2022</SelectItem>
                  <SelectItem value="2023">FY 2023</SelectItem>
                  <SelectItem value="2024">FY 2024</SelectItem>
                  <SelectItem value="2025">FY 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                Target Timeline
              </label>
              <Select value={timelineMonths.toString()} onValueChange={(v) => setTimelineMonths(parseInt(v))}>
                <SelectTrigger className="border-2 border-blue-300 font-semibold hover:border-blue-500 transition-all text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">1 year (12 months)</SelectItem>
                  <SelectItem value="24">2 years (24 months)</SelectItem>
                  <SelectItem value="36">3 years (36 months)</SelectItem>
                  <SelectItem value="60">5 years (60 months)</SelectItem>
                  <SelectItem value="84">7 years (84 months)</SelectItem>
                  <SelectItem value="120">10 years (120 months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-3 h-3 text-purple-500" />
                Peer Comparison
              </label>
              <Select value={includePeers.toString()} onValueChange={(v) => setIncludePeers(v === 'true')}>
                <SelectTrigger className="border-2 border-purple-300 font-semibold hover:border-purple-500 transition-all text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes (Rwanda, Ghana, Kenya)</SelectItem>
                  <SelectItem value="false">No (Internal only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planning Summary - Enhanced */}
      <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="border-b border-indigo-200 bg-gradient-to-r from-indigo-100/50 to-purple-100/50">
          <CardTitle className="flex items-center gap-3 text-indigo-950">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Planning Summary</div>
              <div className="text-sm font-normal text-indigo-800">Strategic targets overview</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 px-5 py-4 rounded-xl border-2 border-blue-300 shadow-sm">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Base Year
                </div>
                <div className="text-3xl font-bold text-blue-950">
                  FY {fiscalYear}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 px-5 py-4 rounded-xl border-2 border-green-300 shadow-sm">
                <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3 h-3" />
                  Target Year
                </div>
                <div className="text-3xl font-bold text-green-950">
                  FY {targetYear}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border-2 border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Timeline:</span>
                <span className="text-base font-bold text-gray-900">
                  {report.target_timeline_months} months ({Math.round(report.target_timeline_months / 12)} years)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Components Analyzed:</span>
                <span className="text-base font-bold text-gray-900">{report.component_targets.length} targets</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Peer Benchmarking:</span>
                {includePeers ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Enabled (Rwanda, Ghana, Kenya)
                  </span>
                ) : (
                  <span className="text-sm text-gray-600 font-semibold">Disabled</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Strategic Guidance - Enhanced */}
      {report.overall_guidance.length > 0 && (
        <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="border-b border-yellow-200 bg-gradient-to-r from-yellow-100/50 to-amber-100/50">
            <CardTitle className="flex items-center gap-3 text-yellow-950">
              <div className="p-2 bg-yellow-600 rounded-lg shadow-md">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">Overall Strategic Guidance</div>
                <div className="text-sm font-normal text-yellow-800">Key recommendations for national planning</div>
              </div>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-yellow-900 mt-2">
              Evidence-based insights for policy makers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {report.overall_guidance.map((guidance, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-yellow-200 hover:border-yellow-400 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <span className="text-base font-semibold text-gray-900 leading-relaxed pt-1">
                    {guidance}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Component Targets - Enhanced */}
      <Card className="border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-emerald-600 to-green-600 rounded-full"></div>
              Recommended Targets by Component
            </CardTitle>
            <CardDescription className="text-base font-semibold text-gray-700">
              <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                EVIDENCE-BASED
              </span>
              Targets for FY {targetYear} based on {includePeers ? 'peer trajectories & ' : ''}historical trends
            </span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTargetRecommendations}
            disabled={isLoading}
            className="border-2 border-gray-300 font-semibold hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50/30">
          <div className="space-y-5">
            {report.component_targets.map((target) => (
              <div
                key={target.component_type}
                className="animate-in fade-in slide-in-from-bottom-2"
              >
                <ComponentTargetCard target={target} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComponentTargetCard({ target }: { target: ComponentTarget }) {
  const improvement = target.recommended_target - target.current_value;
  const improvementPercent = (improvement / target.current_value) * 100;
  const hasGap = target.current_gap > 0;

  return (
    <div className="group border-2 border-gray-300 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 bg-white hover:border-emerald-400 relative overflow-hidden">
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-100 to-green-100 opacity-30 rounded-full blur-3xl -mr-20 -mt-20"></div>

      <div className="space-y-5 relative">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-8 bg-gradient-to-b from-emerald-600 to-green-600 rounded-full"></div>
              <h3 className="text-xl font-bold text-gray-900">
                {COMPONENT_DISPLAY_NAMES[target.component_type] || target.component_type}
              </h3>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 rounded-xl border-2 border-gray-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                  Current
                </div>
                <div className="text-2xl font-bold text-gray-950">
                  {target.current_value.toFixed(1)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 px-4 py-3 rounded-xl border-2 border-emerald-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Target
                </div>
                <div className="text-2xl font-bold text-emerald-950">
                  {target.recommended_target.toFixed(1)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 px-4 py-3 rounded-xl border-2 border-green-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Gain Needed
                </div>
                <div className="text-2xl font-bold text-green-950">
                  +{improvement.toFixed(1)}
                </div>
              </div>
            </div>

            {hasGap && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 border-2 border-orange-300 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-700" />
                <span className="text-sm font-bold text-orange-900">
                  Current Gap: <span className="text-red-700">{(target.current_gap * 100).toFixed(1)}%</span> from benchmark
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Visualization - Enhanced */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border-2 border-gray-300">
          <div className="flex justify-between items-center text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              Current: {target.current_value.toFixed(1)}
            </span>
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-bold">
                <TrendingUp className="w-3 h-3" />
                {target.realistic_closure_percent.toFixed(1)}% realistic closure
              </span>
            </div>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Target: {target.recommended_target.toFixed(1)}
            </span>
          </div>

          <div className="relative h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl overflow-hidden shadow-inner border-2 border-gray-400">
            {/* Current value bar */}
            <div
              className="absolute h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-700 shadow-lg relative overflow-hidden"
              style={{ width: `${(target.current_value / target.recommended_target) * 100}%` }}
            >
              {/* Animated shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
            {/* Target marker */}
            <div className="absolute h-full w-2 bg-emerald-600 right-0 shadow-2xl z-10">
              <div className="absolute -top-10 right-0 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg">
                Target
              </div>
            </div>
            {/* Current value label */}
            <div className="absolute inset-0 flex items-center px-4">
              <span className="text-sm font-bold text-white drop-shadow-lg">
                {target.current_value.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="text-center mt-4">
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 px-4 py-2 rounded-xl text-sm font-bold border-2 border-purple-300 shadow-sm">
              <TrendingUp className="w-4 h-4" />
              +{improvementPercent.toFixed(1)}% improvement needed over {Math.round(target.current_gap > 0 ? (improvement / target.current_gap) * 100 : 0)}% of gap
            </span>
          </div>
        </div>

        {/* Evidence-Based Rationale - Enhanced */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-600 rounded-xl p-5 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md flex-shrink-0">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-950 mb-2">Evidence-Based Rationale:</p>
              <p className="text-sm text-blue-900 leading-relaxed font-medium">{target.rationale}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
