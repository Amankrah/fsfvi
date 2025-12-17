# FSFI Admin Access Guide

Complete guide for FSFI company administrators to manage the Food Systems Financial Intelligence system.

## Quick Start

### 1. Create FSFI Admin Account

```cmd
.\create-admin.bat
```

This creates:
- FSFI Company government record (ID: `00000000-0000-0000-0000-000000000000`)
- FSFI Admin user with email: `admin@fsfi.org` and password: `Test123!@#`

### 2. Start the Backend Server

```powershell
cargo run
# OR for auto-reload during development
cargo watch -x run
```

Server starts on: `http://localhost:8080`

### 3. Login and Get Access Token

```powershell
.\login-test.ps1
```

This will:
- Login as FSFI admin
- Display your user information
- Save the access token to `admin-token.txt`

## Authentication

### Login

```powershell
$credentials = @{
    email = "admin@fsfi.org"
    password = "Test123!@#"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/auth/login" `
    -Method Post `
    -Body $credentials `
    -ContentType "application/json"

# Save token
$token = $response.data.access_token
$token | Out-File -FilePath "admin-token.txt" -NoNewline
```

### Use Token for API Calls

```powershell
# Load token
$token = Get-Content admin-token.txt
$headers = @{ Authorization = "Bearer $token" }

