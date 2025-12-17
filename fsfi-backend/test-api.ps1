# FSFI Backend - API Testing Script
# This script tests all API endpoints

param(
    [string]$BaseUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "FSFI Backend - API Testing" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test credentials
$testEmail = "john.kamau@agriculture.ke.gov"
$testPassword = "Test123!@#"

# Variables to store tokens
$accessToken = ""
$refreshToken = ""
$apiKey = ""

# Helper function to make API calls
function Invoke-ApiTest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [string]$Description
    )

    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "  ${Method} ${Endpoint}" -ForegroundColor Gray

    try {
        $params = @{
            Method = $Method
            Uri = "${BaseUrl}${Endpoint}"
            Headers = $Headers
            ContentType = "application/json"
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }

        $response = Invoke-RestMethod @params
        Write-Host "  ✓ Success" -ForegroundColor Green
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  ✗ Failed (HTTP $statusCode)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            $error = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "  Error: $($error.error)" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Health Check
Write-Host "`n[1/10] Health Check" -ForegroundColor Cyan
$health = Invoke-ApiTest -Method "GET" -Endpoint "/health" -Description "Health check endpoint"
if ($health) {
    Write-Host "  Service: $($health.service)" -ForegroundColor White
    Write-Host "  Version: $($health.version)" -ForegroundColor White
    Write-Host "  Status: $($health.status)" -ForegroundColor White
}

# Test 2: Login
Write-Host "`n[2/10] Authentication - Login" -ForegroundColor Cyan
$loginBody = @{
    email = $testEmail
    password = $testPassword
}
$login = Invoke-ApiTest -Method "POST" -Endpoint "/api/v1/auth/login" -Body $loginBody -Description "User login"
if ($login -and $login.success) {
    $accessToken = $login.data.access_token
    $refreshToken = $login.data.refresh_token
    Write-Host "  User: $($login.data.user.full_name)" -ForegroundColor White
    Write-Host "  Role: $($login.data.user.role)" -ForegroundColor White
    Write-Host "  Access token expires in: $($login.data.expires_in)s" -ForegroundColor White
} else {
    Write-Host "  ⚠ Login failed. Make sure to run seed-dev-data.sql first!" -ForegroundColor Yellow
    Write-Host "  Command: docker exec -i fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db < seed-dev-data.sql" -ForegroundColor Yellow
    exit 1
}

# Test 3: Get Governments
Write-Host "`n[3/10] Get Governments List" -ForegroundColor Cyan
$authHeaders = @{
    "Authorization" = "Bearer $accessToken"
}
$governments = Invoke-ApiTest -Method "GET" -Endpoint "/api/v1/governments" -Headers $authHeaders -Description "List all governments"
if ($governments -and $governments.success) {
    Write-Host "  Found $($governments.data.Count) governments" -ForegroundColor White
    foreach ($gov in $governments.data) {
        Write-Host "  - $($gov.country_name) ($($gov.tier)): $($gov.status)" -ForegroundColor Gray
    }
}

# Test 4: Get Specific Government
Write-Host "`n[4/10] Get Government Details" -ForegroundColor Cyan
$govId = "11111111-1111-1111-1111-111111111111"
$government = Invoke-ApiTest -Method "GET" -Endpoint "/api/v1/governments/$govId" -Headers $authHeaders -Description "Get government by ID"
if ($government -and $government.success) {
    Write-Host "  Name: $($government.data.government_name)" -ForegroundColor White
    Write-Host "  Tier: $($government.data.tier)" -ForegroundColor White
    Write-Host "  Daily Quota: $($government.data.api_quota_daily)" -ForegroundColor White
    Write-Host "  Monthly Quota: $($government.data.api_quota_monthly)" -ForegroundColor White
}

# Test 5: Create API Key
Write-Host "`n[5/10] Create API Key" -ForegroundColor Cyan
$apiKeyBody = @{
    name = "Test API Key - PowerShell"
    scopes = @("read:data", "read:analytics")
    expires_in_days = 365
}
$apiKeyResponse = Invoke-ApiTest -Method "POST" -Endpoint "/api/v1/api-keys" -Headers $authHeaders -Body $apiKeyBody -Description "Create new API key"
if ($apiKeyResponse -and $apiKeyResponse.success) {
    $apiKey = $apiKeyResponse.data.api_key
    Write-Host "  ⚠ API Key (save this!): $apiKey" -ForegroundColor Yellow
    Write-Host "  Name: $($apiKeyResponse.data.name)" -ForegroundColor White
    Write-Host "  Scopes: $($apiKeyResponse.data.scopes -join ', ')" -ForegroundColor White
    Write-Host "  Expires: $($apiKeyResponse.data.expires_at)" -ForegroundColor White
}

# Test 6: List API Keys
Write-Host "`n[6/10] List API Keys" -ForegroundColor Cyan
$apiKeys = Invoke-ApiTest -Method "GET" -Endpoint "/api/v1/api-keys" -Headers $authHeaders -Description "List all API keys"
if ($apiKeys -and $apiKeys.success) {
    Write-Host "  Found $($apiKeys.data.Count) API key(s)" -ForegroundColor White
    foreach ($key in $apiKeys.data) {
        Write-Host "  - $($key.name) ($($key.key_prefix)...): $($key.status), used $($key.usage_count) times" -ForegroundColor Gray
    }
}

# Test 7: Use API Key to Access Governments
if ($apiKey) {
    Write-Host "`n[7/10] Use API Key Authentication" -ForegroundColor Cyan
    $apiKeyHeaders = @{
        "X-API-Key" = $apiKey
    }
    $apiKeyTest = Invoke-ApiTest -Method "GET" -Endpoint "/api/v1/governments" -Headers $apiKeyHeaders -Description "Access with API key"
    if ($apiKeyTest -and $apiKeyTest.success) {
        Write-Host "  ✓ API key authentication works!" -ForegroundColor Green
    }
} else {
    Write-Host "`n[7/10] Use API Key Authentication" -ForegroundColor Cyan
    Write-Host "  ⊘ Skipped (no API key)" -ForegroundColor Gray
}

# Test 8: Refresh Token
Write-Host "`n[8/10] Refresh Access Token" -ForegroundColor Cyan
$refreshBody = @{
    refresh_token = $refreshToken
}
$refreshResponse = Invoke-ApiTest -Method "POST" -Endpoint "/api/v1/auth/refresh" -Body $refreshBody -Description "Refresh access token"
if ($refreshResponse -and $refreshResponse.success) {
    $newAccessToken = $refreshResponse.data.access_token
    Write-Host "  ✓ New access token received" -ForegroundColor Green
    Write-Host "  Expires in: $($refreshResponse.data.expires_in)s" -ForegroundColor White
}

# Test 9: Invalid Authentication
Write-Host "`n[9/10] Test Invalid Authentication" -ForegroundColor Cyan
$invalidHeaders = @{
    "Authorization" = "Bearer invalid_token_123"
}
$invalidAuth = Invoke-ApiTest -Method "GET" -Endpoint "/api/v1/governments" -Headers $invalidHeaders -Description "Access with invalid token"
if ($null -eq $invalidAuth) {
    Write-Host "  ✓ Properly rejected invalid token" -ForegroundColor Green
}

# Test 10: Logout
Write-Host "`n[10/10] Logout" -ForegroundColor Cyan
$logoutBody = @{
    refresh_token = $refreshToken
}
$logout = Invoke-ApiTest -Method "POST" -Endpoint "/api/v1/auth/logout" -Headers $authHeaders -Body $logoutBody -Description "Logout (revoke refresh token)"
if ($logout -and $logout.success) {
    Write-Host "  ✓ Logged out successfully" -ForegroundColor Green
}

# Summary
Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Base URL: $BaseUrl" -ForegroundColor White
Write-Host "  Test User: $testEmail" -ForegroundColor White
Write-Host "  Test Password: $testPassword" -ForegroundColor White
if ($apiKey) {
    Write-Host "  Generated API Key: $apiKey" -ForegroundColor White
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  - View audit logs in database" -ForegroundColor White
Write-Host "  - Test rate limiting with repeated requests" -ForegroundColor White
Write-Host "  - Try the API with Postman or Insomnia" -ForegroundColor White
Write-Host ""
