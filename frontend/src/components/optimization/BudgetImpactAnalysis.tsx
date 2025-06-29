'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Settings,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Lightbulb,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { 
  analysisAPI, 
  BudgetSensitivityAnalysis,
  BudgetRecommendationResult
} from '@/lib/api';

// Budget Impact Analysis Configuration Interface
interface BudgetImpactConfig {
  configured: boolean;
  baseBudget?: number;
  budgetVariations: number[];
  method: string;
  scenario: string;
  constraints: {
    minAllocation: number;
    maxAllocation: number;
    transitionLimit: number;
  };
}

// Efficiency Curve Result Interface
interface EfficiencyCurveResult {
  fsfvi: number;
  efficiency_per_million: number;
  error?: string;
}

interface SessionInfo {
  country: string;
  fiscal_year: number;
  total_budget: number;
  currency: string;
}

interface OptimizationResults {
  budgetSensitivity?: BudgetSensitivityAnalysis;
}

interface BudgetImpactAnalysisProps {
  sessionId: string;
  sessionInfo: SessionInfo | null;
  activeResultsView: string;
  setActiveResultsView: (view: string) => void;
  analysisInProgress: Record<string, boolean>;
  optimizationResults: OptimizationResults;
  setOptimizationResults: (updater: (prev: OptimizationResults) => OptimizationResults) => void;
  setError: (error: string | null) => void;
  runAnalysis: (toolId: string, analysisFunction: () => Promise<unknown>) => Promise<void>;
}

// Simple Tooltip Component
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2 w-80">
          <div className="absolute top-2 -left-1 w-2 h-2 bg-gray-900 rotate-45"></div>
          {content}
        </div>
      )}
    </div>
  );
};

