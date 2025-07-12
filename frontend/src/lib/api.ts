import axios from 'axios';

// API Base URL - Django backend
// In production, requests go through nginx to the same domain
// In development, direct to Django on port 8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
    console.log('🔑 API: Adding token to request:', config.url);
  } else {
    console.log('ℹ️ API: No token found for request:', config.url);
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API: Successful response from:', response.config.url);
    return response;
  },
  (error) => {
    console.log('❌ API: Error response from:', error.config?.url, 'Status:', error.response?.status);
    if (error.response?.status === 401) {
      console.log('🚫 API: 401 Unauthorized - clearing auth data');
      // Clear token but don't redirect here - let components handle it
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Don't use window.location.href as it causes redirect loops
      // Let the AuthContext and components handle the redirect
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: async (userData: RegisterData) => {
    const response = await api.post('/django-api/auth/register/', userData);
    return response.data;
  },

  login: async (credentials: LoginData) => {
    const response = await api.post('/django-api/auth/login/', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/django-api/auth/logout/');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/django-api/auth/profile/');
    return response.data;
  },

  // Session management - Updated to use django-api prefix
  getUserSessions: async () => {
    const response = await api.get('/django-api/sessions/');
    return response.data;
  },
};

// Data API endpoints for FSFVI analysis
export const dataAPI = {
  uploadCSV: async (formData: FormData) => {
    const response = await api.post('/django-api/upload-csv/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadDummyData: async (formData: FormData) => {
    const response = await api.post('/django-api/upload-dummy-data/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/django-api/dashboard/');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/django-api/analytics/');
    return response.data;
  },

  // All endpoints now use django-api prefix
  getUserSessions: async () => {
    const response = await api.get('/django-api/sessions/');
    return response.data;
  },

  getSessionDetails: async (sessionId: string) => {
    const response = await api.get(`/django-api/sessions/${sessionId}/`);
    return response.data;
  },

  clearSession: async (sessionId: string) => {
    const response = await api.delete(`/django-api/sessions/${sessionId}/delete/`);
    return response.data;
  },

  listUserSessions: async () => {
    const response = await api.get('/django-api/sessions/');
    return response.data;
  },

  getUserFiles: async () => {
    const response = await api.get('/django-api/my-files/');
    return response.data;
  },

  getSessionFileInfo: async (sessionId: string) => {
    const response = await api.get(`/django-api/sessions/${sessionId}/file-info/`);
    return response.data;
  },

  reprocessFile: async (sessionId: string) => {
    const response = await api.post(`/django-api/sessions/${sessionId}/reprocess/`);
    return response.data;
  },
};

// FastAPI Analysis endpoints - DEDICATED + COMPREHENSIVE API
// In production, requests go through nginx to /api path
// In development, direct to FastAPI on port 8001
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8001');

export const analysisAPI = {
  /*
   * DUAL ARCHITECTURE:
   * 1. DEDICATED ENDPOINTS: Individual analysis steps for step-by-step workflow
   * 2. COMPREHENSIVE ENDPOINT: All analyses in one call for speed
   * 
   * Use dedicated endpoints for:
   * - Step-by-step workflow visualization
   * - Individual analysis debugging
   * - Granular control over each step
   * 
   * Use comprehensive endpoint for:
   * - Fast complete analysis
   * - Production workflows
   * - Dashboard overview loading
   */

  // COMPREHENSIVE: All analyses in one call (fastest, for comprehensive workflow)
  analyzeSystem: async (sessionId: string, token: string, method = 'hybrid', scenario = 'normal_operations') => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('method', method);
    formData.append('scenario', scenario);
    formData.append('include_optimization_preview', 'true');

    const response = await fetch(`${FASTAPI_BASE_URL}/analyze_system`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('System analysis failed:', errorText);
      throw new Error(`System analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('System analysis result:', result);
    return result;
  },

  // DEDICATED: Current distribution analysis (calls dedicated endpoint)
  analyzeCurrentDistribution: async (sessionId: string, token: string) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('include_visualizations', 'true');

    const response = await fetch(`${FASTAPI_BASE_URL}/analyze_current_distribution`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Distribution analysis failed:', errorText);
      throw new Error(`Distribution analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Distribution analysis result:', result);
    return result;
  },

  // DEDICATED: Performance gaps calculation (calls dedicated endpoint)
  calculatePerformanceGaps: async (sessionId: string, token: string) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);

    const response = await fetch(`${FASTAPI_BASE_URL}/calculate_performance_gaps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Performance gaps calculation failed:', errorText);
      throw new Error(`Performance gaps calculation failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Performance gaps result:', result);
    return result;
  },

  calculateComponentVulnerabilities: async (sessionId: string, token: string, method = 'hybrid', scenario = 'normal_operations') => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('method', method);
    formData.append('scenario', scenario);

    const response = await fetch(`${FASTAPI_BASE_URL}/calculate_component_vulnerabilities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Component vulnerabilities calculation failed:', errorText);
      throw new Error(`Component vulnerabilities calculation failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Log the result to see the data structure
    console.log('Component vulnerabilities result:', result);
    
    // The enhanced API now returns the structure expected by ComponentVulnerabilityDetails directly
    // Return the result as-is since it now contains the enhanced structure
    return result;
  },

  // DEDICATED: System vulnerability calculation (calls dedicated endpoint)
  calculateSystemVulnerability: async (sessionId: string, token: string, method = 'hybrid', scenario = 'normal_operations') => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('method', method);
    formData.append('scenario', scenario);

    const response = await fetch(`${FASTAPI_BASE_URL}/calculate_system_vulnerability`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('System vulnerability calculation failed:', errorText);
      throw new Error(`System vulnerability calculation failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('System vulnerability result:', result);
    return result;
  },

  optimizeAllocation: async (sessionId: string, token: string, optimizationMethod = 'hybrid', budgetChangePercent = 0, constraints?: OptimizationConstraints, optimizationMode = 'traditional', newBudgetAmount?: number) => {
    // Enhanced validation for new budget requirement
    if (optimizationMode === 'new_budget') {
      if (!newBudgetAmount || newBudgetAmount <= 0) {
        throw new Error('New budget amount must be specified and greater than 0 for new budget optimization mode. Please configure the new budget amount in optimization settings.');
      }
      // Additional validation for reasonable budget amounts
      if (newBudgetAmount > 100000) { // More than 100 billion
        throw new Error('New budget amount seems unreasonably large. Please check the amount (should be in millions USD).');
      }
    }
    
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('method', optimizationMethod);
    formData.append('budget_change_percent', budgetChangePercent.toString());
    formData.append('optimization_mode', optimizationMode); // "traditional" or "new_budget"
    
    // Add new budget amount if specified
    if (newBudgetAmount !== undefined) {
      formData.append('new_budget_amount', newBudgetAmount.toString());
    }
    
    if (constraints) {
      formData.append('constraints', JSON.stringify(constraints));
    }

    const response = await fetch(`${FASTAPI_BASE_URL}/optimize_allocation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to optimize allocation');
    }

    return await response.json();
  },

  // NEW: Dedicated function for new budget optimization
  optimizeNewBudget: async (sessionId: string, token: string, newBudgetAmount: number, optimizationMethod = 'hybrid', constraints?: OptimizationConstraints) => {
    if (!newBudgetAmount || newBudgetAmount <= 0) {
      throw new Error('New budget amount must be specified and greater than 0');
    }
    
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('method', optimizationMethod);
    formData.append('new_budget_amount', newBudgetAmount.toString());
    formData.append('optimization_mode', 'new_budget');
    
    if (constraints) {
      formData.append('constraints', JSON.stringify(constraints));
    }

    const response = await fetch(`${FASTAPI_BASE_URL}/optimize_allocation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to optimize new budget allocation');
    }

    return await response.json();
  },

  // GOVERNMENT PLANNING TOOLS

  // Multi-year optimization for fiscal planning (NEW BUDGET CUMULATIVE APPROACH)
  multiYearOptimization: async (
    sessionId: string, 
    token: string, 
    budgetScenarios: Record<number, number>, 
    targetFsfvi?: number, 
    targetYear?: number, 
    method = 'hybrid', 
    scenario = 'normal_operations',
    constraints?: OptimizationConstraints
  ) => {
    // Validate that budget scenarios contain new budget amounts
    const budgetValues = Object.values(budgetScenarios);
    if (budgetValues.length === 0) {
      throw new Error('Budget scenarios must be provided for multi-year optimization');
    }
    
    // Validate reasonable budget amounts
    if (budgetValues.some(budget => budget <= 0)) {
      throw new Error('All budget scenarios must be positive values (in millions USD)');
    }
    
    if (budgetValues.some(budget => budget > 50000)) { // More than 50 billion per year
      throw new Error('Budget amounts seem unreasonably large. Please check amounts (should be in millions USD)');
    }
    
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('budget_scenarios', JSON.stringify(budgetScenarios));
    formData.append('method', method);
    formData.append('scenario', scenario);
    formData.append('optimization_mode', 'new_budget'); // Force new budget mode for multi-year
    
    if (targetFsfvi !== undefined) {
      formData.append('target_fsfvi', targetFsfvi.toString());
    }
    if (targetYear !== undefined) {
      formData.append('target_year', targetYear.toString());
    }
    if (constraints) {
      formData.append('constraints', JSON.stringify(constraints));
    }

    const response = await fetch(`${FASTAPI_BASE_URL}/multi_year_optimization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Multi-year optimization failed:', errorText);
      throw new Error(`Multi-year optimization failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Multi-year optimization result:', result);
    return result;
  },

  // Scenario comparison for crisis preparedness
  scenarioComparison: async (
    sessionId: string,
    token: string,
    scenarios: string[],
    methods: string[],
    budget?: number,
    constraints?: OptimizationConstraints
  ) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('scenarios', JSON.stringify(scenarios));
    formData.append('methods', JSON.stringify(methods));
    
    if (budget !== undefined) {
      formData.append('budget', budget.toString());
    }
    if (constraints) {
      formData.append('constraints', JSON.stringify(constraints));
    }

    const response = await fetch(`${FASTAPI_BASE_URL}/scenario_comparison`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Scenario comparison failed:', errorText);
      throw new Error(`Scenario comparison failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Scenario comparison result:', result);
    return result;
  },

  // Budget sensitivity analysis
  budgetSensitivityAnalysis: async (
    sessionId: string,
    token: string,
    baseBudget: number,
    budgetVariations: number[], // e.g., [-0.2, -0.1, 0, 0.1, 0.2]
    method = 'hybrid',
    scenario = 'normal_operations',
    constraints?: OptimizationConstraints
  ) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('base_budget', baseBudget.toString());
    formData.append('budget_variations', JSON.stringify(budgetVariations));
    formData.append('method', method);
    formData.append('scenario', scenario);
    
    if (constraints) {
      formData.append('constraints', JSON.stringify(constraints));
    }

    const response = await fetch(`${FASTAPI_BASE_URL}/budget_sensitivity_analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Budget sensitivity analysis failed:', errorText);
      throw new Error(`Budget sensitivity analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Budget sensitivity analysis result:', result);
    return result;
  },

  // Interactive optimization with user adjustments
  interactiveOptimization: async (
    sessionId: string,
    token: string,
    userAdjustments: Record<string, number>, // component_type -> allocation_adjustment
    method = 'hybrid',
    scenario = 'normal_operations',
    constraints?: OptimizationConstraints
  ) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('user_adjustments', JSON.stringify(userAdjustments));
    formData.append('method', method);
    formData.append('scenario', scenario);
    
    if (constraints) {
      formData.append('constraints', JSON.stringify(constraints));
    }

    const response = await fetch(`${FASTAPI_BASE_URL}/interactive_optimization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Interactive optimization failed:', errorText);
      throw new Error(`Interactive optimization failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Interactive optimization result:', result);
    return result;
  },

  // Target-based optimization
  targetBasedOptimization: async (
    sessionId: string,
    token: string,
    targetFsfvi: number,
    targetYear: number,
    method = 'hybrid',
    scenario = 'normal_operations',
    constraints?: OptimizationConstraints
  ) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('target_fsfvi', targetFsfvi.toString());
    formData.append('target_year', targetYear.toString());
    formData.append('method', method);
    formData.append('scenario', scenario);
    
    if (constraints) {
      formData.append('constraints', JSON.stringify(constraints));
    }

    const response = await fetch(`${FASTAPI_BASE_URL}/target_based_optimization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Target-based optimization failed:', errorText);
      throw new Error(`Target-based optimization failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Target-based optimization result:', result);
    return result;
  },

  // Crisis resilience assessment
  crisisResilienceAssessment: async (
    sessionId: string,
    token: string,
    testScenarios: string[] = ['climate_shock', 'financial_crisis', 'pandemic_disruption', 'cyber_threats'],
    method = 'hybrid'
  ) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('test_scenarios', JSON.stringify(testScenarios));
    formData.append('method', method);

    const response = await fetch(`${FASTAPI_BASE_URL}/crisis_resilience_assessment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Crisis resilience assessment failed:', errorText);
      throw new Error(`Crisis resilience assessment failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Crisis resilience assessment result:', result);
    return result;
  },

  // Get available analysis options
  getAnalysisOptions: async (token: string) => {
    const response = await fetch(`${FASTAPI_BASE_URL}/analysis_options`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get analysis options:', errorText);
      throw new Error(`Failed to get analysis options: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  },
};

// Types
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface OptimizationConstraints {
  min_allocation_per_component?: number;
  max_allocation_per_component?: number;
  target_fsfvi?: number;
  target_year?: number;
  transition_limit?: number;
  [key: string]: unknown;
}

// Enhanced types for government planning tools
export interface MultiYearPlan {
  planning_horizon: {
    start_year: number;
    end_year: number;
    total_years: number;
  };
  budget_scenarios: Record<number, number>;
  yearly_recommendations: Record<number, YearlyRecommendation>;
  trajectory_analysis: TrajectoryAnalysis;
  target_achievement: TargetAchievement;
  crisis_preparedness: CrisisPreparedness;
  government_recommendations: GovernmentRecommendations;
}

export interface YearlyRecommendation {
  budget: number;
  optimal_allocations: number[];
  projected_fsfvi: number;
  improvement_from_baseline: number;
  component_analysis: ComponentAnalysis;
  transition_analysis: TransitionAnalysis;
  implementation_complexity: string;
  crisis_resilience_score: number;
  // New budget optimization properties
  new_budget_this_year?: number;
  cumulative_new_budget?: number;
  current_allocations_total?: number;
  total_budget_after_new?: number;
  optimal_new_allocations?: number[];
  total_allocations_after_optimization?: number[];
  optimization_type?: string;
}

export interface TrajectoryAnalysis {
  total_improvement_percent: number;
  average_yearly_improvement_percent: number;
  final_fsfvi: number;
  total_budget_billions: number;
  efficiency_per_billion_usd: number;
  trajectory_trend: string;
  target_achievement_probability?: number;
  target_status?: string;
}

export interface TargetAchievement {
  target_fsfvi: number;
  target_year: number;
  projected_fsfvi: number;
  target_gap: number;
  achievement_status: string;
  additional_budget_needed_millions?: number;
  alternative_strategies?: string[];
}

export interface CrisisPreparedness {
  overall_resilience_trend: Array<{year: number; resilience_score: number}>;
  crisis_vulnerability_by_year: Record<number, {resilience_score: number; preparedness_level: string; budget: number}>;
  preparedness_recommendations: string[];
}

export interface GovernmentRecommendations {
  executive_summary: {
    planning_horizon_years: number;
    total_budget_billions: number;
    projected_improvement_percent: number;
    crisis_preparedness: string;
    target_achievement_outlook: string;
  };
  immediate_actions: string[];
  medium_term_strategy: string[];
  long_term_vision: string[];
  budget_recommendations: {
    total_commitment_millions: number;
    annual_average_millions: number;
    efficiency_rating: string;
    funding_adequacy: string;
  };
  risk_mitigation: string[];
  implementation_roadmap: Record<string, unknown>;
}

export interface ComponentAnalysis {
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
}

export interface ComponentOptimizationResult {
  component_type: string;
  component_name: string;
  current_allocation: number;
  optimal_allocation: number;
  change_amount: number;
  change_percent: number;
  current_vulnerability: number;
  optimal_vulnerability: number;
  vulnerability_reduction: number;
  vulnerability_reduction_percent: number;
  priority_level: string;
  implementation_complexity: string;
  expected_impact: string;
  weight: number;
  performance_gap: number;
  sensitivity_parameter: number;
}

export interface TransitionAnalysis {
  total_reallocation: number;
  reallocation_intensity: number;
  max_increase_percent: number;
  max_decrease_percent: number;
  components_increased: number;
  components_decreased: number;
  implementation_complexity: string;
}

export interface ScenarioComparison {
  scenarios_analyzed: string[];
  methods_analyzed: string[];
  budget: number;
  comparison_matrix: Record<string, Record<string, ScenarioResult>>;
  scenario_insights: Record<string, ScenarioInsight>;
  method_insights: Record<string, MethodInsight>;
  robust_recommendations: RobustRecommendations;
  risk_analysis: CrossScenarioRisk;
}

export interface ScenarioResult {
  optimal_fsfvi: number;
  improvement_percent: number;
  optimal_allocations: number[];
  reallocation_intensity: number;
  component_analysis: ComponentAnalysis;
}

export interface ScenarioInsight {
  avg_fsfvi: number;
  best_fsfvi: number;
  worst_fsfvi: number;
  variability: number;
}

export interface MethodInsight {
  avg_fsfvi: number;
  consistency: number;
  scenarios_succeeded: number;
}

export interface RobustRecommendations {
  most_robust_method: string;
  consistent_reallocations: string[];
  scenario_specific_adjustments: Record<string, unknown>;
}

export interface CrossScenarioRisk {
  scenario_risk_levels: Record<string, {average_vulnerability: number; risk_level: string}>;
  method_risk_stability: Record<string, unknown>;
  overall_system_resilience: number;
}

export interface BudgetSensitivityAnalysis {
  base_budget: number;
  budget_variations: number[];
  method: string;
  scenario: string;
  budget_analysis: Record<string, BudgetAnalysisResult>;  // String keys for budget variations like "-0.3", "0.1"
  marginal_impact: Record<string, MarginalImpactResult>;
  optimal_budget_recommendations: Record<string, BudgetRecommendationResult>;
  efficiency_curves: Record<string, EfficiencyCurveResult>;
  status?: 'success' | 'partial_success' | 'failed';
  successful_variations_count?: number;
  total_variations_count?: number;
  error?: string;
  warning?: string;
}

export interface BudgetAnalysisResult {
  budget: number;
  budget_change_percent: number;
  optimal_fsfvi: number;
  improvement_percent: number;
  efficiency_per_million: number;
  marginal_effectiveness: number;
  optimal_allocations: number[];
  component_analysis: ComponentAnalysis;
  error?: string; // Optional error field for failed optimizations
}

export interface MarginalImpactResult {
  marginal_effectiveness: number;
  optimal_budget: number;
  error?: string;
}

export interface BudgetRecommendationResult {
  recommended_budget: number;
  improvement_percent: number;
  efficiency_per_million: number;
  error?: string;
}

export interface EfficiencyCurveResult {
  fsfvi: number;
  efficiency_per_million: number;
  error?: string;
}

// NEW BUDGET OPTIMIZATION TYPES
export interface NewBudgetOptimizationResult {
  session_id: string;
  country: string;
  optimization_type: 'new_budget_allocation';
  current_budget_millions: number;
  new_budget_millions: number;
  total_budget_millions: number;
  optimization_results: {
    success: boolean;
    baseline_fsfvi: number;
    optimal_fsfvi: number;
    optimal_new_allocations: number[];
    optimal_total_allocations: number[];
    current_allocations: number[];
    absolute_improvement: number;
    relative_improvement_percent: number;
    new_budget_utilization_percent: number;
    component_analysis: NewBudgetComponentAnalysis;
    government_insights: NewBudgetGovernmentInsights;
    optimization_type: string;
    new_budget: number;
    current_budget: number;
    total_budget: number;
  };
  practical_guidance: {
    interpretation: string;
    current_allocations: string;
    new_allocations: string;
    implementation: string;
    monitoring: string;
  };
}

export interface NewBudgetComponentAnalysis {
  components: NewBudgetComponentResult[];
  summary: {
    total_components: number;
    components_receiving_new_budget: number;
    new_budget_utilized_percent: number;
    average_vulnerability_reduction_percent: number;
    highest_new_allocation: number;
    most_improved_component: string;
  };
  recommendations: string[];
}

export interface NewBudgetComponentResult {
  component_type: string;
  component_name: string;
  current_allocation_fixed: number;
  new_allocation_optimized: number;
  total_allocation: number;
  new_budget_share_percent: number;
  current_vulnerability: number;
  optimized_vulnerability: number;
  vulnerability_reduction: number;
  vulnerability_reduction_percent: number;
  new_budget_efficiency_per_100m: number;
  allocation_priority: string;
  strategic_rationale: string;
  weight: number;
  performance_gap: number;
}

export interface NewBudgetGovernmentInsights {
  budget_planning: {
    new_budget_impact: string;
    most_effective_allocation: string;
    allocation_spread: string;
    budget_efficiency: string;
  };
  implementation_guidance: {
    immediate_priorities: string[];
    funding_timeline: string;
    monitoring_focus: string;
    success_metrics: string[];
  };
  strategic_context: {
    current_vs_new: string;
    system_improvement: string;
    future_planning: string;
    risk_mitigation: string;
  };
} 