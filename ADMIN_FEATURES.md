# FSFVI Admin Interface - Comprehensive Feature Documentation

## Overview

This document outlines the comprehensive admin features implemented for the FSFVI (Food Systems Financial Vulnerability Index) platform. These features provide FSFI administrators with complete control, monitoring, and security capabilities for managing government users and the platform.

## Architecture

### Backend (Rust/Actix-web)
- **Location**: `fsfi-backend/src/handlers/admin.rs`
- **Authentication**: JWT-based with role-based access control (Admin role required)
- **Database**: PostgreSQL with optimized queries and proper indexing

### Frontend (React/TypeScript/Tauri)
- **Location**: `fsfvi-admin/src/components/`
- **Framework**: React 19 with TypeScript
- **UI Library**: Tailwind CSS v4
- **Desktop**: Tauri v2

---

## Feature Set

### 1. **Analytics Dashboard** 📊

**Purpose**: Provides system-wide overview and insights into platform usage, performance, and government activity.

#### Backend Endpoints:
- `GET /api/v1/admin/analytics/overview?days=30`
  - Returns comprehensive analytics for the specified time period
  - Includes government statistics, user counts, API usage, daily trends
  - Identifies governments approaching quota limits (80%+ usage)

#### Frontend Component:
- **File**: `fsfvi-admin/src/components/Analytics.tsx`

#### Features:
- **Key Metrics Cards**:
  - Total Governments count
  - Active Users count
  - Total API Requests
  - System-wide Error Rate

- **Government Status Breakdown**: Visual breakdown of governments by status (active/suspended/pending)

- **Users by Role**: Distribution of admin vs developer users

- **Daily Request Trends**: Tabular view of API requests, errors, and active governments over time

- **Quota Warnings**:
  - Proactive alerts for governments exceeding 80% of daily or monthly quotas
  - Shows exact usage numbers and percentages
  - Critical for preventing service disruptions

#### Use Cases:
- Daily operational overview
- Capacity planning
- Identifying governments needing quota increases
- Monitoring overall system health trends

---

### 2. **Government Management** 🌍

**Purpose**: Complete CRUD operations for government entities with advanced filtering and status management.

#### Backend Endpoints:
- `GET /api/v1/admin/governments` - List all governments
- `POST /api/v1/admin/governments` - Create new government
- `GET /api/v1/admin/governments/{id}` - Get government details
- `PUT /api/v1/admin/governments/{id}` - Update government
- `POST /api/v1/admin/governments/{id}/activate` - Activate government
- `POST /api/v1/admin/governments/{id}/suspend` - Suspend government
- `GET /api/v1/admin/governments/{id}/usage-stats?days=30` - Get usage statistics

#### Frontend Component:
- **File**: `fsfvi-admin/src/components/Governments.tsx`

#### Features:
- **Government Listing**:
  - Sortable table with country, type, tier, status
  - Visual status indicators (colored badges)
  - Quick action buttons (Suspend/Activate)

- **Create Government**:
  - Form validation (country code, email, quotas)
  - Tier selection (Basic/Standard/Premium/Enterprise)
  - Government type (Federal/State/Regional/Local/Agency)
  - API quota configuration

- **Government Details**:
  - Full government information
  - Contact details
  - API quotas and current usage
  - Active API keys count
  - Historical usage data

#### Security Features:
- Country code validation (ISO 3166-1 alpha-2)
- Email validation
- Scope/endpoint validation
- IP whitelist support

---

### 3. **User Management** 👥

**Purpose**: Manage government users with role-based access control and security monitoring.

#### Backend Endpoints:
- `GET /api/v1/admin/users?government_id={id}` - List users (optionally filtered)
- `POST /api/v1/admin/users` - Create new user
- `GET /api/v1/admin/users/{id}` - Get user details
- `PUT /api/v1/admin/users/{id}` - Update user
- `PUT /api/v1/admin/users/{id}/roles` - Update user role
- `GET /api/v1/admin/users/{id}/permissions` - Check user permissions

#### Frontend Component:
- **File**: `fsfvi-admin/src/components/Users.tsx`

#### Features:
- **User Listing**:
  - Filter by government
  - View user role (Admin/Developer)
  - Status indicators (Active/Inactive/Locked)
  - MFA status
  - Last login tracking

- **Create User**:
  - Government assignment
  - Role selection with descriptions
  - Password requirements (min 8 characters)
  - Automatic password hashing (Argon2)

- **Security Features**:
  - Failed login attempt tracking
  - Account locking after 5 failed attempts
  - MFA support (TOTP + backup codes)
  - Session management with refresh tokens

