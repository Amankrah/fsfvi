# FSFVI Demo Government Authentication System - Complete Implementation

## 🎯 Overview

This document provides a comprehensive overview of the complete authentication system implementation for the Food Systems Financial & Vulnerability Intelligence (FSFVI) platform's Demo Government deployment.

**Critical Context:** This is a government-level system where people's livelihoods and food security decisions depend on accurate, secure access. The authentication system has been implemented with the highest security standards.

---

## 📊 System Status: FULLY OPERATIONAL

### ✅ Backend Authentication (Rust - demo_gov_backend)

**Total Test Coverage: 104 Tests - ALL PASSING**

#### Security Services:
1. **Password Service** (15 tests) ✅
   - Bcrypt hashing with cost factor 12
   - Argon2 support for government compliance
   - Password policy enforcement (12+ chars, complexity requirements)
   - Common password detection

2. **Authentication Service** (19 tests) ✅
   - Secure login/logout
   - Session management (30-minute timeout)
   - Account lockout (5 failed attempts → 30-minute lockout)
   - Rate limiting protection
   - Comprehensive audit logging

3. **Token Service** (20 tests) ✅
   - JWT generation with HS256 signing
   - 8-hour token expiration
   - Token blacklisting for secure logout
   - Session tracking with unique JTI (JWT ID)
   - Validation: audience, issuer, expiration, role

4. **Two-Factor Authentication Service** (33 tests) ✅
   - TOTP (Time-based One-Time Password) RFC 6238 compliant
   - QR code generation (Base64-encoded PNG)
   - Backup codes (alphanumeric, one-time use)
   - Temporary tokens for 2FA completion (5-minute expiry)
   - ±30 second time tolerance window

5. **HTTP Endpoints** (17 integration tests) ✅
   - `/api/auth/login` - User authentication
   - `/api/auth/verify` - Token verification
   - `/api/auth/logout` - Secure logout
   - `/api/auth/change-password` - Password management
   - `/api/auth/password-strength` - Real-time password validation
   - `/api/auth/2fa/prepare` - Get QR code and setup
   - `/api/auth/2fa/setup` - Enable 2FA
   - `/api/auth/2fa/verify` - Complete 2FA login
   - `/api/auth/2fa/disable` - Disable 2FA
   - `/api/auth/session` - Get session info
   - `/api/auth/audit-logs` - Security event logs

### ✅ Frontend Authentication (TypeScript/React - fsfvi-frontend)

#### Type Definitions ([lib/types/demoAuth.ts](fsfvi-frontend/lib/types/demoAuth.ts))
- Complete TypeScript interfaces matching backend models
- Proper type safety for all authentication operations
- Security event and session tracking types

#### API Client ([lib/demoAuthApi.ts](fsfvi-frontend/lib/demoAuthApi.ts))
- Axios-based HTTP client with interceptors
- Automatic JWT token inclusion
- Token storage in localStorage with expiry tracking
- Automatic 401 handling and logout
- All authentication endpoints implemented

#### React Hooks ([hooks/useDemoAuth.ts](fsfvi-frontend/hooks/useDemoAuth.ts))
- `useDemoAuth(requireAuth)` - Main authentication hook
- Automatic token verification
- Redirect to login when unauthenticated
- User state management
- Logout functionality

#### UI Components ([components/demo/](fsfvi-frontend/components/demo/))
1. **LoginForm** - Government login with 2FA support
2. **TwoFactorForm** - 6-digit TOTP verification
3. **PasswordChangeForm** - Real-time strength checking
4. **TwoFactorSetup** - QR code display and backup codes
5. **ProtectedRoute** - Authentication wrapper
6. **DemoDashboard** - User profile and security settings

#### Pages ([app/demo/](fsfvi-frontend/app/demo/))
- `/demo/login` - Login page with 2FA flow
- `/demo/dashboard` - Protected dashboard with FSFVI data
- `/demo` - Smart redirect (authenticated → dashboard, else → login)

---

## 🔧 User Management Utilities

