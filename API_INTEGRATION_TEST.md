# 🔗 Kenya FSFVI API Integration Test Guide

## Overview

This guide provides instructions for testing the integration between the Next.js frontend and Rust backend for the Kenya FSFVI authentication system.

## Prerequisites

1. **Backend Running**: Ensure the Rust backend is running on `http://localhost:8080`
2. **Frontend Running**: Ensure the Next.js frontend is running on `http://localhost:3000`
3. **Environment Configuration**: `.env.local` file is configured with correct API URL

## Testing Steps

### 1. Start the Backend

```bash
cd kenya_backend
cargo run
```

**Expected Output**:
- Server starts successfully on port 8080
- Database migrations run automatically
- Default user credentials are displayed in logs
- Temporary password is generated and shown

### 2. Start the Frontend

```bash
cd kenya-frontend
npm run dev
```

**Expected Output**:
- Next.js dev server starts on port 3000
- No compilation errors
- Application loads successfully

### 3. Test Authentication Flow

#### A. Login Test
1. Navigate to `http://localhost:3000/signin`
2. Enter credentials:
   - **Username**: `kenya_government`
   - **Password**: [Use temporary password from backend logs]
3. Click "Sign In"

**Expected Behavior**:
- Successful login
- JWT token stored in localStorage
- Redirected to password change page (due to temporary password)
- Backend logs show successful authentication

#### B. Password Change Test
1. On the password change page
2. Enter:
   - **Current Password**: [Temporary password]
   - **New Password**: [Strong password meeting requirements]
   - **Confirm Password**: [Same as new password]
3. Click "Change Password"

**Expected Behavior**:
- Password change successful
- User redirected to dashboard
- Backend logs show password change event
- Temporary password flag updated

#### C. Dashboard Access Test
1. Access dashboard at `http://localhost:3000/dashboard`
2. Verify user information is displayed
3. Check session information

**Expected Behavior**:
- Dashboard loads successfully
- User data displays correctly
- Session information shows valid state

#### D. Logout Test
1. Click logout button
2. Verify logout process

**Expected Behavior**:
- Token invalidated on backend
- User redirected to signin page
- localStorage cleared
- Backend logs show logout event

### 4. Security Feature Tests

#### A. Session Validation
1. Open browser developer tools
2. Go to Application/Local Storage
3. Modify or delete the `kenya_auth_token`
4. Try to access protected routes

**Expected Behavior**:
- Invalid/missing tokens redirect to signin
- Backend rejects invalid tokens
- User session is invalidated

#### B. Failed Login Attempts
1. Try logging in with incorrect credentials
2. Repeat multiple times

**Expected Behavior**:
- Failed attempts are tracked
- Account lockout after 5 attempts
- Backend logs security events
- Appropriate error messages displayed

#### C. Token Expiration
1. Wait for token to expire (8 hours)
2. Try to access protected routes

**Expected Behavior**:
- Expired tokens are rejected
- User redirected to signin
- Session automatically cleared

## API Endpoint Testing

### Using curl or Postman

#### 1. Health Check
```bash
curl http://localhost:8080/api/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### 2. Login Request
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "kenya_government",
    "password": "TEMPORARY_PASSWORD_FROM_LOGS",
    "user_agent": "curl/7.68.0",
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "uuid",
      "username": "kenya_government",
      "role": "KenyaGovernment",
      "is_temporary_password": true,
      "login_attempts": 0,
      "is_locked": false
    },
    "expires_in": 28800
  }
}
```

#### 3. Token Verification
```bash
curl -X GET http://localhost:8080/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "uuid",
      "username": "kenya_government",
      "role": "KenyaGovernment",
      "is_temporary_password": true
    },
    "expires_in": 28000
  }
}
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Symptoms**: "Access to fetch at 'http://localhost:8080/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy"

**Solution**:
- Ensure backend CORS is configured to allow localhost:3000
- Check backend logs for CORS configuration

#### 2. Connection Refused
**Symptoms**: "Failed to fetch" or "Network error"

**Solutions**:
- Verify backend is running on port 8080
- Check if firewall is blocking connections
- Ensure API_URL environment variable is correct

#### 3. Invalid Credentials
**Symptoms**: "Invalid username or password"

**Solutions**:
- Check backend logs for generated temporary password
- Ensure username is exactly "kenya_government"
- Verify password is copied correctly

#### 4. Database Errors
**Symptoms**: Backend crashes or database connection errors

**Solutions**:
- Check if SQLite database file is created
- Verify database permissions
- Review backend logs for detailed errors

### Expected Log Entries

#### Backend Logs (Successful Flow)
```
[INFO] Starting Kenya FSFVI Authentication Server
[INFO] Database connected successfully
[INFO] Default user created: kenya_government
[INFO] Temporary password: [GENERATED_PASSWORD]
[INFO] Server listening on 127.0.0.1:8080
[INFO] Login attempt for user: kenya_government from IP: 127.0.0.1
[INFO] Successful login for user: kenya_government from IP: 127.0.0.1
[INFO] Password change for user: kenya_government from IP: 127.0.0.1
```

#### Frontend Console (Successful Flow)
```
[DEBUG] AuthContext: Checking existing session
[DEBUG] AuthContext: Session check successful
[DEBUG] API: Login request successful
[DEBUG] API: Token stored securely
[DEBUG] AuthContext: User authenticated successfully
```

## Security Verification

### 1. Audit Logs
- Check backend database for security_events table
- Verify all authentication events are logged
- Confirm IP addresses and timestamps are recorded

### 2. Token Security
- Verify JWT tokens have proper expiration
- Check token format and claims
- Ensure tokens are invalidated on logout

### 3. Password Security
- Confirm Argon2 hashing is working
- Verify password strength validation
- Test temporary password enforcement

## Performance Testing

### Basic Load Test
```bash
# Install wrk if not available
# Test login endpoint
wrk -t12 -c100 -d30s --script=login_test.lua http://localhost:8080/api/auth/login
```

**Expected Results**:
- No errors under normal load
- Response times under 100ms
- Proper rate limiting enforcement

## Integration Checklist

- [ ] Backend starts without errors
- [ ] Frontend compiles and runs
- [ ] API endpoints respond correctly
- [ ] Authentication flow works end-to-end
- [ ] Password change functionality works
- [ ] Session management functions properly
- [ ] Security features are active
- [ ] Audit logging is working
- [ ] Error handling is graceful
- [ ] CORS is properly configured

## Next Steps

Once integration testing is complete:

1. **Production Configuration**
   - Update environment variables for production
   - Configure PostgreSQL database
   - Set up HTTPS and security headers
   - Configure production CORS origins

2. **Deployment Testing**
   - Test in staging environment
   - Verify production configurations
   - Run security scans
   - Performance testing under load

3. **Security Audit**
   - Review all security implementations
   - Test for common vulnerabilities
   - Verify compliance requirements
   - Document security procedures

---

**🇰🇪 Kenya FSFVI Secure Authentication System**
**Integration Testing Complete**