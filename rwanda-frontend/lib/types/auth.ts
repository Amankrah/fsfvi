/**
 * Rwanda FSFI Authentication Types
 * =================================
 * Type definitions for Rwanda Government Portal authentication
 *
 * Backend: Rwanda Django backend (http://localhost:8000/api/auth/)
 * Auth: Rust JWT via RustJWTAuthentication
 */

// ============================================================================
// User & Auth Types
// ============================================================================

export interface UserResponse {
  id: string;
  username: string;
  government_name: string;
  country_code: string;
  role: UserRole;
  district_id?: string;
  province_id?: string;
  is_active: boolean;
  is_temporary_password: boolean;
  two_fa_enabled: boolean;
  last_login?: string;
  created_at: string;
}

export type UserRole =
  | 'admin'
  | 'analyst'
  | 'data_entry'
  | 'viewer'
  | 'auditor';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  refresh_token?: string;
  user: UserResponse;
  requires_two_fa: boolean;
  two_fa_temp_token?: string;
  message?: string;
}

export interface TwoFactorRequest {
  code: string;
  temp_token: string;
  is_backup_code?: boolean;
}

export interface TwoFactorResponse {
  token: string;
  refresh_token?: string;
  user: UserResponse;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

/** POST /api/auth/2fa/setup/ — aligns with Django + Rust `mfa.rs` (otpauth URL + backup codes). */
export interface MfaSetupResponse {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

/** POST /api/auth/2fa/enable/ */
export interface MfaEnableResponse {
  backup_codes: string[];
  message: string;
}

/** POST /api/auth/2fa/disable/ */
export interface MfaDisableResponse {
  message: string;
}

/** POST /api/auth/change-password/ */
export interface PasswordChangeResponse {
  message: string;
}

export interface TokenVerifyResponse {
  valid: boolean;
  user: UserResponse;
  expires_at: string;
}

// ============================================================================
// Auth Storage Keys
// ============================================================================

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'rw_auth_token',
  USER: 'rw_user',
  REFRESH_TOKEN: 'rw_refresh_token',
} as const;
