'use client';

import { useMemo } from 'react';
import type { ReallocationPlan as ReallocationPlanType, ReallocationItem } from '@/lib/types/optimization';
import type { IndicatorComponent } from '@/lib/types/assessment';
import { COMPONENT_DISPLAY_NAMES } from '@/lib/types/assessment';
import { formatScore, formatRWFCompact, formatEngineDurationMs } from '@/lib/utils/formatters';
import {
  ArrowRight,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface ReallocationPlanProps {
  data: ReallocationPlanType;
}



export function ReallocationPlan({ data }: ReallocationPlanProps) {
  const sortedComponents = useMemo(() => {
    return [...data.components].sort((a, b) => a.priority - b.priority);
  }, [data.components]);

  const increases = data.components.filter((r) => r.change_lcu > 0);
  const decreases = data.components.filter((r) => r.change_lcu < 0);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Current FSFSI
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatScore(data.current_fsfsi)}
              </p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
            <div className="text-center sm:text-left">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
                Projected FSFSI
              </p>
              <p className="text-2xl font-bold text-green-700">
                {formatScore(data.projected_fsfsi)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
            <TrendingDown className="h-5 w-5 text-green-700" />
            <span className="text-lg font-bold text-green-700">
              {data.projected_improvement_pct.toFixed(1)}% Improvement
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Total budget: {formatRWFCompact(data.total_budget_lcu)} · Engine step:{' '}
          {formatEngineDurationMs(data.computing_time_ms)}
        </p>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="h-4 w-4 text-green-700" />
            <p className="text-sm font-semibold text-green-800">Increase Allocation</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{increases.length} components</p>
          <p className="text-xs text-green-600 mt-1">Need additional funding</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="h-4 w-4 text-amber-700" />
            <p className="text-sm font-semibold text-amber-800">Reduce Allocation</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{decreases.length} components</p>
          <p className="text-xs text-amber-600 mt-1">Currently over-funded</p>
        </div>
      </div>

      {/* Reallocation Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            Reallocation Recommendations
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Component
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Current
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Recommended
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Change
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Impact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedComponents.map((item) => {
                const isIncrease = item.change_lcu > 0;
                return (
                  <tr key={item.component_type} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {COMPONENT_DISPLAY_NAMES[item.component_type as IndicatorComponent] || item.component_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {formatRWFCompact(item.current_allocation_lcu)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {formatRWFCompact(item.recommended_allocation_lcu)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isIncrease ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isIncrease ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isIncrease ? '+' : ''}
                          {formatRWFCompact(item.change_lcu)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({isIncrease ? '+' : ''}
                          {item.change_pct.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.projected_impact}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
