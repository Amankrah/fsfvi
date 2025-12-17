import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  LoginCredentials,
  AuthResponse,
  Government,
  GovernmentDetail,
  CreateGovernmentRequest,
  UpdateGovernmentRequest,
  User,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ApiKey,
  CreateApiKeyRequest,
  AdminRevokeApiKeyRequest,
  AdminApiKeyDetail,
  ApiResponse,
  DetailedHealthResponse,
} from '../types';

// API Configuration
const API_BASE_URL = 'http://localhost:8080';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.refreshToken) {
            try {
              const response = await this.refresh();
              this.setTokens(response.data.access_token, response.data.refresh_token);
              originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
              return this.client(originalRequest);
            } catch (refreshError) {
              this.clearTokens();
              window.location.href = '/login';
              return Promise.reject(refreshError);
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    this.setTokens(response.data.data.access_token, response.data.data.refresh_token);
    return response.data;
  }

  async refresh(): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/refresh', {
      refresh_token: this.refreshToken,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Governments
  async listGovernments(page = 1, pageSize = 20): Promise<ApiResponse<Government[]>> {
    const response = await this.client.get<ApiResponse<Government[]>>(
      `/api/v1/admin/governments?page=${page}&page_size=${pageSize}`
    );
    return response.data;
  }

  async getGovernment(id: string): Promise<ApiResponse<GovernmentDetail>> {
    const response = await this.client.get<ApiResponse<GovernmentDetail>>(`/api/v1/admin/governments/${id}`);
    return response.data;
  }

  async createGovernment(data: CreateGovernmentRequest): Promise<ApiResponse<Government>> {
    const response = await this.client.post<ApiResponse<Government>>('/api/v1/admin/governments', data);
    return response.data;
  }

  async updateGovernment(
    id: string,
    data: UpdateGovernmentRequest
  ): Promise<ApiResponse<Government>> {
    const response = await this.client.put<ApiResponse<Government>>(`/api/v1/admin/governments/${id}`, data);
    return response.data;
  }

  async suspendGovernment(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>(`/api/v1/admin/governments/${id}/suspend`);
    return response.data;
  }

  async activateGovernment(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>(`/api/v1/admin/governments/${id}/activate`);
    return response.data;
  }

  async deleteGovernment(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete<ApiResponse<void>>(`/api/v1/admin/governments/${id}`);
    return response.data;
  }

  // Users
  async listUsers(governmentId?: string, page = 1, pageSize = 20): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (governmentId) {
      params.append('government_id', governmentId);
    }
    const response = await this.client.get<ApiResponse<User[]>>(`/api/v1/admin/users?${params}`);
    return response.data;
  }

  async generatePassword(): Promise<ApiResponse<{ password: string }>> {
    const response = await this.client.get<ApiResponse<{ password: string }>>('/api/v1/admin/users/generate-password');
    return response.data;
  }

  async createUser(data: CreateUserRequest): Promise<ApiResponse<CreateUserResponse>> {
    const response = await this.client.post<ApiResponse<CreateUserResponse>>('/api/v1/admin/users', data);
    return response.data;
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>(`/api/v1/admin/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    const response = await this.client.put<ApiResponse<User>>(`/api/v1/admin/users/${id}`, data);
    return response.data;
  }

  async resetUserPassword(id: string, data: ResetPasswordRequest): Promise<ApiResponse<ResetPasswordResponse>> {
    const response = await this.client.post<ApiResponse<ResetPasswordResponse>>(`/api/v1/admin/users/${id}/reset-password`, data);
    return response.data;
  }

  // API Keys
  async listApiKeys(governmentId: string): Promise<ApiResponse<ApiKey[]>> {
    const response = await this.client.get<ApiResponse<{ api_keys: ApiKey[]; context: any; total: number }>>(
      `/api/v1/admin/api-keys/all?government_id=${governmentId}`
    );
    // Extract api_keys array from the nested response
    return {
      success: response.data.success,
      data: response.data.data.api_keys,
      message: response.data.message,
    };
  }

  async createApiKey(data: CreateApiKeyRequest): Promise<ApiResponse<{ api_key: ApiKey; key: string }>> {
    const response = await this.client.post<ApiResponse<{ api_key: ApiKey; key: string }>>(
      '/api/v1/api-keys',
      data
    );
    return response.data;
  }

  async revokeApiKey(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete<ApiResponse<void>>(`/api/v1/api-keys/${id}`);
    return response.data;
  }

  // ============================================================================
  // ADMIN-ONLY API KEY MANAGEMENT
  // Admins can ONLY view and revoke API keys, NEVER create them
  // Backend: fsfi-backend/src/handlers/admin.rs (lines 815-963)
  // ============================================================================

  /**
   * Get detailed API key information (admin only)
   * Includes creator details and government info
   */
  async getApiKeyDetails(keyId: string): Promise<ApiResponse<AdminApiKeyDetail>> {
    const response = await this.client.get<ApiResponse<AdminApiKeyDetail>>(
      `/api/v1/admin/api-keys/${keyId}/details`
    );
    return response.data;
  }

  /**
   * Revoke an API key with audit trail (admin only)
   * Requires detailed reason (min 10 chars) and optional internal note
   */
  async adminRevokeApiKey(keyId: string, request: AdminRevokeApiKeyRequest): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>(
      `/api/v1/admin/api-keys/${keyId}/revoke`,
      request
    );
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(governmentId?: string, page = 1, pageSize = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (governmentId) {
      params.append('government_id', governmentId);
    }
    const response = await this.client.get(`/api/v1/admin/audit-logs?${params}`);
    return response.data;
  }

  // Usage Statistics
  async getUsageStats(governmentId: string, days = 30) {
    const response = await this.client.get(`/api/v1/admin/governments/${governmentId}/usage-stats?days=${days}`);
    return response.data;
  }

  // Analytics
  async getAnalyticsOverview(days = 30): Promise<ApiResponse<any>> {
    const response = await this.client.get<ApiResponse<any>>(`/api/v1/admin/analytics/overview?days=${days}`);
    return response.data;
  }

  async getApiUsageAnalytics(governmentId?: string, days = 30): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ days: days.toString() });
    if (governmentId) {
      params.append('government_id', governmentId);
    }
    const response = await this.client.get<ApiResponse<any>>(`/api/v1/admin/analytics/api-usage?${params}`);
    return response.data;
  }

  // System Health - ADMIN-ONLY detailed metrics with REAL measurements
  async getSystemHealth(): Promise<ApiResponse<DetailedHealthResponse>> {
    const response = await this.client.get<ApiResponse<DetailedHealthResponse>>(
      '/api/v1/admin/system/health/detailed'
    );
    return response.data;
  }

  // Security Alerts
  async getSecurityAlerts(hours = 24): Promise<ApiResponse<any>> {
    const response = await this.client.get<ApiResponse<any>>(`/api/v1/admin/security/alerts?hours=${hours}`);
    return response.data;
  }

  // Configuration
  async getAvailableScopes(): Promise<ApiResponse<{ scopes: string[]; descriptions: Record<string, string> }>> {
    const response = await this.client.get<ApiResponse<{ scopes: string[]; descriptions: Record<string, string> }>>('/api/v1/admin/config/scopes');
    return response.data;
  }
}

export const apiClient = new ApiClient();
