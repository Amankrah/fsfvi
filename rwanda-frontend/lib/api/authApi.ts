/**
 * Rwanda FSFI Authentication API Client
 * ======================================
 * API client for Rwanda Government Portal authentication
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/auth/)
 * Auth: Rust JWT via RustJWTAuthentication
 */

import axios, { AxiosInstance } from 'axios';
import { RW_AUTH_TOKEN_KEY, RW_USER_KEY } from '@/lib/auth/storageKeys';
import { attachAuthInterceptors } from '@/lib/api/attachAuthInterceptors';
import type {
  LoginRequest,
  LoginResponse,
  TwoFactorRequest,
  TwoFactorResponse,
  PasswordChangeRequest,
  PasswordChangeResponse,
  MfaSetupResponse,
  MfaEnableResponse,
  MfaDisableResponse,
  UserResponse,
} from '@/lib/types/auth';

// ============================================================================
// Configuration
// ============================================================================

const RWANDA_API_BASE_URL =
  process.env.NEXT_PUBLIC_RWANDA_API_URL || 'http://localhost:8000';

// ============================================================================
// Axios Instance
// ============================================================================

const authClient: AxiosInstance = axios.create({
  baseURL: `${RWANDA_API_BASE_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

attachAuthInterceptors(authClient);

// ============================================================================
// Auth API Methods
// ============================================================================

export const authAPI = {
  /**
   * Login with username and password
   *
   * POST /api/auth/login/
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await authClient.post<LoginResponse>('/login/', credentials);
    const data = response.data;

    if (!data.requires_two_fa && data.token) {
      localStorage.setItem(
        RW_AUTH_TOKEN_KEY,
        JSON.stringify({
          token: data.token,
          refresh_token: data.refresh_token ?? '',
        })
      );
      localStorage.setItem(RW_USER_KEY, JSON.stringify(data.user));
    }

    return data;
  },

  /**
   * Complete 2FA verification
   *
   * POST /api/auth/2fa/verify/
   */
  verify2FA: async (request: TwoFactorRequest): Promise<TwoFactorResponse> => {
    const response = await authClient.post<TwoFactorResponse>('/2fa/verify/', request);
    const data = response.data;

    localStorage.setItem(
      RW_AUTH_TOKEN_KEY,
      JSON.stringify({
        token: data.token,
        refresh_token: data.refresh_token ?? '',
      })
    );
    localStorage.setItem(RW_USER_KEY, JSON.stringify(data.user));

    return data;
  },

  /**
   * Setup 2FA for user
   *
   * POST /api/auth/2fa/setup/
   */
  setup2FA: async (): Promise<MfaSetupResponse> => {
    const response = await authClient.post<MfaSetupResponse>('/2fa/setup/');
    return response.data;
  },

  /**
   * Enable 2FA after setup (confirms TOTP against Rust `verify_totp_encrypted`).
   * POST /api/auth/2fa/enable/
   */
  enable2FA: async (code: string): Promise<MfaEnableResponse> => {
    const response = await authClient.post<MfaEnableResponse>('/2fa/enable/', {
      code,
    });
    return response.data;
  },

  /**
   * Disable 2FA (TOTP required).
   * POST /api/auth/2fa/disable/
   */
  disable2FA: async (code: string): Promise<MfaDisableResponse> => {
    const response = await authClient.post<MfaDisableResponse>('/2fa/disable/', {
      code,
    });
    return response.data;
  },

  /**
   * Verify current token
   *
   * GET /api/auth/verify/
   */
  verifyToken: async (): Promise<UserResponse> => {
    const response = await authClient.get<UserResponse>('/verify/');
    const data = response.data;

    // Update cached user data
    localStorage.setItem(RW_USER_KEY, JSON.stringify(data));

    return data;
  },

  /**
   * Logout and invalidate token
   *
   * POST /api/auth/logout/
   */
  logout: async (): Promise<void> => {
    try {
      await authClient.post('/logout/');
    } finally {
      // Always clear local storage
      localStorage.removeItem(RW_AUTH_TOKEN_KEY);
      localStorage.removeItem(RW_USER_KEY);
    }
  },

  /**
   * Change password
   *
   * POST /api/auth/change-password/
   */
  changePassword: async (
    request: PasswordChangeRequest
  ): Promise<PasswordChangeResponse> => {
    const response = await authClient.post<PasswordChangeResponse>(
      '/change-password/',
      request
    );
    return response.data;
  },

  /**
   * Check if user is authenticated (local check)
   */
  isAuthenticated: (): boolean => {
    const tokenData = localStorage.getItem(RW_AUTH_TOKEN_KEY);
    return tokenData !== null;
  },

  /**
   * Get current user from cache
   */
  getCurrentUser: (): UserResponse | null => {
    const userData = localStorage.getItem(RW_USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData) as UserResponse;
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Get auth token
   */
  getToken: (): string | null => {
    const tokenData = localStorage.getItem(RW_AUTH_TOKEN_KEY);
    if (tokenData) {
      try {
        const parsed = JSON.parse(tokenData);
        return parsed.token;
      } catch {
        return null;
      }
    }
    return null;
  },
};

/** Parse DRF / Rust auth error body for display. */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: Record<string, unknown> } }).response
      ?.data;
    if (data && typeof data === 'object') {
      if (typeof data.error === 'string') return data.error;
      if (typeof data.detail === 'string') return data.detail;
    }
  }
  return fallback;
}

export default authAPI;