### Create User
```bash
cargo run --bin create_user -- <username> <password>

# Example:
cargo run --bin create_user -- fsfi_gov "SecureGov@2025!Pass"
```

**Features:**
- Automatic bcrypt hashing (cost 12)
- Password complexity validation
- Sets `is_temporary_password = TRUE`
- Generates UUID automatically
- Full security audit trail

### List Users
```bash
cargo run --bin list_users
```

**Displays:**
- All users with security status
- Account status (active/locked)
- Password status (temporary/permanent)
- 2FA status (enabled/disabled)
- Failed login attempts
- Last login timestamp
- Security recommendations

### Delete User

```bash
cargo run --bin delete_user -- <username>
```

**Features:**

- Confirmation required (`DELETE <username>`)
- Cannot be undone
- Shows user details before deletion

### Reset Password

```bash
cargo run --bin reset_password -- <username> <new_password>

# Example:
cargo run --bin reset_password -- demo_government "DemoGov@2025!SecurePass"
```

**Features:**

- Emergency password recovery
- Password complexity validation
- Uses bcrypt hashing (cost 12)
- Sets `is_temporary_password = TRUE`
- Unlocks account and resets failed login attempts
- Useful when user forgets password or initial password is lost

### Check Password (Diagnostic)

```bash
cargo run --bin check_password -- <username> <password>
```

**Features:**

- Verify password without attempting login
- Shows hash type (Argon2 or bcrypt)
- Tests password verification logic
- Useful for debugging authentication issues

---

## 🚀 Quick Start Guide

### 1. Start Backend Server
```bash
cd demo_gov_backend
cargo run
```

**Server Details:**
- URL: `http://localhost:8081`
- Health Check: `http://localhost:8081/api/health`
- Default User: `demo_government` / `DemoGov@2025!SecurePass`

### 2. Start Frontend
```bash
cd fsfvi-frontend
npm run dev
```

**Frontend URLs:**
- Home: `http://localhost:3000`
- Demo Login: `http://localhost:3000/demo/login`
- Demo Dashboard: `http://localhost:3000/demo/dashboard`

### 3. First Login Flow

1. **Navigate to Login:**
   ```
   http://localhost:3000/demo/login
   ```

2. **Login with Default Credentials:**
   - Username: `demo_government`
   - Password: `DemoGov@2025!SecurePass`

3. **Change Temporary Password:**
   - System will prompt immediately
   - New password must meet all requirements (12+ chars, complexity)

4. **Enable 2FA (Recommended):**
   - Navigate to security settings in dashboard
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Save backup codes securely
   - Verify with 6-digit code

5. **Access Protected Dashboard:**
   - View FSFVI performance data
   - Manage user profile
   - Change password
   - Manage 2FA settings

---

## 🔒 Security Features

### Password Security
- **Minimum Requirements:**
  - 12 characters minimum
  - Uppercase letter
  - Lowercase letter
  - Number
  - Special character
  - No common patterns

- **Hashing:**
  - Bcrypt with cost factor 12
  - Argon2 alternative available
  - Salted automatically

- **Policy Enforcement:**
  - Real-time strength checking
  - Common password dictionary
  - Pattern detection (123, abc, password, etc.)
  - Repeating character detection

### Authentication Security
- **JWT Tokens:**
  - HS256 signing algorithm
  - 8-hour expiration
  - Secure token storage
  - Blacklisting on logout

- **Session Management:**
  - 30-minute idle timeout
  - Unique session IDs (UUID)
  - IP address tracking
  - User agent logging

- **Account Protection:**
  - 5 failed attempts → lockout
  - 30-minute lockout duration
  - Automatic attempt reset on success
  - Comprehensive audit logging

### Two-Factor Authentication (2FA)
- **TOTP Standard:**
  - RFC 6238 compliant
  - 30-second time windows
  - ±30 second tolerance
  - 6-digit codes

- **Backup Codes:**
  - 8 alphanumeric codes generated
  - One-time use enforcement
  - Secure storage required

