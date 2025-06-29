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
  Shield,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Lightbulb,
  HelpCircle
} from 'lucide-react';
import { AnalysisNavigation } from '@/components/analysis/AnalysisNavigation';
import { 
  analysisAPI, 
  dataAPI,
  MultiYearPlan, 
  ScenarioComparison, 
  BudgetSensitivityAnalysis,
  ComponentOptimizationResult,
  BudgetRecommendationResult,
  EfficiencyCurveResult
} from '@/lib/api';

// Import dedicated optimization components
import { OptimizationHeader } from '@/components/optimization/OptimizationHeader';
import { OptimizationResults } from '@/components/optimization/OptimizationResults';
import { MultiYearResults } from '@/components/optimization/MultiYearResults';

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

interface TargetAchievementConfig {
  configured: boolean;
  targetFsfvi?: number;
  targetYear?: number;
  method: string;
  scenario: string;
  optimizationApproach: 'budget_adjustment' | 'reallocation_only';
  constraints: {
    minAllocation: number;
    maxAllocation: number;
    transitionLimit: number;
  };
}

interface CrisisScenariosConfig {
  configured: boolean;
  selectedScenarios: string[];
  methods: string[];
  analysisDepth: 'basic' | 'comprehensive';
  constraints: {
    minAllocation: number;
    maxAllocation: number;
    transitionLimit: number;
  };
}

