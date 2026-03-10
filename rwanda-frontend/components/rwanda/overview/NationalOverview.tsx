'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { getCurrentSeason } from '@/lib/constants/rwanda';
import { getRiskBgColor, getRiskBarColor, formatRWFCompact, formatScore } from '@/lib/utils/formatters';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import type { DashboardSummary, ComponentSummary } from '@/lib/types/assessment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Activity,
  BarChart3,
  Loader2,
} from 'lucide-react';
import type { StressLevel } from '@/lib/utils/formatters';

export function NationalOverview() {
  const { t } = useLanguage();
  const { fiscalYear } = useFiscalYear();
  const season = getCurrentSeason();

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await assessmentAPI.getDashboardSummary(fiscalYear.start_year);
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
        setError('Unable to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [fiscalYear.start_year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  const isEmpty = dashboardData?.empty === true || (dashboardData?.components?.length === 0 && !dashboardData?.assessment_id);

  if (error || !dashboardData || isEmpty) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('overview.national_fsfi')}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {fiscalYear.label} — {season.label}
            </p>
          </div>
          <FiscalYearSelector />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Assessment Data</h2>
          <p className="text-gray-600 max-w-md">
            {error || 'No assessment data available for this fiscal year. Select a different fiscal year or run an assessment to see dashboard data.'}
          </p>
        </div>
      </div>
    );
  }

  const stressLevel = dashboardData.stress_level as StressLevel;
  const yoyChange = dashboardData.yoy_change_percent ?? 0;
  const improving = yoyChange < 0;
  const criticalComponents = dashboardData.components.filter(
    (c) => c.priority_level === 'critical'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('overview.national_fsfi')}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {fiscalYear.label} — {season.label}
          </p>
        </div>
        <FiscalYearSelector />
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FSFSI Score */}
        <Card className="border-l-4 border-l-[var(--rw-blue)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">FSFSI Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatScore(dashboardData.overall_fsfsi)}
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${getRiskBgColor(stressLevel)}`}>
                {stressLevel.charAt(0).toUpperCase() + stressLevel.slice(1)} Risk
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YoY Change */}
        <Card className={`border-l-4 ${improving ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('overview.yoy_change')}</p>
                <p className={`text-3xl font-bold mt-1 ${improving ? 'text-emerald-600' : 'text-red-600'}`}>
                  {improving ? '' : '+'}{yoyChange.toFixed(1)}%
                </p>
              </div>
              {improving ? (
                <TrendingDown className="h-8 w-8 text-emerald-500" />
              ) : (
                <TrendingUp className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Components */}
        <Card className="border-l-4 border-l-[var(--risk-critical)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('overview.critical_components')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{criticalComponents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Budget */}
        <Card className="border-l-4 border-l-[var(--rw-green)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('overview.total_budget')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatRWFCompact(dashboardData.total_budget_lcu_bn * 1_000_000_000)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-[var(--rw-green)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Component Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>{t('overview.component_breakdown')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardData.components.map((component) => (
              <ComponentCard key={component.component} component={component} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Index */}
      <Card className="border-[var(--rw-blue)]/30 bg-[var(--rw-blue)]/5">
        <CardContent className="p-5">
          <div className="flex items-start space-x-3">
            <Activity className="h-6 w-6 text-[var(--rw-blue)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Efficiency Index: {formatScore(dashboardData.efficiency_index)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Measures how effectively budget allocations reduce food system stress.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComponentCard({ component }: { component: ComponentSummary }) {
  const stressLevel = (component.priority_level || 'medium') as StressLevel;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md hover:border-[var(--rw-blue)]/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {component.component_display}
        </h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRiskBgColor(stressLevel)}`}>
          {formatScore(component.stress)}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {component.indicator_count} indicators · {component.budget_share_percent.toFixed(1)}% budget
      </p>
      {/* Stress bar */}
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(component.stress * 100, 100)}%`,
            backgroundColor: getRiskBarColor(stressLevel),
          }}
        />
      </div>
    </div>
  );
}
