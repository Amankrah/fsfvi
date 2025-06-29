'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Settings,
  CheckCircle,
  Play
} from 'lucide-react';
import { 
  analysisAPI, 
  BudgetSensitivityAnalysis
} from '@/lib/api';

// Budget Impact Analysis Configuration Interface
export interface BudgetImpactConfig {
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
  budgetImpactConfig: BudgetImpactConfig;
  setBudgetImpactConfig: (updater: (prev: BudgetImpactConfig) => BudgetImpactConfig) => void;
  onOpenConfiguration: () => void;
}

export default function BudgetImpactAnalysis({
  sessionId,
  sessionInfo,
  activeResultsView,
  setActiveResultsView,
  analysisInProgress,
  optimizationResults,
  setOptimizationResults,
  setError,
  runAnalysis,
  budgetImpactConfig,
  setBudgetImpactConfig,
  onOpenConfiguration
}: BudgetImpactAnalysisProps) {
  
  const getToken = () => localStorage.getItem('auth_token') || '';

  // Budget Sensitivity Analysis Function
  const runBudgetSensitivity = async () => {
    if (!budgetImpactConfig.configured) {
      setError('Please configure budget impact analysis settings first.');
      onOpenConfiguration();
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

  const handleRunAnalysis = () => {
    setActiveResultsView('budget-sensitivity');
    runBudgetSensitivity();
  };

  const handleConfigure = () => {
    // Pre-fill base budget from session info when opening config
    setBudgetImpactConfig(prev => ({
      ...prev,
      baseBudget: sessionInfo?.total_budget || prev.baseBudget
    }));
    onOpenConfiguration();
  };

  return (
    // Sidebar Section Only
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
      
      {/* Separate Configure and Run Buttons */}
      <div className="space-y-2">
        <Button
          onClick={handleConfigure}
          className="w-full text-xs"
          variant="outline"
          size="sm"
        >
          <Settings className="w-3 h-3 mr-1" />
          Configure Settings
        </Button>
        
        {budgetImpactConfig.configured && (
          <Button
            onClick={handleRunAnalysis}
            disabled={analysisInProgress['budget-sensitivity']}
            className="w-full text-xs"
            variant="default"
            size="sm"
          >
            {analysisInProgress['budget-sensitivity'] ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Run Analysis
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
} 