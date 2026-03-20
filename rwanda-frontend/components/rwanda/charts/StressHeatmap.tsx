'use client';

import { useMemo } from 'react';
import type { AssessmentHistory } from '@/lib/types/assessment';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';

interface StressHeatmapProps {
  data: AssessmentHistory[];
}

const getStressColor = (score: number): string => {
  if (score > 0.30) return 'bg-red-500';
  if (score > 0.15) return 'bg-orange-400';
  if (score > 0.05) return 'bg-yellow-400';
  return 'bg-green-400';
};

const getStressTextColor = (score: number): string => {
  if (score > 0.15) return 'text-white';
  return 'text-gray-900';
};

export function StressHeatmap({ data }: StressHeatmapProps) {
  const { years, components, matrix } = useMemo(() => {
    const sortedData = [...data].sort((a, b) => a.fiscal_year - b.fiscal_year);
    const years = sortedData.map((d) => d.fiscal_year);

    // Get all unique components
    const componentSet = new Set<string>();
    sortedData.forEach((item) => {
      if (item.component_scores) {
        Object.keys(item.component_scores).forEach((c) => componentSet.add(c));
      }
    });
    const components = Array.from(componentSet);

    // Build matrix: component -> year -> score
    const matrix: Record<string, Record<number, number | null>> = {};
    components.forEach((comp) => {
      matrix[comp] = {};
      years.forEach((year) => {
        const yearData = sortedData.find((d) => d.fiscal_year === year);
        matrix[comp][year] = yearData?.component_scores?.[comp] ?? null;
      });
    });

    return { years, components, matrix };
  }, [data]);

  if (!years.length || !components.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No heatmap data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide p-2 border-b border-gray-200">
              Component
            </th>
            {years.map((year) => (
              <th
                key={year}
                className="text-center text-xs font-medium text-gray-500 uppercase tracking-wide p-2 border-b border-gray-200 min-w-[70px]"
              >
                FY{year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {components.map((component) => (
            <tr key={component} className="hover:bg-gray-50">
              <td className="text-sm font-medium text-gray-900 p-2 border-b border-gray-100">
                {COMPONENT_DISPLAY_NAMES[component as IndicatorComponent] || component}
              </td>
              {years.map((year) => {
                const score = matrix[component][year];
                return (
                  <td key={year} className="p-1 border-b border-gray-100">
                    {score !== null ? (
                      <div
                        className={`rounded px-2 py-1 text-center text-xs font-medium ${getStressColor(
                          score
                        )} ${getStressTextColor(score)}`}
                        title={`${COMPONENT_DISPLAY_NAMES[component as IndicatorComponent] || component}: ${score.toFixed(4)}`}
                      >
                        {score.toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-xs">-</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-400" />
          <span>Low (&le;0.05)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-yellow-400" />
          <span>Medium (0.05-0.15)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-orange-400" />
          <span>High (0.15-0.30)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Critical (&gt;0.30)</span>
        </div>
      </div>
    </div>
  );
}
