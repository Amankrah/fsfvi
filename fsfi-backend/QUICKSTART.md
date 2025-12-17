# FSFI Backend - Quick Start Guide

## Getting Started in 5 Minutes

### Option 1: Docker (Recommended for Testing)

```bash
# 1. Clone and navigate
git clone <repository-url>
cd fsfi-backend

# 2. Create .env file
cp .env.example .env

# 3. Generate secrets
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env

# 4. Start everything
docker-compose up -d

# 5. Check health
curl http://localhost:8080/health
```

### Option 2: Local Development

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Start PostgreSQL
docker run -d \
  --name fsfi-postgres \
  -e POSTGRES_DB=fsfi_db \
  -e POSTGRES_USER=fsfi_user \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:16-alpine

# 3. Set up environment
cp .env.example .env
# Edit .env with your settings

# 4. Run migrations
cargo install sqlx-cli
sqlx migrate run

# 5. Start the server
cargo run

# Server running at http://localhost:8080
```

## Testing the API

### 1. Create Initial Government (Manual DB Insert)

```sql
-- Connect to PostgreSQL
psql -U fsfi_user -d fsfi_db

-- Insert test government
INSERT INTO governments (
    id, country_code, country_name, government_name,
    government_type, tier, status, contact_email,
    primary_contact_name, primary_contact_title,
    api_quota_daily, api_quota_monthly, allowed_endpoints
) VALUES (
    gen_random_uuid(),
    'KE',
    'Kenya',
    'Ministry of Agriculture',
    'federal',
    'standard',
    'active',
    'admin@agriculture.ke.gov',
    'John Doe',
    'Director of IT',
    10000,
    300000,
    '["*"]'::jsonb
);
```

### 2. Create Initial User

```sql
-- Insert test user (password: TestPassword123!)
-- Password hash generated for "TestPassword123!"
INSERT INTO users (
    id, government_id, email, password_hash,
    full_name, title, role, status
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM governments WHERE country_code = 'KE'),
    'john.doe@agriculture.ke.gov',
    '$argon2id$v=19$m=19456,t=2,p=1$...',  -- Update with actual hash
    'John Doe',
    'System Administrator',
    'admin',
    'active'
);
```

### 3. Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@agriculture.ke.gov",
    "password": "TestPassword123!"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1Qi...",
    "refresh_token": "eyJ0eXAiOiJKV1Qi...",
    "expires_in": 3600,
    "user": {
      "id": "...",
      "government_id": "...",
      "email": "john.doe@agriculture.ke.gov",
      "full_name": "John Doe",
      "role": "admin"
    }
  }
}
```

### 4. Create API Key

```bash
# Save the access token from login
export TOKEN="eyJ0eXAiOiJKV1Qi..."

curl -X POST http://localhost:8080/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First API Key",
    "scopes": ["read:data", "read:analytics"],
    "expires_in_days": 365
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "My First API Key",
    "api_key": "fsfi_live_abc123xyz...",
    "key_prefix": "fsfi_liv",
    "scopes": ["read:data", "read:analytics"],
    "expires_at": "2026-12-12T00:00:00Z",
    "created_at": "2025-12-12T00:00:00Z"
  }
}
```

**IMPORTANT**: Save the `api_key` - it won't be shown again!

### 5. Use API Key

```bash
export API_KEY="fsfi_live_abc123xyz..."

curl http://localhost:8080/api/v1/governments \
  -H "X-API-Key: $API_KEY"
```

## Production Deployment

### AWS EC2 Deployment

```bash
# 1. Launch Ubuntu 22.04 LTS instance

# 2. SSH into instance
ssh ubuntu@your-ec2-ip

# 3. Upload deployment script
scp deploy-secure.sh ubuntu@your-ec2-ip:~/

# 4. Run deployment
sudo bash deploy-secure.sh

# 5. Clone your code
cd /opt
sudo git clone <repository-url> fsfi-backend
sudo chown -R fsfi:fsfi fsfi-backend

# 6. Configure environment
cd fsfi-backend
sudo -u fsfi cp .env.example .env
sudo -u fsfi nano .env  # Edit with production values

# 7. Build
sudo -u fsfi cargo build --release

# 8. Start service
sudo systemctl start fsfi-backend
sudo systemctl enable fsfi-backend

# 9. Check status
sudo systemctl status fsfi-backend
curl http://localhost:8080/health

# 10. Configure SSL
sudo certbot --nginx -d your-domain.com
```

## Common Commands

### Database

```bash
# Run migrations
sqlx migrate run

# Rollback migration
sqlx migrate revert

# Create new migration
sqlx migrate add migration_name
```

### Service Management

```bash
# Check status
sudo systemctl status fsfi-backend

# View logs
sudo journalctl -u fsfi-backend -f

# Restart
sudo systemctl restart fsfi-backend

# Stop
sudo systemctl stop fsfi-backend
```

### Docker

```bash
# View logs
docker-compose logs -f backend

# Restart backend
docker-compose restart backend

# Rebuild
docker-compose up -d --build

# Clean up
docker-compose down -v
```

## Troubleshooting

### "Database connection failed"

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### "Migration failed"

```bash
# Check migration status
sqlx migrate info

# Force reset (DEV ONLY!)
sqlx database drop
sqlx database create
sqlx migrate run
```

### "Port already in use"

```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process
sudo kill -9 <PID>
```

## Next Steps

1. Read the full [README.md](README.md)
2. Review [SECURITY.md](SECURITY.md)
3. Set up monitoring and alerts
4. Configure backups
5. Implement your core algorithms
6. Set up CI/CD pipeline

## Support

- Documentation: [README.md](README.md)
- Security: security@fsfi.org
- Technical: support@fsfi.org
