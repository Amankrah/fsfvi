'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RoiAnalysis as RoiAnalysisType, ComponentRoi } from '@/lib/types/optimization';
import type { IndicatorComponent } from '@/lib/types/assessment';
import { COMPONENT_DISPLAY_NAMES } from '@/lib/types/assessment';
import {
  Trophy,
  TrendingDown,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface RoiAnalysisProps {
  data: RoiAnalysisType;
}

const CHART_COLORS = [
  '#22c55e', // green-500 (best ROI)
  '#84cc16', // lime-500
  '#eab308', // yellow-500
  '#f97316', // orange-500
  '#ef4444', // red-500 (worst ROI)
];

function getColorByRank(rank: number, total: number): string {
  const index = Math.min(
    Math.floor((rank - 1) / (total / CHART_COLORS.length)),
    CHART_COLORS.length - 1
  );
  return CHART_COLORS[index];
}

export function RoiAnalysis({ data }: RoiAnalysisProps) {
  const sortedComponents = useMemo(() => {
    return [...data.components].sort((a, b) => a.rank - b.rank);
  }, [data.components]);

  const bestRoi = sortedComponents[0];
  const worstRoi = sortedComponents[sortedComponents.length - 1];

  const chartData = useMemo(() => {
    return sortedComponents.map((item) => ({
      name: COMPONENT_DISPLAY_NAMES[item.component_type as IndicatorComponent] || item.component_type,
      component_type: item.component_type,
      roi: item.roi_per_million,
      rank: item.rank,
      marginal_benefit: item.marginal_benefit,
    }));
  }, [sortedComponents]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { name: string; roi: number; marginal_benefit: number; rank: number } }>;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900">{item.name}</p>
        <p className="text-sm text-gray-600 mt-1">
          ROI per bn LCU: <span className="font-bold text-green-600">{item.roi.toFixed(4)}</span>
        </p>
        <p className="text-sm text-gray-600">
          Marginal Benefit: <span className="font-medium">{item.marginal_benefit.toFixed(6)}</span>
        </p>
        <p className="text-sm text-gray-500">Rank: #{item.rank}</p>
      </div>
    );
  };

  if (!data.components.length) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No ROI data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best ROI */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800">Highest ROI</p>
              </div>
              <p className="text-xl font-bold text-green-700 mt-2">
                {COMPONENT_DISPLAY_NAMES[data.best_roi_component as IndicatorComponent] || data.best_roi_component}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {bestRoi.roi_per_million.toFixed(4)} stress reduction per bn LCU
              </p>
            </div>
            <div className="bg-green-100 px-3 py-1 rounded-full">
              <span className="text-sm font-bold text-green-700">#1</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
            <Sparkles className="h-3 w-3" />
            <span>Best investment opportunity</span>
          </div>
        </div>

        {/* Lowest ROI */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-5 border border-amber-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">Lowest ROI</p>
              </div>
              <p className="text-xl font-bold text-amber-700 mt-2">
                {COMPONENT_DISPLAY_NAMES[data.worst_roi_component as IndicatorComponent] || data.worst_roi_component}
              </p>
              <p className="text-sm text-amber-600 mt-1">
                {worstRoi.roi_per_million.toFixed(4)} stress reduction per bn LCU
              </p>
            </div>
            <div className="bg-amber-100 px-3 py-1 rounded-full">
              <span className="text-sm font-bold text-amber-700">#{worstRoi.rank}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
            <TrendingDown className="h-3 w-3" />
            <span>May need efficiency review</span>
          </div>
        </div>
      </div>

      {/* ROI Bar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          ROI per bn LCU by Component
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={95}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.component_type}
                  fill={getColorByRank(entry.rank, chartData.length)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            Component ROI Rankings
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Total budget: RWF {(data.total_budget_lcu / 1_000_000_000).toFixed(1)}B · Computed in {data.computing_time_ms}ms
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Component
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Current Stress
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Marginal Benefit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  ROI per bn LCU
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedComponents.map((item) => (
                <tr key={item.component_type} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                        item.rank === 1
                          ? 'bg-green-100 text-green-800'
                          : item.rank === sortedComponents.length
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {COMPONENT_DISPLAY_NAMES[item.component_type as IndicatorComponent] || item.component_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {item.current_stress.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                    {item.marginal_benefit.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-medium ${
                        item.rank <= 2
                          ? 'text-green-600'
                          : item.rank >= sortedComponents.length - 1
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {item.roi_per_million.toFixed(4)}
                    </span>
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
