# Testing Guide - FSFI Backend

## Local Development Testing

### Prerequisites

1. **Docker Desktop** - Must be running
2. **Rust** - Latest stable version
3. **PowerShell** - For running scripts

### Quick Start

Run the automated setup script:

```powershell
# Set up everything (PostgreSQL, migrations, build)
.\setup-dev.ps1
```

This script will:
- Start PostgreSQL in Docker
- Copy `.env.development` to `.env`
- Install `sqlx-cli` if needed
- Run database migrations
- Build the project

### Manual Setup

If you prefer to set up manually:

```powershell
# 1. Copy environment file
cp .env.development .env

# 2. Start PostgreSQL
docker run -d `
  --name fsfi-dev-postgres `
  -e POSTGRES_DB=fsfi_dev_db `
  -e POSTGRES_USER=fsfi_dev `
  -e POSTGRES_PASSWORD=dev_password_123 `
  -p 5432:5432 `
  postgres:16-alpine

# 3. Install sqlx-cli (if not installed)
cargo install sqlx-cli --no-default-features --features postgres,rustls

# 4. Run migrations
sqlx migrate run

# 5. Build project
cargo build
```

### Seed Test Data

Before testing, populate the database with test data:

```powershell
# Generate password hash for test users
cargo run --bin hash_password "Test123!@#"

# Update seed-dev-data.sql with the generated hash
# Then run:
Get-Content seed-dev-data.sql | docker exec -i fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db
```

**Test Accounts Created:**

| Email | Password | Country | Role |
|-------|----------|---------|------|
| john.kamau@agriculture.ke.gov | Test123!@# | Kenya | admin |
| developer@agriculture.ke.gov | Test123!@# | Kenya | developer |
| sarah.nakato@maaif.go.ug | Test123!@# | Uganda | admin |
| hassan.mwinyi@agriculture.go.tz | Test123!@# | Tanzania | analyst |

### Start the Server

```powershell
# Development mode (with hot reload)
cargo run

# Or release mode (faster)
cargo build --release
./target/release/fsfi-backend
```

The server will start at `http://localhost:8080`

### Test All Endpoints

Run the comprehensive test script:

```powershell
.\test-api.ps1
```

This will test:
1. ✓ Health check
2. ✓ User login
3. ✓ List governments
4. ✓ Get government details
5. ✓ Create API key
6. ✓ List API keys
7. ✓ Use API key authentication
8. ✓ Refresh access token
9. ✓ Invalid authentication (should fail)
10. ✓ Logout

### Manual API Testing

#### 1. Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/health"
```

#### 2. Login

```powershell
$loginBody = @{
    email = "john.kamau@agriculture.ke.gov"
    password = "Test123!@#"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:8080/api/v1/auth/login" `
    -ContentType "application/json" `
    -Body $loginBody

$token = $login.data.access_token
```

#### 3. Get Governments

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Method GET `
    -Uri "http://localhost:8080/api/v1/governments" `
    -Headers $headers
```

#### 4. Create API Key

```powershell
$apiKeyBody = @{
    name = "My Test API Key"
    scopes = @("read:data", "read:analytics")
    expires_in_days = 365
} | ConvertTo-Json

$apiKeyResponse = Invoke-RestMethod -Method POST `
    -Uri "http://localhost:8080/api/v1/api-keys" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $apiKeyBody

$apiKey = $apiKeyResponse.data.api_key
Write-Host "API Key: $apiKey"
```

#### 5. Use API Key

```powershell
$apiHeaders = @{
    "X-API-Key" = $apiKey
}

Invoke-RestMethod -Method GET `
    -Uri "http://localhost:8080/api/v1/governments" `
    -Headers $apiHeaders
```

### Using cURL (Alternative)

```bash
# Health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.kamau@agriculture.ke.gov","password":"Test123!@#"}'

# Get governments (replace TOKEN)
curl http://localhost:8080/api/v1/governments \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import the Postman collection (if provided)
2. Set environment variables:
   - `base_url`: `http://localhost:8080`
   - `email`: `john.kamau@agriculture.ke.gov`
   - `password`: `Test123!@#`

### Database Access

Connect to the development database:

```powershell
# Using psql in Docker
docker exec -it fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db

# View all governments
SELECT * FROM governments;

# View all users
SELECT id, email, full_name, role, status FROM users;

# View audit logs
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;

# Check API usage
SELECT * FROM api_usage ORDER BY date DESC;
```

### Common Issues

#### Issue: "Database connection failed"

```powershell
# Check if PostgreSQL is running
docker ps | Select-String "fsfi-dev-postgres"

# Check logs
docker logs fsfi-dev-postgres

# Restart PostgreSQL
docker restart fsfi-dev-postgres
```

#### Issue: "Port 8080 already in use"

```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

#### Issue: "sqlx-cli not found"

```powershell
# Install sqlx-cli
cargo install sqlx-cli --no-default-features --features postgres,rustls

# Verify installation
sqlx --version
```

#### Issue: "Migration failed"

```powershell
# Check migration status
sqlx migrate info

# Reset database (DEV ONLY!)
docker exec -it fsfi-dev-postgres psql -U fsfi_dev -d fsfi_dev_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
sqlx migrate run
```

### Performance Testing

Test rate limiting:

```powershell
# Send 100 requests rapidly
1..100 | ForEach-Object {
    Invoke-RestMethod -Uri "http://localhost:8080/health"
}
```

### Cleanup

```powershell
# Stop and remove PostgreSQL container
docker stop fsfi-dev-postgres
docker rm fsfi-dev-postgres

# Clean build artifacts
cargo clean

# Remove .env file
Remove-Item .env
```

## Production Testing

### Pre-Production Checklist

Before deploying to production:

- [ ] All tests pass: `cargo test`
- [ ] Security audit clean: `cargo audit`
- [ ] Code formatted: `cargo fmt --check`
- [ ] Linter passes: `cargo clippy -- -D warnings`
- [ ] Environment variables set in `.env.production`
- [ ] SSL certificates configured
- [ ] Firewall rules tested
- [ ] Database backups configured
- [ ] CloudWatch logs working
- [ ] Monitoring alerts set up

### Production Database

**IMPORTANT**: Production migrations are independent!

```bash
# On production server
export DATABASE_URL="postgresql://prod_user:prod_pass@prod-host:5432/fsfi_prod_db"

# Run migrations
sqlx migrate run

# NEVER seed test data in production!
```

### Security Testing

```powershell
# Run security audit
cargo audit

# Check dependencies
cargo outdated

# Test authentication failures
# Should lock account after 5 attempts
```

### Load Testing

Use tools like Apache Bench or k6:

```bash
# Install Apache Bench
# Test health endpoint
ab -n 1000 -c 10 http://localhost:8080/health

# Test authentication with rate limiting
ab -n 100 -c 5 -p login.json -T application/json http://localhost:8080/api/v1/auth/login
```

## Integration Testing

Coming soon: Full integration test suite with mock governments and automated workflows.

## Support

- Issues: Create a GitHub issue
- Questions: support@fsfi.org
- Security: security@fsfi.org
