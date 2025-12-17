# FSFI Backend API Documentation

Base URL: `https://api.fsfi.org/api/v1`

## Authentication

FSFI uses two authentication methods:

### 1. JWT Bearer Token (for users)
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### 2. API Key (for programmatic access)
```http
X-API-Key: fsfi_live_abc123xyz...
```

## Endpoints

### Authentication

#### POST /auth/login
Login and receive JWT tokens.

**Request:**
```json
{
  "email": "user@government.gov",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "government_id": "uuid",
      "email": "user@government.gov",
      "full_name": "John Doe",
      "role": "admin"
    }
  },
  "error": null,
  "timestamp": "2025-12-12T10:00:00Z"
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account locked or not active

---

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "expires_in": 3600
  }
}
```

---

#### POST /auth/logout
Revoke refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### API Keys

#### POST /api-keys
Create a new API key.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "name": "Production API Key",
  "scopes": ["read:data", "read:analytics"],
  "expires_in_days": 365
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Production API Key",
    "api_key": "fsfi_live_abc123xyz...",
    "key_prefix": "fsfi_liv",
    "scopes": ["read:data", "read:analytics"],
    "expires_at": "2026-12-12T00:00:00Z",
    "created_at": "2025-12-12T00:00:00Z"
  }
}
```

⚠️ **Important**: The `api_key` is only shown once. Store it securely!

---

#### GET /api-keys
List all API keys for your government.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production API Key",
      "key_prefix": "fsfi_liv",
      "status": "active",
      "scopes": ["read:data", "read:analytics"],
      "last_used": "2025-12-12T09:30:00Z",
      "usage_count": 1523,
      "created_at": "2025-12-12T00:00:00Z",
      "expires_at": "2026-12-12T00:00:00Z",
      "revoked_at": null
    }
  ]
}
```

---

#### POST /api-keys/{id}/revoke
Revoke an API key.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "reason": "Security rotation - monthly update"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "API key revoked successfully"
  }
}
```

---

### Governments

#### GET /governments
List all governments (admin only).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "country_code": "KE",
      "country_name": "Kenya",
      "government_name": "Ministry of Agriculture",
      "government_type": "federal",
      "tier": "standard",
      "status": "active",
      "contact_email": "admin@agriculture.ke.gov",
      "created_at": "2025-01-01T00:00:00Z",
      "activated_at": "2025-01-02T00:00:00Z"
    }
  ]
}
```

---

#### GET /governments/{id}
Get government details.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "country_code": "KE",
    "country_name": "Kenya",
    "government_name": "Ministry of Agriculture",
    "government_type": "federal",
    "tier": "standard",
    "status": "active",
    "contact_email": "admin@agriculture.ke.gov",
    "contact_phone": "+254-xxx-xxx-xxx",
    "primary_contact_name": "John Doe",
    "primary_contact_title": "Director of IT",
    "api_quota_daily": 10000,
    "api_quota_monthly": 300000,
    "created_at": "2025-01-01T00:00:00Z",
    "activated_at": "2025-01-02T00:00:00Z",
    "expires_at": null
  }
}
```

---

### Health Check

#### GET /health
Check API health status.

**No authentication required**

**Response (200):**
```json
{
  "status": "healthy",
  "service": "FSFI Backend",
  "version": "0.1.0",
  "timestamp": "2025-12-12T10:00:00Z"
}
```

---

## Access Scopes

| Scope | Description | Access Level |
|-------|-------------|--------------|
| `read:data` | Read core financial data | Basic |
| `write:data` | Write/update financial data | Standard |
| `read:analytics` | Access analytics endpoints | Standard |
| `export:data` | Export data in various formats | Premium |
| `admin:all` | Full administrative access | Admin only |

---

## Rate Limits

### General API Endpoints
- **Rate**: 10 requests/second
- **Burst**: 20 requests
- **Daily Quota**: Based on tier
- **Monthly Quota**: Based on tier

### Authentication Endpoints
- **Rate**: 5 requests/minute
- **Burst**: 3 requests

### Response Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1639392000
```

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 seconds.",
  "timestamp": "2025-12-12T10:00:00Z"
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "data": null,
  "error": "Error message description",
  "timestamp": "2025-12-12T10:00:00Z"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid or missing credentials |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Examples

### Using cURL

```bash
# Login
curl -X POST https://api.fsfi.org/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@government.gov",
    "password": "SecurePassword123!"
  }'

# Create API Key
curl -X POST https://api.fsfi.org/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "scopes": ["read:data"],
    "expires_in_days": 365
  }'

# Use API Key
curl https://api.fsfi.org/api/v1/governments \
  -H "X-API-Key: fsfi_live_abc123xyz..."
```

### Using Python

```python
import requests

# Login
response = requests.post(
    'https://api.fsfi.org/api/v1/auth/login',
    json={
        'email': 'user@government.gov',
        'password': 'SecurePassword123!'
    }
)
data = response.json()
token = data['data']['access_token']

# Create API Key
response = requests.post(
    'https://api.fsfi.org/api/v1/api-keys',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'name': 'My API Key',
        'scopes': ['read:data'],
        'expires_in_days': 365
    }
)
api_key = response.json()['data']['api_key']

# Use API Key
response = requests.get(
    'https://api.fsfi.org/api/v1/governments',
    headers={'X-API-Key': api_key}
)
print(response.json())
```

### Using JavaScript

```javascript
// Login
const loginResponse = await fetch('https://api.fsfi.org/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@government.gov',
    password: 'SecurePassword123!'
  })
});
const { data } = await loginResponse.json();
const token = data.access_token;

// Create API Key
const keyResponse = await fetch('https://api.fsfi.org/api/v1/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My API Key',
    scopes: ['read:data'],
    expires_in_days: 365
  })
});
const { data: keyData } = await keyResponse.json();
const apiKey = keyData.api_key;

// Use API Key
const govResponse = await fetch('https://api.fsfi.org/api/v1/governments', {
  headers: { 'X-API-Key': apiKey }
});
const governments = await govResponse.json();
```

---

## Best Practices

1. **Store API Keys Securely**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly (recommended: every 90 days)

2. **Handle Rate Limits**
   - Implement exponential backoff
   - Cache responses when appropriate
   - Monitor usage metrics

3. **Error Handling**
   - Always check `success` field
   - Log errors for debugging
   - Implement retry logic for transient errors

4. **Security**
   - Use HTTPS only
   - Validate SSL certificates
   - Keep tokens short-lived
   - Implement request signing for sensitive operations

---

## Webhooks (Coming Soon)

FSFI will support webhooks for real-time notifications:
- API quota warnings
- Security alerts
- Data updates
- System maintenance

---

## Support

- **API Documentation**: https://docs.fsfi.org
- **Status Page**: https://status.fsfi.org
- **Technical Support**: support@fsfi.org
- **Security Issues**: security@fsfi.org

Last updated: 2025-12-12
