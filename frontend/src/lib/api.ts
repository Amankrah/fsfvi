import axios from 'axios';

// API Base URL - Django backend on port 8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8001';

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

  optimizeAllocation: async (sessionId: string, token: string, optimizationMethod = 'hybrid', budgetChangePercent = 0) => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('method', optimizationMethod);
    formData.append('budget_change_percent', budgetChangePercent.toString());

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