#### User Roles:
- **Admin**: FSFI company administrators (full system control)
- **Developer**: Government users (API access, can manage API keys)

---

### 4. **API Key Management** 🔑

**Purpose**: Secure API key lifecycle management with granular permissions and usage tracking.

#### Backend Endpoints:
- `GET /api/v1/admin/api-keys/all?government_id={id}` - List all API keys
- `POST /api/v1/api-keys` - Create API key
- `DELETE /api/v1/api-keys/{id}` - Revoke API key
- `POST /api/v1/admin/api-keys/verify` - Verify API key

#### Frontend Component:
- **File**: `fsfvi-admin/src/components/ApiKeys.tsx`

#### Features:
- **API Key Listing**:
  - Filter by government
  - Status (Active/Revoked/Expired)
  - Last used timestamp
  - Usage count
  - Expiration date

- **Create API Key**:
  - Custom key name
  - Scope/permission selection:
    - `fsfvi:analyze`
    - `fsfvi:budget-optimization`
    - `fsfvi:scenario-analysis`
    - `fsfvi:policy-recommendations`
    - `users:read`
    - `users:write`
  - Optional expiration date
  - Rate limit overrides

- **Security Features**:
  - Keys are hashed (SHA-256) before storage
  - Only shown once during creation
  - Key prefix stored for identification
  - Revocation tracking (who, when, why)
  - Automatic expiration support

---

### 5. **Audit Logs Viewer** 📋

**Purpose**: Comprehensive audit trail for compliance, security investigations, and troubleshooting.

#### Backend Endpoints:
- `GET /api/v1/admin/audit-logs?page=1&page_size=50`
- `POST /api/v1/admin/audit-log` - Create audit log entry

#### Frontend Component:
- **File**: `fsfvi-admin/src/components/AuditLogs.tsx`

#### Features:
- **Log Viewing**:
  - Paginated table (50 entries per page)
  - Filter by action type
  - Real-time refresh capability
  - Color-coded action badges
  - Response status indicators

- **Captured Events**:
  - Login/Logout (successful and failed)
  - API Key lifecycle (created, revoked)
  - API requests
  - Data access and exports
  - Configuration changes
  - User management actions
  - Permission changes
  - Rate limit violations
  - Unauthorized access attempts

- **Log Details**:
  - Timestamp (with millisecond precision)
  - Action type
  - Resource type and ID
  - IP address
  - User agent
  - Request method and path
  - Response status
  - Response time (ms)
  - Error messages
  - Custom metadata

#### Compliance:
- **Partitioned by month** for performance
- Supports regulatory requirements (SOC 2, GDPR, etc.)
- Immutable log entries
- Long-term retention support

---

### 6. **System Health & Security Dashboard** 🏥

**Purpose**: Real-time monitoring of system health and proactive security threat detection.

#### Backend Endpoints:
- `GET /api/v1/admin/system/health` - System health metrics
- `GET /api/v1/admin/security/alerts?hours=24` - Security alerts

#### Frontend Component:
- **File**: `fsfvi-admin/src/components/SystemHealth.tsx`

#### Features:

##### System Health Monitoring:
- **Database Health**:
  - Connection status
  - Active connections count
  - Total connections
  - Database size

- **Security Metrics**:
  - Failed logins (last hour)
  - Rate limit violations (last hour)
  - Unauthorized access attempts (last hour)
  - Locked user accounts

- **Auto-refresh**: Updates every 30 seconds

##### Security Alerts:
- **Failed Login Attempts**:
  - Timestamp, IP address, user email
  - User agent information
  - Associated government

- **Rate Limit Violations**:
  - IP address and request path
  - Government and country
  - Timestamp tracking

- **Unauthorized Access Attempts**:
  - HTTP method and path
  - IP address
  - Error details

- **Suspicious IP Detection**:
  - IPs with 5+ security events
  - Aggregated action types
  - Last attempt timestamp
  - Attempt count

- **Revoked API Keys**:
  - Recently revoked keys
  - Revocation reason
  - Who revoked it
  - Government association

#### Security Use Cases:
- **Intrusion Detection**: Identify brute force attacks
- **Anomaly Detection**: Spot unusual access patterns
- **Incident Response**: Quick access to security events
- **Compliance**: Security event reporting

---

## API Client Integration

**File**: `fsfvi-admin/src/api/client.ts`

### New Methods Added:
```typescript
// Analytics
getAnalyticsOverview(days: number): Promise<ApiResponse<any>>
getApiUsageAnalytics(governmentId?: string, days?: number): Promise<ApiResponse<any>>

// Usage Statistics
getUsageStats(governmentId: string, days: number): Promise<ApiResponse<any>>

// System Health
getSystemHealth(): Promise<ApiResponse<any>>

// Security
getSecurityAlerts(hours: number): Promise<ApiResponse<any>>
```

