import axios from 'axios';

// API Base URL - Django backend on port 8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.origin) || 'http://localhost:8000';

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
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: async (userData: RegisterData) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },

  login: async (credentials: LoginData) => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout/');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },

  // Session management
  getUserSessions: async () => {
    const response = await api.get('/api/sessions/');
    return response.data;
  },
};

// Data API endpoints for FSFVI analysis
export const dataAPI = {
  uploadCSV: async (formData: FormData) => {
    const response = await api.post('/upload-csv/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/dashboard/');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/analytics/');
    return response.data;
  },

  getUserSessions: async () => {
    const response = await api.get('/api/sessions/');
    return response.data;
  },

  getSessionDetails: async (sessionId: string) => {
    const response = await api.get(`/api/sessions/${sessionId}/`);
    return response.data;
  },

  clearSession: async (sessionId: string) => {
    const response = await api.delete(`/sessions/${sessionId}/delete/`);
    return response.data;
  },

  listUserSessions: async () => {
    const response = await api.get('/api/sessions/');
    return response.data;
  },
};

// FastAPI Analysis endpoints - DEDICATED + COMPREHENSIVE API
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8001');

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

  optimizeAllocation: async (sessionId: string, token: string, optimizationMethod = 'hybrid', budgetChangePercent = 0, constraints?: OptimizationConstraints) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('method', optimizationMethod);
    formData.append('budget_change_percent', budgetChangePercent.toString());
    
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
      const errorText = await response.text();
      console.error('Allocation optimization failed:', errorText);
      throw new Error(`Allocation optimization failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Optimization result:', result);
    return result;
  },

  // GOVERNMENT PLANNING TOOLS

  // Multi-year optimization for fiscal planning
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
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('budget_scenarios', JSON.stringify(budgetScenarios));
    formData.append('method', method);
    formData.append('scenario', scenario);
    
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