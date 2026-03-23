'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { indicatorAPI, type Indicator, type IndicatorData, type IndicatorDataInput } from '@/lib/api/indicatorApi';
import { assessmentAPI } from '@/lib/api/assessmentApi';
import {
  BarChart3,
  Save,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
  Plus,
} from 'lucide-react';

const COMPONENT_ORDER = [
  'markets',
  'crop_production',
  'nutrition',
  'research',
  'post_harvest',
  'environment',
  'animal_systems',
  'finance',
];

const COMPONENT_COLORS: Record<string, string> = {
  markets: 'bg-blue-50 border-blue-200',
  crop_production: 'bg-green-50 border-green-200',
  nutrition: 'bg-orange-50 border-orange-200',
  research: 'bg-purple-50 border-purple-200',
  post_harvest: 'bg-yellow-50 border-yellow-200',
  environment: 'bg-teal-50 border-teal-200',
  animal_systems: 'bg-pink-50 border-pink-200',
  finance: 'bg-indigo-50 border-indigo-200',
};

interface IndicatorRowData extends Indicator {
  gross_lcu_bn: number;
  weighted_lcu_bn: number;
  observed_value: number | null;
  benchmark_value: number | null;
  hasData: boolean;
}

export function IndicatorDataEntry() {
  // State
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorData, setIndicatorData] = useState<Record<string, IndicatorData>>({});
  const [editedData, setEditedData] = useState<Record<string, Partial<IndicatorDataInput>>>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAssessment, setRunningAssessment] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set(COMPONENT_ORDER));
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [copyFromYear, setCopyFromYear] = useState<number | null>(null);

  // Load indicators and available years on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [indList, years] = await Promise.all([
          indicatorAPI.listIndicators(),
          indicatorAPI.getAvailableDataYears(),
        ]);
        setIndicators(indList);
        setAvailableYears(years);

        // Default to latest year with data
        if (years.length > 0) {
          setSelectedYear(years[0]);
        }
      } catch (err) {
        console.error('[IndicatorDataEntry] Failed to load initial data:', err);
        setError('Failed to load indicators');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load indicator data when year changes
  useEffect(() => {
    if (!selectedYear) return;

    const loadYearData = async () => {
      setLoading(true);
      try {
        const data = await indicatorAPI.getIndicatorData(selectedYear);
        const dataMap: Record<string, IndicatorData> = {};
        for (const d of data) {
          dataMap[d.indicator_id] = d;
        }
        setIndicatorData(dataMap);
        setEditedData({});
        setSaveSuccess(false);
      } catch (err) {
        console.error('[IndicatorDataEntry] Failed to load year data:', err);
        // Not an error - just no data for this year
        setIndicatorData({});
      } finally {
        setLoading(false);
      }
    };
    loadYearData();
  }, [selectedYear]);

  // Group indicators by component
  const groupedIndicators = useMemo(() => {
    const groups: Record<string, IndicatorRowData[]> = {};

    for (const comp of COMPONENT_ORDER) {
      groups[comp] = [];
    }

    for (const ind of indicators) {
      const data = indicatorData[ind.id];
      const edited = editedData[ind.id];

      const row: IndicatorRowData = {
        ...ind,
        gross_lcu_bn: parseFloat(String(edited?.gross_lcu_bn ?? data?.gross_lcu_bn ?? 0)) || 0,
        weighted_lcu_bn: parseFloat(String(edited?.weighted_lcu_bn ?? data?.weighted_lcu_bn ?? 0)) || 0,
        observed_value: edited?.observed_value ?? data?.observed_value ?? null,
        benchmark_value: edited?.benchmark_value ?? data?.benchmark_value ?? null,
        hasData: !!data,
      };

      if (groups[ind.component]) {
        groups[ind.component].push(row);
      }
    }

    return groups;
  }, [indicators, indicatorData, editedData]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalWeighted = 0;
    let indicatorsWithData = 0;

    for (const ind of indicators) {
      const data = indicatorData[ind.id];
      const edited = editedData[ind.id];

      const gross = parseFloat(String(edited?.gross_lcu_bn ?? data?.gross_lcu_bn ?? 0)) || 0;
      const weighted = parseFloat(String(edited?.weighted_lcu_bn ?? data?.weighted_lcu_bn ?? 0)) || 0;

      totalGross += gross;
      totalWeighted += weighted;
      if (data || edited) indicatorsWithData++;
    }

    return { totalGross, totalWeighted, indicatorsWithData, totalIndicators: indicators.length };
  }, [indicators, indicatorData, editedData]);

  // Handle field change
  const handleFieldChange = (indicatorId: string, field: keyof IndicatorDataInput, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setEditedData((prev) => ({
      ...prev,
      [indicatorId]: {
        ...prev[indicatorId],
        indicator_id: indicatorId,
        [field]: numValue,
      },
    }));
    setSaveSuccess(false);
  };

  // Toggle component expansion
  const toggleComponent = (component: string) => {
    setExpandedComponents((prev) => {
      const next = new Set(prev);
      if (next.has(component)) {
        next.delete(component);
      } else {
        next.add(component);
      }
      return next;
    });
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Prepare data for bulk save
      const indicatorsToSave: IndicatorDataInput[] = [];

      for (const ind of indicators) {
        const data = indicatorData[ind.id];
        const edited = editedData[ind.id];

        // Include if has existing data or has edits
        if (data || edited) {
          indicatorsToSave.push({
            indicator_id: ind.id,
            gross_lcu_bn: edited?.gross_lcu_bn ?? data?.gross_lcu_bn ?? 0,
            weighted_lcu_bn: edited?.weighted_lcu_bn ?? data?.weighted_lcu_bn ?? 0,
            observed_value: edited?.observed_value ?? data?.observed_value ?? null,
            benchmark_value: edited?.benchmark_value ?? data?.benchmark_value ?? null,
          });
        }
      }

      if (indicatorsToSave.length === 0) {
        setError('No indicator data to save');
        return;
      }

      const result = await indicatorAPI.bulkSaveIndicatorData(selectedYear, indicatorsToSave);

      if (result.errors.length > 0) {
        setError(`Saved ${result.created + result.updated} records, but ${result.errors.length} errors occurred`);
      } else {
        setSaveSuccess(true);
        // Reload data
        const data = await indicatorAPI.getIndicatorData(selectedYear);
        const dataMap: Record<string, IndicatorData> = {};
        for (const d of data) {
          dataMap[d.indicator_id] = d;
        }
        setIndicatorData(dataMap);
        setEditedData({});
      }
    } catch (err) {
      console.error('[IndicatorDataEntry] Save failed:', err);
      setError('Failed to save indicator data');
    } finally {
      setSaving(false);
    }
  };

  // Create new fiscal year
  const handleCreateNewYear = async () => {
    if (availableYears.includes(newYear)) {
      setError(`Fiscal year ${newYear} already has data`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (copyFromYear) {
        await indicatorAPI.copyFiscalYearData(copyFromYear, newYear);
      }
      // Refresh available years and switch to new year
      const years = await indicatorAPI.getAvailableDataYears();
      setAvailableYears(years);
      setSelectedYear(newYear);
      setShowCreateNew(false);
      setCopyFromYear(null);
    } catch (err: unknown) {
      console.error('[IndicatorDataEntry] Create year failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new fiscal year');
    } finally {
      setLoading(false);
    }
  };

  // Run assessment
  const handleRunAssessment = async () => {
    setRunningAssessment(true);
    setError(null);

    try {
      await assessmentAPI.runForYear(selectedYear, `FY${selectedYear} Assessment`, 'hybrid', 'normal_operations');
      setSaveSuccess(true);
    } catch (err: unknown) {
      console.error('[IndicatorDataEntry] Assessment failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to run assessment');
    } finally {
      setRunningAssessment(false);
    }
  };

  // Check if there are unsaved changes
  const hasChanges = Object.keys(editedData).length > 0;

  if (loading && indicators.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--rw-blue)]" />
          <span className="ml-3 text-gray-600">Loading indicators...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-[var(--rw-blue)]" />
            <span>Indicator Data Entry</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Year Selection */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label
                htmlFor="indicator-entry-fiscal-year"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fiscal Year
              </label>
              <select
                id="indicator-entry-fiscal-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="h-10 rounded-lg border-2 border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    FY {year}/{year + 1}
                  </option>
                ))}
                {!availableYears.includes(selectedYear) && (
                  <option value={selectedYear}>
                    FY {selectedYear}/{selectedYear + 1} (New)
                  </option>
                )}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateNew(!showCreateNew)}
              className="mt-6"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Year
            </Button>
          </div>

          {/* Create New Year Panel */}
          {showCreateNew && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Create New Fiscal Year</h4>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs text-blue-700 mb-1">New Year</label>
                  <Input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(parseInt(e.target.value))}
                    className="w-28"
                  />
                </div>
                <div>
                  <label
                    htmlFor="indicator-entry-copy-from-year"
                    className="block text-xs text-blue-700 mb-1"
                  >
                    Copy from (optional)
                  </label>
                  <select
                    id="indicator-entry-copy-from-year"
                    value={copyFromYear || ''}
                    onChange={(e) => setCopyFromYear(e.target.value ? parseInt(e.target.value) : null)}
                    className="h-10 rounded-lg border-2 border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)]"
                  >
                    <option value="">Start empty</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        FY {year}/{year + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <Button size="sm" onClick={handleCreateNewYear}>
                  <Copy className="h-4 w-4 mr-1" />
                  Create
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateNew(false);
                    setCopyFromYear(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Total Indicators</div>
              <div className="text-xl font-semibold text-gray-900">{totals.totalIndicators}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">With Data</div>
              <div className="text-xl font-semibold text-[var(--rw-blue)]">
                {totals.indicatorsWithData}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Total Gross Budget</div>
              <div className="text-xl font-semibold text-gray-900">
                {totals.totalGross.toFixed(2)} Bn
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Total Weighted Budget</div>
              <div className="text-xl font-semibold text-gray-900">
                {totals.totalWeighted.toFixed(2)} Bn
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-sm text-green-800">Data saved successfully!</span>
        </div>
      )}

      {/* Indicator Data by Component */}
      {COMPONENT_ORDER.map((component) => {
        const componentIndicators = groupedIndicators[component] || [];
        const isExpanded = expandedComponents.has(component);
        const componentDisplay = componentIndicators[0]?.component_display || component;

        const componentTotal = componentIndicators.reduce(
          (sum, ind) => sum + (ind.weighted_lcu_bn || 0),
          0
        );

        return (
          <Card key={component} className={`border ${COMPONENT_COLORS[component] || ''}`}>
            <CardHeader
              className="cursor-pointer py-3"
              onClick={() => toggleComponent(component)}
            >
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 mr-2 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 mr-2 text-gray-500" />
                  )}
                  <span>{componentDisplay}</span>
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({componentIndicators.length} indicators)
                  </span>
                </div>
                <span className="text-sm font-normal text-gray-600">
                  {componentTotal.toFixed(2)} Bn LCU
                </span>
              </CardTitle>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500">
                        <th className="pb-2 pr-2 font-medium w-12">Code</th>
                        <th className="pb-2 pr-2 font-medium">Indicator</th>
                        <th className="pb-2 pr-2 font-medium text-right w-28">Gross (Bn)</th>
                        <th className="pb-2 pr-2 font-medium text-right w-28">Weighted (Bn)</th>
                        <th className="pb-2 pr-2 font-medium text-right w-28">Observed</th>
                        <th className="pb-2 font-medium text-right w-28">Benchmark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {componentIndicators.map((ind) => (
                        <tr key={ind.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pr-2 text-gray-500">{ind.code}</td>
                          <td className="py-2 pr-2">
                            <div className="font-medium text-gray-900">{ind.name}</div>
                            {ind.unit && (
                              <div className="text-xs text-gray-500">{ind.unit}</div>
                            )}
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ind.gross_lcu_bn || ''}
                              onChange={(e) =>
                                handleFieldChange(ind.id, 'gross_lcu_bn', e.target.value)
                              }
                              className="text-right h-8 text-sm"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ind.weighted_lcu_bn || ''}
                              onChange={(e) =>
                                handleFieldChange(ind.id, 'weighted_lcu_bn', e.target.value)
                              }
                              className="text-right h-8 text-sm"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={ind.observed_value ?? ''}
                              onChange={(e) =>
                                handleFieldChange(ind.id, 'observed_value', e.target.value)
                              }
                              className="text-right h-8 text-sm"
                              placeholder="—"
                            />
                          </td>
                          <td className="py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={ind.benchmark_value ?? ''}
                              onChange={(e) =>
                                handleFieldChange(ind.id, 'benchmark_value', e.target.value)
                              }
                              className="text-right h-8 text-sm"
                              placeholder="—"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRunAssessment}
            disabled={runningAssessment || totals.indicatorsWithData === 0}
          >
            {runningAssessment ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Assessment
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setEditedData({})} disabled={!hasChanges}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Changes
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Data
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default IndicatorDataEntry;
