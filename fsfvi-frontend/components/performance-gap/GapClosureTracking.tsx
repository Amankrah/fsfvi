/**
 * Gap Closure Tracking Component
 * ================================
 * CRITICAL: Tracks government progress in closing performance gaps over time
 * Uses REAL data from database - NO MOCK DATA
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, RefreshCw, TrendingUp, TrendingDown, CheckCircle2, Calendar, Clock } from 'lucide-react';
import { govPerformanceGapAPI } from '@/lib/fsfviApi/performanceGapApi';
import type { GapClosureReport, ComponentProgress } from '@/lib/types/performanceGap';
import { COMPONENT_DISPLAY_NAMES, PROGRESS_STATUS_COLORS } from '@/lib/types/performanceGap';

export function GapClosureTracking() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GapClosureReport | null>(null);

  // Tracking parameters
  const [baselineFY, setBaselineFY] = useState<number>(2024);
  const [currentFY, setCurrentFY] = useState<number>(2025);

  // Calculate time period automatically based on fiscal year difference
  const timePeriodMonths = (currentFY - baselineFY) * 12;

  /**
   * Load real gap closure tracking data from database
   * CRITICAL: Compares two fiscal years from government database
   */
  const loadGapClosureData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[GapClosureTracking] Tracking gap closure from FY ${baselineFY} to FY ${currentFY}...`);

      // Fetch real data from government database
      const response = await govPerformanceGapAPI.trackGapClosure(
        baselineFY,
        currentFY,
        timePeriodMonths
      );

      console.log(`[GapClosureTracking] Tracking complete:`, response.data);
      setReport(response.data);
    } catch (err: any) {
      console.error('[GapClosureTracking] Failed to track gap closure:', err);

      if (err.response?.data?.message?.includes('No validated data')) {
        setError(`No validated data found for baseline FY ${baselineFY} or current FY ${currentFY}. Please ensure data exists for both years.`);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load gap closure tracking from database');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGapClosureData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baselineFY, currentFY]);

  if (isLoading && !report) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-indigo-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Tracking Gap Closure Progress</p>
              <p className="text-sm text-gray-600">Analyzing historical trends and improvements...</p>
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
      <Card className="border-2 border-indigo-300 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader className="border-b border-indigo-200 bg-gradient-to-r from-indigo-100/50 to-purple-100/50">
          <CardTitle className="flex items-center gap-3 text-indigo-950">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-md">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Tracking Period Configuration</div>
              <div className="text-sm font-normal text-indigo-800">Compare performance between fiscal years</div>
            </div>
          </CardTitle>
          <CardDescription className="text-sm font-semibold text-indigo-900 mt-2">
            Time period calculated automatically based on selected years
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                Baseline Fiscal Year
              </label>
              <Select value={baselineFY.toString()} onValueChange={(v) => setBaselineFY(parseInt(v))}>
                <SelectTrigger className="border-2 border-indigo-300 font-semibold hover:border-indigo-500 transition-all text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2021">FY 2021</SelectItem>
                  <SelectItem value="2022">FY 2022</SelectItem>
                  <SelectItem value="2023">FY 2023</SelectItem>
                  <SelectItem value="2024">FY 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                Current Fiscal Year
              </label>
              <Select value={currentFY.toString()} onValueChange={(v) => setCurrentFY(parseInt(v))}>
                <SelectTrigger className="border-2 border-purple-300 font-semibold hover:border-purple-500 transition-all text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2022">FY 2022</SelectItem>
                  <SelectItem value="2023">FY 2023</SelectItem>
                  <SelectItem value="2024">FY 2024</SelectItem>
                  <SelectItem value="2025">FY 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-3 h-3 text-emerald-500" />
                Time Period
              </label>
              <div className="flex items-center h-10 px-4 border-2 border-emerald-300 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm">
                <span className="text-base font-bold text-emerald-900">
                  {timePeriodMonths} months <span className="text-sm font-normal text-emerald-700">({timePeriodMonths / 12} {timePeriodMonths === 12 ? 'year' : 'years'})</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Enhanced */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Tracking Period
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{report.time_period_months}</div>
            <p className="text-xs text-blue-700 mt-1 font-medium">months analyzed</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Average Gap Closure
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-indigo-900">
              {report.average_gap_closure_percent.toFixed(1)}%
            </div>
            <p className="text-xs text-indigo-700 mt-1 font-medium">overall improvement</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-green-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Improving Components
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-800">{report.improving_components}</div>
            <p className="text-xs text-green-700 mt-1 font-medium">positive trajectory</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-orange-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
          {report.declining_components > 0 && (
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500 opacity-10 rounded-full blur-2xl"></div>
          )}
          <CardHeader className="pb-3 relative">
            <CardDescription className="text-xs font-bold text-red-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3" />
              Declining Components
            </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-bold text-red-800">{report.declining_components}</div>
            <p className="text-xs text-red-700 mt-1 font-semibold uppercase">Need intervention</p>
          </CardContent>
        </Card>
      </div>

      {/* Success Stories - Enhanced */}
      {report.success_stories.length > 0 && (
        <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="border-b border-green-200 bg-gradient-to-r from-green-100/50 to-emerald-100/50">
            <CardTitle className="flex items-center gap-3 text-green-950">
              <div className="p-2 bg-green-600 rounded-lg shadow-md">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">Success Stories</div>
                <div className="text-sm font-normal text-green-800">Components with strong progress</div>
              </div>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-green-900 mt-2">
              Celebrate these achievements and learn from their success
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {report.success_stories.map((story, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <span className="text-base font-semibold text-gray-900 leading-relaxed pt-1">
                    {story}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Areas Needing Attention - Enhanced */}
      {report.areas_needing_attention.length > 0 && (
        <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="border-b border-orange-200 bg-gradient-to-r from-orange-100/50 to-amber-100/50">
            <CardTitle className="flex items-center gap-3 text-orange-950">
              <div className="p-2 bg-orange-600 rounded-lg shadow-md">
                <AlertCircle className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <div className="text-xl font-bold">Areas Needing Attention</div>
                <div className="text-sm font-normal text-orange-800">Urgent intervention required</div>
              </div>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-orange-900 mt-2">
              Components requiring immediate government action
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {report.areas_needing_attention.map((area, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-left"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <span className="text-base font-semibold text-gray-900 leading-relaxed pt-1">
                    {area}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Component Progress Details - Enhanced */}
      <Card className="border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
              Component Progress Details
            </CardTitle>
            <CardDescription className="text-base font-semibold text-gray-700">
              <span className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                LIVE DATA
              </span>
              Real tracking data from FY {baselineFY} to FY {currentFY}
            </span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadGapClosureData}
            disabled={isLoading}
            className="border-2 border-gray-300 font-semibold hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50/30">
          <div className="space-y-5">
            {report.component_progress.map((progress) => (
              <div
                key={progress.component_type}
                className="animate-in fade-in slide-in-from-bottom-2"
              >
                <ComponentProgressCard progress={progress} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComponentProgressCard({ progress }: { progress: ComponentProgress }) {
  const statusColors = PROGRESS_STATUS_COLORS[progress.progress_status] || PROGRESS_STATUS_COLORS.stagnant;
  const isImproving = progress.gap_closure_percent > 0;

  const getStatusGradient = () => {
    switch (progress.progress_status) {
      case 'good':
        return 'from-green-50 to-green-100 border-green-400';
      case 'moderate':
        return 'from-blue-50 to-blue-100 border-blue-400';
      case 'stagnant':
        return 'from-gray-50 to-gray-100 border-gray-400';
      case 'poor':
        return 'from-red-50 to-red-100 border-red-400';
      default:
        return 'from-gray-50 to-gray-100 border-gray-400';
    }
  };

  return (
    <div className={`group border-2 rounded-xl p-6 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${getStatusGradient()} hover:scale-[1.01] relative overflow-hidden`}>
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>

      <div className="space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-1.5 h-8 rounded-full ${
                progress.progress_status === 'good' ? 'bg-green-600' :
                progress.progress_status === 'moderate' ? 'bg-blue-600' :
                progress.progress_status === 'stagnant' ? 'bg-gray-600' :
                'bg-red-600 animate-pulse'
              }`}></div>
              <h3 className="text-xl font-bold text-gray-900">
                {COMPONENT_DISPLAY_NAMES[progress.component_type] || progress.component_type}
              </h3>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 px-4 py-3 rounded-xl border-2 border-orange-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                  Baseline Gap
                </div>
                <div className="text-2xl font-bold text-orange-950">
                  {(progress.baseline_gap * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3 rounded-xl border-2 border-blue-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Current Gap
                </div>
                <div className="text-2xl font-bold text-blue-950">
                  {(progress.current_gap * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-3 rounded-xl border-2 border-purple-300 hover:shadow-lg transition-all duration-200">
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  Monthly Rate
                </div>
                <div className="text-2xl font-bold text-purple-950">
                  {(progress.monthly_closure_rate * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-4 ml-6">
            <div className={`text-center px-6 py-4 rounded-2xl border-3 shadow-xl hover:shadow-2xl transition-all duration-300 ${
              isImproving ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-400' :
              'bg-gradient-to-br from-red-100 to-red-200 border-red-400'
            }`}>
              <div className="flex items-center justify-center mb-2">
                {isImproving ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className={`text-4xl font-black ${
                isImproving ? 'text-green-900' : 'text-red-900'
              }`}>
                {isImproving ? '+' : ''}{progress.gap_closure_percent.toFixed(1)}%
              </div>
              <div className={`text-xs font-bold uppercase tracking-wider mt-1 ${
                isImproving ? 'text-green-800' : 'text-red-800'
              }`}>
                Gap Closure
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex flex-col gap-2">
              <span className={`px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider text-center min-w-[120px] border-2 shadow-lg ${statusColors.bg} ${statusColors.text}`}>
                {progress.progress_status}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar - Enhanced */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Gap Closure Progress</span>
            <span className="text-xs font-semibold text-gray-600">
              From {(progress.baseline_gap * 100).toFixed(1)}% to {(progress.current_gap * 100).toFixed(1)}%
            </span>
          </div>
          <div className="relative h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl overflow-hidden shadow-inner border-2 border-gray-400">
            <div
              className={`h-full shadow-lg transition-all duration-700 ease-out relative overflow-hidden ${
                progress.gap_closure_percent >= 50
                  ? 'bg-gradient-to-r from-green-600 to-green-500'
                  : progress.gap_closure_percent >= 25
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                  : progress.gap_closure_percent >= 0
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500'
                  : 'bg-gradient-to-r from-red-600 to-red-500'
              }`}
              style={{ width: `${Math.min(Math.abs(progress.gap_closure_percent), 100)}%` }}
            >
              {/* Animated shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs font-semibold text-gray-600 mt-2">
            <span>0% closure</span>
            <span className="text-green-700 font-bold">100% closure (gap eliminated)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
