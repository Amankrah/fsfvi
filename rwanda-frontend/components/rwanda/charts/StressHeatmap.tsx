'use client';

import { useMemo } from 'react';
import type { AssessmentHistory, StressThreshold } from '@/lib/types/assessment';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';
import { classifyWithThresholds, type StressLevel } from '@/lib/utils/formatters';

interface StressHeatmapProps {
  data: AssessmentHistory[];
  /** Component-level cut-points from the backend (`stress_thresholds.component`). */
  thresholds?: StressThreshold | null;
}

const LEVEL_BG: Record<StressLevel, string> = {
  low: 'bg-green-400',
  medium: 'bg-yellow-400',
  high: 'bg-orange-400',
  critical: 'bg-red-500',
};

const LEVEL_TEXT: Record<StressLevel, string> = {
  low: 'text-gray-900',
  medium: 'text-gray-900',
  high: 'text-white',
  critical: 'text-white',
};

export function StressHeatmap({ data, thresholds = null }: StressHeatmapProps) {
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
                const level = score !== null ? classifyWithThresholds(score, thresholds) : null;
                return (
                  <td key={year} className="p-1 border-b border-gray-100">
                    {score !== null && level ? (
                      <div
                        className={`rounded px-2 py-1 text-center text-xs font-medium ${
                          thresholds ? LEVEL_BG[level] : 'bg-slate-200'
                        } ${thresholds ? LEVEL_TEXT[level] : 'text-gray-900'}`}
                        title={`${COMPONENT_DISPLAY_NAMES[component as IndicatorComponent] || component}: ${score.toFixed(4)}${
                          thresholds ? ` (${level})` : ''
                        }`}
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

      {/* Legend (cut-points from the backend's calibrated component-level thresholds) */}
      {thresholds ? (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-400" />
            <span>Low (&le;{thresholds.low_max.toFixed(3)})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-400" />
            <span>
              Medium ({thresholds.low_max.toFixed(3)}–{thresholds.medium_max.toFixed(3)})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-orange-400" />
            <span>
              High ({thresholds.medium_max.toFixed(3)}–{(thresholds.high_max ?? thresholds.medium_max).toFixed(3)})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Critical (&gt;{(thresholds.high_max ?? thresholds.medium_max).toFixed(3)})</span>
          </div>
          {thresholds.is_calibrated && (
            <span className="basis-full text-center text-[11px] text-slate-500">
              Component-level cut-points: Jenks natural breaks on {thresholds.n_observations} observations,
              FY{thresholds.calibration_years[0]}–FY{thresholds.calibration_years[thresholds.calibration_years.length - 1]}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-slate-500">Stress thresholds unavailable; cells are uncoloured.</p>
      )}
    </div>
  );
}
