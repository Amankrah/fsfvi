/**
 * FSFVI Action Priorities Display
 * =================================
 * Displays government action recommendations and resource allocation priorities
 *
 * CRITICAL: Government-level system - these recommendations directly influence
 * policy decisions and resource allocation affecting food security
 *
 * Pattern Reference: components/performance-gap/PerformanceGapAnalysis.tsx
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
  Clock,
  Target,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import govAssessmentAPI from '@/lib/fsfviApi/assessmentApi';
import type { AssessmentReport } from '@/lib/types/assessment';
import { URGENCY_LEVEL_COLORS } from '@/lib/types/assessment';

interface ActionPrioritiesProps {
  fiscalYear: number;
  weightingMethod: string;
  scenario: string;
}

/**
 * Format cost string from backend (fixes incorrect M suffix)
 * Backend may return "$120000000.0M" which should be "$120M"
 */
const formatCostString = (costString: string): string => {
  // Extract numeric values and range indicators
  const rangeMatch = costString.match(/\$?([\d.]+)M?\s*-\s*\$?([\d.]+)M?/);

  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);

    // If values are already in millions (< 1000), use as-is
    if (low < 1000 && high < 1000) {
      return `$${low.toFixed(0)}M - $${high.toFixed(0)}M`;
    }

    // If values are in raw USD (>= 1,000,000), convert to M or B
    const formatValue = (val: number): string => {
      if (val >= 1_000_000_000) {
        return `$${(val / 1_000_000_000).toFixed(1)}B`;
      } else if (val >= 1_000_000) {
        return `$${(val / 1_000_000).toFixed(0)}M`;
      } else {
        return `$${val.toFixed(0)}M`;
      }
    };

    return `${formatValue(low)} - ${formatValue(high)}`;
  }

  // Single value format
  const singleMatch = costString.match(/\$?([\d.]+)M?/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);

    if (value < 1000) {
      return `$${value.toFixed(0)}M`;
    } else if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(0)}M`;
    }
  }

  // Fallback: return original string
  return costString;
};

export function ActionPriorities({ fiscalYear, weightingMethod, scenario }: ActionPrioritiesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);

  /**
   * Load action priorities from government database
   */
  const loadPrioritiesData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[ActionPriorities] Fetching assessment for FY ${fiscalYear} with ${weightingMethod} weighting and ${scenario} scenario...`);

      // Backend returns AssessmentReport directly (unwrapped from ApiResponse)
      const report = await govAssessmentAPI.runAssessment(
        fiscalYear,
        undefined,
        weightingMethod as any,
        scenario as any
      );

      console.log(`[ActionPriorities] Loaded action priorities:`, {
        immediate: report.system_result.action_priorities.immediate_actions_0_6_months.length,
        strategic: report.system_result.action_priorities.strategic_actions_6_24_months.length,
        urgency: report.system_result.action_priorities.overall_urgency,
      });

      setReport(report);
    } catch (err: any) {
      console.error('[ActionPriorities] Error:', err);

      if (err.response?.data?.message?.includes('No validated data')) {
        setError(`No assessment data found for FY ${fiscalYear}.`);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load action priorities');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrioritiesData();
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
                <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-orange-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Loading Action Priorities</p>
              <p className="text-sm text-gray-600">Generating policy recommendations...</p>
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

  const { action_priorities, government_insights } = report.system_result;
  const urgencyColors =
    URGENCY_LEVEL_COLORS[action_priorities.overall_urgency] || URGENCY_LEVEL_COLORS.medium;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Summary Card */}
      <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50 shadow-lg">
        <CardHeader className="border-b border-orange-200 bg-gradient-to-r from-orange-100/50 to-amber-100/50">
          <CardTitle className="flex items-center gap-3 text-orange-950">
            <div className="p-2 bg-orange-600 rounded-lg shadow-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">Government Action Priorities</div>
              <div className="text-sm font-normal text-orange-800">
                Strategic recommendations for food security resilience
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Overall Urgency */}
            <div className={`${urgencyColors.bg} p-4 rounded-xl border-2 border-orange-300`}>
              <div className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">
                Overall Urgency
              </div>
              <div className={`text-2xl font-bold ${urgencyColors.text} capitalize`}>
                {action_priorities.overall_urgency.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Intervention Urgency */}
            <div className="bg-white p-4 rounded-xl border-2 border-blue-300">
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                Intervention Type
              </div>
              <div className="text-2xl font-bold text-blue-950 capitalize">
                {government_insights.intervention_urgency.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="bg-white p-4 rounded-xl border-2 border-green-300">
              <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">
                Estimated Cost
              </div>
              <div className="text-2xl font-bold text-green-950">
                {formatCostString(action_priorities.estimated_intervention_cost)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Understanding Intervention Types - Educational Panel */}
      <details className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-md">
        <summary className="cursor-pointer p-4 font-bold text-sm text-blue-900 hover:text-blue-700 transition-all duration-200 flex items-center gap-2">
          <svg className="h-4 w-4 transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Understanding Intervention Types: How This Is Determined
        </summary>
        <div className="px-4 pb-4 space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
            <h4 className="font-bold text-blue-950 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Why Intervention Type Cannot Be Manually Selected
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              The <span className="font-semibold">Intervention Type</span> is <span className="font-semibold text-blue-900">automatically calculated</span> by the FSFVI system based on your food system's actual vulnerability data. This ensures evidence-based decision-making and prevents subjective assessment bias.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-900 font-semibold mb-2">CALCULATION LOGIC:</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-red-600 min-w-[80px]">URGENT:</span>
                  <span>Critical components detected OR FSFVI score {'>'} 75% (severe vulnerability)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600 min-w-[80px]">TACTICAL:</span>
                  <span>{'>'} 2 high-risk components OR FSFVI score {'>'} 50% (moderate-high vulnerability)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 min-w-[80px]">STRATEGIC:</span>
                  <span>Stable system with manageable risks (requires long-term planning)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-green-200">
            <h4 className="font-bold text-green-950 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Your Current Assessment
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-semibold text-gray-700">FSFVI Vulnerability Score:</span>
                <span className="font-bold text-gray-900">{(report.system_result.fsfvi_value * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-semibold text-gray-700">Critical Components:</span>
                <span className="font-bold text-gray-900">{report.system_result.critical_components.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-semibold text-gray-700">High-Risk Components:</span>
                <span className="font-bold text-gray-900">{report.system_result.high_risk_components.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                <span className="font-semibold text-blue-700">Intervention Type:</span>
                <span className="font-bold text-blue-900 capitalize">{government_insights.intervention_urgency.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold">Why "{government_insights.intervention_urgency}"?</span>{' '}
              {government_insights.intervention_urgency === 'urgent' &&
                "Your system has critical vulnerabilities requiring immediate emergency response and resource mobilization."}
              {government_insights.intervention_urgency === 'tactical' &&
                "Your system shows elevated risks requiring accelerated intervention programs and increased monitoring."}
              {government_insights.intervention_urgency === 'strategic' &&
                "Your system is stable with manageable risks. Focus on long-term planning, prevention, and systematic improvements rather than emergency interventions."}
            </p>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border-2 border-amber-300">
            <h4 className="font-bold text-amber-950 mb-2 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Testing Different Scenarios
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              To see how intervention type changes under crisis conditions, use the <span className="font-semibold">Assessment Configuration</span> dropdown above:
            </p>
            <ul className="space-y-1 text-sm text-gray-700 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span><span className="font-semibold">Climate Shock:</span> Simulates drought, floods, or extreme weather events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span><span className="font-semibold">Financial Crisis:</span> Tests system resilience during economic downturns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span><span className="font-semibold">Pandemic Disruption:</span> Evaluates vulnerability during health emergencies</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-amber-800 font-semibold">
              These scenarios will likely shift intervention type to "Urgent" or "Tactical" based on increased vulnerability.
            </p>
          </div>
        </div>
      </details>

      {/* Immediate Actions (0-6 months) */}
      <Card className="border-2 border-red-400 bg-gradient-to-br from-red-50 via-red-50 to-orange-50 shadow-lg">
        <CardHeader className="border-b border-red-200 bg-gradient-to-r from-red-100/50 to-orange-100/50">
          <CardTitle className="flex items-center gap-3 text-red-950">
            <div className="p-2 bg-red-600 rounded-lg shadow-md">
              <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-xl font-bold">Immediate Actions (0-6 Months)</div>
              <div className="text-sm font-normal text-red-800">
                {action_priorities.immediate_actions_0_6_months.length} urgent interventions required
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {action_priorities.immediate_actions_0_6_months.length > 0 ? (
            <ul className="space-y-3">
              {action_priorities.immediate_actions_0_6_months.map((action, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-red-200 hover:border-red-400 hover:shadow-md transition-all duration-200"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <span className="text-base font-bold text-gray-900 leading-relaxed block">
                      {action}
                    </span>
                    <span className="text-xs text-red-700 font-semibold uppercase tracking-wide flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Immediate Priority
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-900">
                No immediate actions required
              </p>
              <p className="text-sm text-gray-600 mt-1">
                System is operating within acceptable parameters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategic Actions (6-24 months) */}
      <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 via-blue-50 to-cyan-50 shadow-lg">
        <CardHeader className="border-b border-blue-200 bg-gradient-to-r from-blue-100/50 to-cyan-100/50">
          <CardTitle className="flex items-center gap-3 text-blue-950">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Strategic Actions (6-24 Months)</div>
              <div className="text-sm font-normal text-blue-800">
                {action_priorities.strategic_actions_6_24_months.length} medium-term improvements
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {action_priorities.strategic_actions_6_24_months.length > 0 ? (
            <ul className="space-y-3">
              {action_priorities.strategic_actions_6_24_months.map((action, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <span className="text-base font-bold text-gray-900 leading-relaxed block">
                      {action}
                    </span>
                    <span className="text-xs text-blue-700 font-semibold uppercase tracking-wide flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Strategic Priority
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-base font-semibold text-gray-900">
                No strategic actions identified
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Focus on immediate priorities first
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Recommendations */}
      <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 via-green-50 to-emerald-50 shadow-lg">
        <CardHeader className="border-b border-green-200 bg-gradient-to-r from-green-100/50 to-emerald-100/50">
          <CardTitle className="flex items-center gap-3 text-green-950">
            <div className="p-2 bg-green-600 rounded-lg shadow-md">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Resource Allocation Recommendations</div>
              <div className="text-sm font-normal text-green-800">
                Budget optimization and efficiency improvements
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {action_priorities.resource_recommendations.length > 0 ? (
            <ul className="space-y-3">
              {action_priorities.resource_recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all duration-200"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <span className="text-base font-bold text-gray-900 leading-relaxed block">
                      {rec}
                    </span>
                    <span className="text-xs text-green-700 font-semibold uppercase tracking-wide flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Resource Optimization
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-base font-semibold text-gray-900">
                Current resource allocation is optimal
              </p>
              <p className="text-sm text-gray-600 mt-1">
                No immediate reallocation needed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Government Insights Summary */}
      <Card className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 via-purple-50 to-indigo-50 shadow-lg">
        <CardHeader className="border-b border-purple-200 bg-gradient-to-r from-purple-100/50 to-indigo-100/50">
          <CardTitle className="flex items-center gap-3 text-purple-950">
            <div className="p-2 bg-purple-600 rounded-lg shadow-md">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Government System Insights</div>
              <div className="text-sm font-normal text-purple-800">
                High-level assessment metrics for decision-makers
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InsightCard
              label="Financing Efficiency"
              value={`${government_insights.financing_efficiency_percent.toFixed(1)}%`}
              color="blue"
            />
            <InsightCard
              label="Budget Optimization Potential"
              value={government_insights.budget_optimization_potential}
              color="green"
            />
            <InsightCard
              label="System Stability"
              value={government_insights.system_stability}
              color="purple"
            />
            <InsightCard
              label="Resource Allocation Quality"
              value={government_insights.resource_allocation_quality}
              color="orange"
            />
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardContent className="flex items-center justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPrioritiesData}
            disabled={isLoading}
            className="border-2 border-gray-300 font-semibold hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Action Priorities
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Insight Card Component
 */
function InsightCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100',
      border: 'border-blue-300',
      text: 'text-blue-700',
      valueText: 'text-blue-950',
    },
    green: {
      bg: 'from-green-50 to-green-100',
      border: 'border-green-300',
      text: 'text-green-700',
      valueText: 'text-green-950',
    },
    purple: {
      bg: 'from-purple-50 to-purple-100',
      border: 'border-purple-300',
      text: 'text-purple-700',
      valueText: 'text-purple-950',
    },
    orange: {
      bg: 'from-orange-50 to-orange-100',
      border: 'border-orange-300',
      text: 'text-orange-700',
      valueText: 'text-orange-950',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className={`bg-gradient-to-br ${colors.bg} p-5 rounded-xl border-2 ${colors.border} hover:shadow-lg transition-all duration-200`}>
      <div className={`text-xs font-bold ${colors.text} uppercase tracking-wider mb-2`}>
        {label}
      </div>
      <div className={`text-2xl font-bold ${colors.valueText} capitalize`}>
        {value.replace(/_/g, ' ')}
      </div>
    </div>
  );
}
