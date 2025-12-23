/**
 * FSFVI Assessment Overview Component
 * =====================================
 * Displays comprehensive vulnerability assessment results with real-time data
 *
 * CRITICAL: Government-level system where livelihoods depend on accurate
 * vulnerability assessments and policy decisions.
 *
 * Pattern Reference: components/performance-gap/PerformanceGapAnalysis.tsx
 * API: lib/fsfviApi/assessmentApi.ts
 * Types: lib/types/assessment.ts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  DollarSign,
  Shield,
  Activity,
} from 'lucide-react';
import govAssessmentAPI from '@/lib/fsfviApi/assessmentApi';
import type {
  AssessmentReport,
  ApiResponse,
  WeightingMethod,
  Scenario,
} from '@/lib/types/assessment';
import {
  WEIGHTING_METHODS,
  SCENARIOS,
  RISK_LEVELS,
  RISK_LEVEL_COLORS,
  COMPONENT_DISPLAY_NAMES,
} from '@/lib/types/assessment';

/**
 * Format large currency values for display
 * Converts to billions (B) or millions (M) based on size
 */
const formatBudget = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else {
    return `$${value.toLocaleString()}`;
  }
};

/**
 * Format component name for display
 * Converts database IDs like "governance_inst_2025" to "Governance & Institutions"
 * and raw types like "agricultural_development" to "Agricultural Development"
 */
