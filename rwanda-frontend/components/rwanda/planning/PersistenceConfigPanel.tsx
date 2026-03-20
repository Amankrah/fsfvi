'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import type { PersistenceConfig } from '@/lib/types/assessment';
import { AlertTriangle, ChevronDown, ChevronUp, Settings2, RotateCcw, Save, Loader2, CheckCircle } from 'lucide-react';

const DESCRIPTIONS: Record<string, string> = {
  markets: 'Price shocks propagate fast; recovery depends on supply normalization',
  crop_production: 'Crop failures hit in one season; soil/seed recovery takes multiple cycles',
  nutrition: 'Malnutrition damage is fast; stunting in children is largely irreversible',
  research: 'Institutional degradation is gradual; rebuilding research capacity takes years',
  post_harvest: 'Infrastructure damage is fast; rebuilding storage/logistics is moderate',
  environment: 'Damage is cumulative; ecosystem recovery is the slowest of all sectors',
  animal_systems: 'Disease/herd loss is rapid; restocking takes multiple breeding cycles',
  finance: 'Financial stress propagates quickly; recovery is relatively fast with policy',
};

const DEFAULTS: Record<string, { rho_up: number; rho_down: number }> = {
  markets: { rho_up: 0.50, rho_down: 0.20 },
  crop_production: { rho_up: 0.35, rho_down: 0.12 },
  nutrition: { rho_up: 0.30, rho_down: 0.10 },
  research: { rho_up: 0.20, rho_down: 0.08 },
  post_harvest: { rho_up: 0.40, rho_down: 0.15 },
  environment: { rho_up: 0.25, rho_down: 0.06 },
  animal_systems: { rho_up: 0.35, rho_down: 0.12 },
  finance: { rho_up: 0.45, rho_down: 0.25 },
};

interface Props {
  onConfigSaved?: () => void;
}

export function PersistenceConfigPanel({ onConfigSaved }: Props) {
  const [configs, setConfigs] = useState<PersistenceConfig[]>([]);
  const [edited, setEdited] = useState<Record<string, { rho_up: number; rho_down: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assessmentAPI.getPersistenceConfigs();
      setConfigs(data);
      const edits: Record<string, { rho_up: number; rho_down: number }> = {};
      for (const c of data) {
        edits[c.component] = { rho_up: Number(c.rho_up), rho_down: Number(c.rho_down) };
      }
      setEdited(edits);
    } catch {
      setError('Failed to load persistence config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) fetchConfigs();
  }, [expanded, fetchConfigs]);

  const isDirty = configs.some((c) => {
    const e = edited[c.component];
    if (!e) return false;
    return Math.abs(e.rho_up - Number(c.rho_up)) > 0.001 || Math.abs(e.rho_down - Number(c.rho_down)) > 0.001;
  });

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    // Client-side validation
    for (const [comp, vals] of Object.entries(edited)) {
      if (vals.rho_up <= 0 || vals.rho_up > 1) {
        setError(`${comp}: Damage speed must be between 0 and 1`);
        return;
      }
      if (vals.rho_down <= 0 || vals.rho_down > 1) {
        setError(`${comp}: Recovery speed must be between 0 and 1`);
        return;
      }
      if (vals.rho_down >= vals.rho_up) {
        setError(`${comp}: Recovery speed must be lower than damage speed`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = Object.entries(edited).map(([component, vals]) => ({
        component,
        rho_up: vals.rho_up,
        rho_down: vals.rho_down,
      }));
      const result = await assessmentAPI.updatePersistenceConfigs(payload);
      setSuccess(`Saved. ${result.recalculated_assessments} assessment(s) recalculated with new parameters.`);
      await fetchConfigs();
      onConfigSaved?.();
      setTimeout(() => setSuccess(null), 8000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors;
      setError(msg ? JSON.stringify(msg) : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const reset: Record<string, { rho_up: number; rho_down: number }> = {};
    for (const c of configs) {
      const d = DEFAULTS[c.component] || { rho_up: 0.40, rho_down: 0.15 };
      reset[c.component] = { ...d };
    }
    setEdited(reset);
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-gray-500" />
            Cumulative Stress Parameters
          </CardTitle>
          {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
        <p className="text-xs text-gray-500 font-normal mt-1">
          Control how fast each food system component responds to stress changes. Damage is always faster than recovery.
        </p>
      </CardHeader>

      {expanded && (
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Saving will recalculate cumulative stress for <strong>all historical assessments</strong>. This ensures consistency but may take a moment.</span>
              </div>

              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {success}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Damage Speed (rho up)</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Recovery Speed (rho down)</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Ratio</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {configs.map((c) => {
                      const e = edited[c.component] || { rho_up: Number(c.rho_up), rho_down: Number(c.rho_down) };
                      const ratio = e.rho_down > 0 ? (e.rho_up / e.rho_down).toFixed(1) : '-';
                      const isModified =
                        Math.abs(e.rho_up - Number(c.rho_up)) > 0.001 ||
                        Math.abs(e.rho_down - Number(c.rho_down)) > 0.001;

                      return (
                        <tr key={c.component} className={isModified ? 'bg-blue-50/50' : ''}>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {c.component_display}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0.01}
                              max={1}
                              step={0.01}
                              value={e.rho_up}
                              onChange={(ev) => setEdited((prev) => ({
                                ...prev,
                                [c.component]: { ...prev[c.component], rho_up: Number(ev.target.value) },
                              }))}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0.01}
                              max={1}
                              step={0.01}
                              value={e.rho_down}
                              onChange={(ev) => setEdited((prev) => ({
                                ...prev,
                                [c.component]: { ...prev[c.component], rho_down: Number(ev.target.value) },
                              }))}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-500">
                            {ratio}x
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {DESCRIPTIONS[c.component] || ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[var(--rw-blue)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? 'Recalculating...' : 'Save & Recalculate'}
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                <strong>Damage speed</strong> controls how fast cumulative stress rises when conditions worsen.
                <strong> Recovery speed</strong> controls how fast it falls when conditions improve.
                The ratio shows how many times faster damage occurs versus recovery.
                Higher ratios mean more persistent damage.
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