# Make authenticated requests
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments" -Headers $headers
```

### Refresh Token

```powershell
$refreshBody = @{
    refresh_token = $response.data.refresh_token
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/auth/refresh" `
    -Method Post `
    -Body $refreshBody `
    -ContentType "application/json"
```

---

## Government Management

### List All Governments

```powershell
$token = Get-Content admin-token.txt
$headers = @{ Authorization = "Bearer $token" }

$governments = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments" -Headers $headers
$governments.data | Format-Table -AutoSize
```

### Get Specific Government

```powershell
$govId = "11111111-1111-1111-1111-111111111111"
$gov = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments/$govId" -Headers $headers
$gov.data
```

### Create New Government

```powershell
# Example: Kenya Ministry of Agriculture
$newGov = @{
    country_code = "KE"
    country_name = "Kenya"
    government_name = "Ministry of Agriculture, Kenya"
    government_type = "federal"
    tier = "premium"
    contact_email = "admin@agriculture.ke.gov"
    contact_phone = "+254-700-000-000"
    primary_contact_name = "John Kamau"
    primary_contact_title = "Director of IT"
    api_quota_daily = 10000
    api_quota_monthly = 300000
    allowed_endpoints = @("*")
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments" `
    -Method Post `
    -Headers $headers `
    -Body $newGov `
    -ContentType "application/json"

$govId = $result.data.id
Write-Host "Government created with ID: $govId"
```

### Update Government

```powershell
$govId = "11111111-1111-1111-1111-111111111111"
$updates = @{
    status = "active"
    tier = "premium"
    api_quota_daily = 50000
    api_quota_monthly = 1500000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments/$govId" `
    -Method Put `
    -Headers $headers `
    -Body $updates `
    -ContentType "application/json"
```

### Government Tiers

| Tier | Daily Quota | Monthly Quota | Use Case |
|------|-------------|---------------|----------|
| `basic` | 1,000 | 30,000 | Small regions, testing |
| `standard` | 10,000 | 300,000 | Medium-sized countries |
| `premium` | 50,000 | 1,500,000 | Large countries, high usage |
| `enterprise` | 999,999 | 99,999,999 | Unlimited (special cases) |

---

## User Management

### Create User for a Government

```powershell
$newUser = @{
    government_id = "11111111-1111-1111-1111-111111111111"
    email = "developer@agriculture.ke.gov"
    password = "SecurePassword123!"
    full_name = "Jane Wanjiku"
    title = "Senior Developer"
    role = "developer"
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users" `
    -Method Post `
    -Headers $headers `
    -Body $newUser `
    -ContentType "application/json"

Write-Host "User created with ID: $($user.data.id)"
```

### User Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| `admin` | Full system access | FSFI company admins only |
| `developer` | API access, key management | Government developers |
| `analyst` | Read-only FSFVI analysis | Data analysts |
| `viewer` | Read-only access | Observers |

### Check User Permissions

```powershell
$userId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users/$userId/permissions" -Headers $headers
```

### Update User Role

```powershell
$userId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
$roleUpdate = @{
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users/$userId/roles" `
    -Method Put `
    -Headers $headers `
    -Body $roleUpdate `
    -ContentType "application/json"
```

---

## API Key Management

### List All API Keys

```powershell
$apiKeys = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/api-keys/all" -Headers $headers
$apiKeys.data | Format-Table -Property government_id, name, status, expires_at
```

### Verify API Key

```powershell
$keyCheck = @{
    api_key = "fsfi_live_abcd1234..."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/api-keys/verify" `
    -Method Post `
    -Headers $headers `
    -Body $keyCheck `
    -ContentType "application/json"
```

---

## Monitoring & Audit Logs

### View Audit Logs

```powershell
# Recent logs (last 50)
$logs = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?limit=50" -Headers $headers
$logs.data | Format-Table -Property timestamp, user_email, action, resource_type

# Filter by government
$govId = "11111111-1111-1111-1111-111111111111"
$logs = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?government_id=$govId" -Headers $headers

# Filter by action
$logs = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?action=create_api_key" -Headers $headers

# Filter by date range
$logs = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?start_date=2025-01-01&end_date=2025-12-31" -Headers $headers
```

### Create Audit Log Entry

```powershell
$auditEntry = @{
    government_id = "11111111-1111-1111-1111-111111111111"
    user_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    action = "manual_intervention"
    resource_type = "system"
    resource_id = "maintenance"
    details = @{
        reason = "System maintenance"
        affected_services = @("fsfvi_api")
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs" `
    -Method Post `
    -Headers $headers `
    -Body $auditEntry `
    -ContentType "application/json"
```

### Check API Quota Usage

```powershell
$govId = "11111111-1111-1111-1111-111111111111"
$quota = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/quota-check/$govId" -Headers $headers

Write-Host "Daily Usage: $($quota.data.daily_usage) / $($quota.data.daily_quota)"
Write-Host "Monthly Usage: $($quota.data.monthly_usage) / $($quota.data.monthly_quota)"
```

---

## FSFVI Analysis (Admin Access)

As an admin, you have full access to all FSFVI analytical capabilities.

### 1. Vulnerability Assessment

```powershell
$assessmentRequest = @{
    components = @(
        @{
            component_id = "agri_001"
            component_type = "agricultural_development"
            observed_value = 75.0
            benchmark_value = 100.0
            financial_allocation = 5000000.0
            weight = 0.25
            sensitivity_parameter = 0.0008
        },
        @{
            component_id = "infra_001"
            component_type = "infrastructure"
            observed_value = 60.0
            benchmark_value = 90.0
            financial_allocation = 8000000.0
            weight = 0.20
            sensitivity_parameter = 0.0006
        }
    )
    country_name = "Kenya"
    weighting_method = "hybrid"
    scenario = "normal_operations"
    currency = "USD"
} | ConvertTo-Json -Depth 10

$assessment = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/fsfvi/assess" `
    -Method Post `
    -Headers $headers `
    -Body $assessmentRequest `
    -ContentType "application/json"

Write-Host "FSFVI Score: $($assessment.data.fsfvi_score)"
Write-Host "Risk Level: $($assessment.data.risk_level)"
```

### 2. Budget Optimization

```powershell
$optimizationRequest = @{
    components = @(
        # ... same components as above
    )
    objective = "minimize_fsfvi"
    constraints = @{
        total_budget = 15000000.0
        min_allocation_per_component = 1000000.0
        preserve_relative_priorities = $true
    }
} | ConvertTo-Json -Depth 10

$optimization = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/fsfvi/optimize" `
    -Method Post `
    -Headers $headers `
    -Body $optimizationRequest `
    -ContentType "application/json"

$optimization.data.optimal_allocations | Format-Table
```

### 3. Policy Recommendations

```powershell
$policyRequest = @{
    components = @(
        # ... components
    )
    country_name = "Kenya"
    currency = "USD"
    planning_horizon_months = 24
    include_budget_optimization = $true
    include_sensitivity_analysis = $true
} | ConvertTo-Json -Depth 10

$policy = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/fsfvi/policy-recommendations" `
    -Method Post `
    -Headers $headers `
    -Body $policyRequest `
    -ContentType "application/json"

# View recommendations
$policy.data.priority_interventions | Format-Table
$policy.data.executive_summary
```

### 4. Scenario Simulation

```powershell
$scenarioRequest = @{
    components = @(
        # ... components
    )
    scenarios = @("normal_operations", "climate_shock", "financial_crisis", "pandemic_disruption")
} | ConvertTo-Json -Depth 10

$scenarios = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/fsfvi/scenarios/compare" `
    -Method Post `
    -Headers $headers `
    -Body $scenarioRequest `
    -ContentType "application/json"

$scenarios.data.scenarios | Format-Table -Property scenario, fsfvi_score, risk_level
```

### 5. Multi-Year Strategic Planning

```powershell
$planRequest = @{
    components = @(
        # ... components
    )
    years = 5
    annual_budget_growth_rate = 0.05
    target_fsfvi_reduction = 0.30
} | ConvertTo-Json -Depth 10

$plan = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/fsfvi/strategic-plan" `
    -Method Post `
    -Headers $headers `
    -Body $planRequest `
    -ContentType "application/json"

$plan.data.yearly_plans | Format-Table -Property year, fsfvi_score, total_budget
```

---

## Component Types

The FSFVI system analyzes six core components:

| Component Type | Description | Example Indicators |
|----------------|-------------|-------------------|
| `agricultural_development` | Productivity, technology, farmer capacity | Crop yields, mechanization rate, extension services |
| `infrastructure` | Physical systems (roads, storage, markets) | Road density, storage capacity, market access |
| `nutrition_health` | Food access, dietary diversity, health | Malnutrition rates, food security index |
| `climate_natural_resources` | Environmental sustainability, adaptation | Climate resilience, water availability |
| `social_protection_equity` | Safety nets, equity measures | Social programs coverage, poverty rates |
| `governance_institutions` | Policy effectiveness, institutional capacity | Governance index, policy implementation |

---

## Scenarios

Available scenarios for vulnerability analysis:

| Scenario | Description | Use Case |
|----------|-------------|----------|
| `normal_operations` | Baseline conditions | Regular assessments |
| `climate_shock` | Extreme weather events | Drought/flood planning |
| `financial_crisis` | Economic instability | Budget constraints |
| `pandemic_disruption` | Disease outbreaks | Health crisis planning |
| `supply_chain_disruption` | Transportation/trade failures | Logistics crises |
| `cyber_threats` | Digital infrastructure attacks | Cybersecurity planning |
| `political_instability` | Governance failures | Political risk assessment |

---

## Complete Admin Workflow Example

### Setting Up a New Country (Kenya)

```powershell
# 1. Load admin token
$token = Get-Content admin-token.txt
$headers = @{ Authorization = "Bearer $token" }

# 2. Create government
$kenya = @{
    country_code = "KE"
    country_name = "Kenya"
    government_name = "Ministry of Agriculture and Livestock Development"
    government_type = "federal"
    tier = "premium"
    contact_email = "admin@kilimo.go.ke"
    contact_phone = "+254-20-2718870"
    primary_contact_name = "Dr. John Kamau"
    primary_contact_title = "Director of Planning"
    api_quota_daily = 50000
    api_quota_monthly = 1500000
    allowed_endpoints = @("*")
} | ConvertTo-Json

$kenyaGov = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments" `
    -Method Post -Headers $headers -Body $kenya -ContentType "application/json"

$kenyaGovId = $kenyaGov.data.id
Write-Host "Kenya government created: $kenyaGovId"

# 3. Create admin user for Kenya
$kenyaAdmin = @{
    government_id = $kenyaGovId
    email = "john.kamau@kilimo.go.ke"
    password = "KenyaSecure2025!"
    full_name = "Dr. John Kamau"
    title = "Director of Planning"
    role = "admin"
} | ConvertTo-Json

$kenyaUser = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users" `
    -Method Post -Headers $headers -Body $kenyaAdmin -ContentType "application/json"

Write-Host "Kenya admin user created: $($kenyaUser.data.email)"

# 4. Create developer users
$developer1 = @{
    government_id = $kenyaGovId
    email = "grace.wanjiru@kilimo.go.ke"
    password = "DevSecure2025!"
    full_name = "Grace Wanjiru"
    title = "Senior Developer"
    role = "developer"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users" `
    -Method Post -Headers $headers -Body $developer1 -ContentType "application/json"

Write-Host "Setup complete! Kenya can now access the system."
Write-Host "Admin Email: john.kamau@kilimo.go.ke"
Write-Host "Developer Email: grace.wanjiru@kilimo.go.ke"
```

---

## Health & Status

### Check System Health

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health"
```

### View API Documentation

Open in browser: `http://localhost:8080/swagger-ui/`

---

## Security Best Practices

### 1. Change Default Password Immediately

```powershell
# After first login, change password
$passwordChange = @{
    current_password = "Test123!@#"
    new_password = "YourStrongPassword2025!@#"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/auth/change-password" `
    -Method Put `
    -Headers $headers `
    -Body $passwordChange `
    -ContentType "application/json"
```

### 2. Enable MFA

```powershell
# Enable MFA
$mfaResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/mfa/enable" `
    -Method Post `
    -Headers $headers

# Display QR code and secret
Write-Host "Secret: $($mfaResponse.data.secret)"
Write-Host "QR Code: $($mfaResponse.data.qr_code_url)"
Write-Host "Scan with Google Authenticator or similar app"

# Verify MFA setup
$verifyMfa = @{
    code = "123456"  # 6-digit code from authenticator app
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/mfa/verify" `
    -Method Post `
    -Headers $headers `
    -Body $verifyMfa `
    -ContentType "application/json"
```

### 3. Regular Security Audits

```powershell
# Check failed login attempts
$failedLogins = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?action=failed_login&limit=100" -Headers $headers

# Check API key creation
$apiKeyCreation = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?action=create_api_key&limit=100" -Headers $headers

# Check admin actions
$adminActions = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?role=admin&limit=100" -Headers $headers
```

### 4. IP Whitelisting (Production)

Update government IP whitelist:

```powershell
$govId = "11111111-1111-1111-1111-111111111111"
$ipUpdate = @{
    ip_whitelist = @("203.0.113.0/24", "198.51.100.42")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments/$govId" `
    -Method Put `
    -Headers $headers `
    -Body $ipUpdate `
    -ContentType "application/json"
```

---

## Troubleshooting

### Token Expired

```powershell
# Use refresh token to get new access token
$refreshBody = @{
    refresh_token = "YOUR_REFRESH_TOKEN"
} | ConvertTo-Json

$newToken = Invoke-RestMethod -Uri "http://localhost:8080/auth/refresh" `
    -Method Post `
    -Body $refreshBody `
    -ContentType "application/json"

$newToken.data.access_token | Out-File -FilePath "admin-token.txt" -NoNewline
```

### Can't Login

```powershell
# Check if user exists
docker exec fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db -c "SELECT email, role, status FROM users WHERE email = 'admin@fsfi.org';"

# Recreate admin account
.\create-admin.bat
```

### Database Connection Issues

```powershell
# Check if PostgreSQL is running
docker ps | grep fsfi-dev-postgres

# Restart PostgreSQL
docker restart fsfi-dev-postgres
```

### View Backend Logs

```powershell
# Run with debug logging
$env:RUST_LOG="debug,fsfi_backend=debug,actix_web=info"
cargo run
```

---

## Production Deployment Checklist

- [ ] Change default admin password
- [ ] Enable MFA for all admin accounts
- [ ] Configure HTTPS/TLS certificates
- [ ] Set up IP whitelisting
- [ ] Configure production database (not dev container)
- [ ] Set strong JWT secret (min 32 characters)
- [ ] Set strong encryption key (min 32 characters)
- [ ] Configure rate limiting per tier
- [ ] Set up monitoring and alerting
- [ ] Configure backup and disaster recovery
- [ ] Review and test audit logging
- [ ] Configure CORS for production domains only
- [ ] Set up firewall rules
- [ ] Enable database encryption at rest
- [ ] Configure secure session management
- [ ] Document incident response procedures

---

## Support & Resources

- **API Documentation**: http://localhost:8080/swagger-ui/
- **Health Check**: http://localhost:8080/health
- **Backend Logs**: Check console output from `cargo run`
- **Database**: PostgreSQL on `localhost:5433`

## Quick Reference Card

```powershell
# Essential Commands Cheat Sheet

# Login
.\login-test.ps1

# Load token
$token = Get-Content admin-token.txt
$headers = @{ Authorization = "Bearer $token" }

# List governments
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/governments" -Headers $headers

# Create government
# See "Create New Government" section above

# List users
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users" -Headers $headers

# View audit logs
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit-logs?limit=50" -Headers $headers

# Check quotas
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/quota-check/GOVERNMENT_ID" -Headers $headers

# FSFVI Assessment
# See "FSFVI Analysis" section above
```

---

**Last Updated**: December 2025
**FSFI Backend Version**: 0.1.0
**Maintained by**: FSFI Development Team
