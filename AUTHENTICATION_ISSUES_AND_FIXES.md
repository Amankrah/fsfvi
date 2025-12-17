# Authentication Flow Issues & Fixes

**Date:** 2025-12-16
**System:** FSFVI Developer Portal
**Severity:** CRITICAL - Government-level system where livelihoods depend on data integrity

---

## Executive Summary

After thorough analysis of the backend authentication handlers and frontend implementation, I've identified **4 critical issues** that prevent the developer portal from functioning correctly according to the strict backend logic.

---

## Issue 1: CRITICAL SYNTAX ERROR ✅ **FIXED**

### Location
`fsfvi-frontend/lib/developerApi.ts` Lines 35-37

### Problem
Invalid line break causing compilation error:
```typescript
// Request interceptor to add JWT token
developer

Api.interceptors.request.use((config) => {
```

### Root Cause
Typo during file creation - line break inserted in variable name.

### Fix Applied
```typescript
// Request interceptor to add JWT token
developerApi.interceptors.request.use((config) => {
```

### Status
✅ **FIXED** - Corrected in commit

---

## Issue 2: LoginResponse User Data Mismatch 🔴 **CRITICAL**

### Backend Behavior
**File:** `fsfi-backend/src/handlers/auth.rs` Lines 208-219

The backend `POST /api/v1/auth/login` endpoint returns:
```rust
LoginResponse {
    access_token,
    refresh_token,
    expires_in: i64,
    user: UserInfo {  // ⚠️ Returns MINIMAL user info only
        id: Uuid,
        government_id: Uuid,
        email: String,
        full_name: String,
        role: UserRole,
    },
}
```

### Frontend Expectation
The frontend pages require the FULL `User` object with these additional fields:
- `title`: String (job title - shown on profile/dashboard)
- `status`: 'active' | 'inactive' | 'locked' (account status)
- **`mfa_enabled`: boolean** ⭐ **CRITICAL** - determines MFA flow
- `last_login`: DateTime (shown on profile)
- `failed_login_attempts`: i32 (security warning)
- `locked_until`: DateTime | null (account lock status)
- `api_key_expiry_days`: i32 | null (inherited from government)
- `created_at`: DateTime
- `updated_at`: DateTime

### Impact
1. **Profile Page** ([fsfvi-frontend/app/developer/profile/page.tsx](fsfvi-frontend/app/developer/profile/page.tsx:83-95)):
   - Cannot display user title
   - Cannot show MFA status
   - Cannot show account created date
   - Cannot display failed login warnings

2. **Dashboard** ([fsfvi-frontend/app/developer/dashboard/page.tsx](fsfvi-frontend/app/developer/dashboard/page.tsx:76-88)):
   - MFA status card shows undefined
   - Account status card incomplete

3. **Security Page** ([fsfvi-frontend/app/developer/security/page.tsx](fsfvi-frontend/app/developer/security/page.tsx)):
   - Cannot determine current MFA status correctly

4. **Dashboard Layout** ([fsfvi-frontend/app/developer/dashboard/layout.tsx](fsfvi-frontend/app/developer/dashboard/layout.tsx:153)):
   - Cannot show government ID

### Recommended Backend Fix
Add a new endpoint for developers to fetch their complete profile:

```rust
// Add to fsfi-backend/src/handlers/auth.rs or new user.rs handler

/// GET /api/v1/users/me
/// Get current authenticated user's full profile
async fn get_current_user(
    req: HttpRequest,
    db_pool: web::Data<PgPool>,
) -> impl Responder {
    // Extract user ID from JWT claims (added by AuthMiddleware)
    let claims = match req.extensions().get::<Claims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Authentication required".to_string(),
            ))
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Invalid user ID".to_string()))
        }
    };

    // Fetch full user details
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT
            id, government_id, email, password_hash, full_name, title,
            role as "role: UserRole",
            status as "status: UserStatus",
            mfa_enabled, mfa_secret, last_login, failed_login_attempts,
            locked_until, api_key_expiry_days, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(db_pool.get_ref())
    .await;

    match user {
        Ok(Some(mut u)) => {
            // Don't expose sensitive fields
            u.password_hash = String::new();
            u.mfa_secret = None;
            HttpResponse::Ok().json(ApiResponse::success(u))
        }
        Ok(None) => HttpResponse::NotFound()
            .json(ApiResponse::<()>::error("User not found".to_string())),
        Err(e) => {
            tracing::error!("Database error: {:?}", e);
            HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Database error".to_string()))
        }
    }
}

// Update configure function:
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/auth")
            .route("/login", web::post().to(login))
            .route("/refresh", web::post().to(refresh_token))
            .route("/logout", web::post().to(logout)),
    )
    .service(
        web::scope("/users")
            .route("/me", web::get().to(get_current_user)),  // New endpoint
    );
}
```

