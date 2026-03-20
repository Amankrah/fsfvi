'use client';

/**
 * Budget Optimization – fiscal years are driven by the same backend source as the Assessment dashboard:
 * GET /api/assessments/available-years/ (years that have at least one saved assessment).
 * The shared FiscalYearSelector fetches and displays only those years.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import { optimizationAPI } from '@/lib/api/optimizationApi';
import type { SavedAssessment } from '@/lib/types/assessment';
import type {
  EfficiencyAnalysis as EfficiencyAnalysisType,
  ReallocationPlan as ReallocationPlanType,
  RoiAnalysis as RoiAnalysisType,
} from '@/lib/types/optimization';
import { EfficiencyAnalysis, ReallocationPlan, RoiAnalysis } from '@/components/rwanda/optimization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

type OptimizationTab = 'efficiency' | 'reallocation' | 'roi';

export default function OptimizationPage() {
  const { t } = useLanguage();
  const { fiscalYear } = useFiscalYear();

  const [assessment, setAssessment] = useState<SavedAssessment | null>(null);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyAnalysisType | null>(null);
  const [reallocationData, setReallocationData] = useState<ReallocationPlanType | null>(null);
  const [roiData, setRoiData] = useState<RoiAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OptimizationTab>('efficiency');

  // Fetch assessment data
  const fetchAssessment = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEfficiencyData(null);
    setReallocationData(null);
    setRoiData(null);

    try {
      const assessments = await assessmentAPI.listAssessments(fiscalYear.start_year, 1);
      if (assessments.length > 0) {
        const detail = await assessmentAPI.getAssessment(assessments[0].id);
        setAssessment(detail);
      } else {
        setAssessment(null);
      }
    } catch (err) {
      console.error('Failed to fetch assessment:', err);
      setError('Unable to load assessment data.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear.start_year]);

  // Run optimization analysis — delegates to the backend which uses the
  // assessment as the single source of truth for FSFSI scores.
  const runOptimization = useCallback(async () => {
    if (!assessment) return;

    setAnalyzing(true);
    setError(null);

    try {
      // All three analyses use the assessment_id — the backend loads the
      // assessment's FSFSI and component data, runs the Rust optimizer,
      // then stamps the assessment's FSFSI as the authoritative current score.
      const [efficiency, reallocation, roi] = await Promise.all([
        optimizationAPI.efficiencyForAssessment(assessment.id),
        optimizationAPI.reallocationForAssessment(assessment.id),
        optimizationAPI.roiForAssessment(assessment.id),
      ]);

      setEfficiencyData(efficiency);
      setReallocationData(reallocation);
      setRoiData(roi);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string }; status?: number } };
      const msg =
        ax.response?.data?.error ||
        (ax instanceof Error ? ax.message : 'Failed to run optimization analysis. Please try again.');
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  }, [assessment]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  // Determine if we have optimization data
  const hasOptimizationData = efficiencyData || reallocationData || roiData;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
        <span className="ml-3 text-gray-600">Loading optimization data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-[var(--rw-blue)]" />
            Budget Optimization
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Analyze allocation efficiency and generate optimization recommendations.
          </p>
        </div>
        <FiscalYearSelector />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* No Assessment State – fiscal year is from backend (available-years); only years with assessments appear */}
      {!assessment && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Assessment Data</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              The fiscal year dropdown shows only years that have assessment data. Run an assessment for{' '}
              {fiscalYear.label} on the FSFI Assessment page to enable budget optimization here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Assessment Found - Show Run Analysis Button */}
      {assessment && !hasOptimizationData && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Target className="h-12 w-12 text-[var(--rw-blue)] mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Analyze
              </h2>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Assessment data available for {fiscalYear.label}. Run optimization analysis to get
                efficiency insights, reallocation recommendations, and ROI rankings.
              </p>
              <button
                type="button"
                onClick={runOptimization}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--rw-blue)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run Optimization Analysis
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Results */}
      {hasOptimizationData && (
        <>
          {/* Tab Navigation */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setActiveTab('efficiency')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === 'efficiency'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Efficiency
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reallocation')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                  activeTab === 'reallocation'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                Reallocation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('roi')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                  activeTab === 'roi'
                    ? 'bg-[var(--rw-blue)] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Target className="h-4 w-4" />
                ROI Analysis
              </button>
            </div>
            <button
              type="button"
              onClick={runOptimization}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>

          {/* Tab Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {activeTab === 'efficiency' && (
                  <>
                    <TrendingUp className="h-5 w-5 text-[var(--rw-blue)]" />
                    Allocation Efficiency Analysis
                  </>
                )}
                {activeTab === 'reallocation' && (
                  <>
                    <DollarSign className="h-5 w-5 text-[var(--rw-blue)]" />
                    Budget Reallocation Plan
                  </>
                )}
                {activeTab === 'roi' && (
                  <>
                    <Target className="h-5 w-5 text-[var(--rw-blue)]" />
                    Return on Investment Analysis
                  </>
                )}
              </CardTitle>
              <p className="text-sm text-gray-500 font-normal">
                {activeTab === 'efficiency' &&
                  'Compares current allocations with optimal allocations to identify inefficiencies.'}
                {activeTab === 'reallocation' &&
                  'Provides prioritized recommendations for reallocating budget across components.'}
                {activeTab === 'roi' &&
                  'Ranks components by return on investment to identify best funding opportunities.'}
              </p>
            </CardHeader>
            <CardContent>
              {activeTab === 'efficiency' && efficiencyData && (
                <EfficiencyAnalysis data={efficiencyData} />
              )}
              {activeTab === 'reallocation' && reallocationData && (
                <ReallocationPlan data={reallocationData} />
              )}
              {activeTab === 'roi' && roiData && <RoiAnalysis data={roiData} />}

              {/* Loading state for individual tabs */}
              {activeTab === 'efficiency' && !efficiencyData && (
                <div className="flex items-center justify-center h-[200px] text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading efficiency analysis...
                </div>
              )}
              {activeTab === 'reallocation' && !reallocationData && (
                <div className="flex items-center justify-center h-[200px] text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading reallocation plan...
                </div>
              )}
              {activeTab === 'roi' && !roiData && (
                <div className="flex items-center justify-center h-[200px] text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading ROI analysis...
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