interface ResilienceAssessmentConfig {
  configured: boolean;
  testScenarios: string[];
  method: string;
  resilienceMetrics: string[];
  assessmentType: 'current_allocation' | 'optimized_allocation';
}

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
  scenarioComparison?: ScenarioComparison;
  budgetSensitivity?: BudgetSensitivityAnalysis;
  targetBased?: OptimizationResult;
  crisisResilience?: OptimizationResult;
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
  const [showTargetAchievementConfig, setShowTargetAchievementConfig] = useState(false);
  const [showCrisisScenariosConfig, setShowCrisisScenariosConfig] = useState(false);
  const [showResilienceAssessmentConfig, setShowResilienceAssessmentConfig] = useState(false);
  
  // Individual analysis configurations
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

  const [targetAchievementConfig, setTargetAchievementConfig] = useState<TargetAchievementConfig>({
    configured: false,
    method: 'hybrid',
    scenario: 'normal_operations',
    optimizationApproach: 'reallocation_only',
    constraints: {
      minAllocation: 1,
      maxAllocation: 40,
      transitionLimit: 30
    }
  });

  const [crisisScenariosConfig, setCrisisScenariosConfig] = useState<CrisisScenariosConfig>({
    configured: false,
    selectedScenarios: ['climate_shock', 'financial_crisis', 'pandemic_disruption', 'cyber_threats'],
    methods: ['hybrid', 'expert', 'network', 'financial'],
    analysisDepth: 'comprehensive',
    constraints: {
      minAllocation: 1,
      maxAllocation: 40,
      transitionLimit: 30
    }
  });

  const [resilienceAssessmentConfig, setResilienceAssessmentConfig] = useState<ResilienceAssessmentConfig>({
    configured: false,
    testScenarios: ['climate_shock', 'financial_crisis', 'pandemic_disruption', 'cyber_threats'],
    method: 'hybrid',
    resilienceMetrics: ['adaptability', 'recovery_speed', 'stability'],
    assessmentType: 'optimized_allocation'
  });
  
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

  const runScenarioComparison = async () => {
    if (!crisisScenariosConfig.configured) {
      setShowCrisisScenariosConfig(true);
      setError('Please configure crisis scenarios settings first.');
      return;
    }

    await runAnalysis('scenario-comparison', async () => {
      const token = getToken();
      const scenarios = crisisScenariosConfig.selectedScenarios;
      const methods = crisisScenariosConfig.methods;
      
      const result = await analysisAPI.scenarioComparison(
        sessionId,
        token,
        scenarios,
        methods,
        sessionInfo?.total_budget,
        crisisScenariosConfig.constraints
      );
      
      setOptimizationResults(prev => ({ ...prev, scenarioComparison: result }));
      return result;
    });
  };

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

  const runTargetBasedOptimization = async () => {
    if (!targetAchievementConfig.configured) {
      setShowTargetAchievementConfig(true);
      setError('Please configure target achievement settings first.');
      return;
    }

    await runAnalysis('target-based', async () => {
      const token = getToken();
      const targetFsfvi = targetAchievementConfig.targetFsfvi || 0.015;
      const targetYear = targetAchievementConfig.targetYear || new Date().getFullYear() + 3;
      
      const result = await analysisAPI.targetBasedOptimization(
        sessionId,
        token,
        targetFsfvi,
        targetYear,
        targetAchievementConfig.method,
        targetAchievementConfig.scenario,
        targetAchievementConfig.constraints
      );
      
      setOptimizationResults(prev => ({ ...prev, targetBased: result }));
      return result;
    });
  };

  const runCrisisResilienceAssessment = async () => {
    if (!resilienceAssessmentConfig.configured) {
      setShowResilienceAssessmentConfig(true);
      setError('Please configure resilience assessment settings first.');
      return;
    }

    await runAnalysis('crisis-resilience', async () => {
      const token = getToken();
      const testScenarios = resilienceAssessmentConfig.testScenarios;
      
      const result = await analysisAPI.crisisResilienceAssessment(
        sessionId,
        token,
        testScenarios,
        resilienceAssessmentConfig.method
      );
      
      setOptimizationResults(prev => ({ ...prev, crisisResilience: result }));
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
      case 'scenario-comparison':
        runScenarioComparison();
        break;
      case 'budget-sensitivity':
        runBudgetSensitivity();
        break;
      case 'target-based':
        runTargetBasedOptimization();
        break;
      case 'crisis-resilience':
        runCrisisResilienceAssessment();
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
                            onClick={() => handleRunAnalysis('budget-sensitivity')}
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

                  {/* Target Achievement */}
                  <div className={`p-3 rounded-lg border ${activeResultsView === 'target-based' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-sm font-medium">Target Achievement</h6>
                      <div className="flex items-center space-x-1">
                      {optimizationResults.targetBased && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {targetAchievementConfig.configured && <CheckCircle className="w-3 h-3 text-blue-600" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Find budget needed to achieve specific goals</p>
                    
                    {!targetAchievementConfig.configured && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="text-yellow-800 font-medium">Configuration Required</p>
                        <p className="text-yellow-700">Set target FSFVI and year first</p>
                      </div>
                    )}
                    
                    {targetAchievementConfig.configured && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-800 font-medium">Configured</p>
                        <p className="text-blue-700">
                          Target: {targetAchievementConfig.targetFsfvi?.toFixed(3) || '0.015'} by {targetAchievementConfig.targetYear || new Date().getFullYear() + 3}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-1">
                      {!targetAchievementConfig.configured ? (
                        <Button
                          onClick={() => setShowTargetAchievementConfig(true)}
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
                      onClick={() => handleRunAnalysis('target-based')}
                      disabled={analysisInProgress['target-based'] || !optimizationResults.basic}
                            className="flex-1 text-xs"
                      variant="outline"
                      size="sm"
                    >
                      {analysisInProgress['target-based'] ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Target className="w-3 h-3 mr-1" />
                                Run Analysis
                        </>
                      )}
                    </Button>
                          <Button
                            onClick={() => setShowTargetAchievementConfig(true)}
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
                </div>

                {/* Crisis & Risk Simulations */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-700 text-sm">Crisis Preparedness</h5>
                  
                  {/* Crisis Scenarios */}
                  <div className={`p-3 rounded-lg border ${activeResultsView === 'scenario-comparison' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-sm font-medium">Crisis Scenarios</h6>
                      <div className="flex items-center space-x-1">
                      {optimizationResults.scenarioComparison && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {crisisScenariosConfig.configured && <CheckCircle className="w-3 h-3 text-blue-600" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Test allocation against different crisis scenarios</p>
                    
                    {!crisisScenariosConfig.configured && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="text-yellow-800 font-medium">Configuration Required</p>
                        <p className="text-yellow-700">Select scenarios and methods first</p>
                      </div>
                    )}
                    
                    {crisisScenariosConfig.configured && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-800 font-medium">Configured</p>
                        <p className="text-blue-700">
                          {crisisScenariosConfig.selectedScenarios.length} scenarios, {crisisScenariosConfig.analysisDepth}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-1">
                      {!crisisScenariosConfig.configured ? (
                        <Button
                          onClick={() => setShowCrisisScenariosConfig(true)}
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
                      onClick={() => handleRunAnalysis('scenario-comparison')}
                      disabled={analysisInProgress['scenario-comparison'] || !optimizationResults.basic}
                            className="flex-1 text-xs"
                      variant="outline"
                      size="sm"
                    >
                      {analysisInProgress['scenario-comparison'] ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                                Run Analysis
                        </>
                      )}
                    </Button>
                          <Button
                            onClick={() => setShowCrisisScenariosConfig(true)}
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

                  {/* Resilience Assessment */}
                  <div className={`p-3 rounded-lg border ${activeResultsView === 'crisis-resilience' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-sm font-medium">Resilience Assessment</h6>
                      <div className="flex items-center space-x-1">
                      {optimizationResults.crisisResilience && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {resilienceAssessmentConfig.configured && <CheckCircle className="w-3 h-3 text-blue-600" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Assess overall crisis preparedness</p>
                    
                    {!resilienceAssessmentConfig.configured && (
                      <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="text-yellow-800 font-medium">Configuration Required</p>
                        <p className="text-yellow-700">Set assessment parameters first</p>
                      </div>
                    )}
                    
                    {resilienceAssessmentConfig.configured && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="text-blue-800 font-medium">Configured</p>
                        <p className="text-blue-700">
                          {resilienceAssessmentConfig.testScenarios.length} scenarios, {resilienceAssessmentConfig.assessmentType}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex space-x-1">
                      {!resilienceAssessmentConfig.configured ? (
                        <Button
                          onClick={() => setShowResilienceAssessmentConfig(true)}
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
                      onClick={() => handleRunAnalysis('crisis-resilience')}
                      disabled={analysisInProgress['crisis-resilience'] || !optimizationResults.basic}
                            className="flex-1 text-xs"
                      variant="outline"
                      size="sm"
                    >
                      {analysisInProgress['crisis-resilience'] ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Assessing...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                                Run Assessment
                        </>
                      )}
                    </Button>
                    <Button
                            onClick={() => setShowResilienceAssessmentConfig(true)}
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

            {/* Budget Impact Analysis Configuration Modal */}
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
                        setTimeout(() => handleRunAnalysis('budget-sensitivity'), 500);
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

            {/* Target Achievement Configuration Modal */}
            {showTargetAchievementConfig && (
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-orange-600" />
                      <span>Target Achievement Configuration</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowTargetAchievementConfig(false)}>✕</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Target Parameters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target FSFVI Score</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="0.1"
                          value={targetAchievementConfig.targetFsfvi || ''}
                          onChange={(e) => setTargetAchievementConfig(prev => ({ 
                            ...prev, 
                            targetFsfvi: parseFloat(e.target.value) || undefined 
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="e.g., 0.015"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Year</label>
                        <input
                          type="number"
                          value={targetAchievementConfig.targetYear || ''}
                          onChange={(e) => setTargetAchievementConfig(prev => ({ 
                            ...prev, 
                            targetYear: parseInt(e.target.value) || undefined 
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder={`e.g., ${new Date().getFullYear() + 3}`}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowTargetAchievementConfig(false)}>Cancel</Button>
                    <Button 
                      onClick={() => {
                        setTargetAchievementConfig(prev => ({ ...prev, configured: true }));
                        setShowTargetAchievementConfig(false);
                        setTimeout(() => handleRunAnalysis('target-based'), 500);
                      }}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Configure & Run Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Crisis Scenarios Configuration Modal */}
            {showCrisisScenariosConfig && (
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <span>Crisis Scenarios Configuration</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowCrisisScenariosConfig(false)}>✕</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Scenario Selection</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['climate_shock', 'financial_crisis', 'pandemic_disruption', 'cyber_threats'].map(scenario => (
                        <label key={scenario} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={crisisScenariosConfig.selectedScenarios.includes(scenario)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCrisisScenariosConfig(prev => ({ 
                                  ...prev, 
                                  selectedScenarios: [...prev.selectedScenarios, scenario] 
                                }));
                              } else {
                                setCrisisScenariosConfig(prev => ({ 
                                  ...prev, 
                                  selectedScenarios: prev.selectedScenarios.filter(s => s !== scenario) 
                                }));
                              }
                            }}
                          />
                          <span className="text-sm">{scenario.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowCrisisScenariosConfig(false)}>Cancel</Button>
                    <Button 
                      onClick={() => {
                        setCrisisScenariosConfig(prev => ({ ...prev, configured: true }));
                        setShowCrisisScenariosConfig(false);
                        setTimeout(() => handleRunAnalysis('scenario-comparison'), 500);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Configure & Run Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resilience Assessment Configuration Modal */}
            {showResilienceAssessmentConfig && (
              <Card className="border-0 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>Resilience Assessment Configuration</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowResilienceAssessmentConfig(false)}>✕</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Assessment Parameters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Type</label>
                        <select
                          value={resilienceAssessmentConfig.assessmentType}
                          onChange={(e) => setResilienceAssessmentConfig(prev => ({ 
                            ...prev, 
                            assessmentType: e.target.value as 'current_allocation' | 'optimized_allocation'
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="current_allocation">Current Allocation</option>
                          <option value="optimized_allocation">Optimized Allocation</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Method</label>
                        <select
                          value={resilienceAssessmentConfig.method}
                          onChange={(e) => setResilienceAssessmentConfig(prev => ({ ...prev, method: e.target.value }))}
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
                  <div className="flex justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowResilienceAssessmentConfig(false)}>Cancel</Button>
                    <Button 
                      onClick={() => {
                        setResilienceAssessmentConfig(prev => ({ ...prev, configured: true }));
                        setShowResilienceAssessmentConfig(false);
                        setTimeout(() => handleRunAnalysis('crisis-resilience'), 500);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Configure & Run Assessment
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

            {/* Scenario Comparison Results */}
            {optimizationResults.scenarioComparison && activeResultsView === 'scenario-comparison' && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 text-purple-600" />
                    <span>Crisis Scenario Analysis Results</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600">Scenarios Analyzed</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {optimizationResults.scenarioComparison.scenarios_analyzed?.length || 0}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-indigo-600">Methods Compared</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {optimizationResults.scenarioComparison.methods_analyzed?.length || 0}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Most Robust Method</p>
                      <p className="text-lg font-bold text-blue-900">
                        {optimizationResults.scenarioComparison.robust_recommendations?.most_robust_method || 'Hybrid'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-cyan-50 rounded-lg">
                      <p className="text-sm text-cyan-600">System Resilience</p>
                      <p className="text-2xl font-bold text-cyan-900">
                        {((optimizationResults.scenarioComparison.risk_analysis?.overall_system_resilience || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Sensitivity Results */}
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
                      
                      {/* Enhanced Fund Allocation Breakdown */}
                      <div className="mt-6 space-y-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Detailed Fund Allocation Breakdown</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          See exactly how additional budget is allocated across components for optimal impact.
                        </p>
                        
                                                {optimizationResults.budgetSensitivity?.budget_analysis && (() => {
                          // Get baseline (0% variation) optimal allocations for comparison
                          const baselineResult = optimizationResults.budgetSensitivity?.budget_analysis?.['0'];
                          const baselineAllocations = baselineResult?.optimal_allocations || [];
                          
                          return Object.entries(optimizationResults.budgetSensitivity?.budget_analysis || {})
                            .filter(([variation, result]) => parseFloat(variation) > 0 && !result.error)
                            .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                            .map(([variation, result]) => {
                              const budgetIncrease = result.budget - (optimizationResults.budgetSensitivity?.base_budget || 0);
                              const budgetChangePercent = parseFloat(variation) * 100;
                              
                              return (
                                <div key={variation} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-semibold text-gray-900">
                                      Budget Increase: +${budgetIncrease.toFixed(1)}M ({budgetChangePercent.toFixed(0)}%)
                                    </h5>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                      {result.improvement_percent?.toFixed(1) || 0}% Better Performance
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Strategic Investments */}
                                    <div>
                                      <h6 className="font-medium text-green-800 mb-2 flex items-center">
                                        💰 Additional Funding Allocation
                                      </h6>
                                      <div className="space-y-2 text-sm">
                                        {result.optimal_allocations?.map((allocation, index) => {
                                          // Compare against baseline optimal allocation (not current allocation)
                                          const baselineAllocation = baselineAllocations[index] || 0;
                                          const change = allocation - baselineAllocation;
                                          const componentNames = ['Agricultural Development', 'Climate & Natural Resources', 'Governance & Institutions', 'Infrastructure', 'Nutrition & Health', 'Social Protection'];
                                          
                                          // Show all components with their allocation changes
                                          return (
                                            <div key={index} className={`p-2 rounded ${change > 0 ? 'bg-green-50 border border-green-200' : change < 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-200'}`}>
                                              <div className="flex justify-between items-center">
                                                <span className="font-medium">
                                                  {componentNames[index] || `Component ${index + 1}`}
                                                </span>
                                                <span className={`font-semibold ${change > 0 ? 'text-green-700' : change < 0 ? 'text-yellow-700' : 'text-gray-700'}`}>
                                                  {change > 0 ? '+' : ''}{change.toFixed(1)}M
                                                </span>
                                              </div>
                                              <div className="flex justify-between items-center text-xs text-gray-600 mt-1">
                                                <span>
                                                  {change > 0 
                                                    ? index === 3 ? 'Critical infrastructure investment' :
                                                      index === 2 ? 'Institutional capacity building' :
                                                      index === 1 ? 'Climate resilience programs' :
                                                      index === 4 ? 'Health system strengthening' :
                                                      index === 0 ? 'Agricultural enhancement' :
                                                      'Performance enhancement'
                                                    : change < 0 
                                                    ? 'Efficiency optimization'
                                                    : 'Maintained level'
                                                  }
                                                </span>
                                                <span className="font-mono">
                                                  ${baselineAllocation.toFixed(1)}M → ${allocation.toFixed(1)}M
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      
                                      {/* Verification */}
                                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Total Additional Allocation:</span>
                                          <span className="font-mono">
                                            +{result.optimal_allocations?.reduce((sum, allocation, index) => {
                                              const baselineAllocation = baselineAllocations[index] || 0;
                                              return sum + (allocation - baselineAllocation);
                                            }, 0).toFixed(1) || 0}M
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Expected Additional Budget:</span>
                                          <span className="font-mono">+{budgetIncrease.toFixed(1)}M</span>
                                        </div>
                                      </div>
                                    </div>
                                  
                                  {/* Impact Summary */}
                                  <div>
                                    <h6 className="font-medium text-blue-800 mb-2 flex items-center">
                                      📈 Expected Impact
                                    </h6>
                                    <div className="space-y-2 text-sm">
                                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                                        <div className="flex justify-between">
                                          <span className="flex items-center">
                                            FSFVI Improvement:
                                            <Tooltip content="Percentage reduction in Food Systems Financial Vulnerability Index. FSFVI ranges from 0 (perfect) to 1 (maximum vulnerability). Lower FSFVI scores indicate better food system performance and resilience.">
                                              <HelpCircle className="w-3 h-3 ml-1 text-blue-600" />
                                            </Tooltip>
                                          </span>
                                          <span className="font-semibold text-blue-700">
                                            {result.improvement_percent?.toFixed(1) || 0}%
                                          </span>
                                        </div>
                                      </div>
                                                                             <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                                         <div className="flex justify-between">
                                           <span className="flex items-center">
                                             Cost Effectiveness:
                                             <Tooltip content="Measures food system resilience gained per million dollars invested. Higher values mean better value for money. This shows how efficiently your budget converts into food system improvements.">
                                               <HelpCircle className="w-3 h-3 ml-1 text-blue-600" />
                                             </Tooltip>
                                           </span>
                                           <span className="font-semibold text-blue-700">
                                             {result.efficiency_per_million?.toFixed(2) || 0} per $M
                                           </span>
                                         </div>
                                       </div>
                                       <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                                         <div className="flex justify-between">
                                           <span className="flex items-center">
                                             Marginal Effectiveness:
                                             <Tooltip content="Shows how much FSFVI improvement you get per 1% budget change. Higher values indicate better return on investment. Values above 20 are excellent, above 10 are good, above 5 are fair.">
                                               <HelpCircle className="w-3 h-3 ml-1 text-blue-600" />
                                             </Tooltip>
                                           </span>
                                           <span className="font-semibold text-blue-700">
                                             {optimizationResults.budgetSensitivity?.marginal_impact?.[variation]?.marginal_effectiveness?.toFixed(2) || 0}
                                           </span>
                                         </div>
                                         <div className="text-xs text-blue-600 mt-1">
                                           Improvement gained per 1% budget change (weighted & optimized)
                                         </div>
                                       </div>
                                                                             <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                                         <div className="flex justify-between">
                                           <span className="flex items-center">
                                             ROI Rating:
                                                                                            <Tooltip content="Return on Investment rating based on marginal effectiveness. Excellent (above 20): Outstanding returns, highly recommended. Good (above 10): Strong returns, recommended. Fair (above 5): Moderate returns, consider carefully. Low (5 or below): Poor returns, not recommended.">
                                               <HelpCircle className="w-3 h-3 ml-1 text-blue-600" />
                                             </Tooltip>
                                           </span>
                                           <span className={`font-semibold ${
                                             (() => {
                                               // Get marginal effectiveness from marginal impact analysis for consistent rating
                                               const marginalData = optimizationResults.budgetSensitivity?.marginal_impact?.[variation];
                                               const marginalEffectiveness = marginalData?.marginal_effectiveness || 0;
                                               
                                               if (marginalEffectiveness > 20) return 'text-green-800';      // Excellent
                                               if (marginalEffectiveness > 10) return 'text-green-600';      // Good
                                               if (marginalEffectiveness > 5) return 'text-yellow-600';      // Fair
                                               return 'text-red-600';                                        // Low
                                             })()
                                           }`}>
                                             {(() => {
                                               // Use same logic as marginal impact analysis for consistency
                                               const marginalData = optimizationResults.budgetSensitivity?.marginal_impact?.[variation];
                                               const marginalEffectiveness = marginalData?.marginal_effectiveness || 0;
                                               
                                               if (marginalEffectiveness > 20) return 'Excellent';
                                               if (marginalEffectiveness > 10) return 'Good';  
                                               if (marginalEffectiveness > 5) return 'Fair';
                                               return 'Low';
                                             })()}
                                           </span>
                                         </div>
                                       </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Key Insight */}
                                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                  <p className="text-sm text-indigo-800">
                                    <strong>💡 Key Insight:</strong> {
                                      budgetChangePercent <= 10 
                                        ? "Small budget increases can yield significant improvements through strategic reallocation."
                                        : budgetChangePercent <= 30
                                        ? "Moderate budget increases enable major infrastructure and governance investments."
                                        : "Large budget increases show diminishing returns but enable comprehensive system transformation."
                                    }
                                  </p>
                                </div>
                              </div>
                            );
                                                                     });
                        })()}
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

                        {/* Detailed Recommendations Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Scenario</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Recommended Budget</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Expected Improvement</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                                  <div className="flex items-center">
                                    Cost-Effectiveness
                                                                         <Tooltip content="Food system resilience units gained per million dollars. Higher values indicate more efficient use of budget resources.">
                                      <HelpCircle className="w-3 h-3 ml-1 text-gray-500" />
                                    </Tooltip>
                                  </div>
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Feasibility</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(optimizationResults.budgetSensitivity.optimal_budget_recommendations).map(([variation, rec]: [string, BudgetRecommendationResult]) => {
                                const budgetChange = parseFloat(variation);
                                const feasibility = Math.abs(budgetChange) <= 0.2 ? 'High' : Math.abs(budgetChange) <= 0.5 ? 'Medium' : 'Low';
                                const feasibilityColor = feasibility === 'High' ? 'text-green-600' : feasibility === 'Medium' ? 'text-yellow-600' : 'text-red-600';
                                
                                return (
                                  <tr key={variation} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                      <div className="flex items-center space-x-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          budgetChange > 0 
                                            ? 'bg-green-100 text-green-800' 
                                            : budgetChange < 0 
                                            ? 'bg-red-100 text-red-800' 
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {budgetChange > 0 ? '+' : ''}{(budgetChange * 100).toFixed(0)}%
                                        </span>
                                        <span className="text-sm text-gray-600">
                                          {budgetChange > 0 ? 'Increase' : budgetChange < 0 ? 'Decrease' : 'Maintain'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono font-semibold">
                                      {rec.error ? (
                                        <span className="text-red-600">Not viable</span>
                                      ) : (
                                        `$${rec.recommended_budget?.toFixed(1) || 0}M`
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      {rec.error ? (
                                        <span className="text-red-600">—</span>
                                      ) : (
                                        <span className="font-medium text-green-600">
                                          +{rec.improvement_percent?.toFixed(1) || 0}%
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-sm">
                                      {rec.error ? (
                                        <span className="text-red-600">—</span>
                                      ) : (
                                        rec.efficiency_per_million?.toFixed(3) || '—'
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      {rec.error ? (
                                        <span className="text-red-600">Not feasible</span>
                                      ) : (
                                        <span className={`font-medium ${feasibilityColor}`}>
                                          {feasibility}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

                {/* Efficiency Analysis */}
                {optimizationResults.budgetSensitivity.efficiency_curves && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <span>Budget Efficiency Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                      <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <h4 className="font-semibold text-indigo-800 mb-2">Understanding Budget Efficiency</h4>
                        <p className="text-sm text-indigo-700 mb-2">
                          This analysis shows the relationship between budget levels and system performance. 
                          The efficiency curve helps identify the optimal budget range where you get the best value for money.
                      </p>
                                                <div className="text-xs text-indigo-600 mt-1">
                          This measures &ldquo;resilience units gained per million dollars invested&rdquo;
                        </div>
                    </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Enhanced Efficiency Table */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Efficiency by Budget Level</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="border-b-2 border-gray-200">
                                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-900">Budget Change</th>
                                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-900">
                                    <div className="flex items-center">
                                      FSFVI Score
                                      <Tooltip content="Food Systems Financial Vulnerability Index. Lower scores indicate better performance and resilience.">
                                        <HelpCircle className="w-3 h-3 ml-1 text-gray-500" />
                                      </Tooltip>
                                    </div>
                                  </th>
                                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-900">
                                    <div className="flex items-center">
                                      Efficiency
                                      <Tooltip content="Resilience units gained per million USD invested. Calculated as (1 - FSFVI) ÷ Budget in millions. Higher values indicate better value for money.">
                                        <HelpCircle className="w-3 h-3 ml-1 text-gray-500" />
                                      </Tooltip>
                                    </div>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(optimizationResults.budgetSensitivity.efficiency_curves)
                                  .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                                  .map(([variation, curve]: [string, EfficiencyCurveResult]) => {
                                    const budgetChange = parseFloat(variation);
                                    const efficiency = curve.efficiency_per_million || 0;
                                    
                                    return (
                                      <tr key={variation} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-3">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            budgetChange > 0 
                                              ? 'bg-green-100 text-green-800' 
                                              : budgetChange < 0 
                                              ? 'bg-red-100 text-red-800' 
                                              : 'bg-gray-100 text-gray-800'
                                          }`}>
                                            {budgetChange > 0 ? '+' : ''}{(budgetChange * 100).toFixed(0)}%
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 font-mono">
                                          {curve.error ? (
                                            <span className="text-red-600 text-xs">Failed</span>
                                          ) : (
                                            <span className={`${curve.fsfvi && curve.fsfvi < 0.3 ? 'text-green-600' : curve.fsfvi && curve.fsfvi < 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                                              {curve.fsfvi?.toFixed(4) || '—'}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3 px-3 font-mono font-semibold">
                                          {curve.error ? (
                                            <span className="text-red-600 text-xs">—</span>
                                          ) : (
                                            <span className={efficiency > 180 ? 'text-green-600' : efficiency > 160 ? 'text-blue-600' : efficiency > 140 ? 'text-yellow-600' : 'text-red-600'}>
                                              {efficiency.toFixed(3)}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                    </div>
                        </div>

                        {/* Dynamic Key Insights based on actual data */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Key Insights</h4>
                          <div className="space-y-3">
                            {/* Best Efficiency Point - Dynamic calculation */}
                            {(() => {
                              const validEfficiencies = Object.entries(optimizationResults.budgetSensitivity.efficiency_curves)
                                .filter(([, curve]: [string, EfficiencyCurveResult]) => !curve.error && curve.efficiency_per_million > 0)
                                .map(([variation, curve]) => ({
                                  variation: parseFloat(variation),
                                  efficiency: curve.efficiency_per_million,
                                  fsfvi: curve.fsfvi
                                }));
                              
                              if (validEfficiencies.length > 0) {
                                const bestEfficiencyPoint = validEfficiencies.reduce((best, current) => 
                                  current.efficiency > best.efficiency ? current : best
                                );
                                
                                const isBaseline = Math.abs(bestEfficiencyPoint.variation) < 0.001;
                                
                                return (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <h5 className="font-medium text-green-800 mb-1 flex items-center">
                                      🎯 Most Efficient Budget Level
                                    </h5>
                                    <p className="text-sm text-green-700 mb-2">
                                      {isBaseline 
                                        ? `Current budget (maintain level) provides the highest efficiency at ${bestEfficiencyPoint.efficiency.toFixed(3)} resilience units per million USD.`
                                        : `${bestEfficiencyPoint.variation > 0 ? '+' : ''}${(bestEfficiencyPoint.variation * 100).toFixed(0)}% budget change provides the highest efficiency at ${bestEfficiencyPoint.efficiency.toFixed(3)} resilience units per million USD.`
                                      }
                                    </p>
                                    <div className="text-xs text-green-600 font-mono">
                                      FSFVI: {bestEfficiencyPoint.fsfvi?.toFixed(4)} | Resilience: {(1 - bestEfficiencyPoint.fsfvi).toFixed(4)}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Diminishing Returns Analysis - Dynamic */}
                            {(() => {
                              const efficiencies = Object.entries(optimizationResults.budgetSensitivity.efficiency_curves)
                                .filter(([, curve]: [string, EfficiencyCurveResult]) => !curve.error)
                                .map(([variation, curve]) => ({
                                  variation: parseFloat(variation),
                                  efficiency: curve.efficiency_per_million || 0
                                }))
                                .sort((a, b) => a.variation - b.variation);
                              
                              // Check for diminishing returns pattern
                              const diminishingPoint = efficiencies.find((point, index) => {
                                if (index === 0) return false;
                                const prevPoint = efficiencies[index - 1];
                                return point.variation > 0.2 && point.efficiency < prevPoint.efficiency * 0.9; // 10% drop
                              });
                              
                              return (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <h5 className="font-medium text-yellow-800 mb-1 flex items-center">
                                    📉 Diminishing Returns Analysis
                                  </h5>
                                  <p className="text-sm text-yellow-700">
                                    {diminishingPoint 
                                      ? `Diminishing returns detected at +${(diminishingPoint.variation * 100).toFixed(0)}% budget increase. Beyond this point, efficiency drops to ${diminishingPoint.efficiency.toFixed(3)} per million USD.`
                                      : "Budget increases show consistent returns within tested range. Consider strategic optimization within reasonable budget constraints."
                                    }
                                  </p>
                                </div>
                              );
                            })()}

                            {/* Efficiency Range Analysis */}
                            {(() => {
                              const validEfficiencies = Object.entries(optimizationResults.budgetSensitivity.efficiency_curves)
                                .filter(([, curve]: [string, EfficiencyCurveResult]) => !curve.error && curve.efficiency_per_million > 0)
                                .map(([, curve]) => curve.efficiency_per_million);
                              
                              if (validEfficiencies.length > 1) {
                                const maxEff = Math.max(...validEfficiencies);
                                const minEff = Math.min(...validEfficiencies);
                                const range = maxEff - minEff;
                                const avgEff = validEfficiencies.reduce((sum, eff) => sum + eff, 0) / validEfficiencies.length;
                                
                                return (
                                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h5 className="font-medium text-blue-800 mb-1 flex items-center">
                                      📊 Efficiency Range Analysis
                                    </h5>
                                    <div className="text-sm text-blue-700 space-y-1">
                                      <p><strong>Range:</strong> {minEff.toFixed(3)} to {maxEff.toFixed(3)} per million USD</p>
                                      <p><strong>Variation:</strong> {range.toFixed(3)} ({((range/avgEff) * 100).toFixed(1)}% of average)</p>
                                      <p><strong>Recommendation:</strong> {
                                        range/avgEff > 0.2 
                                          ? "Significant efficiency variation detected. Careful budget planning recommended."
                                          : "Consistent efficiency across budget levels. Focus on strategic priorities."
                                      }</p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Budget Reduction Feasibility */}
                            {(() => {
                              const failedReductions = Object.entries(optimizationResults.budgetSensitivity.efficiency_curves)
                                .filter(([variation, curve]: [string, EfficiencyCurveResult]) => 
                                  parseFloat(variation) < 0 && curve.error
                                ).length;
                              
                              if (failedReductions > 0) {
                                return (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <h5 className="font-medium text-red-800 mb-1 flex items-center">
                                      ⚠️ Budget Reduction Constraints
                                    </h5>
                                    <p className="text-sm text-red-700">
                                      {failedReductions} budget reduction scenario(s) failed optimization. 
                                      Current allocations may require minimum funding levels for component functionality.
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}


                          </div>
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