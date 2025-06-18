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
};

// Types
export interface RegisterData {
  username: string;
  email: string;
  password: string;
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