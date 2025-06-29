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
  CheckCircle
} from 'lucide-react';
import { AnalysisNavigation } from '@/components/analysis/AnalysisNavigation';
import { 
  analysisAPI, 
  dataAPI,
  MultiYearPlan, 
  BudgetSensitivityAnalysis,
  ComponentOptimizationResult
} from '@/lib/api';

// Import dedicated optimization components
import { OptimizationHeader } from '@/components/optimization/OptimizationHeader';
import { OptimizationResults } from '@/components/optimization/OptimizationResults';
import { MultiYearResults } from '@/components/optimization/MultiYearResults';
import BudgetImpactAnalysis from '@/components/optimization/BudgetImpactAnalysis';

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

// Individual configuration interfaces for each analysis tool



interface PlanningHorizon {
  startYear: number;
  endYear: number;
  budgetGrowth: number;
}

interface MultiYearConfig {
  configured: boolean;
  targetFsfvi?: number;
  targetYear?: number;
  priorityAreas: string[];
  riskTolerance: 'low' | 'medium' | 'high';
  implementationSpeed: 'gradual' | 'moderate' | 'aggressive';
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
  
  // Results state
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResults>({});
  const [analysisInProgress, setAnalysisInProgress] = useState<Record<string, boolean>>({});
  const [activeResultsView, setActiveResultsView] = useState<string>('optimization');
  
  // Multi-year planning state
  const [planningHorizon, setPlanningHorizon] = useState<PlanningHorizon>({
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 5,
    budgetGrowth: 3 // Annual growth percentage
  });

  // Enhanced multi-year configuration state
  const [multiYearConfig, setMultiYearConfig] = useState<MultiYearConfig>({
    configured: false,
    priorityAreas: [],
    riskTolerance: 'medium',
    implementationSpeed: 'moderate'
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
      
      // Set optimization results (do NOT use this for total budget)
      if (result && typeof result === 'object') {
        setOptimizationResults(prev => ({ ...prev, basic: result.optimization_results || result }));
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
      const result = await analysisAPI.optimizeAllocation(
        sessionId, 
        token, 
        'hybrid', 
        0,
        {
          minAllocation: 1,
          maxAllocation: 40,
          transitionLimit: 30
        }
      );
      setOptimizationResults(prev => ({ ...prev, basic: result }));
      return result;
    });
  };

  // Enhanced multi-year planning with configuration validation
  const runMultiYearPlan = async () => {
    // Check if multi-year configuration is complete
    if (!multiYearConfig.configured) {
      setShowMultiYearConfig(true);
      setError('Please configure multi-year planning settings first.');
      return;
    }

    await runAnalysis('multi-year', async () => {
      const token = getToken();
      
      // Generate budget scenarios based on planning horizon and configuration
      const budgetScenarios: Record<number, number> = {};
      const baseBudget = sessionInfo?.total_budget || 2900;
      
      // Apply implementation speed adjustments
      let adjustedGrowthRate = planningHorizon.budgetGrowth;
      if (multiYearConfig.implementationSpeed === 'aggressive') {
        adjustedGrowthRate *= 1.2; // 20% higher growth for aggressive implementation
      } else if (multiYearConfig.implementationSpeed === 'gradual') {
        adjustedGrowthRate *= 0.8; // 20% lower growth for gradual implementation
      }
      
      for (let year = planningHorizon.startYear; year <= planningHorizon.endYear; year++) {
        const yearsFromStart = year - planningHorizon.startYear;
        budgetScenarios[year] = baseBudget * Math.pow(1 + adjustedGrowthRate / 100, yearsFromStart);
      }
      
      // Enhanced constraints based on configuration
      const enhancedConstraints = {
          minAllocation: 1,
          maxAllocation: 40,
        // Adjust transition limits based on implementation speed
        transitionLimit: multiYearConfig.implementationSpeed === 'aggressive' ? 50 : 
                        multiYearConfig.implementationSpeed === 'gradual' ? 15 : 30,
        // Add risk tolerance adjustments
        riskTolerance: multiYearConfig.riskTolerance,
        priorityAreas: multiYearConfig.priorityAreas
      };
      
      const result = await analysisAPI.multiYearOptimization(
        sessionId,
        token,
        budgetScenarios,
          multiYearConfig.targetFsfvi,
          multiYearConfig.targetYear,
          'hybrid',
          'normal_operations',
        enhancedConstraints
      );
      
      // Extract the multi-year plan data from the response
      const multiYearPlan = result.multi_year_plan || result;
      console.log('Extracted multi-year plan:', multiYearPlan);
      
      setOptimizationResults(prev => ({ ...prev, multiYear: multiYearPlan }));
      return multiYearPlan;
    });
  };