export default function BudgetImpactAnalysis({
  sessionId,
  sessionInfo,
  activeResultsView,
  setActiveResultsView,
  analysisInProgress,
  optimizationResults,
  setOptimizationResults,
  setError,
  runAnalysis
}: BudgetImpactAnalysisProps) {
  
  // Budget Impact Analysis Configuration State
  const [showBudgetImpactConfig, setShowBudgetImpactConfig] = useState(false);
  const [budgetImpactConfig, setBudgetImpactConfig] = useState<BudgetImpactConfig>({
    configured: false,
    budgetVariations: [0, 0.1, 0.2, 0.3, 0.5], // Default variations - users can customize
    method: 'hybrid',
    scenario: 'normal_operations',
    constraints: {
      minAllocation: 1,
      maxAllocation: 40,
      transitionLimit: 30
    }
  });

  const getToken = () => localStorage.getItem('auth_token') || '';

  // Budget Sensitivity Analysis Function
  const runBudgetSensitivity = async () => {
    if (!budgetImpactConfig.configured) {
      setShowBudgetImpactConfig(true);
      setError('Please configure budget impact analysis settings first.');
      return;
    }

    await runAnalysis('budget-sensitivity', async () => {
      const token = getToken();
      const baseBudget = budgetImpactConfig.baseBudget || sessionInfo?.total_budget || 2900;
      const variations = budgetImpactConfig.budgetVariations;
      
      const result = await analysisAPI.budgetSensitivityAnalysis(
        sessionId,
        token,
        baseBudget,
        variations,
        budgetImpactConfig.method,
        budgetImpactConfig.scenario,
        budgetImpactConfig.constraints
      );
      
      // Extract the budget sensitivity data from the nested response structure
      const budgetSensitivityData = result.budget_sensitivity || result;
      setOptimizationResults(prev => ({ ...prev, budgetSensitivity: budgetSensitivityData }));
      return result;
    });
  };

  // Budget variation helper functions
  const addBudgetVariation = () => {
    if (budgetImpactConfig.budgetVariations.length < 10) {
      setBudgetImpactConfig(prev => ({
        ...prev,
        budgetVariations: [...prev.budgetVariations, 0]
      }));
    }
  };

  const removeBudgetVariation = (index: number) => {
    if (budgetImpactConfig.budgetVariations.length > 1) {
      setBudgetImpactConfig(prev => ({
        ...prev,
        budgetVariations: prev.budgetVariations.filter((_, i) => i !== index)
      }));
    }
  };

  const updateBudgetVariation = (index: number, value: number) => {
    setBudgetImpactConfig(prev => ({
      ...prev,
      budgetVariations: prev.budgetVariations.map((variation, i) => 
        i === index ? value / 100 : variation // Convert percentage to decimal
      )
    }));
  };

  const setBudgetVariationPreset = (preset: 'conservative' | 'moderate' | 'aggressive' | 'comprehensive') => {
    let variations: number[] = [];
    
    switch (preset) {
      case 'conservative':
        variations = [0, 0.05, 0.1, 0.15]; // 0%, 5%, 10%, 15%
        break;
      case 'moderate':
        variations = [0, 0.1, 0.2, 0.3, 0.5]; // 0%, 10%, 20%, 30%, 50%
        break;
      case 'aggressive':
        variations = [0, 0.2, 0.5, 0.75, 1.0]; // 0%, 20%, 50%, 75%, 100%
        break;
      case 'comprehensive':
        variations = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.75, 1.0]; // 0% to 100% comprehensive
        break;
    }
    
    setBudgetImpactConfig(prev => ({
      ...prev,
      budgetVariations: variations
    }));
  };

  const handleRunAnalysis = () => {
    setActiveResultsView('budget-sensitivity');
    runBudgetSensitivity();
  };

  // Process efficiency curves data
  const processEfficiencyCurves = (curves: Record<string, EfficiencyCurveResult>): Array<{
    variation: string;
    variationPercent: number;
    fsfvi: number;
    efficiency: number;
    hasError: boolean;
    error?: string;
  }> => {
    return Object.entries(curves).map(([variation, data]) => ({
      variation,
      variationPercent: parseFloat(variation) * 100,
      fsfvi: data.fsfvi,
      efficiency: data.efficiency_per_million,
      hasError: !!data.error,
      error: data.error
    })).sort((a, b) => a.variationPercent - b.variationPercent);
  };

  return (
    <>
      {/* Sidebar Section */}
      <div className={`p-3 rounded-lg border ${activeResultsView === 'budget-sensitivity' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h6 className="text-sm font-medium">Budget Impact Analysis</h6>
          <div className="flex items-center space-x-1">
            {optimizationResults.budgetSensitivity && <CheckCircle className="w-3 h-3 text-green-600" />}
            {budgetImpactConfig.configured && <CheckCircle className="w-3 h-3 text-blue-600" />}
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-2">See how budget changes affect performance</p>
        
        {/* Configuration Status */}
        {!budgetImpactConfig.configured && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p className="text-yellow-800 font-medium">Configuration Required</p>
            <p className="text-yellow-700">Set budget variations first</p>
          </div>
        )}
        
        {budgetImpactConfig.configured && (
          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <p className="text-green-800 font-medium flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready to Run
            </p>
            <p className="text-green-700">
              {budgetImpactConfig.budgetVariations.length} variation{budgetImpactConfig.budgetVariations.length !== 1 ? 's' : ''} ({budgetImpactConfig.budgetVariations.map(v => `${(v * 100).toFixed(0)}%`).join(', ')}), {budgetImpactConfig.method} method
            </p>
          </div>
        )}
        
        <div className="flex space-x-1">
          {!budgetImpactConfig.configured ? (
            <Button
              onClick={() => {
                // Pre-fill base budget from session info when opening config
                setBudgetImpactConfig(prev => ({
                  ...prev,
                  baseBudget: sessionInfo?.total_budget || prev.baseBudget
                }));
                setShowBudgetImpactConfig(true);
              }}
              className="flex-1 text-xs"
              variant="outline"
              size="sm"
            >
              <Settings className="w-3 h-3 mr-1" />
              Configure
            </Button>
          ) : (
            <>
              <Button
                onClick={handleRunAnalysis}
                disabled={analysisInProgress['budget-sensitivity']}
                className="flex-1 text-xs"
                variant="outline"
                size="sm"
              >
                {analysisInProgress['budget-sensitivity'] ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-3 h-3 mr-1" />
                    Run Analysis
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  // Pre-fill base budget when reconfiguring
                  setBudgetImpactConfig(prev => ({
                    ...prev,
                    baseBudget: sessionInfo?.total_budget || prev.baseBudget
                  }));
                  setShowBudgetImpactConfig(true);
                }}
                className="text-xs"
                variant="ghost"
                size="sm"
              >
                <Settings className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      {showBudgetImpactConfig && (
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span>Budget Impact Analysis Configuration</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowBudgetImpactConfig(false)}>✕</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Budget Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Budget (millions)</label>
                  <input
                    type="number"
                    value={budgetImpactConfig.baseBudget || sessionInfo?.total_budget || ''}
                    onChange={(e) => setBudgetImpactConfig(prev => ({ 
                      ...prev, 
                      baseBudget: parseFloat(e.target.value) || undefined 
                    }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., 2900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Method</label>
                  <select
                    value={budgetImpactConfig.method}
                    onChange={(e) => setBudgetImpactConfig(prev => ({ ...prev, method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="hybrid">Hybrid (Recommended)</option>
                    <option value="expert">Expert Consensus</option>
                    <option value="network">Network Analysis</option>
                    <option value="financial">Financial Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Budget Variations Configuration */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Budget Variations</h4>
                <Button
                  onClick={addBudgetVariation}
                  disabled={budgetImpactConfig.budgetVariations.length >= 10}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  + Add Variation
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Configure up to 10 budget percentage changes to analyze (e.g., 0% = maintain, 10% = increase by 10%)
              </p>
              
              {/* Preset Buttons */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Quick Presets:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setBudgetVariationPreset('conservative')}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Conservative (0%, 5%, 10%, 15%)
                  </Button>
                  <Button
                    onClick={() => setBudgetVariationPreset('moderate')}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Moderate (0%, 10%, 20%, 30%, 50%)
                  </Button>
                  <Button
                    onClick={() => setBudgetVariationPreset('aggressive')}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Aggressive (0%, 20%, 50%, 75%, 100%)
                  </Button>
                  <Button
                    onClick={() => setBudgetVariationPreset('comprehensive')}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Comprehensive (10 variations)
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {budgetImpactConfig.budgetVariations.map((variation, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700 min-w-[60px]">
                          Variation {index + 1}:
                        </label>
                        <input
                          type="number"
                          min="-50"
                          max="200"
                          step="1"
                          value={(variation * 100).toFixed(0)}
                          onChange={(e) => updateBudgetVariation(index, parseFloat(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600">%</span>
                        <span className="text-xs text-gray-500 ml-2">
                          = ${((budgetImpactConfig.baseBudget || sessionInfo?.total_budget || 2900) * (1 + variation)).toFixed(1)}M
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeBudgetVariation(index)}
                      disabled={budgetImpactConfig.budgetVariations.length <= 1}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 px-2"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              
              {budgetImpactConfig.budgetVariations.length >= 10 && (
                <p className="text-xs text-amber-600 mt-2">
                  Maximum of 10 budget variations reached
                </p>
              )}
              
              {budgetImpactConfig.budgetVariations.length === 1 && (
                <p className="text-xs text-blue-600 mt-2">
                  At least one budget variation is required
                </p>
              )}
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setShowBudgetImpactConfig(false)}>Cancel</Button>
              <Button 
                onClick={() => {
                  // Set configuration as completed
                  setBudgetImpactConfig(prev => ({ ...prev, configured: true }));
                  setShowBudgetImpactConfig(false);
                  // Automatically run analysis after configuration
                  setTimeout(() => handleRunAnalysis(), 500);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Configure & Run Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {optimizationResults.budgetSensitivity && activeResultsView === 'budget-sensitivity' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-green-600" />
                <span>Budget Impact Analysis Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Status indicator */}
              {optimizationResults.budgetSensitivity.status && (
                <div className={`mb-4 p-3 rounded-lg ${
                  optimizationResults.budgetSensitivity.status === 'success' 
                    ? 'bg-green-50 border border-green-200' 
                    : optimizationResults.budgetSensitivity.status === 'partial_success'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    optimizationResults.budgetSensitivity.status === 'success' 
                      ? 'text-green-800' 
                      : optimizationResults.budgetSensitivity.status === 'partial_success'
                      ? 'text-yellow-800'
                      : 'text-red-800'
                  }`}>
                    {optimizationResults.budgetSensitivity.status === 'success' 
                      ? '✓ Analysis completed successfully' 
                      : optimizationResults.budgetSensitivity.status === 'partial_success'
                      ? '⚠ Partial results available'
                      : '✗ Analysis failed'}
                  </p>
                  {optimizationResults.budgetSensitivity.warning && (
                    <p className="text-sm text-yellow-700 mt-1">
                      {optimizationResults.budgetSensitivity.warning}
                    </p>
                  )}
                  {optimizationResults.budgetSensitivity.error && (
                    <p className="text-sm text-red-700 mt-1">
                      {optimizationResults.budgetSensitivity.error}
                    </p>
                  )}
                </div>
              )}
              
              {/* Executive Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Base Budget</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${optimizationResults.budgetSensitivity.base_budget?.toFixed(1) || 0}M
                  </p>
                </div>
                <div className="text-center p-4 bg-teal-50 rounded-lg">
                  <p className="text-sm text-teal-600">Variations Tested</p>
                  <p className="text-2xl font-bold text-teal-900">
                    {optimizationResults.budgetSensitivity.total_variations_count || optimizationResults.budgetSensitivity.budget_variations?.length || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Successful Optimizations</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {optimizationResults.budgetSensitivity.successful_variations_count || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-600">Analysis Method</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {optimizationResults.budgetSensitivity.method?.charAt(0).toUpperCase() + optimizationResults.budgetSensitivity.method?.slice(1) || 'Hybrid'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Budget Variation Analysis */}
          {optimizationResults.budgetSensitivity.budget_analysis && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Budget Variation Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Budget Change</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Total Budget</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Optimal FSFVI</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Improvement</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Efficiency</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(optimizationResults.budgetSensitivity.budget_analysis).map(([variation, result]) => (
                        <tr key={variation} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              parseFloat(variation) > 0 
                                ? 'bg-green-100 text-green-800' 
                                : parseFloat(variation) < 0 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {parseFloat(variation) > 0 ? '+' : ''}{(parseFloat(variation) * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            ${result.budget?.toFixed(1) || 0}M
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {result.error ? (
                              <span className="text-red-600">—</span>
                            ) : (
                              result.optimal_fsfvi?.toFixed(4) || '—'
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {result.error ? (
                              <span className="text-red-600">—</span>
                            ) : (
                              <span className={`font-medium ${
                                (result.improvement_percent || 0) > 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {result.improvement_percent?.toFixed(1) || 0}%
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-sm">
                            {result.error ? (
                              <span className="text-red-600">—</span>
                            ) : (
                              result.efficiency_per_million?.toFixed(3) || '—'
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {result.error ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Success
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Efficiency Curves Visualization */}
          {optimizationResults.budgetSensitivity.efficiency_curves && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  <span>Budget Efficiency Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-1">Efficiency Curve Analysis</h4>
                  <p className="text-sm text-blue-700">
                    Shows how efficiently each budget level converts investment into FSFVI reduction (vulnerability improvement).
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Budget Variation</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">FSFVI Score</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Efficiency per Million</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Efficiency Rating</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processEfficiencyCurves(optimizationResults.budgetSensitivity.efficiency_curves).map((curve) => (
                        <tr key={curve.variation} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              curve.variationPercent > 0 
                                ? 'bg-green-100 text-green-800' 
                                : curve.variationPercent < 0 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {curve.variationPercent > 0 ? '+' : ''}{curve.variationPercent.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {curve.hasError ? (
                              <span className="text-red-600">—</span>
                            ) : (
                              curve.fsfvi.toFixed(4)
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {curve.hasError ? (
                              <span className="text-red-600">—</span>
                            ) : (
                              curve.efficiency.toFixed(3)
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {curve.hasError ? (
                              <span className="text-red-600">—</span>
                            ) : (
                              <span className={`font-medium ${
                                curve.efficiency > 0.005 ? 'text-green-600' : 
                                curve.efficiency > 0.002 ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {curve.efficiency > 0.005 ? 'High' : 
                                 curve.efficiency > 0.002 ? 'Medium' : 'Low'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {curve.hasError ? (
                              <Tooltip content={curve.error || 'Analysis failed'}>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-help">
                                  Error
                                </span>
                              </Tooltip>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Recommendations */}
          {optimizationResults.budgetSensitivity.optimal_budget_recommendations && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-orange-600" />
                  <span>Budget Optimization Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Key Findings */}
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-1">Balanced Scoring System</h4>
                    <p className="text-sm text-orange-700">
                      Rankings now use a balanced score that combines impact and efficiency to recommend options that provide both meaningful improvement and good value for money.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(optimizationResults.budgetSensitivity.optimal_budget_recommendations)
                      .filter(([, rec]: [string, BudgetRecommendationResult]) => !rec.error && rec.improvement_percent > 0)
                      .sort(([, a]: [string, BudgetRecommendationResult], [, b]: [string, BudgetRecommendationResult]) => {
                        // Calculate balanced score: 60% improvement impact + 40% cost efficiency
                        // Normalize efficiency to be comparable with improvement percentages
                        const effA = a.efficiency_per_million || 0;
                        const effB = b.efficiency_per_million || 0;
                        const balancedA = (a.improvement_percent || 0) * 0.6 + (effA / 10) * 0.4; // Divide by 10 to normalize efficiency scale
                        const balancedB = (b.improvement_percent || 0) * 0.6 + (effB / 10) * 0.4;
                        return balancedB - balancedA;
                      })
                      .slice(0, 3)
                      .map(([variation, rec]: [string, BudgetRecommendationResult], index) => {
                        // Calculate balanced score for display
                        const efficiency = rec.efficiency_per_million || 0;
                        const balancedScore = (rec.improvement_percent || 0) * 0.6 + (efficiency / 10) * 0.4;
                        
                        return (
                          <div key={variation} className={`p-4 rounded-lg border ${
                            index === 0 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-medium ${
                                index === 0 ? 'text-green-800' : 'text-blue-800'
                              }`}>
                                {parseFloat(variation) > 0 ? 'Increase' : parseFloat(variation) < 0 ? 'Decrease' : 'Maintain'} Budget
                              </span>
                              {index === 0 && (
                                <Tooltip content="Best balanced option considers both impact and cost-effectiveness together. This provides a more comprehensive recommendation than focusing on impact alone, ensuring good value for taxpayer money.">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-help">
                                    Best Balanced Option
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-bold text-gray-900">
                                ${rec.recommended_budget?.toFixed(1) || 0}M
                              </p>
                              <p className="text-sm text-gray-600">
                                {parseFloat(variation) > 0 ? '+' : ''}{(parseFloat(variation) * 100).toFixed(0)}% change
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {rec.improvement_percent?.toFixed(1) || 0}% improvement
                              </p>
                              <p className="text-xs text-gray-500">
                                Efficiency: {rec.efficiency_per_million?.toFixed(3) || 0} per $M
                              </p>
                              <div className="text-xs text-blue-600 mt-1 flex items-center">
                                <span>Balanced Score: {balancedScore.toFixed(1)} (60% impact + 40% efficiency)</span>
                                <Tooltip content="This combines impact with cost-effectiveness to identify the best overall option, balancing maximum improvement with efficient resource use. The score prioritizes improvement while also considering efficiency.">
                                  <HelpCircle className="w-3 h-3 ml-1 text-blue-600" />
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
} 