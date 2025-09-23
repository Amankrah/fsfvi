'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  Settings,
  Target,
  Calendar,
  CheckCircle,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { AnalysisNavigation } from '@/components/analysis/AnalysisNavigation';
import { 
  analysisAPI, 
  dataAPI,
  MultiYearPlan, 
  BudgetSensitivityAnalysis,
  ComponentOptimizationResult,
  BudgetStrategyConfig
} from '@/lib/api';

// Import dedicated optimization components
import OptimizationHeader from '@/components/optimization/OptimizationHeader';
import { OptimizationResults } from '@/components/optimization/OptimizationResults';
import { MultiYearResults } from '@/components/optimization/MultiYearResults';
import BudgetImpactAnalysis, { BudgetImpactConfig } from '@/components/optimization/BudgetImpactAnalysis';

// Enhanced TypeScript interfaces
interface OptimizationResult {
  success: boolean;
  original_fsfvi: number;
  optimal_fsfvi: number;
  optimal_allocations: number[];
  relative_improvement_percent: number;
  efficiency_gain_percent: number;
  total_reallocation_amount: number;
  reallocation_intensity_percent: number;
  budget_utilization_percent: number;
  iterations: number;
  solver: string;
  mathematical_compliance: boolean;
  constraints_applied: string[];
  component_analysis?: {
    components: ComponentOptimizationResult[];
    summary: {
      total_components: number;
      components_increased: number;
      components_decreased: number;
      largest_increase: number;
      largest_decrease: number;
      total_vulnerability_reduction: number;
      average_vulnerability_reduction_percent: number;
    };
    recommendations: string[];
  };
  [key: string]: unknown; // Index signature for compatibility
}

interface OptimizationConfig {
  configured: boolean;
  method: string;
  scenario: string;
  budgetChange: number;
  budgetChangePercent: number;
  constraints: {
    minAllocation: number;
    maxAllocation: number;
    transitionLimit: number;
  };
  optimizationMode: 'traditional' | 'new_budget';
  newBudgetAmount?: number;
  targetFsfvi?: number;
  targetYear?: number;
}

interface PlanningHorizon {
  startYear: number;
  endYear: number;
  annualNewBudget: number; // Changed from budgetGrowth to annual new budget amount in millions
  budgetStrategy: 'fixed_annual' | 'percentage_growth' | 'custom' | 'algorithm'; // New: Budget strategy type
  budgetGrowthRate?: number; // New: 5% annual growth
  customYearBudgets?: Record<number, number>; // New: Custom budgets for specific years
  customYearGrowthRates?: Record<number, number>; // New: Custom growth rates for specific years
  algorithmConfig?: { // New: Algorithm-based budget configuration
    economicCycleImpact: number;
    politicalPriorityShift: number;
    performanceBasedAdjustment: number;
    crisisResponseFactor: number;
    baselineGrowthRate: number;
  };
}

interface MultiYearConfig {
  configured: boolean;
  targetFsfvi?: number;
  targetYear?: number;
  priorityAreas: string[];
  riskTolerance: 'low' | 'medium' | 'high';
  implementationSpeed: 'gradual' | 'moderate' | 'aggressive';
  budgetStrategy: 'fixed_annual' | 'custom' | 'algorithm'; // New: Strategy selection
  economicAssumptions?: { // New: Economic context
    inflationRate: number;
    gdpGrowthRate: number;
    fiscalConstraints: 'low' | 'moderate' | 'high';
  };
  politicalContext?: { // New: Political context
    electionCycle: number;
    currentElectionYear: number;
    policyStability: 'stable' | 'volatile' | 'unstable';
  };
}

interface SessionInfo {
  country: string;
  fiscal_year: number;
  total_budget: number;
  currency: string;
}

interface OptimizationResults {
  basic?: OptimizationResult;
  multiYear?: MultiYearPlan;
  budgetSensitivity?: BudgetSensitivityAnalysis;
}

// Removed unused interfaces - using the ones from components