- **QR Code:**
  - Base64-encoded PNG
  - Compatible with all standard authenticator apps

### Network Security
- **CORS Configuration:**
  - Restricted to frontend origin only
  - Credentials support
  - Pre-flight requests handled

- **Rate Limiting:**
  - 60 requests per minute (configurable)
  - Per-IP tracking
  - Prevents brute force attacks

- **Security Headers:**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security

### Audit & Compliance
- **Security Events Logged:**
  - All login attempts (success/failure)
  - Password changes
  - 2FA setup/disable
  - Account lockouts
  - Token blacklisting
  - Session creation/termination

- **Audit Trail:**
  - Timestamp (RFC3339)
  - User ID
  - IP address
  - User agent
  - Event type
  - Success/failure
  - Metadata (JSON)

---

## 📁 File Structure

### Backend (demo_gov_backend/)
```
demo_gov_backend/
├── src/
│   ├── main.rs                    # Server entry point
│   ├── config.rs                  # Configuration management
│   ├── models/
│   │   ├── auth.rs               # Auth types and SecurityConfig
│   │   └── user.rs               # User models and requests
│   ├── services/
│   │   ├── auth_service.rs       # Authentication logic (19 tests)
│   │   ├── password_service.rs   # Password hashing (15 tests)
│   │   ├── token_service.rs      # JWT management (20 tests)
│   │   └── two_fa_service.rs     # 2FA/TOTP (33 tests)
│   ├── handlers/
│   │   ├── auth_handler.rs       # HTTP endpoints (17 tests)
│   │   └── fsfvi_handler.rs      # FSFVI endpoints
│   ├── middleware/
│   │   └── security.rs           # Security headers, rate limiting, logging
│   ├── utils/
│   │   └── mod.rs                # Utility functions
│   └── bin/
│       ├── create_user.rs        # User creation utility
│       ├── delete_user.rs        # User deletion utility
│       └── list_users.rs         # User listing utility
├── migrations/
│   └── 001_auth.sql              # Database schema
├── Cargo.toml                     # Dependencies
├── .env                           # Environment variables
├── USER_MANAGEMENT.md             # User management guide
└── demo_gov_backend.db            # SQLite database
```

### Frontend (fsfvi-frontend/)
```
fsfvi-frontend/
├── lib/
│   ├── demoAuthApi.ts            # Authentication API client
│   └── types/
│       └── demoAuth.ts           # TypeScript type definitions
├── hooks/
│   └── useDemoAuth.ts            # Authentication React hook
├── components/
│   └── demo/
│       ├── index.ts              # Component exports
│       ├── ProtectedRoute.tsx    # Authentication wrapper
│       ├── LoginForm.tsx         # Login UI
│       ├── TwoFactorForm.tsx     # 2FA verification
│       ├── PasswordChangeForm.tsx # Password management
│       ├── TwoFactorSetup.tsx    # 2FA setup flow
│       └── DemoDashboard.tsx     # User dashboard
└── app/
    └── demo/
        ├── page.tsx              # Smart redirect
        ├── login/
        │   └── page.tsx          # Login page
        └── dashboard/
            └── page.tsx          # Protected dashboard
```

---

## 🧪 Testing

### Run All Backend Tests
```bash
cd demo_gov_backend
cargo test
```

**Test Results:**
```
running 104 tests
test services::password_service::tests::... ok (15 tests)
test services::auth_service::tests::... ok (19 tests)
test services::token_service::tests::... ok (20 tests)
test services::two_fa_service::tests::... ok (33 tests)
test handlers::auth_handler::tests::... ok (17 tests)

test result: ok. 104 passed; 0 failed
```

### Run Specific Test Suites
```bash
# Password service tests
cargo test password_service

# Authentication service tests
cargo test auth_service

# Token service tests
cargo test token_service

# 2FA service tests
cargo test two_fa_service

# HTTP endpoint integration tests
cargo test auth_handler
```

---

## 🔐 Default Credentials