### Features:
- **Automatic token refresh** on 401 errors
- **Request/response interceptors** for authentication
- **Type-safe** API calls with TypeScript
- **Error handling** with proper error messages
- **LocalStorage** token management

---

## Database Schema

### Key Tables:

#### `governments`
- Government entity information
- Tier and status management
- API quotas (daily/monthly)
- Allowed endpoints (JSONB)
- IP whitelist support

#### `users`
- User authentication
- Role-based access control
- MFA configuration
- Failed login tracking
- Account locking

#### `api_keys`
- Hashed key storage
- Scope/permission management
- Usage tracking
- Expiration support
- Revocation tracking

#### `audit_logs` (Partitioned)
- Comprehensive event logging
- Monthly partitioning for performance
- Full request/response tracking
- Metadata support

#### `api_usage`
- Daily aggregated usage statistics
- Request and error counts
- Response time tracking
- Per-endpoint tracking

### Performance Optimizations:
- **Indexes** on frequently queried columns
- **Partitioning** for audit logs
- **Aggregation tables** for usage statistics
- **Triggers** for automatic timestamp updates

---

## Security Features

### Authentication & Authorization:
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (Admin/Developer)
- **Permission checking** at endpoint level
- **MFA support** (TOTP + backup codes)

### API Security:
- **Rate limiting** (per-second and burst)
- **API key authentication** for government access
- **Scope-based permissions** for API keys
- **IP whitelisting** support

### Security Monitoring:
- **Failed login tracking** with automatic account locking
- **Suspicious IP detection** (5+ security events)
- **Audit logging** of all security events
- **Real-time security alerts**

### Data Protection:
- **Password hashing** (Argon2)
- **API key hashing** (SHA-256)
- **Encrypted MFA secrets**
- **HTTPS enforcement** (production)

---

## Operational Features

### Quota Management:
- **Proactive warnings** at 80% usage
- **Daily and monthly limits**
- **Per-government tracking**
- **Override capabilities**

### Monitoring & Alerting:
- **Real-time health checks**
- **Auto-refresh dashboards** (30s)
- **Historical trend analysis**
- **Performance metrics**

### Compliance & Audit:
- **Complete audit trail**
- **Immutable logs**
- **Long-term retention**
- **Regulatory compliance support** (SOC 2, GDPR)

---

## Getting Started

### Backend Setup:
```bash
cd fsfi-backend
cargo build --release
cargo run
```

### Frontend Setup:
```bash
cd fsfvi-admin
npm install
npm run dev      # Development mode
npm run tauri    # Tauri desktop app
```

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/fsfvi

# JWT
JWT_SECRET=your-secret-key-here
JWT_ACCESS_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=604800

# Server
SERVER_HOST=127.0.0.1
SERVER_PORT=8080

# Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Best Practices

### For Administrators:

1. **Regular Monitoring**:
   - Check Analytics dashboard daily
   - Review Security Alerts hourly
   - Monitor quota warnings

2. **Security Practices**:
   - Investigate suspicious IPs immediately
   - Review audit logs for unusual patterns
   - Rotate API keys regularly

3. **Capacity Planning**:
   - Monitor quota utilization trends
   - Increase quotas proactively
   - Scale infrastructure based on analytics

4. **User Management**:
   - Enable MFA for all users
   - Review user permissions quarterly
   - Deactivate unused accounts

### For Developers:

1. **API Key Management**:
   - Use minimal required scopes
   - Set expiration dates
   - Rotate keys regularly
   - Store keys securely (never in code)

2. **Rate Limiting**:
   - Implement exponential backoff
   - Monitor quota usage
   - Request quota increases proactively

---

## Future Enhancements

### Planned Features:
- **Email notifications** for security alerts
- **Webhook support** for critical events
- **Custom dashboards** per government
- **Export capabilities** (CSV, PDF)
- **Advanced analytics** (ML-based anomaly detection)
- **Mobile app** for on-the-go monitoring
- **Multi-tenancy improvements**
- **GraphQL API** option

---

## Support & Documentation

### Technical Support:
- GitHub Issues: [Repository URL]
- Email: support@fsfvi.org

### Additional Documentation:
- API Reference: `/swagger-ui`
- Security Policy: `SECURITY_README.md`
- Deployment Guide: `DEPLOYMENT.md`

---

## License

Proprietary - FSFVI Platform
Copyright © 2025 Food Systems Financial Intelligence

---

**Last Updated**: December 15, 2025
**Version**: 1.0.0
**Status**: Production Ready
