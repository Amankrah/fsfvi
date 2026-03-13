'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { AssessmentHistory } from '@/lib/types/assessment';
import { COMPONENT_DISPLAY_NAMES, type IndicatorComponent } from '@/lib/types/assessment';

interface ComponentStressTrendProps {
  data: AssessmentHistory[];
  height?: number;
}

const COMPONENT_COLORS: Record<string, string> = {
  markets: '#3b82f6',        // blue-500
  crop_production: '#22c55e', // green-500
  nutrition: '#f97316',       // orange-500
  research: '#8b5cf6',        // violet-500
  post_harvest: '#ec4899',    // pink-500
  environment: '#14b8a6',     // teal-500
  animal_systems: '#f59e0b',  // amber-500
  finance: '#6366f1',         // indigo-500
};

export function ComponentStressTrend({ data, height = 350 }: ComponentStressTrendProps) {
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(
    new Set(Object.keys(COMPONENT_COLORS))
  );

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.fiscal_year - b.fiscal_year)
      .map((item) => {
        const entry: Record<string, string | number> = {
          year: `FY${item.fiscal_year}`,
          fiscalYear: item.fiscal_year,
        };

        // Add component scores
        if (item.component_scores) {
          Object.entries(item.component_scores).forEach(([component, score]) => {
            entry[component] = score;
          });
        }

        return entry;
      });
  }, [data]);

  const availableComponents = useMemo(() => {
    const components = new Set<string>();
    data.forEach((item) => {
      if (item.component_scores) {
        Object.keys(item.component_scores).forEach((c) => components.add(c));
      }
    });
    return Array.from(components);
  }, [data]);

  const toggleComponent = (component: string) => {
    setSelectedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(component)) {
        next.delete(component);
      } else {
        next.add(component);
      }
      return next;
    });
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload
            .sort((a, b) => b.value - a.value)
            .map((entry) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-600">
                    {COMPONENT_DISPLAY_NAMES[entry.dataKey as IndicatorComponent] || entry.dataKey}
                  </span>
                </span>
                <span className="font-medium">{entry.value.toFixed(4)}</span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-500">
        No component trend data available
      </div>
    );
  }

  return (
    <div>
      {/* Component toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableComponents.map((component) => (
          <button
            type="button"
            key={component}
            onClick={() => toggleComponent(component)}
            className={`px-3 py-1 text-xs rounded-full border transition-all ${
              selectedComponents.has(component)
                ? 'border-transparent text-white'
                : 'border-gray-300 text-gray-500 bg-gray-50'
            }`}
            style={{
              backgroundColor: selectedComponents.has(component)
                ? COMPONENT_COLORS[component]
                : undefined,
            }}
          >
            {COMPONENT_DISPLAY_NAMES[component as IndicatorComponent] || component}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => value.toFixed(2)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value: string) =>
              COMPONENT_DISPLAY_NAMES[value as IndicatorComponent] || value
            }
          />

          {availableComponents
            .filter((c) => selectedComponents.has(c))
            .map((component) => (
              <Line
                key={component}
                type="monotone"
                dataKey={component}
                stroke={COMPONENT_COLORS[component]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