export default function AllocationOptimizationPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMultiYearConfig, setShowMultiYearConfig] = useState(false);
  const [showBudgetImpactConfig, setShowBudgetImpactConfig] = useState(false);
  
  // Results state
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResults>({});
  const [analysisInProgress, setAnalysisInProgress] = useState<Record<string, boolean>>({});
  const [activeResultsView, setActiveResultsView] = useState<string>('optimization');
  
  // Multi-year planning state
  const [planningHorizon, setPlanningHorizon] = useState<PlanningHorizon>({
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 5,
    annualNewBudget: 500, // Annual new budget amount in millions USD
    budgetStrategy: 'fixed_annual', // New: Budget strategy type
    budgetGrowthRate: 0.05, // New: 5% annual growth
    customYearBudgets: {}, // New: Custom budgets for specific years
    customYearGrowthRates: {}, // New: Custom growth rates for specific years
    algorithmConfig: { // New: Algorithm-based budget configuration
      economicCycleImpact: 0.15,
      politicalPriorityShift: 0.10,
      performanceBasedAdjustment: 0.20,
      crisisResponseFactor: 0.25,
      baselineGrowthRate: 0.03
    }
  });

  // Enhanced multi-year configuration state
  const [multiYearConfig, setMultiYearConfig] = useState<MultiYearConfig>({
    configured: false,
    priorityAreas: [],
    riskTolerance: 'medium',
    implementationSpeed: 'moderate',
    budgetStrategy: 'fixed_annual', // New: Strategy selection
    economicAssumptions: { // New: Economic context
      inflationRate: 0.03,
      gdpGrowthRate: 0.025,
      fiscalConstraints: 'moderate'
    },
    politicalContext: { // New: Political context
      electionCycle: 4,
      currentElectionYear: 2024,
      policyStability: 'stable'
    }
  });

  // Budget Impact Analysis configuration state
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

  // New budget optimization configuration state
  const [optimizationConfig] = useState<OptimizationConfig>({
    configured: false,
    method: 'hybrid',
    scenario: 'baseline',
    budgetChangePercent: 0,
    budgetChange: 0,
    constraints: {
      minAllocation: 0,
      maxAllocation: 100,
      transitionLimit: 50
    },
    optimizationMode: 'traditional' as 'traditional' | 'new_budget',
    newBudgetAmount: 0
  });

  const getToken = () => localStorage.getItem('auth_token') || '';

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      // FIRST: Get session details from Django to get the correct total budget
      const sessionDetails = await dataAPI.getSessionDetails(sessionId);
      
      // Extract correct session info with the ACTUAL total budget from Django
      setSessionInfo({
        country: sessionDetails.country_name || 'Kenya',
        fiscal_year: sessionDetails.fiscal_year || new Date().getFullYear(),
        total_budget: sessionDetails.total_budget || 2908.5, // Use actual total budget from Django
        currency: sessionDetails.currency || 'USD'
      });

      // SECOND: Auto-run basic optimization using the correct budget
      const result = await analysisAPI.optimizeAllocation(sessionId, token, 'hybrid', 0);
      
      // Set optimization results - Use the flattened structure at top level, not the nested optimization_results
      if (result && typeof result === 'object') {
        // Extract optimization data from the top level response
        const optimizationData = {
          success: result.success !== undefined ? result.success : true,
          original_fsfvi: result.original_fsfvi || 0,
          optimal_fsfvi: result.optimal_fsfvi || 0,
          relative_improvement_percent: result.relative_improvement_percent || 0,
          efficiency_gain_percent: result.efficiency_gain_percent || 0,
          total_reallocation_amount: result.total_reallocation_amount || 0,
          reallocation_intensity_percent: result.reallocation_intensity_percent || 0,
          budget_utilization_percent: result.budget_utilization_percent || 0,
          optimal_allocations: result.optimal_allocations || [],
          current_allocations: result.current_allocations || [],
          iterations: result.iterations || 0,
          solver: result.solver || 'unknown',
          mathematical_compliance: result.mathematical_compliance !== undefined ? result.mathematical_compliance : true,
          constraints_applied: result.constraints_applied || [],
          component_analysis: result.component_analysis || result.optimization_results?.component_analysis,
        };
        
        setOptimizationResults(prev => ({ ...prev, basic: optimizationData }));
        setActiveResultsView('optimization'); // Set active view to optimization
      } else {
        throw new Error('Invalid optimization response format');
      }
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to load optimization data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadInitialData();
    }
  }, [sessionId, loadInitialData]);

  // Analysis functions
  const runAnalysis = async (toolId: string, analysisFunction: () => Promise<unknown>) => {
    try {
      setAnalysisInProgress(prev => ({ ...prev, [toolId]: true }));
      setError(null);
      
      await analysisFunction();
      setActiveResultsView(toolId);
      
    } catch (error) {
      console.error(`${toolId} analysis failed:`, error);
      setError(`${toolId} analysis failed. Please try again.`);
    } finally {
      setAnalysisInProgress(prev => ({ ...prev, [toolId]: false }));
    }
  };

  const runBasicOptimization = async () => {
    await runAnalysis('optimization', async () => {
      const token = getToken();
      
      // Determine optimization mode and validate
      const mode = optimizationConfig.optimizationMode || 'traditional';
      
      // Validation for new budget optimization
      if (mode === 'new_budget') {
        if (!optimizationConfig.newBudgetAmount || optimizationConfig.newBudgetAmount <= 0) {
          throw new Error('New budget amount must be specified and greater than 0 for new budget optimization mode. Please configure the new budget amount in optimization settings.');
        }
      }
      
      const result = await analysisAPI.optimizeAllocation(
        sessionId, 
        token, 
        optimizationConfig.method || 'hybrid', 
        optimizationConfig.budgetChange || 0,
        {
          minAllocation: optimizationConfig.constraints.minAllocation || 1,
          maxAllocation: optimizationConfig.constraints.maxAllocation || 40,
          transitionLimit: optimizationConfig.constraints.transitionLimit || 30
        },
        mode,
        optimizationConfig.newBudgetAmount
      );
      
      // Debug logging - let's see what we got from backend
      console.log('runBasicOptimization received result keys:', Object.keys(result));
      console.log('runBasicOptimization received values:', {
        original_fsfvi: result.original_fsfvi,
        optimal_fsfvi: result.optimal_fsfvi,
        relative_improvement_percent: result.relative_improvement_percent,
        efficiency_gain_percent: result.efficiency_gain_percent,
        total_reallocation_amount: result.total_reallocation_amount
      });
      
      // Extract the flattened optimization data from the top level response
      const optimizationData = {
        success: result.success !== undefined ? result.success : true,
        original_fsfvi: result.original_fsfvi || 0,
        optimal_fsfvi: result.optimal_fsfvi || 0,
        relative_improvement_percent: result.relative_improvement_percent || 0,
        efficiency_gain_percent: result.efficiency_gain_percent || 0,
        total_reallocation_amount: result.total_reallocation_amount || 0,
        reallocation_intensity_percent: result.reallocation_intensity_percent || 0,
        budget_utilization_percent: result.budget_utilization_percent || 0,
        optimal_allocations: result.optimal_allocations || [],
        current_allocations: result.current_allocations || [],
        iterations: result.iterations || 0,
        solver: result.solver || 'unknown',
        mathematical_compliance: result.mathematical_compliance !== undefined ? result.mathematical_compliance : true,
        constraints_applied: result.constraints_applied || [],
        component_analysis: result.component_analysis || result.optimization_results?.component_analysis,
      };
      
      setOptimizationResults(prev => ({ ...prev, basic: optimizationData }));
      return optimizationData;
    });
  };

  // Enhanced multi-year planning with NEW BUDGET CUMULATIVE approach
  const runMultiYearPlan = async () => {
    // Check if multi-year configuration is complete
    if (!multiYearConfig.configured) {
      setShowMultiYearConfig(true);
      setError('Please configure multi-year planning settings first.');
      return;
    }

    await runAnalysis('multi-year', async () => {
      const token = getToken();
      
      // ENHANCED BUDGET STRATEGY: Send strategy configuration to backend
      let budgetConfiguration: Record<number, number> | BudgetStrategyConfig;
      
      // For algorithm strategy, send full configuration to backend
      if (planningHorizon.budgetStrategy === 'algorithm') {
        budgetConfiguration = {
          budgetStrategy: planningHorizon.budgetStrategy,
          startYear: planningHorizon.startYear,
          endYear: planningHorizon.endYear,
          baseBudget: planningHorizon.annualNewBudget || 500,
          algorithmConfig: {
            baselineGrowthRate: planningHorizon.algorithmConfig?.baselineGrowthRate || 0.03,
            economicCycleImpact: planningHorizon.algorithmConfig?.economicCycleImpact || 0.15,
            politicalPriorityShift: planningHorizon.algorithmConfig?.politicalPriorityShift || 0.10,
            performanceBasedAdjustment: planningHorizon.algorithmConfig?.performanceBasedAdjustment || 0.20,
            crisisResponseFactor: planningHorizon.algorithmConfig?.crisisResponseFactor || 0.25,
            economicAssumptions: {
              inflationRate: multiYearConfig.economicAssumptions?.inflationRate || 0.03,
              gdpGrowthRate: multiYearConfig.economicAssumptions?.gdpGrowthRate || 0.025,
              fiscalConstraints: multiYearConfig.economicAssumptions?.fiscalConstraints || 'moderate'
            },
            politicalContext: {
              electionCycle: multiYearConfig.politicalContext?.electionCycle || 4,
              currentElectionYear: multiYearConfig.politicalContext?.currentElectionYear || 2024,
              policyStability: multiYearConfig.politicalContext?.policyStability || 'stable'
            }
          }
        };
        
        console.log('Sending algorithm strategy configuration to backend:', budgetConfiguration);
        
      } else if (planningHorizon.budgetStrategy === 'percentage_growth') {
        // Send percentage growth strategy configuration
        budgetConfiguration = {
          budgetStrategy: planningHorizon.budgetStrategy,
          startYear: planningHorizon.startYear,
          endYear: planningHorizon.endYear,
          baseBudget: planningHorizon.annualNewBudget || 500,
          budgetGrowthRate: planningHorizon.budgetGrowthRate || 0.05
        };
        
        console.log('Sending percentage growth strategy configuration to backend:', budgetConfiguration);
        
      } else if (planningHorizon.budgetStrategy === 'custom') {
        // Send custom strategy configuration
        budgetConfiguration = {
          budgetStrategy: planningHorizon.budgetStrategy,
          startYear: planningHorizon.startYear,
          endYear: planningHorizon.endYear,
          customYearBudgets: planningHorizon.customYearBudgets || {}
        };
        
        console.log('Sending custom strategy configuration to backend:', budgetConfiguration);
        
      } else {
        // Fixed annual strategy - can use either strategy config or simple budget scenarios
        budgetConfiguration = {
          budgetStrategy: 'fixed_annual',
          startYear: planningHorizon.startYear,
          endYear: planningHorizon.endYear,
          baseBudget: planningHorizon.annualNewBudget || 500
        };
        
        console.log('Sending fixed annual strategy configuration to backend:', budgetConfiguration);
      }
      
      // Enhanced constraints for new budget optimization
      const enhancedConstraints = {
        minAllocation: 1,
        maxAllocation: 40,
        // Adjust transition limits based on implementation speed
        transitionLimit: multiYearConfig.implementationSpeed === 'aggressive' ? 50 : 
                        multiYearConfig.implementationSpeed === 'gradual' ? 15 : 30,
        // Add risk tolerance adjustments
        riskTolerance: multiYearConfig.riskTolerance,
        priorityAreas: multiYearConfig.priorityAreas,
        // Add implementation speed as constraint
        implementationSpeed: multiYearConfig.implementationSpeed
      };
      
      const result = await analysisAPI.multiYearOptimization(
        sessionId,
        token,
        budgetConfiguration,
        multiYearConfig.targetFsfvi,
        multiYearConfig.targetYear,
        'hybrid',
        'normal_operations',
        enhancedConstraints
      );
      
      // Extract the multi-year plan data from the response
      const multiYearPlan = result.multi_year_plan || result;
      console.log('Extracted multi-year plan (enhanced strategy approach):', multiYearPlan);
      
      setOptimizationResults(prev => ({ ...prev, multiYear: multiYearPlan }));
      return multiYearPlan;
    });
  };

  const handleRunAnalysis = (toolId: string) => {
    // Set active view immediately when starting analysis
    setActiveResultsView(toolId);
    
    console.log(`Starting analysis: ${toolId}, setting activeResultsView to:`, toolId);
    
    switch (toolId) {
      case 'optimization':
        runBasicOptimization();
        break;
      case 'multi-year':
        runMultiYearPlan();
        break;
      default:
        console.warn(`Unknown analysis tool: ${toolId}`);
    }
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

  const handleOpenMultiYearConfiguration = () => {
    setActiveResultsView('multi-year-config');
    setShowMultiYearConfig(true);
  };

  if (loading) {
    return (
      <div>
        <AnalysisNavigation sessionId={sessionId} currentPage="allocation-optimization" sessionInfo={sessionInfo || undefined} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading government optimization tools...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <AnalysisNavigation sessionId={sessionId} currentPage="allocation-optimization" sessionInfo={sessionInfo || undefined} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Error</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={loadInitialData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AnalysisNavigation sessionId={sessionId} currentPage="allocation-optimization" sessionInfo={sessionInfo || undefined} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Component */}
        <OptimizationHeader 
          sessionInfo={sessionInfo}
          optimizationConfig={optimizationConfig}
          isConfigured={optimizationConfig.configured}
          onConfigure={() => {}}
        />

        {/* Main Content Layout with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar - Simulation Tools */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <span>Simulation Tools</span>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Run one analysis at a time to understand different budget scenarios
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Show different tools based on active view */}
                {activeResultsView === 'multi-year' && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>📊 Multi-Year Planning Mode:</strong> Viewing cumulative new budget analysis. 
                      Traditional optimization tools are hidden to avoid confusion.
                    </p>
                  </div>
                )}

                {/* Budget Planning Simulations - Hide traditional tools in multi-year view */}
                {activeResultsView !== 'multi-year' && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-700 text-sm">Traditional Budget Planning</h5>
                  </div>
                )}

                {/* Multi-Year Planning Tools */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-700 text-sm">
                    {activeResultsView === 'multi-year' ? 'Multi-Year Planning' : 'New Budget Planning'}
                  </h5>
                  
                  {/* Multi-Year Planning */}
                  <div className={`p-3 rounded-lg border ${activeResultsView === 'multi-year' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-sm font-medium">Multi-Year New Budget</h6>
                      <div className="flex items-center space-x-1">
                        {optimizationResults.multiYear && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {multiYearConfig.configured && <CheckCircle className="w-3 h-3 text-blue-600" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Cumulative new budget planning (current allocations fixed)</p>
                    
                    {/* Configuration Status */}
                    {!multiYearConfig.configured && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="text-yellow-800 font-medium">Configuration Required</p>
                        <p className="text-yellow-700">Set new budget parameters first</p>
                      </div>
                    )}
                    
                    {multiYearConfig.configured && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-800 font-medium">Configured</p>
                        <p className="text-blue-700">
                          {planningHorizon.endYear - planningHorizon.startYear + 1} years, 
                          ${planningHorizon.annualNewBudget || 500}M/year new budget
                        </p>
                      </div>
                    )}
                    
                    {/* Separate Configure and Run Buttons */}
                    <div className="space-y-2">
                      <Button
                        onClick={handleOpenMultiYearConfiguration}
                        className="w-full text-xs"
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Configure Settings
                      </Button>
                      
                      {multiYearConfig.configured && (
                        <Button
                          onClick={() => handleRunAnalysis('multi-year')}
                          disabled={analysisInProgress['multi-year'] || !optimizationResults.basic}
                          className="w-full text-xs"
                          variant="default"
                          size="sm"
                        >
                          {analysisInProgress['multi-year'] ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Planning...
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3 h-3 mr-1" />
                              Run Plan
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Budget Impact Analysis - Only show when not in multi-year view */}
                  {activeResultsView !== 'multi-year' && (
                    <BudgetImpactAnalysis
                      optimizationResult={optimizationResults.basic || {
                        success: false,
                        original_fsfvi: 0,
                        optimal_fsfvi: 0,
                        optimal_allocations: [],
                        relative_improvement_percent: 0,
                        efficiency_gain_percent: 0,
                        total_reallocation_amount: 0,
                        reallocation_intensity_percent: 0,
                        budget_utilization_percent: 0
                      }}
                    />
                  )}

                </div>



              </CardContent>
            </Card>
          </div>

          {/* Main Results Area */}
          <div className="lg:col-span-3 space-y-6">
            


            {/* Budget Impact Configuration Modal */}
            {showBudgetImpactConfig && activeResultsView === 'budget-impact-config' && (
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-green-600" />
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
                          aria-label="Analysis method selection"
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
                        // Set view back to show results when ready
                        setActiveResultsView('optimization');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Multi-Year Configuration Modal */}
            {showMultiYearConfig && activeResultsView === 'multi-year-config' && (
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span>Multi-Year New Budget Planning</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowMultiYearConfig(false)}
                    >
                      ✕
                    </Button>
                  </CardTitle>
                  <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h4 className="font-semibold text-emerald-900 mb-2">🧠 Dynamic Government Planning Approach</h4>
                    <div className="text-sm text-emerald-800 space-y-2">
                      <p><strong>✅ Current Allocations:</strong> Remain fixed (already committed/spent)</p>
                      <p><strong>🧠 Dynamic Optimization:</strong> Each year considers how cumulative funding changes system sensitivity and performance</p>
                      <p><strong>📈 Evolving Strategy:</strong> Allocation patterns adapt as components reach diminishing returns</p>
                      <p><strong>🎯 Smart Allocation:</strong> Resources flow to components with highest marginal impact potential</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Planning Horizon */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Planning Horizon</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
                        <input
                          type="number"
                          min={new Date().getFullYear()}
                          max={new Date().getFullYear() + 2}
                          value={planningHorizon.startYear || new Date().getFullYear()}
                          onChange={(e) => setPlanningHorizon(prev => ({ ...prev, startYear: parseInt(e.target.value) || new Date().getFullYear() }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          aria-label="Planning start year"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Year</label>
                        <input
                          type="number"
                          min={planningHorizon.startYear + 2}
                          max={new Date().getFullYear() + 10}
                          value={planningHorizon.endYear || (new Date().getFullYear() + 5)}
                          onChange={(e) => setPlanningHorizon(prev => ({ ...prev, endYear: parseInt(e.target.value) || (new Date().getFullYear() + 5) }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          aria-label="Planning end year"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Budget Strategy Selection */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Budget Strategy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Type</label>
                        <select
                          value={planningHorizon.budgetStrategy}
                          onChange={(e) => setPlanningHorizon(prev => ({ 
                            ...prev, 
                            budgetStrategy: e.target.value as 'fixed_annual' | 'percentage_growth' | 'custom' | 'algorithm'
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          aria-label="Budget strategy selection"
                        >
                          <option value="fixed_annual">Fixed Annual Amount</option>
                          <option value="percentage_growth">Percentage Growth</option>
                          <option value="custom">Custom Year-by-Year</option>
                          <option value="algorithm">Algorithm-Based</option>
                        </select>
                      </div>
                      
                      {/* Fixed Annual Amount */}
                      {planningHorizon.budgetStrategy === 'fixed_annual' && (
                                                  <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Annual New Budget (Million USD)</label>
                            <input
                              type="number"
                              min={50}
                              max={5000}
                              step={50}
                              value={planningHorizon.annualNewBudget || 500}
                              onChange={(e) => setPlanningHorizon(prev => ({ ...prev, annualNewBudget: parseFloat(e.target.value) || 500 }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              aria-label="Annual new budget amount in millions USD"
                            />
                          </div>
                      )}
                      
                      {/* Percentage Growth */}
                      {planningHorizon.budgetStrategy === 'percentage_growth' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Budget (Million USD)</label>
                            <input
                              type="number"
                              min={50}
                              max={5000}
                              step={50}
                              value={planningHorizon.annualNewBudget || 500}
                              onChange={(e) => setPlanningHorizon(prev => ({ ...prev, annualNewBudget: parseFloat(e.target.value) || 500 }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              aria-label="Annual new budget amount in millions USD"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Growth Rate (%)</label>
                            <input
                              type="number"
                              min={-20}
                              max={30}
                              step={0.5}
                              value={(planningHorizon.budgetGrowthRate || 0.05) * 100}
                              onChange={(e) => setPlanningHorizon(prev => ({ ...prev, budgetGrowthRate: parseFloat(e.target.value) / 100 || 0.05 }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              aria-label="Annual budget growth rate percentage"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Custom Year-by-Year Configuration */}
                  {planningHorizon.budgetStrategy === 'custom' && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Custom Budget by Year</h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {Array.from({ length: planningHorizon.endYear - planningHorizon.startYear + 1 }, (_, i) => {
                          const year = planningHorizon.startYear + i;
                          return (
                            <div key={year} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                              <div className="w-16 text-sm font-medium text-gray-700">
                                {year}
                              </div>
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={10000}
                                  step={50}
                                  value={planningHorizon.customYearBudgets?.[year] || 500}
                                  onChange={(e) => setPlanningHorizon(prev => ({
                                    ...prev,
                                    customYearBudgets: {
                                      ...prev.customYearBudgets,
                                      [year]: parseFloat(e.target.value) || 500
                                    }
                                  }))}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                  placeholder="Budget (Million USD)"
                                />
                              </div>
                              <div className="w-24 text-xs text-gray-500">
                                Million USD
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Algorithm-Based Configuration */}
                  {planningHorizon.budgetStrategy === 'algorithm' && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Algorithm-Based Budget Strategy</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Budget (Million USD)</label>
                          <input
                            type="number"
                            min={50}
                            max={5000}
                            step={50}
                            value={planningHorizon.annualNewBudget || 500}
                            onChange={(e) => setPlanningHorizon(prev => ({ ...prev, annualNewBudget: parseFloat(e.target.value) || 500 }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            aria-label="Base budget amount for algorithm-based strategy"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Baseline Growth Rate (%)</label>
                          <input
                            type="number"
                            min={-5}
                            max={15}
                            step={0.5}
                            value={(planningHorizon.algorithmConfig?.baselineGrowthRate || 0.03) * 100}
                            onChange={(e) => setPlanningHorizon(prev => ({
                              ...prev,
                              algorithmConfig: {
                                ...prev.algorithmConfig!,
                                baselineGrowthRate: parseFloat(e.target.value) / 100 || 0.03
                              }
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            aria-label="Baseline growth rate percentage"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Economic Cycle Impact (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            step={1}
                            value={(planningHorizon.algorithmConfig?.economicCycleImpact || 0.15) * 100}
                            onChange={(e) => setPlanningHorizon(prev => ({
                              ...prev,
                              algorithmConfig: {
                                ...prev.algorithmConfig!,
                                economicCycleImpact: parseFloat(e.target.value) / 100 || 0.15
                              }
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            aria-label="Economic cycle impact percentage"
                          />
                        </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Political Priority Shift (%)</label>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              step={1}
                              value={(planningHorizon.algorithmConfig?.politicalPriorityShift || 0.10) * 100}
                              onChange={(e) => setPlanningHorizon(prev => ({
                                ...prev,
                                algorithmConfig: {
                                  ...prev.algorithmConfig!,
                                  politicalPriorityShift: parseFloat(e.target.value) / 100 || 0.10
                                }
                              }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              aria-label="Political priority shift percentage"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Performance Adjustment (%)</label>
                            <input
                              type="number"
                              min={0}
                              max={40}
                              step={1}
                              value={(planningHorizon.algorithmConfig?.performanceBasedAdjustment || 0.20) * 100}
                              onChange={(e) => setPlanningHorizon(prev => ({
                                ...prev,
                                algorithmConfig: {
                                  ...prev.algorithmConfig!,
                                  performanceBasedAdjustment: parseFloat(e.target.value) / 100 || 0.20
                                }
                              }))}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              aria-label="Performance-based adjustment percentage"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Crisis Response Factor (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            step={1}
                            value={(planningHorizon.algorithmConfig?.crisisResponseFactor || 0.25) * 100}
                            onChange={(e) => setPlanningHorizon(prev => ({
                              ...prev,
                              algorithmConfig: {
                                ...prev.algorithmConfig!,
                                crisisResponseFactor: parseFloat(e.target.value) / 100 || 0.25
                              }
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            aria-label="Crisis response factor percentage"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Budget Preview */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">💰 Budget Preview</h4>
                    <div className="space-y-2 text-sm">
                      {(() => {
                        const years = Array.from({ length: planningHorizon.endYear - planningHorizon.startYear + 1 }, (_, i) => planningHorizon.startYear + i);
                        let totalNewBudget = 0;
                        
                        const budgetByYear = years.map(year => {
                          let yearBudget = 0;
                          
                          if (planningHorizon.budgetStrategy === 'fixed_annual') {
                            yearBudget = planningHorizon.annualNewBudget || 500;
                          } else if (planningHorizon.budgetStrategy === 'percentage_growth') {
                            const yearIndex = year - planningHorizon.startYear;
                            yearBudget = (planningHorizon.annualNewBudget || 500) * Math.pow(1 + (planningHorizon.budgetGrowthRate || 0.05), yearIndex);
                          } else if (planningHorizon.budgetStrategy === 'custom') {
                            yearBudget = planningHorizon.customYearBudgets?.[year] || 500;
                          } else if (planningHorizon.budgetStrategy === 'algorithm') {
                            // Simplified preview - actual algorithm runs in backend
                            const yearIndex = year - planningHorizon.startYear;
                            const baseGrowth = Math.pow(1 + (planningHorizon.algorithmConfig?.baselineGrowthRate || 0.03), yearIndex);
                            const cyclicalFactor = 1 + 0.1 * Math.sin(yearIndex * 0.5); // Simulated economic cycle
                            yearBudget = (planningHorizon.annualNewBudget || 500) * baseGrowth * cyclicalFactor;
                          }
                          
                          totalNewBudget += yearBudget;
                          return { year, budget: yearBudget };
                        });
                        
                        return (
                          <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-blue-700">Strategy:</span>
                                <span className="font-bold text-blue-900 ml-2">
                                  {planningHorizon.budgetStrategy === 'fixed_annual' ? 'Fixed Annual' :
                                   planningHorizon.budgetStrategy === 'percentage_growth' ? 'Percentage Growth' :
                                   planningHorizon.budgetStrategy === 'custom' ? 'Custom Year-by-Year' :
                                   planningHorizon.budgetStrategy === 'algorithm' ? 'Algorithm-Based' : 'Unknown'}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">Total New Investment:</span>
                                <span className="font-bold text-blue-900 ml-2">
                                  ${totalNewBudget.toFixed(0)}M
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 space-y-1">
                              {budgetByYear.map(({ year, budget }) => (
                                <div key={year} className="flex justify-between text-xs">
                                  <span className="text-blue-700">{year}:</span>
                                  <span className="font-medium text-blue-900">${budget.toFixed(0)}M</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowMultiYearConfig(false)}>Cancel</Button>
                    <Button 
                      onClick={() => {
                        // Set configuration as completed
                        setMultiYearConfig(prev => ({ ...prev, configured: true }));
                        setShowMultiYearConfig(false);
                        // Set view back to show results when ready
                        setActiveResultsView('optimization');
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Display using dedicated components */}
            {!optimizationResults.basic && !loading && activeResultsView === 'optimization' && (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Food System Budget Optimization
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Welcome to the government optimization suite. Start by running the current optimization 
                      to analyze your existing budget allocation and identify opportunities for improvement.
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>📊 <strong>Current Budget:</strong> ${sessionInfo?.total_budget?.toFixed(1) || '0'}M {sessionInfo?.currency || 'USD'}</p>
                      <p>🏛️ <strong>Country:</strong> {sessionInfo?.country || 'Unknown'}</p>
                      <p>📅 <strong>Fiscal Year:</strong> {sessionInfo?.fiscal_year || new Date().getFullYear()}</p>
                    </div>
                    <div className="mt-8">
                      <Button
                        onClick={() => handleRunAnalysis('optimization')}
                        disabled={analysisInProgress.optimization}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {analysisInProgress.optimization ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Running Initial Optimization...
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4 mr-2" />
                            Start Optimization Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State for Analysis */}
            {(analysisInProgress.optimization || analysisInProgress[activeResultsView]) && (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Running {activeResultsView.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis
                    </h3>
                    <p className="text-gray-600">
                      Processing your food system data to generate optimal budget allocation recommendations...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {optimizationResults.basic && activeResultsView === 'optimization' && (
              <div>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Traditional Reallocation Analysis:</strong> This shows how current budget could be optimally reallocated. 
                    For new budget planning, use the Multi-Year New Budget analysis above.
                  </p>
                </div>
                <OptimizationResults
                  result={optimizationResults.basic}
                />
              </div>
            )}

            {/* Multi-Year Results Component */}
            {optimizationResults.multiYear && activeResultsView === 'multi-year' && (
              <MultiYearResults
                result={optimizationResults.multiYear}
              />
            )}

            {/* Budget Impact Analysis Results */}
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

                {/* Component Allocation Analysis Across Budget Scenarios */}
                {optimizationResults.budgetSensitivity.budget_analysis && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="w-5 h-5 text-purple-600" />
                        <span>Component Allocation Distribution</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-1">Budget Distribution Analysis</h4>
                        <p className="text-sm text-purple-700">
                          Shows how additional budget is allocated across components for different budget scenarios. This reveals which components benefit most from budget increases and how funds are redistributed.
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        {Object.entries(optimizationResults.budgetSensitivity.budget_analysis)
                          .filter(([, result]) => !result.error && result.optimal_allocations)
                          .map(([variation, result]) => (
                            <div key={variation} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-gray-900">
                                  Budget Scenario: 
                                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${
                                    parseFloat(variation) > 0 
                                      ? 'bg-green-100 text-green-800' 
                                      : parseFloat(variation) < 0 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {parseFloat(variation) > 0 ? '+' : ''}{(parseFloat(variation) * 100).toFixed(0)}% 
                                    (${result.budget?.toFixed(1) || 0}M)
                                  </span>
                                </h5>
                                <span className="text-sm text-gray-500">
                                  FSFVI: {result.optimal_fsfvi?.toFixed(4) || '—'}
                                </span>
                              </div>
                              
                              {result.optimal_allocations && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {result.optimal_allocations.map((allocation, index) => {
                                    const componentTypes = ['agricultural_development', 'infrastructure', 'governance_institutions', 'nutrition_health', 'climate_natural_resources', 'social_protection_equity'];
                                    const componentType = componentTypes[index] || `component_${index}`;
                                    const componentName = componentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    const allocationPercent = ((allocation / (result.budget || 1)) * 100);
                                    
                                    // Calculate change from baseline (0% variation)
                                    const baselineResult = optimizationResults.budgetSensitivity?.budget_analysis?.['0'];
                                    const baselineAllocation = baselineResult?.optimal_allocations?.[index] || allocation;
                                    const allocationChange = allocation - baselineAllocation;
                                    const allocationChangePercent = baselineAllocation > 0 ? (allocationChange / baselineAllocation) * 100 : 0;
                                    
                                    return (
                                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                                        <h6 className="font-medium text-gray-900 text-sm mb-2">{componentName}</h6>
                                        <div className="space-y-1">
                                          <p className="text-lg font-bold text-gray-900">
                                            ${allocation.toFixed(1)}M
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {allocationPercent.toFixed(1)}% of budget
                                          </p>
                                          {parseFloat(variation) !== 0 && (
                                            <p className={`text-xs font-medium ${
                                              allocationChange > 0 ? 'text-green-600' : allocationChange < 0 ? 'text-red-600' : 'text-gray-600'
                                            }`}>
                                              {allocationChange > 0 ? '+' : ''}{allocationChange.toFixed(1)}M 
                                              ({allocationChangePercent > 0 ? '+' : ''}{allocationChangePercent.toFixed(1)}%)
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {result.optimal_allocations && (() => {
                                // Calculate actual changes from the allocations we're displaying
                                const baselineResult = optimizationResults.budgetSensitivity?.budget_analysis?.['0'];
                                
                                let actualIncreases = 0;
                                let actualDecreases = 0;
                                let largestIncrease = 0;
                                let largestDecrease = 0;
                                
                                if (baselineResult?.optimal_allocations && parseFloat(variation) !== 0) {
                                  result.optimal_allocations.forEach((allocation, index) => {
                                    const baselineAllocation = baselineResult.optimal_allocations[index] || allocation;
                                    const changePercent = baselineAllocation > 0 ? ((allocation - baselineAllocation) / baselineAllocation) * 100 : 0;
                                    
                                    if (changePercent > 0.1) { // More than 0.1% increase
                                      actualIncreases++;
                                      largestIncrease = Math.max(largestIncrease, changePercent);
                                    } else if (changePercent < -0.1) { // More than 0.1% decrease
                                      actualDecreases++;
                                      largestDecrease = Math.min(largestDecrease, changePercent);
                                    }
                                  });
                                }
                                
                                return (
                                  <div className="mt-4 pt-3 border-t border-gray-200">
                                    <h6 className="font-medium text-gray-900 mb-2">Key Changes</h6>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <p className="text-gray-600">Components Increased: 
                                          <span className="font-medium text-green-600 ml-1">
                                            {actualIncreases}
                                          </span>
                                        </p>
                                        {largestIncrease > 0 && (
                                          <p className="text-gray-600">Largest Increase: 
                                            <span className="font-medium text-green-600 ml-1">
                                              {largestIncrease.toFixed(1)}%
                                            </span>
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-gray-600">Components Decreased: 
                                          <span className="font-medium text-red-600 ml-1">
                                            {actualDecreases}
                                          </span>
                                        </p>
                                        {actualDecreases > 0 && largestDecrease < 0 && (
                                          <p className="text-gray-600">Largest Decrease: 
                                            <span className="font-medium text-red-600 ml-1">
                                              {Math.abs(largestDecrease).toFixed(1)}%
                                            </span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Budget Efficiency Curve Visualization */}
                {optimizationResults.budgetSensitivity.efficiency_curves && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span>Budget Efficiency Curve</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-1">Efficiency Curve Analysis</h4>
                        <p className="text-sm text-blue-700">
                          Visual representation of how efficiently each budget level converts investment into FSFVI reduction (vulnerability improvement).
                        </p>
                      </div>
                      
                      {/* Dynamic SVG Chart */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="h-64 relative">
                          <svg width="100%" height="100%" viewBox="0 0 600 200" className="overflow-visible">
                            {/* Chart background */}
                            <defs>
                              <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                              </linearGradient>
                            </defs>
                            
                            {(() => {
                              // Get all valid data points first
                              const validData = Object.entries(optimizationResults.budgetSensitivity.efficiency_curves)
                                .filter(([, curve]) => !curve.error && curve.efficiency_per_million)
                                .sort(([a], [b]) => parseFloat(a) - parseFloat(b));
                              
                              if (validData.length === 0) return <text x="300" y="100" textAnchor="middle" className="text-sm fill-gray-500">No valid efficiency data available</text>;
                              
                              // Calculate dynamic ranges
                              const variations = validData.map(([variation]) => parseFloat(variation));
                              const efficiencies = validData.map(([, curve]) => curve.efficiency_per_million);
                              
                              const minVariation = Math.min(...variations);
                              const maxVariation = Math.max(...variations);
                              const minEfficiency = Math.min(...efficiencies);
                              const maxEfficiency = Math.max(...efficiencies);
                              
                              // Add 10% padding to ranges
                              const efficiencyRange = maxEfficiency - minEfficiency;
                              const efficiencyPadding = efficiencyRange * 0.1;
                              const adjustedMinEff = minEfficiency - efficiencyPadding;
                              const adjustedMaxEff = maxEfficiency + efficiencyPadding;
                              
                              // Chart dimensions
                              const chartLeft = 60;
                              const chartRight = 540;
                              const chartTop = 20;
                              const chartBottom = 170;
                              const chartWidth = chartRight - chartLeft;
                              const chartHeight = chartBottom - chartTop;
                              
                              // Scale functions
                              const xScale = (variation: number) => chartLeft + ((variation - minVariation) / (maxVariation - minVariation)) * chartWidth;
                              const yScale = (efficiency: number) => chartBottom - ((efficiency - adjustedMinEff) / (adjustedMaxEff - adjustedMinEff)) * chartHeight;
                              
                              // Create data points with scaled positions
                              const scaledPoints = validData.map(([variation, curve]) => ({
                                x: xScale(parseFloat(variation)),
                                y: yScale(curve.efficiency_per_million),
                                variation: parseFloat(variation),
                                efficiency: curve.efficiency_per_million
                              }));
                              
                              // Generate grid lines (5 vertical, 5 horizontal)
                              const xGridPoints = Array.from({length: 5}, (_, i) => {
                                const variation = minVariation + (maxVariation - minVariation) * (i / 4);
                                return { x: xScale(variation), variation };
                              });
                              
                              const yGridPoints = Array.from({length: 5}, (_, i) => {
                                const efficiency = adjustedMinEff + (adjustedMaxEff - adjustedMinEff) * (i / 4);
                                return { y: yScale(efficiency), efficiency };
                              });
                              
                              return (
                                <g>
                                  {/* Vertical grid lines */}
                                  {xGridPoints.map((point, i) => (
                                    <g key={`v-${i}`}>
                                      <line x1={point.x} y1={chartTop} x2={point.x} y2={chartBottom} stroke="#e5e7eb" strokeWidth="1"/>
                                      <text x={point.x} y="185" textAnchor="middle" className="text-xs fill-gray-500">
                                        {point.variation === 0 ? '0%' : `${point.variation > 0 ? '+' : ''}${(point.variation * 100).toFixed(0)}%`}
                                      </text>
                                    </g>
                                  ))}
                                  
                                  {/* Horizontal grid lines */}
                                  {yGridPoints.map((point, i) => (
                                    <g key={`h-${i}`}>
                                      <line x1={chartLeft} y1={point.y} x2={chartRight} y2={point.y} stroke="#e5e7eb" strokeWidth="1"/>
                                      <text x="55" y={point.y + 3} textAnchor="end" className="text-xs fill-gray-500">
                                        {point.efficiency.toFixed(0)}
                                      </text>
                                    </g>
                                  ))}
                                  
                                  {/* Y-axis label */}
                                  <text x="20" y="95" textAnchor="middle" transform="rotate(-90 20 95)" className="text-xs fill-gray-700 font-medium">
                                    Efficiency per Million
                                  </text>
                                  
                                  {/* X-axis label */}
                                  <text x="300" y="200" textAnchor="middle" className="text-xs fill-gray-700 font-medium">
                                    Budget Variation
                                  </text>
                                  
                                  {/* Efficiency curve */}
                                  {scaledPoints.length >= 2 && (() => {
                                    // Create smooth curve path
                                    const pathData = scaledPoints.reduce((path, point, index) => {
                                      if (index === 0) {
                                        return `M ${point.x} ${point.y}`;
                                      } else {
                                        const prevPoint = scaledPoints[index - 1];
                                        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
                                        const cp1y = prevPoint.y;
                                        const cp2x = point.x - (point.x - prevPoint.x) / 3;
                                        const cp2y = point.y;
                                        return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
                                      }
                                    }, '');
                                    
                                    const areaPath = `${pathData} L ${scaledPoints[scaledPoints.length - 1].x} ${chartBottom} L ${scaledPoints[0].x} ${chartBottom} Z`;
                                    
                                    return (
                                      <g>
                                        {/* Area under curve */}
                                        <path d={areaPath} fill="url(#curveGradient)" opacity="0.4"/>
                                        
                                        {/* Main curve line */}
                                        <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="3"/>
                                        
                                        {/* Data points */}
                                        {scaledPoints.map((point, index) => (
                                          <g key={index}>
                                            <circle cx={point.x} cy={point.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2"/>
                                            
                                            {/* Tooltip on hover */}
                                            <g className="opacity-0 hover:opacity-100 transition-opacity">
                                              <rect x={point.x - 35} y={point.y - 25} width="70" height="20" fill="black" fillOpacity="0.8" rx="3"/>
                                              <text x={point.x} y={point.y - 12} textAnchor="middle" className="text-xs fill-white">
                                                {point.efficiency.toFixed(1)}
                                              </text>
                                            </g>
                                          </g>
                                        ))}
                                      </g>
                                    );
                                  })()}
                                </g>
                              );
                            })()}
                          </svg>
                        </div>
                        
                        {/* Legend */}
                        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-0.5 bg-blue-600"></div>
                            <span className="text-gray-600">Efficiency Curve</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-600 rounded-full opacity-60"></div>
                            <span className="text-gray-600">Budget Scenarios</span>
                          </div>
                        </div>
                        
                        {/* Key Insights */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2">Key Insights</h5>
                          <div className="text-sm text-gray-600 space-y-1">
                            {(() => {
                              const validCurves = Object.entries(optimizationResults.budgetSensitivity.efficiency_curves)
                                .filter(([, curve]) => !curve.error && curve.efficiency_per_million);
                              
                              if (validCurves.length === 0) return <p>No valid efficiency data available</p>;
                              
                              const efficiencies = validCurves.map(([, curve]) => curve.efficiency_per_million);
                              const maxEff = Math.max(...efficiencies);
                              const minEff = Math.min(...efficiencies);
                              const trend = efficiencies[efficiencies.length - 1] > efficiencies[0] ? 'increasing' : 'decreasing';
                              
                              return (
                                <>
                                  <p>• Efficiency ranges from {minEff.toFixed(1)} to {maxEff.toFixed(1)} per million USD</p>
                                  <p>• Overall trend: {trend} efficiency with higher budgets</p>
                                  <p>• {maxEff > 200 ? 'High' : maxEff > 190 ? 'Medium' : 'Low'} efficiency levels across all scenarios</p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
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
                            .filter(([, rec]) => !rec.error && rec.improvement_percent > 0)
                            .sort(([, a], [, b]) => {
                              // Calculate balanced score: 60% improvement impact + 40% cost efficiency
                              const effA = a.efficiency_per_million || 0;
                              const effB = b.efficiency_per_million || 0;
                              const balancedA = (a.improvement_percent || 0) * 0.6 + (effA / 10) * 0.4;
                              const balancedB = (b.improvement_percent || 0) * 0.6 + (effB / 10) * 0.4;
                              return balancedB - balancedA;
                            })
                            .slice(0, 3)
                            .map(([variation, rec], index) => {
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
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" title="Best balanced option considers both impact and cost-effectiveness together.">
                                        Best Balanced Option
                                      </span>
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
                                    <div className="text-xs text-blue-600 mt-1">
                                      <span title="This combines impact with cost-effectiveness to identify the best overall option.">
                                        Balanced Score: {balancedScore.toFixed(1)} (60% impact + 40% efficiency)
                                      </span>
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

          </div>
        </div>
      </div>
    </div>
  );
} 