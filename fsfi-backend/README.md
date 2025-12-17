# FSFI Backend - Food System Financial Intelligence

A secure, production-grade backend API built with Rust and Actix Web for the FSFI (Food System Financial Intelligence) platform. This system provides government-level access to core financial intelligence algorithms through a secure, multi-tenant architecture.

## Features

### Security
- **Multi-tier Authentication**: JWT-based authentication with refresh tokens
- **API Key Management**: Secure API keys for programmatic access
- **Role-Based Access Control (RBAC)**: Admin, Developer, Analyst, and Viewer roles
- **Multi-tenant Architecture**: Isolated data per government entity
- **Comprehensive Audit Logging**: All actions tracked for compliance
- **Rate Limiting**: Protection against abuse and DDoS
- **Security Headers**: Helmet-style security headers (CSP, HSTS, etc.)
- **IP Whitelisting**: Optional IP-based access restrictions
- **Automatic Security Updates**: Unattended upgrades configured

### Government-Level Features
- **Tiered Access**: Basic, Standard, Premium, and Enterprise tiers
- **Quota Management**: Daily and monthly API call limits
- **Scope-based Permissions**: Granular control over API access
- **Usage Analytics**: Track API usage and performance metrics
- **Audit Trail**: Complete history of all API calls and changes

## Architecture

```
┌─────────────────┐
│   Government    │
│    Entities     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   API Gateway   │────▶│   Database   │
│  (Nginx/Actix)  │     │ (PostgreSQL) │
└────────┬────────┘     └──────────────┘
         │
         ├─────▶ JWT Auth
         ├─────▶ API Key Auth
         ├─────▶ Rate Limiting
         └─────▶ Audit Logging
```

## Tech Stack

- **Language**: Rust 1.75+
- **Web Framework**: Actix Web 4.5
- **Database**: PostgreSQL 16
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: Argon2
- **Reverse Proxy**: Nginx
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Rust 1.75 or higher
- PostgreSQL 16
- Docker (optional)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/your-org/fsfi-backend.git
cd fsfi-backend
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start PostgreSQL**
```bash
docker run -d \
  --name fsfi-postgres \
  -e POSTGRES_DB=fsfi_db \
  -e POSTGRES_USER=fsfi_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:16-alpine
```

4. **Run database migrations**
```bash
cargo install sqlx-cli
sqlx migrate run
```

5. **Start the application**
```bash
cargo run
# Or for production build
cargo build --release
./target/release/fsfi-backend
```

The API will be available at `http://localhost:8080`

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

## API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@government.gov",
  "password": "SecurePassword123!"
}
```

Response:
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
  }
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### API Key Endpoints

#### Create API Key
```http
POST /api/v1/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Production API Key",
  "scopes": ["read:data", "read:analytics"],
  "expires_in_days": 365
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Production API Key",
    "api_key": "fsfi_live_abc123...",
    "key_prefix": "fsfi_liv",
    "scopes": ["read:data", "read:analytics"],
    "expires_at": "2026-12-12T00:00:00Z",
    "created_at": "2025-12-12T00:00:00Z"
  }
}
```

**Important**: The `api_key` is only shown once during creation. Store it securely.

#### Using API Keys

Include the API key in the `X-API-Key` header:

```http
GET /api/v1/data/endpoint
X-API-Key: fsfi_live_abc123...
```

### Available Scopes

- `read:data` - Read access to core data
- `write:data` - Write access to data
- `read:analytics` - Access to analytics endpoints
- `export:data` - Permission to export data
- `admin:all` - Full administrative access

## Security Best Practices

### For Production Deployment

1. **SSL/TLS Certificate**
```bash
sudo certbot --nginx -d your-domain.com
```

2. **Update IP Whitelist**
Edit your `.env` file to restrict SSH access:
```bash
# In deploy-secure.sh
ADMIN_IP="your.ip.address.here"
```

3. **Strong Secrets**
Generate strong secrets for JWT and encryption:
```bash
# Generate JWT secret
openssl rand -base64 64

# Generate encryption key
openssl rand -base64 32
```

4. **Database Security**
- Use strong database passwords
- Enable SSL for database connections
- Regular backups

5. **Monitoring**
- Enable CloudWatch logs
- Set up alerts for:
  - Failed login attempts
  - Rate limit violations
  - Unusual traffic patterns
  - API quota exceeded

### Rate Limits

- **General API**: 10 requests/second, burst 20
- **Authentication**: 5 requests/minute, burst 3
- **Daily Quota**: Configured per government tier
- **Monthly Quota**: Configured per government tier

## Deployment

### Secure EC2 Deployment

1. **Run the deployment script**
```bash
sudo bash deploy-secure.sh
```

This script will:
- Update system packages
- Install and configure UFW firewall
- Set up Fail2ban intrusion detection
- Harden SSH configuration
- Configure automatic security updates
- Set up Nginx with security headers
- Configure audit logging
- Set up CloudWatch logging

2. **Configure the database**
```bash
# Set DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@host:5432/fsfi_db
```

3. **Build and deploy**
```bash
cd /opt/fsfi-backend
cargo build --release
sudo systemctl start fsfi-backend
sudo systemctl enable fsfi-backend
```

4. **Verify deployment**
```bash
curl http://localhost:8080/health
```

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "FSFI Backend",
  "version": "0.1.0",
  "timestamp": "2025-12-12T10:00:00Z"
}
```

## Database Schema

### Tables

- **governments** - Government entities and their access tiers
- **users** - Government users with role-based access
- **api_keys** - API keys for programmatic access
- **refresh_tokens** - JWT refresh tokens
- **audit_logs** - Comprehensive audit trail (partitioned by month)
- **api_usage** - API usage tracking and analytics

### Access Tiers

| Tier | Daily Quota | Monthly Quota | Features |
|------|-------------|---------------|----------|
| Basic | 1,000 | 30,000 | Core algorithms only |
| Standard | 10,000 | 300,000 | Full algorithm access |
| Premium | 50,000 | 1,500,000 | Advanced analytics |
| Enterprise | Custom | Custom | Custom integrations |

## Monitoring and Logging

### Audit Logs

All actions are logged to the `audit_logs` table with:
- Timestamp
- Government/User/API Key ID
- Action type
- Resource accessed
- IP address and user agent
- Request/response details
- Response time

### CloudWatch Integration

Logs are sent to CloudWatch under:
- `/fsfi/backend/syslog`
- `/fsfi/backend/auth`
- `/fsfi/backend/nginx-access`
- `/fsfi/backend/nginx-error`

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check DATABASE_URL in `.env`
   - Verify PostgreSQL is running
   - Check firewall rules

2. **JWT token invalid**
   - Ensure JWT_SECRET is set correctly
   - Check token expiration
   - Verify token format

3. **Rate limit exceeded**
   - Check rate limit configuration
   - Implement exponential backoff
   - Consider upgrading tier

## Contributing

This is a government-level platform. All contributions must be reviewed and approved by the security team.

## License

Proprietary - Food System Financial Intelligence Platform

## Support

For security issues, contact: security@fsfi.org
For technical support: support@fsfi.org

## Changelog

### v0.1.0 (2025-12-12)
- Initial release
- JWT authentication
- API key management
- Multi-tenant government access
- Comprehensive audit logging
- Rate limiting and security hardening
