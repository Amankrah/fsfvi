/**
 * FSFVI Component Insights Display
 * ==================================
 * Displays detailed vulnerability insights for each food system component
 *
 * CRITICAL: Government-level system - accurate component analysis guides
 * resource allocation and policy decisions that affect livelihoods
 *
 * Pattern Reference: components/performance-gap/PerformanceGapAnalysis.tsx (ComponentGapCard)
 * Types: lib/types/assessment.ts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import govAssessmentAPI from '@/lib/fsfviApi/assessmentApi';
import type { AssessmentReport, ComponentInsight } from '@/lib/types/assessment';
import {
  COMPONENT_DISPLAY_NAMES,
  PRIORITY_LEVEL_COLORS,
  RISK_LEVEL_COLORS,
} from '@/lib/types/assessment';

interface ComponentInsightsProps {
  fiscalYear: number;
  weightingMethod: string;
  scenario: string;
}

export function ComponentInsights({ fiscalYear, weightingMethod, scenario }: ComponentInsightsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);

  /**
   * Load component insights from government database
   */
  const loadComponentData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[ComponentInsights] Fetching assessment for FY ${fiscalYear} with ${weightingMethod} weighting and ${scenario} scenario...`);

      // Backend returns AssessmentReport directly (unwrapped from ApiResponse)
      const report = await govAssessmentAPI.runAssessment(
        fiscalYear,
        undefined,
        weightingMethod as any,
        scenario as any
      );

      console.log(`[ComponentInsights] Loaded ${report.component_insights.length} components`);
      setReport(report);
    } catch (err: any) {
      console.error('[ComponentInsights] Error:', err);

      if (err.response?.data?.message?.includes('No validated data')) {
        setError(`No component data found for FY ${fiscalYear}.`);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load component insights');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComponentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fiscalYear, weightingMethod, scenario]);

  // Loading state
  if (isLoading && !report) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Loading Component Insights</p>
              <p className="text-sm text-gray-600">Analyzing component vulnerabilities...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !report) {
    return (
      <Alert variant="destructive" className="border-2 shadow-lg animate-in fade-in duration-300">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="font-medium text-base">{error}</AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!report) return null;

  const { component_insights, system_result } = report;

  // Sort components by contribution (highest first)
  const sortedComponents = [...component_insights].sort(
    (a, b) => b.contribution_to_system - a.contribution_to_system
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <Card className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 via-purple-50 to-indigo-50 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b border-purple-200 bg-gradient-to-r from-purple-100/50 to-indigo-100/50">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-purple-950 flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-full"></div>
              Component Vulnerability Analysis
            </CardTitle>
            <CardDescription className="text-base font-semibold text-purple-800">
              Detailed assessment of {component_insights.length} food system components
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadComponentData}
            disabled={isLoading}
            className="border-2 border-purple-300 font-semibold hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="bg-white p-4 rounded-xl border-2 border-purple-200">
              <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
                Average Vulnerability
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {(system_result.component_statistics.average_vulnerability * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border-2 border-red-200">
              <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                Critical Components
              </div>
              <div className="text-2xl font-bold text-red-900">
                {system_result.critical_components.length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border-2 border-orange-200">
              <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">
                High Risk Components
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {system_result.high_risk_components.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Cards */}
      <div className="space-y-5">
        {sortedComponents.map((component, idx) => (
          <ComponentInsightCard key={component.component_name} component={component} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual Component Insight Card
 * Pattern Reference: PerformanceGapAnalysis.tsx ComponentGapCard
 */
function ComponentInsightCard({ component, rank }: { component: ComponentInsight; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  const componentName =
    COMPONENT_DISPLAY_NAMES[component.component_type] || component.component_type;

  const priorityColors =
    PRIORITY_LEVEL_COLORS[component.priority_level] || PRIORITY_LEVEL_COLORS.medium;

  // Determine severity color based on vulnerability level
  const getSeverityColor = (vulnerability: number) => {
    if (vulnerability >= 0.75) return 'red';
    if (vulnerability >= 0.5) return 'orange';
    if (vulnerability >= 0.25) return 'yellow';
    return 'green';
  };

  const severityColor = getSeverityColor(component.vulnerability);

  const severityColorClasses = {
    red: {
      border: 'border-red-400',
      bg: 'from-red-50 to-red-100',
      text: 'text-red-900',
      metricBg: 'from-red-50 to-red-100',
      metricBorder: 'border-red-300',
      metricText: 'text-red-700',
      barBg: 'from-red-600 to-red-500',
    },
    orange: {
      border: 'border-orange-400',
      bg: 'from-orange-50 to-orange-100',
      text: 'text-orange-900',
      metricBg: 'from-orange-50 to-orange-100',
      metricBorder: 'border-orange-300',
      metricText: 'text-orange-700',
      barBg: 'from-orange-600 to-orange-500',
    },
    yellow: {
      border: 'border-yellow-400',
      bg: 'from-yellow-50 to-yellow-100',
      text: 'text-yellow-900',
      metricBg: 'from-yellow-50 to-yellow-100',
      metricBorder: 'border-yellow-300',
      metricText: 'text-yellow-700',
      barBg: 'from-yellow-600 to-yellow-500',
    },
    green: {
      border: 'border-green-400',
      bg: 'from-green-50 to-green-100',
      text: 'text-green-900',
      metricBg: 'from-green-50 to-green-100',
      metricBorder: 'border-green-300',
      metricText: 'text-green-700',
      barBg: 'from-green-600 to-green-500',
    },
  };

  const colors = severityColorClasses[severityColor];

  return (
    <div
      className={`group border-2 ${colors.border} rounded-xl p-6 hover:shadow-2xl transition-all bg-gradient-to-br ${colors.bg} relative overflow-hidden`}
    >
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-20 rounded-full blur-3xl"></div>

      <div className="space-y-5 relative">
        {/* Header with component name and rank */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${colors.barBg}`}></div>
            <div>
              <h3 className={`text-xl font-bold ${colors.text}`}>{componentName}</h3>
              <p className="text-sm text-gray-600 font-medium">
                #{rank} by system contribution
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 ${priorityColors.bg} ${priorityColors.text} rounded-xl font-bold text-sm uppercase tracking-wide shadow-md`}>
            {component.priority_level}
          </div>
        </div>

        {/* 4-column metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Vulnerability */}
          <div className={`bg-gradient-to-br ${colors.metricBg} px-4 py-3 rounded-xl border-2 ${colors.metricBorder} hover:shadow-lg transition-all duration-200`}>
            <div className={`text-xs font-bold ${colors.metricText} uppercase tracking-wider mb-1.5 flex items-center gap-1`}>
              <TrendingDown className="w-3 h-3" />
              Vulnerability
            </div>
            <div className={`text-2xl font-bold ${colors.text}`}>
              {(component.vulnerability * 100).toFixed(1)}%
            </div>
          </div>

          {/* Weight */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3 rounded-xl border-2 border-blue-300 hover:shadow-lg transition-all duration-200">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              Weight
            </div>
            <div className="text-2xl font-bold text-blue-950">
              {(component.weight * 100).toFixed(1)}%
            </div>
          </div>

          {/* System Contribution */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-3 rounded-xl border-2 border-purple-300 hover:shadow-lg transition-all duration-200">
            <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              Contribution
            </div>
            <div className="text-2xl font-bold text-purple-950">
              {component.contribution_to_system.toFixed(1)}%
            </div>
          </div>

          {/* Efficiency Index */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 px-4 py-3 rounded-xl border-2 border-green-300 hover:shadow-lg transition-all duration-200">
            <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Efficiency
            </div>
            <div className="text-2xl font-bold text-green-950">
              {component.efficiency_index.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Metrics Explanation Panel */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border-2 border-gray-300">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Understanding These Metrics
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-blue-200">
              <span className="font-bold text-blue-900">Weight ({(component.weight * 100).toFixed(1)}%):</span>
              <span className="text-gray-700"> How important this component is to the food system structure</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-purple-200">
              <span className="font-bold text-purple-900">Contribution ({component.contribution_to_system.toFixed(1)}%):</span>
              <span className="text-gray-700"> How much this component is driving current vulnerability</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              <span className="font-bold text-green-900">Efficiency ({component.efficiency_index.toFixed(2)}):</span>
              <span className="text-gray-700"> Cost-effectiveness of investments per million USD allocated</span>
            </div>
          </div>
        </div>

        {/* Advanced Metrics (Collapsible) */}
        <details className="group bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border-2 border-indigo-300">
          <summary className="cursor-pointer p-4 font-bold text-sm text-indigo-900 hover:text-indigo-700 transition-all duration-200 flex items-center gap-2">
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
            Advanced: Sensitivity Parameter (α)
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Sensitivity Coefficient</span>
                <span className="text-2xl font-bold text-indigo-950">{component.sensitivity_parameter.toFixed(3)}</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-semibold">Investment Responsiveness:</span> Measures how effectively financial allocation reduces vulnerability.
                Higher values (0.005-0.010) indicate investments yield rapid improvements. Lower values (0.001-0.003) suggest systemic issues
                requiring sustained, long-term investment.
              </p>
            </div>
          </div>
        </details>

        {/* Vulnerability Progress Bar */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Vulnerability Level
            </span>
            <span className="text-lg font-black text-gray-900">
              {(component.vulnerability * 100).toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <div className="overflow-hidden h-6 flex rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 border-2 border-gray-400 shadow-inner">
              <div
                className={`shadow-lg flex items-center justify-center text-xs font-bold text-white transition-all duration-700 ease-out relative overflow-hidden bg-gradient-to-r ${colors.barBg}`}
                style={{ width: `${Math.min(component.vulnerability * 100, 100)}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Badge */}
        {component.is_critical && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg">
            <AlertCircle className="h-5 w-5 animate-pulse" />
            CRITICAL COMPONENT
          </div>
        )}

        {/* Expandable Recommendations */}
        {component.recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-300 shadow-lg">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-base font-bold text-blue-950 hover:text-blue-700 flex items-center gap-3 w-full transition-all duration-200"
            >
              <div
                className={`p-2 rounded-lg bg-blue-600 text-white transition-all duration-300 ${
                  expanded ? 'rotate-180' : ''
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <span className="block text-lg">
                  {component.recommendations.length} Recommended Actions
                </span>
                <span className="block text-xs text-blue-700">
                  Click to {expanded ? 'hide' : 'view'} policy recommendations
                </span>
              </div>
              <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                {component.recommendations.length}
              </div>
            </button>
            {expanded && (
              <ul className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {component.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="group/item flex items-start gap-3 bg-white p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                  >
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform duration-200" />
                    <span className="text-sm font-semibold text-gray-900 leading-relaxed">
                      {rec}
                    </span>
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