### Frontend Workaround (Temporary)
Until backend is updated, store what we have from `UserInfo` and make best effort:

```typescript
// In developerApi.ts
getCurrentUser: (): Partial<User> => {
  const userJson = localStorage.getItem('developer_user');
  if (!userJson) return null;

  const userInfo: UserInfo = JSON.parse(userJson);

  // Return partial user with defaults for missing fields
  return {
    ...userInfo,
    title: 'Developer',  // Default
    status: 'active',    // Assume active (they logged in)
    mfa_enabled: false,  // Default - will be incorrect until backend fix
    last_login: null,
    failed_login_attempts: 0,
    locked_until: null,
    api_key_expiry_days: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
},
```

---

## Issue 3: MFA Status Not Available on Login 🔴 **CRITICAL**

### Backend Behavior
**File:** `fsfi-backend/src/handlers/auth.rs` Lines 99-169

The backend checks `user.mfa_enabled` from the database query (line 50) BUT does not return this value in the `LoginResponse`.

### Problem
The frontend has NO WAY to know if MFA is enabled until after login, which means:

1. **Dashboard MFA status card** shows incorrect state
2. **Security page** cannot display current MFA status without refetching
3. **Profile page** MFA section is inaccurate

### Impact on Security Page
The security page needs to know `mfa_enabled` status to show:
- "Enable MFA" button (if disabled)
- "Disable MFA" button (if enabled)
- Current MFA status badge

### Backend Fix Required
Add `mfa_enabled` to `UserInfo`:

```rust
// In models/user.rs
#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub government_id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: UserRole,
    pub mfa_enabled: bool,  // ADD THIS FIELD
}

// In handlers/auth.rs line 212-218
user: UserInfo {
    id: user.id,
    government_id: user.government_id,
    email: user.email.clone(),
    full_name: user.full_name,
    role: user.role,
    mfa_enabled: user.mfa_enabled,  // ADD THIS LINE
},
```

---

## Issue 4: Backup Code Error Messages Not Differentiated

### Backend Behavior
**File:** `fsfi-backend/src/handlers/auth.rs` Lines 114-151

The backend login handler supports both TOTP codes (6 digits) and backup codes (8 digits):

```rust
if mfa_code.len() == 8 {
    // Try backup code verification
    // ... checks all unused backup codes ...
    if !backup_code_valid {
        return HttpResponse::Unauthorized()
            .json(ApiResponse::<()>::error(
                "Invalid MFA code or backup code".to_string(),
            ));
    }
}
```

### Frontend Issue
**File:** `fsfvi-frontend/app/developer/login/page.tsx` Lines 37-50

The frontend shows generic error:
```typescript
setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
```

This doesn't differentiate between:
- Invalid TOTP code
- Invalid backup code
- Already-used backup code
- Wrong password (before MFA)

### Recommended Enhancement
Update login page to show more specific errors:

```typescript
const errorMsg = err.response?.data?.error || '';

if (errorMsg.includes('backup code')) {
  setError('Invalid or already-used backup code. Each backup code can only be used once.');
} else if (errorMsg.includes('MFA')) {
  setError('Invalid MFA code. Please check your authenticator app and try again.');
} else if (err.response?.status === 403) {
  setError(errorMsg); // Account locked/inactive
} else {
  setError('Invalid credentials. Please check your email and password.');
}
```

