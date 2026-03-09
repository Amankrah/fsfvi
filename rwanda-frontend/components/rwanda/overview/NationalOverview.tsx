'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { FiscalYearSelector } from '@/components/rwanda/shared/FiscalYearSelector';
import { RWANDA_PROVINCES } from '@/lib/constants/rwanda';
import { getCurrentSeason } from '@/lib/constants/rwanda';
import { getRiskBgColor, getRiskLevel, getRiskLabel, formatRWFCompact, formatScore } from '@/lib/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  MapPin,
  Activity,
} from 'lucide-react';

// Mock data — will be replaced with real API calls
const MOCK_NATIONAL = {
  fsfi_score: 0.42,
  yoy_change: -0.032,
  critical_components: 2,
  total_budget: 225_000_000_000,
};

const MOCK_PROVINCE_SCORES: Record<string, number> = {
  kigali: 0.28,
  eastern: 0.51,
  northern: 0.38,
  southern: 0.55,
  western: 0.47,
};

export function NationalOverview() {
  const { t } = useLanguage();
  const { fiscalYear } = useFiscalYear();
  const season = getCurrentSeason();

  const riskLevel = getRiskLevel(MOCK_NATIONAL.fsfi_score);
  const improving = MOCK_NATIONAL.yoy_change < 0;

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
        {/* FSFI Score */}
        <Card className="border-l-4 border-l-[var(--rw-blue)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">FSFI Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatScore(MOCK_NATIONAL.fsfi_score)}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${getRiskBgColor(riskLevel)}`}>
                {getRiskLabel(riskLevel)}
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
                  {improving ? '' : '+'}{(MOCK_NATIONAL.yoy_change * 100).toFixed(1)}%
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
                <p className="text-3xl font-bold text-gray-900 mt-1">{MOCK_NATIONAL.critical_components}</p>
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatRWFCompact(MOCK_NATIONAL.total_budget)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-[var(--rw-green)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Province Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>{t('overview.province_breakdown')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {RWANDA_PROVINCES.map((province) => {
              const score = MOCK_PROVINCE_SCORES[province.id] ?? 0.5;
              const provRisk = getRiskLevel(score);
              return (
                <div
                  key={province.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md hover:border-[var(--rw-blue)]/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">{province.name}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRiskBgColor(provRisk)}`}>
                      {formatScore(score)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{province.districts.length} districts</p>
                  {/* Progress bar */}
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${score * 100}%`,
                        backgroundColor: score <= 0.3 ? 'var(--risk-low)' : score <= 0.5 ? 'var(--risk-moderate)' : score <= 0.7 ? 'var(--risk-high)' : 'var(--risk-critical)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card className="border-[var(--rw-yellow)]/30 bg-[var(--rw-yellow)]/5">
        <CardContent className="p-5">
          <div className="flex items-start space-x-3">
            <Activity className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('overview.alerts_banner')}</p>
              <p className="text-sm text-gray-700 mt-1">
                Bugesera district FSFI crossed critical threshold (0.71) — Eastern Province
              </p>
              <p className="text-sm text-gray-700">
                Southern Province shows declining trend for 3 consecutive quarters
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