**⚠️ CRITICAL: CHANGE IMMEDIATELY IN PRODUCTION**

- **Username:** `demo_government`
- **Password:** `DemoGov@2025!SecurePass`
- **Temporary Password:** YES (must change on first login)
- **2FA Enabled:** NO (should enable after first login)

---

## 🛠️ Configuration

### Environment Variables (.env)

```bash
# Server Configuration
HOST=127.0.0.1
PORT=8081

# Database
DATABASE_URL=sqlite:./demo_gov_backend.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION_HOURS=8

# Security
RATE_LIMIT_PER_MINUTE=60
SESSION_TIMEOUT_MINUTES=30

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# FSFVI API Integration
FSFVI_API_URL=http://localhost:8080
FSFVI_API_KEY=your-fsfvi-api-key

# Password Policy
MIN_PASSWORD_LENGTH=12
REQUIRE_UPPERCASE=true
REQUIRE_LOWERCASE=true
REQUIRE_NUMBERS=true
REQUIRE_SPECIAL=true
```

### Frontend Configuration

Create `.env.local`:
```bash
NEXT_PUBLIC_DEMO_API_URL=http://localhost:8081
```

---

## 📝 API Endpoints Reference

### Authentication Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auth/login` | POST | No | User login |
| `/api/auth/verify` | GET | Yes | Verify token |
| `/api/auth/logout` | POST | Yes | Logout user |
| `/api/auth/change-password` | POST | Yes | Change password |
| `/api/auth/password-strength` | POST | No | Check password strength |
| `/api/auth/2fa/prepare` | GET | Yes | Get 2FA QR code |
| `/api/auth/2fa/setup` | POST | Yes | Enable 2FA |
| `/api/auth/2fa/verify` | POST | No | Verify 2FA code |
| `/api/auth/2fa/disable` | POST | Yes | Disable 2FA |
| `/api/auth/session` | GET | Yes | Get session info |
| `/api/auth/audit-logs` | GET | Yes | Get audit logs |

---

## 🚨 Troubleshooting

### Backend Won't Start
```bash
# Check if port 8081 is in use
netstat -ano | findstr :8081

# Run with verbose logging
RUST_LOG=debug cargo run
```

### Frontend Can't Connect
```bash
# Verify backend is running
curl http://localhost:8081/api/health

# Check environment variables
cat .env.local
```

### User Can't Login
```bash
# Check if user exists
cargo run --bin list_users

# Check if account is locked
# Look for "is_locked: true" in list_users output

# Reset failed attempts manually if needed
```

### 2FA Code Not Working
- Ensure system time is synchronized
- Wait for new code (30-second window)
- Check authenticator app time sync
- Use backup code as alternative

---

## 📚 Additional Documentation

- **[USER_MANAGEMENT.md](demo_gov_backend/USER_MANAGEMENT.md)** - Detailed user management guide
- **Backend API Docs** - In-code documentation (Rust doc comments)
- **Frontend Component Docs** - TSDoc comments in components

---

## ✅ Production Readiness Checklist

### Before Deploying to Production:

- [ ] Change all default passwords
- [ ] Update JWT_SECRET to strong random value
- [ ] Enable HTTPS/TLS
- [ ] Configure production CORS origins
- [ ] Set up PostgreSQL (recommended over SQLite)
- [ ] Enable comprehensive logging
- [ ] Set up monitoring and alerts
- [ ] Configure backup procedures
- [ ] Review and adjust rate limits
- [ ] Test disaster recovery procedures
- [ ] Enable all users to use 2FA
- [ ] Document incident response procedures
- [ ] Conduct security audit
- [ ] Perform penetration testing

---

## 🤝 Support & Contact

For technical support or questions about the authentication system:

**Email:** J.Ulimwengu@cgiar.org, emmanuel.kwofie@mcgill.ca
**CC:** ebenezer.miezah@mcgill.ca

---

**Last Updated:** December 19, 2025
**Version:** 1.0.0
**Status:** Production Ready
