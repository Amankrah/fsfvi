// ============================================================================
// TYPE DEFINITIONS - STRICTLY ALIGNED WITH BACKEND RUST MODELS
// Backend: fsfi-backend/src/models/
// ============================================================================

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
  mfa_code?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: UserInfo;
  };
}

// User types - Aligned with backend User model
export interface User {
  id: string;
  government_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  title: string;
  role: 'admin' | 'developer';
  status: 'active' | 'inactive' | 'locked';
  mfa_enabled: boolean;
  mfa_secret: string | null;
  last_login: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  api_key_expiry_days: number | null;  // Set by admin, controls API key expiration
  created_at: string;
  updated_at: string;
}

// UserInfo - Aligned with backend UserInfo (used in LoginResponse)
export interface UserInfo {
  id: string;
  government_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'developer';
}

// Government types - Aligned with backend GovernmentListItem
export interface Government {
  id: string;
  country_code: string;
  country_name: string;
  government_name: string;
  government_type: 'federal' | 'state' | 'regional' | 'local' | 'agency';
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  contact_email: string;
  primary_contact_name: string;
  primary_contact_title: string;
  created_at: string;
  activated_at: string | null;
}

// GovernmentDetail - Aligned with backend GovernmentDetail (extended info)
export interface GovernmentDetail extends Government {
  contact_phone: string | null;
  api_quota_daily: number;
  api_quota_monthly: number;
  allowed_endpoints: string[];
  ip_whitelist: string[] | null;
  expires_at: string | null;
  // API Key Security Controls
  max_active_api_keys: number;  // Always has value (default 5)
  mandatory_rotation_days: number | null;  // NULL = no mandatory rotation
  api_key_expiry_days: number | null;  // Default API key expiration for ALL users (1-730 days, NULL = no expiration)
}

// CreateGovernmentRequest - Aligned with backend CreateGovernmentRequest
export interface CreateGovernmentRequest {
  country_code: string;
  country_name: string;
  government_name: string;
  government_type: 'federal' | 'state' | 'regional' | 'local' | 'agency';
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  contact_email: string;
  contact_phone?: string;
  primary_contact_name: string;
  primary_contact_title: string;
  api_quota_daily: number;
  api_quota_monthly: number;
  allowed_endpoints: string[];
  ip_whitelist?: string[];
  // API Key Security Controls
  max_active_api_keys?: number;  // 1-50, default: 5
  mandatory_rotation_days?: number;  // 1-365 or null
  api_key_expiry_days?: number;  // 1-730 days or null
}

// UpdateGovernmentRequest - Aligned with backend UpdateGovernmentRequest
export interface UpdateGovernmentRequest {
  status?: 'pending' | 'active' | 'suspended' | 'revoked';
  tier?: 'basic' | 'standard' | 'premium' | 'enterprise';
  contact_email?: string;
  api_quota_daily?: number;
  api_quota_monthly?: number;
  allowed_endpoints?: string[];
  ip_whitelist?: string[];
  // API Key Security Controls
  max_active_api_keys?: number;  // 1-50
  mandatory_rotation_days?: number;  // 1-365 or null
  api_key_expiry_days?: number;  // 1-730 days or null
}

// CreateUserRequest - Aligned with backend CreateUserRequest
export interface CreateUserRequest {
  government_id: string;
  email: string;
  password: string;  // REQUIRED - admin provides this (either manually or from generate-password API)
  full_name: string;
  title: string;
  role: 'admin' | 'developer';
  api_key_expiry_days?: number;  // Optional: 1-730 days, controls API key expiration
}

// CreateUserResponse - Returned after creating user, includes plain password
export interface CreateUserResponse {
  user: User;
  plain_password: string;  // ONLY returned during creation for admin to share securely
}

// UpdateUserRequest - For updating user details
export interface UpdateUserRequest {
  full_name?: string;
  title?: string;
  status?: 'active' | 'inactive' | 'locked';
  api_key_expiry_days?: number;  // 1-730 days
}

// ResetPasswordRequest - For resetting user password
export interface ResetPasswordRequest {
  new_password: string;  // Min 8 chars - from generate-password or manual
}

// ResetPasswordResponse - Returned after password reset
export interface ResetPasswordResponse {
  plain_password: string;
  message: string;
}

// API Key types
export interface ApiKey {
  id: string;
  government_id: string;
  created_by_user_id: string | null;
  name: string;
  key_hash: string;
  key_prefix: string;
  status: 'active' | 'revoked' | 'expired';
  scopes: string[];
  rate_limit_override: number | null;
  last_used: string | null;
  usage_count: number;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  revocation_reason: string | null;
}

export interface CreateApiKeyRequest {
  government_id: string;
  name: string;
  scopes: string[];
  rate_limit_override?: number;
  expires_at?: string;
}

// ============================================================================
// ADMIN-ONLY API KEY TYPES
// These are for FSFI admin actions on developer-created API keys
// Aligned with backend: fsfi-backend/src/models/api_key.rs (lines 75-112)
// ============================================================================

// Admin request to revoke an API key (emergency action)
export interface AdminRevokeApiKeyRequest {
  reason: string;  // 10-500 chars required
  admin_note?: string;  // Internal admin note (not shown to developer)
}

// Admin response with detailed API key info including creator details
export interface AdminApiKeyDetail {
  id: string;
  government_id: string;
  government_name: string;
  created_by_user_id: string;
  created_by_email: string;
  created_by_name: string;
  name: string;
  key_prefix: string;
  status: 'active' | 'revoked' | 'expired';
  scopes: string[];
  last_used: string | null;
  usage_count: number;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  revocation_reason: string | null;
  must_rotate_by: string | null;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// ADMIN-ONLY HEALTH CHECK TYPES
// Aligned with backend: fsfi-backend/src/handlers/health.rs
// ============================================================================

export interface DatabaseHealth {
  status: 'connected' | 'slow' | 'disconnected';
  response_time_ms: number | null;
  active_connections: number;
  max_connections: number;
}

export interface DetailedHealthResponse {
  status: 'operational' | 'degraded' | 'down';
  database: DatabaseHealth;
  response_time_ms: number;
  service: string;
  version: string;
  timestamp: string;
}