  // Multi-year configuration completion function
  const completeMultiYearConfig = (config: Partial<MultiYearConfig>) => {
    setMultiYearConfig(prev => ({
      ...prev,
      ...config,
      configured: true
    }));
    setShowMultiYearConfig(false);
    
    // Auto-run multi-year analysis after configuration
    setTimeout(() => {
      runMultiYearPlan();
    }, 500);
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
                
                {/* Basic Optimization - Auto-run */}
                <div className={`p-4 rounded-lg border-2 ${activeResultsView === 'optimization' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Current Optimization</h4>
                    {optimizationResults.basic && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">Optimize current allocations to reduce vulnerabilities</p>
                  <Button
                    onClick={() => handleRunAnalysis('optimization')}
                    disabled={analysisInProgress.optimization}
                    className="w-full text-sm"
                    variant={activeResultsView === 'optimization' ? 'default' : 'outline'}
                  >
                    {analysisInProgress.optimization ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Target className="w-3 h-3 mr-2" />
                        {optimizationResults.basic ? 'Update Analysis' : 'Run Optimization'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Budget Planning Simulations */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-700 text-sm">Budget Planning</h5>
                  
                  {/* Multi-Year Planning */}
                  <div className={`p-3 rounded-lg border ${activeResultsView === 'multi-year' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-sm font-medium">Multi-Year Planning</h6>
                      <div className="flex items-center space-x-1">
                        {optimizationResults.multiYear && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {multiYearConfig.configured && <CheckCircle className="w-3 h-3 text-blue-600" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Plan budget allocation for next 3-5 years</p>
                    
                    {/* Configuration Status */}
                    {!multiYearConfig.configured && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="text-yellow-800 font-medium">Configuration Required</p>
                        <p className="text-yellow-700">Set planning parameters first</p>
                      </div>
                    )}
                    
                    {multiYearConfig.configured && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-800 font-medium">Configured</p>
                        <p className="text-blue-700">
                          {planningHorizon.endYear - planningHorizon.startYear + 1} years, 
                          {multiYearConfig.implementationSpeed} pace
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-1">
                      {!multiYearConfig.configured ? (
                        <Button
                          onClick={() => setShowMultiYearConfig(true)}
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
                            onClick={() => handleRunAnalysis('multi-year')}
                            disabled={analysisInProgress['multi-year'] || !optimizationResults.basic}
                            className="flex-1 text-xs"
                            variant="outline"
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
                          <Button
                            onClick={() => setShowMultiYearConfig(true)}
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

                  {/* Budget Impact Analysis */}
                  <BudgetImpactAnalysis
                    sessionId={sessionId}
                    sessionInfo={sessionInfo}
                    activeResultsView={activeResultsView}
                    setActiveResultsView={setActiveResultsView}
                    analysisInProgress={analysisInProgress}
                    optimizationResults={optimizationResults}
                    setOptimizationResults={setOptimizationResults}
                    setError={setError}
                    runAnalysis={runAnalysis}
                  />

                </div>



              </CardContent>
            </Card>
          </div>

          {/* Main Results Area */}
          <div className="lg:col-span-3 space-y-6">
            


            {/* Multi-Year Configuration Modal */}
            {showMultiYearConfig && (
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span>Multi-Year Planning Configuration</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowMultiYearConfig(false)}
                    >
                      ✕
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Planning Horizon */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Planning Horizon</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual Budget Growth (%)</label>
                        <input
                          type="number"
                          min={-5}
                          max={15}
                          step={0.5}
                          value={planningHorizon.budgetGrowth || 3}
                          onChange={(e) => setPlanningHorizon(prev => ({ ...prev, budgetGrowth: parseFloat(e.target.value) || 3 }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          aria-label="Annual budget growth percentage"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Target Configuration */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Performance Targets</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target FSFVI Score</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="0.1"
                          value={multiYearConfig.targetFsfvi ? multiYearConfig.targetFsfvi.toString() : ''}
                          onChange={(e) => setMultiYearConfig(prev => ({ 
                            ...prev, 
                            targetFsfvi: e.target.value && !isNaN(parseFloat(e.target.value)) ? parseFloat(e.target.value) : undefined 
                          }))}
                          placeholder="e.g., 0.015"
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">Lower scores indicate better performance</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Achievement Year</label>
                        <input
                          type="number"
                          min={planningHorizon.startYear + 1}
                          max={planningHorizon.endYear}
                          value={multiYearConfig.targetYear ? multiYearConfig.targetYear.toString() : ''}
                          onChange={(e) => setMultiYearConfig(prev => ({ 
                            ...prev, 
                            targetYear: e.target.value && !isNaN(parseInt(e.target.value)) ? parseInt(e.target.value) : undefined 
                          }))}
                          placeholder={`e.g., ${planningHorizon.startYear + 3}`}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Implementation Strategy */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Implementation Strategy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Implementation Speed</label>
                        <select
                          value={multiYearConfig.implementationSpeed}
                          onChange={(e) => setMultiYearConfig(prev => ({ 
                            ...prev, 
                            implementationSpeed: e.target.value as 'gradual' | 'moderate' | 'aggressive'
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          aria-label="Implementation speed selection"
                        >
                          <option value="gradual">Gradual (15% max annual change)</option>
                          <option value="moderate">Moderate (30% max annual change)</option>
                          <option value="aggressive">Aggressive (50% max annual change)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Risk Tolerance</label>
                        <select
                          value={multiYearConfig.riskTolerance}
                          onChange={(e) => setMultiYearConfig(prev => ({ 
                            ...prev, 
                            riskTolerance: e.target.value as 'low' | 'medium' | 'high'
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          aria-label="Risk tolerance level selection"
                        >
                          <option value="low">Low (Conservative approach)</option>
                          <option value="medium">Medium (Balanced approach)</option>
                          <option value="high">High (Bold transformation)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Priority Areas */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Priority Focus Areas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['agricultural_development', 'infrastructure', 'governance_institutions', 'nutrition_health', 'climate_natural_resources', 'social_protection_equity'].map(area => (
                        <label key={area} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={multiYearConfig.priorityAreas.includes(area)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMultiYearConfig(prev => ({ 
                                  ...prev, 
                                  priorityAreas: [...prev.priorityAreas, area] 
                                }));
                              } else {
                                setMultiYearConfig(prev => ({ 
                                  ...prev, 
                                  priorityAreas: prev.priorityAreas.filter(a => a !== area) 
                                }));
                              }
                            }}
                            className="text-blue-600"
                          />
                          <span className="text-sm">{area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowMultiYearConfig(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => completeMultiYearConfig({})}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Configure & Run Analysis
                    </Button>
                  </div>

                </CardContent>
              </Card>
            )}









            {/* Results Display using dedicated components */}
            {!optimizationResults.basic && !loading && (
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
              <OptimizationResults
                result={optimizationResults.basic}
              />
            )}

            {/* Multi-Year Results Component */}
            {optimizationResults.multiYear && activeResultsView === 'multi-year' && (
              <MultiYearResults
                result={optimizationResults.multiYear}
              />
            )}



                        {/* Budget Sensitivity Results are now handled by BudgetImpactAnalysis component */}

          </div>
        </div>
      </div>
    </div>
  );
} 