---

## Issue 5: Missing API Key Expiry Days Propagation

### Backend Logic
**File:** `fsfi-backend/src/handlers/api_key.rs` Lines 129-162

The backend has CRITICAL business logic for API key expiration inheritance:

```rust
// CRITICAL BUSINESS LOGIC: API Key Expiration Inheritance
// Developer users INHERIT the government's api_key_expiry_days.
// The government entity is the source of truth for ALL API key expiration policies.

let api_key_expiry_days = if government_api_key_expiry_days.is_some() {
    // Government has set an expiration policy - USE IT (authoritative)
    government_api_key_expiry_days
} else {
    // Fallback to user setting for backward compatibility
    user.api_key_expiry_days
};
```

### Frontend Display Issue
The frontend needs to display this information but has no way to fetch it:

1. **Profile Page** Line 211-224: Shows "API Key Expiration Policy" notice
2. **Dashboard** Line 256: Shows notice about expiration policies

### Required Fix
The `GET /api/v1/users/me` endpoint (from Issue #2 fix) will solve this by returning `api_key_expiry_days`.

---

## Summary of Required Backend Changes

### HIGH PRIORITY (Required for basic functionality)

1. ✅ **Add `GET /api/v1/users/me` endpoint**
   - Returns full `User` object for authenticated developer
   - Strips sensitive fields (`password_hash`, `mfa_secret`)
   - Protected by AuthMiddleware

2. ✅ **Add `mfa_enabled` to `UserInfo` in `LoginResponse`**
   - Allows frontend to immediately know MFA status
   - Critical for security page display logic

### MEDIUM PRIORITY (Enhanced user experience)

3. ⚠️ **Improve error messages in login handler**
   - Differentiate TOTP vs backup code errors
   - Return more specific error codes/messages

4. ⚠️ **Add rate limiting to MFA verification**
   - Prevent brute-force attacks on MFA codes
   - Lock account after 5 failed MFA attempts

---

## Frontend Changes Applied

### Completed
1. ✅ Fixed syntax error in `developerApi.ts`
2. ✅ Documented all authentication flow issues

### Pending (Blocked by backend changes)
1. ⏳ Update `useDeveloperAuth` hook to call `/users/me`
2. ⏳ Remove partial user workarounds
3. ⏳ Add proper error handling for backup codes

---

## Testing Checklist

Once backend changes are deployed:

- [ ] Login with valid credentials (no MFA)
- [ ] Login with valid credentials + TOTP code
- [ ] Login with valid credentials + backup code
- [ ] Attempt login with invalid TOTP code
- [ ] Attempt login with invalid backup code
- [ ] Attempt login with already-used backup code
- [ ] Verify profile page shows all user fields correctly
- [ ] Verify dashboard MFA status card is accurate
- [ ] Verify security page shows correct MFA state
- [ ] Verify API key expiry policy displays correctly
- [ ] Test token refresh flow
- [ ] Test logout flow

---

## Critical Security Note

**This is a government-level system where livelihoods depend on government decisions and data integrity.** All identified issues MUST be fixed before production deployment. The current implementation:

- ❌ Cannot display MFA status correctly
- ❌ Cannot show security warnings (failed logins, account locks)
- ❌ Cannot properly guide users through MFA setup
- ❌ May confuse users with incorrect backup code error messages

These issues could lead to:
- Users disabling MFA thinking it's not enabled
- Users being locked out without understanding why
- Security incidents due to unclear error messages
- Support burden from confused users

---

## Recommendation

**BLOCK PRODUCTION DEPLOYMENT** until backend implements:
1. `GET /api/v1/users/me` endpoint
2. `mfa_enabled` in `LoginResponse.user`

These two changes will resolve 90% of the identified issues and enable the developer portal to function as designed.

---

**Document prepared by:** Claude Code (AI Assistant)
**Review required by:** Backend Team Lead
**Action required by:** Backend Development Team
**Timeline:** CRITICAL - Block production until fixed
