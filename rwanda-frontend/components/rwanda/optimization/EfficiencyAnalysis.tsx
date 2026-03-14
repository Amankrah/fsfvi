'use client';

import { useMemo } from 'react';
import type { EfficiencyAnalysis as EfficiencyAnalysisType, ComponentEfficiency } from '@/lib/types/optimization';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import { formatScore } from '@/lib/utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface EfficiencyAnalysisProps {
  data: EfficiencyAnalysisType;
}

function formatUSD(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export function EfficiencyAnalysis({ data }: EfficiencyAnalysisProps) {
  const efficiencyPercent = data.efficiency_index * 100;

  const sortedComponents = useMemo(() => {
    return [...data.components].sort((a, b) => {
      // Sort by underfunded first (needs more funding), then by allocation gap
      if (a.is_underfunded !== b.is_underfunded) {
        return a.is_underfunded ? -1 : 1;
      }
      return Math.abs(b.allocation_gap_usd) - Math.abs(a.allocation_gap_usd);
    });
  }, [data.components]);

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 0.75) return 'text-green-600';
    if (efficiency >= 0.5) return 'text-yellow-600';
    if (efficiency >= 0.25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getEfficiencyBarColor = (efficiency: number): string => {
    if (efficiency >= 0.75) return 'bg-green-500';
    if (efficiency >= 0.5) return 'bg-yellow-500';
    if (efficiency >= 0.25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Score Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current FSFSI */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Current FSFSI
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatScore(data.current_fsfsi)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Actual stress index</p>
        </div>

        {/* Optimal FSFSI */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
            Optimal FSFSI
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {formatScore(data.optimal_fsfsi)}
          </p>
          <p className="text-xs text-green-600 mt-1">With optimized allocation</p>
        </div>

        {/* Total Budget */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
            Total Budget
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {formatUSD(data.total_budget_usd)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Computed in {data.computing_time_ms}ms
          </p>
        </div>
      </div>

      {/* Efficiency Gauge */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Efficiency Index</h3>
            <p className="text-xs text-gray-500">
              How well budget allocations reduce food system stress
            </p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold ${getEfficiencyColor(data.efficiency_index)}`}>
              {efficiencyPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getEfficiencyBarColor(data.efficiency_index)}`}
            style={{ width: `${efficiencyPercent}%` }}
          />
        </div>

        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0% (Inefficient)</span>
          <span>100% (Optimal)</span>
        </div>

        {/* Waste Indicator */}
        {data.waste_ratio > 0.1 && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">
                {(data.waste_ratio * 100).toFixed(1)}% Budget Inefficiency
              </p>
              <p className="text-amber-700 text-xs mt-0.5">
                Current allocations could be optimized to reduce stress more effectively.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Component Allocation Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            Component Allocation Analysis
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Component
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Current
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Optimal
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Gap
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedComponents.map((item) => (
                <tr key={item.component_type} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {COMPONENT_DISPLAY_NAMES[item.component_type as IndicatorComponent] || item.component_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {formatUSD(item.current_allocation_usd)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {formatUSD(item.optimal_allocation_usd)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-medium ${
                        item.allocation_gap_usd > 0
                          ? 'text-red-600'
                          : item.allocation_gap_usd < 0
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {item.allocation_gap_usd > 0 ? '+' : ''}
                      {formatUSD(item.allocation_gap_usd)}
                      <span className="text-xs ml-1">
                        ({item.allocation_gap_pct > 0 ? '+' : ''}
                        {item.allocation_gap_pct.toFixed(1)}%)
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.is_underfunded ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <TrendingDown className="h-3 w-3" />
                        Underfunded
                      </span>
                    ) : item.allocation_gap_usd < -1000 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <TrendingUp className="h-3 w-3" />
                        Over-funded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        Optimal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