const formatComponentName = (name: string): string => {
  // Remove year suffix if present (e.g., "_2025")
  const cleanName = name.replace(/_\d{4}$/, '');

  // Map abbreviated names to full component types
  const abbreviationMap: Record<string, string> = {
    agr_dev: 'agricultural_development',
    governance_inst: 'governance_institutions',
    climate_natural_res: 'climate_natural_resources',
    nutrition_hlth: 'nutrition_health',
    social_prot: 'social_protection_equity',
    infra: 'infrastructure',
  };

  // Use abbreviation map if available
  const componentType = abbreviationMap[cleanName] || cleanName;

  // Return display name from constants or fallback to formatted version
  return (
    COMPONENT_DISPLAY_NAMES[componentType] ||
    componentType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};

interface AssessmentOverviewProps {
  fiscalYear: number;
  weightingMethod: WeightingMethod;
  scenario: Scenario;
  onFiscalYearChange: (year: number) => void;
  onWeightingMethodChange: (method: WeightingMethod) => void;
  onScenarioChange: (scenario: Scenario) => void;
}

export function AssessmentOverview({
  fiscalYear,
  weightingMethod,
  scenario,
  onFiscalYearChange,
  onWeightingMethodChange,
  onScenarioChange,
}: AssessmentOverviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AssessmentReport | null>(null);

  /**
   * Load FSFVI vulnerability assessment from government database
   * CRITICAL: Real data only - fetches from fsfvi_data table
   */
  const loadAssessmentData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[AssessmentOverview] Running assessment for FY ${fiscalYear}`, {
        weighting: weightingMethod,
        scenario,
      });

      // CRITICAL: Fetch real data from government database via backend API
      // Backend unwraps ApiResponse, returns AssessmentReport directly
      const report = await govAssessmentAPI.runAssessment(
        fiscalYear,
        undefined,
        weightingMethod,
        scenario
      );

      console.log(`[AssessmentOverview] Assessment complete:`, {
        fsfvi: report.system_result.fsfvi_value,
        risk: report.system_result.risk_level,
        components: report.component_insights.length,
      });

      setReport(report);
    } catch (err: any) {
      console.error('[AssessmentOverview] Failed to run assessment:', err);

      // User-friendly error messages
      if (err.response?.data?.message?.includes('No validated data')) {
        setError(
          `No validated component data found for FY ${fiscalYear}. Please ensure financial data is entered and validated in the system.`
        );
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again to access assessment data.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to run vulnerability assessments.');
      } else {
        setError(
          err.response?.data?.message || err.message || 'Failed to load assessment data. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessmentData();
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
                <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-pulse"></div>
              </div>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-indigo-600 relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">Running Vulnerability Assessment</p>
              <p className="text-sm text-gray-600">
                Analyzing food system components from government database...
              </p>
              <p className="text-xs text-gray-500 font-mono">
                FY {fiscalYear} • {weightingMethod} • {scenario}
              </p>
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

  const { executive_summary, system_result, metadata } = report;
  const riskColors = RISK_LEVEL_COLORS[system_result.risk_level] || RISK_LEVEL_COLORS.moderate;

  // Success state - render assessment data
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Configuration Controls */}
      <Card className="border-2 border-gray-300 shadow-lg bg-gradient-to-br from-gray-50 to-slate-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Assessment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Fiscal Year Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Fiscal Year
              </label>
              <Select value={fiscalYear.toString()} onValueChange={(v) => onFiscalYearChange(parseInt(v))}>
                <SelectTrigger className="border-2 border-indigo-300 font-semibold text-gray-900 hover:border-indigo-500 transition-all">
                  <SelectValue className="text-gray-900 font-semibold" />
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

            {/* Weighting Method Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Weighting Method
              </label>
              <Select value={weightingMethod} onValueChange={(v) => onWeightingMethodChange(v as WeightingMethod)}>
                <SelectTrigger className="border-2 border-indigo-300 font-semibold text-gray-900 hover:border-indigo-500 transition-all">
                  <SelectValue className="text-gray-900 font-semibold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WEIGHTING_METHODS.HYBRID}>Hybrid (Recommended)</SelectItem>
                  <SelectItem value={WEIGHTING_METHODS.EXPERT}>Expert (AHP)</SelectItem>
                  <SelectItem value={WEIGHTING_METHODS.FINANCIAL}>Financial</SelectItem>
                  <SelectItem value={WEIGHTING_METHODS.NETWORK}>Network</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scenario Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">Scenario</label>
              <Select value={scenario} onValueChange={(v) => onScenarioChange(v as Scenario)}>
                <SelectTrigger className="border-2 border-indigo-300 font-semibold text-gray-900 hover:border-indigo-500 transition-all">
                  <SelectValue className="text-gray-900 font-semibold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SCENARIOS.NORMAL_OPERATIONS}>Normal Operations</SelectItem>
                  <SelectItem value={SCENARIOS.CLIMATE_SHOCK}>Climate Shock</SelectItem>
                  <SelectItem value={SCENARIOS.FINANCIAL_CRISIS}>Financial Crisis</SelectItem>
                  <SelectItem value={SCENARIOS.PANDEMIC_DISRUPTION}>Pandemic Disruption</SelectItem>
                  <SelectItem value={SCENARIOS.SUPPLY_CHAIN_DISRUPTION}>
                    Supply Chain Disruption
                  </SelectItem>
                  <SelectItem value={SCENARIOS.CYBER_THREATS}>Cyber Threats</SelectItem>
                  <SelectItem value={SCENARIOS.POLITICAL_INSTABILITY}>Political Instability</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* FSFVI Score Card */}
        <Card
          className={`border-2 ${riskColors.border} ${riskColors.bg} hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden`}
        >
          {system_result.risk_level === RISK_LEVELS.CRITICAL && (
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500 opacity-10 rounded-full blur-2xl"></div>
          )}
          <CardHeader className="pb-3 relative">
            <CardDescription
              className={`text-xs font-bold uppercase tracking-wider ${riskColors.text}`}
            >
              <span className="flex items-center gap-2">
                <TrendingDown className="w-3 h-3 animate-pulse" />
                FSFVI Score
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-4xl font-bold ${riskColors.text}`}>
              {system_result.fsfvi_value.toFixed(6)}
            </div>
            <p className={`text-xs font-semibold mt-1.5 uppercase tracking-wide ${riskColors.text}`}>
              {system_result.vulnerability_percent.toFixed(2)}% Vulnerable
            </p>
          </CardContent>
        </Card>

        {/* Risk Level Card */}
        <Card className="border-2 border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Risk Level
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 capitalize">
              {system_result.risk_level.replace(/_/g, ' ')}
            </div>
            <p className="text-xs text-gray-600 mt-1.5 font-medium">
              Based on {executive_summary.components_analyzed} components
            </p>
          </CardContent>
        </Card>

        {/* Critical Components Card */}
        <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-orange-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                Critical Components
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-800">
              {executive_summary.critical_components}
            </div>
            <p className="text-xs font-semibold text-orange-700 mt-1.5 uppercase tracking-wide">
              Require Immediate Attention
            </p>
          </CardContent>
        </Card>

        {/* Total Budget Card */}
        <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-bold text-green-900 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <DollarSign className="w-3 h-3" />
                Total Budget Analyzed
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">
              {/* CRITICAL: total_allocation is in millions, convert to USD for formatting */}
              {formatBudget(system_result.total_allocation * 1_000_000)}
            </div>
            <p className="text-xs font-semibold text-green-700 mt-1.5 uppercase tracking-wide">
              USD
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Finding Card */}
      <Card className="border-2 border-blue-400 bg-gradient-to-br from-blue-50 via-blue-50 to-cyan-50 shadow-lg">
        <CardHeader className="border-b border-blue-200 bg-gradient-to-r from-blue-100/50 to-cyan-100/50">
          <CardTitle className="flex items-center gap-3 text-blue-950">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Key Finding</div>
              <div className="text-sm font-normal text-blue-800">Primary Assessment Result</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-lg font-semibold text-gray-900 leading-relaxed">
            {executive_summary.key_finding}
          </p>
        </CardContent>
      </Card>

      {/* Top Vulnerabilities */}
      {executive_summary.top_vulnerabilities.length > 0 && (
        <Card className="border-2 border-red-400 bg-gradient-to-br from-red-50 via-red-50 to-orange-50 shadow-lg">
          <CardHeader className="border-b border-red-200 bg-gradient-to-r from-red-100/50 to-orange-100/50">
            <CardTitle className="flex items-center gap-3 text-red-950">
              <div className="p-2 bg-red-600 rounded-lg shadow-md">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold">Top Vulnerabilities</div>
                <div className="text-sm font-normal text-red-800">
                  {executive_summary.immediate_actions_required} Immediate Actions Required
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {executive_summary.top_vulnerabilities.map((vuln, idx) => (
                <li
                  key={idx}
                  className="group flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-red-200 hover:border-red-400 hover:shadow-md transition-all duration-200"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="text-base font-bold text-gray-900">
                      {formatComponentName(vuln.name)}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-700 font-semibold">
                        Vulnerability: {(vuln.vulnerability * 100).toFixed(1)}%
                      </span>
                      <span className="text-gray-600 font-medium">
                        Contribution: {vuln.contribution_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button and Metadata */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              LIVE DATA
            </span>
            <span className="text-sm text-gray-600">
              Assessment Date: {new Date(metadata.assessment_date).toLocaleDateString()}
            </span>
            <span className="text-sm text-gray-600">•</span>
            <span className="text-sm text-gray-600">
              Currency: {metadata.currency}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAssessmentData}
            disabled={isLoading}
            className="border-2 border-gray-300 font-semibold hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Assessment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
