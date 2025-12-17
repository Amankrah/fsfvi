# 🇰🇪 Kenya FSFVI Authentication Backend

High-security authentication system built with Rust and Actix-Web for the Kenya Food System Financial Vulnerability Index (FSFVI) platform.

## 🔒 Security Features

### Multi-Layer Authentication System
- **Enterprise-Grade Security**: Built specifically for Kenya Government requirements
- **Single Authorized User**: System designed for exclusive Kenya Government access
- **Zero-Trust Architecture**: Every request validated and logged

### Password Security
- **Argon2 Hashing**: Industry-leading password hashing algorithm
- **Minimum 12 Characters**: Enforced password complexity
- **Strength Validation**: Real-time password strength checking
- **Pattern Detection**: Prevents common patterns and dictionary words
- **Temporary Password Enforcement**: Forces immediate password change on first login

### Token Management
- **JWT with HS256**: Secure JSON Web Tokens with HMAC-SHA256
- **8-Hour Expiration**: Tokens automatically expire for security
- **Session Management**: Server-side session validation
- **Token Blacklisting**: Ability to invalidate tokens immediately

### Account Security
- **Progressive Lockout**: Account locked after 5 failed attempts
- **5-Minute Cooldown**: Automatic unlock after lockout period
- **Attempt Tracking**: All login attempts logged and monitored
- **IP Address Logging**: Complete audit trail with client information

### Network Security
- **CORS Protection**: Restricted to Kenya frontend domains only
- **Security Headers**: Comprehensive security headers for all responses
- **Rate Limiting**: Protection against brute force attacks
- **TLS/HTTPS Ready**: Designed for encrypted connections

## 🏗️ Architecture

### Technology Stack
- **Language**: Rust (2021 edition)
- **Web Framework**: Actix-Web 4.4
- **Database**: SQLite (production-ready for PostgreSQL)
- **Password Hashing**: Argon2 + BCrypt fallback
- **JWT**: jsonwebtoken 9.2
- **Logging**: Comprehensive with tracing and env_logger

### Project Structure
```
kenya_backend/
├── src/
│   ├── config/          # Configuration management
│   ├── handlers/        # HTTP request handlers
│   ├── middleware/      # Security and logging middleware
│   ├── models/          # Data models and validation
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   └── main.rs          # Application entry point
├── migrations/          # Database migrations
└── Cargo.toml          # Dependencies and metadata
```

## 🚀 Quick Start

### Prerequisites
- Rust 1.70+ installed
- SQLite for development
- Environment variables configured

### Installation

1. **Clone and Setup**
   ```bash
   cd kenya_backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Install Dependencies**
   ```bash
   cargo build
   ```

3. **Run Database Migrations**
   ```bash
   # Migrations run automatically on startup
   ```

4. **Start the Server**
   ```bash
   # Development
   cargo run

   # Production
   cargo build --release
   ./target/release/kenya_backend
   ```

### Default Credentials
⚠️ **SECURITY CRITICAL**: On first startup, the system creates a default user with a temporary password. This password is displayed in the logs and MUST be changed immediately.

```
Username: kenya_government
Password: [Generated and displayed in startup logs]
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
HOST=127.0.0.1                    # Server host
PORT=8080                         # Server port

# Database
DATABASE_URL=sqlite:./kenya_fsfvi.db  # SQLite for development
# DATABASE_URL=postgresql://user:pass@host/db  # PostgreSQL for production

# Security (CRITICAL)
JWT_SECRET=your-256-bit-secret-key    # MUST be changed for production

# Logging
RUST_LOG=info                     # Logging level
```

### Production Configuration
For production deployment, ensure:

1. **Strong JWT Secret**: Generate a cryptographically secure 256-bit key
2. **PostgreSQL Database**: Migrate from SQLite to PostgreSQL
3. **HTTPS Only**: Configure reverse proxy for TLS termination
4. **Firewall Rules**: Restrict access to authorized networks only
5. **Log Monitoring**: Set up centralized logging and monitoring

## 🛡️ Security Specifications

### Authentication Flow

1. **Login Request**
   ```http
   POST /api/auth/login
   Content-Type: application/json

   {
     "username": "kenya_government",
     "password": "user_password",
     "user_agent": "Mozilla/5.0...",
     "ip_address": "192.168.1.1",
     "timestamp": "2024-01-01T12:00:00Z"
   }
   ```

2. **Login Response**
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
       "user": {
         "id": "uuid",
         "username": "kenya_government",
         "role": "kenya_government",
         "is_temporary_password": false,
         "last_login": "2024-01-01T12:00:00Z"
       },
       "expires_in": 28800
     }
   }
   ```

### Password Requirements

- **Minimum Length**: 12 characters
- **Character Classes**:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*)
- **Restrictions**:
  - No more than 3 repeating characters
  - No common patterns (123, abc, password, etc.)
  - Cannot contain username
  - Cannot be a common dictionary word

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/verify` - Verify token validity
- `POST /api/auth/logout` - User logout

#### System
- `GET /api/health` - Health check endpoint

### Error Handling

The system provides detailed error responses while avoiding information disclosure:

```json
{
  "success": false,
  "message": "Invalid username or password",
  "error_type": "InvalidCredentials"
}
```

### Audit Logging

All security events are logged with:
- User ID and username
- IP address and User-Agent
- Timestamp (UTC)
- Action performed
- Success/failure status
- Additional metadata

Example log entry:
```
2024-01-01T12:00:00Z [INFO] 192.168.1.1 POST /api/auth/login - 200 - 45ms - User-Agent: Mozilla/5.0...
```

## 🔍 Monitoring & Observability

### Key Metrics to Monitor
- **Failed Login Attempts**: Indicator of potential attacks
- **Account Lockouts**: Security incidents requiring attention
- **Token Expiration Events**: Normal security operations
- **Password Change Events**: User security actions
- **Unusual IP Addresses**: Potential unauthorized access

### Log Analysis
- All authentication events logged to stdout
- Structured logging with JSON format available
- Integration ready for ELK stack or similar
- Correlation IDs for request tracking

## 🚨 Security Incident Response

### Failed Login Alerts
- **3+ Failed Attempts**: Monitor for unusual patterns
- **5 Failed Attempts**: Account automatically locked
- **Multiple IP Addresses**: Potential distributed attack
- **Off-hours Access**: Review for legitimacy

### Account Compromise Response
1. **Immediate Actions**:
   - Change JWT secret to invalidate all tokens
   - Review audit logs for unauthorized access
   - Change user password immediately

2. **Investigation**:
   - Analyze login patterns and IP addresses
   - Check for successful unauthorized access
   - Review system logs for anomalies

3. **Recovery**:
   - Generate new secure credentials
   - Update security configurations
   - Notify relevant authorities if required

## 🧪 Testing

### Running Tests
```bash
cargo test
```

### Security Testing
- Password strength validation tests
- JWT token generation/validation tests
- Authentication flow tests
- Rate limiting tests

### Load Testing
Use tools like Apache Bench or wrk to test:
```bash
# Test login endpoint
ab -n 1000 -c 10 -p login.json -T application/json http://localhost:8080/api/auth/login
```

## 📋 Compliance & Standards

### Government Security Requirements
- **Access Control**: Single authorized user model
- **Data Encryption**: All passwords hashed with Argon2
- **Audit Trail**: Comprehensive logging of all access attempts
- **Session Management**: Secure session handling with timeout
- **Network Security**: CORS and security headers implemented

### Industry Standards
- **OWASP Compliance**: Follows OWASP authentication guidelines
- **JWT Best Practices**: Secure token implementation
- **Password Security**: NIST password guidelines compliance
- **Logging Standards**: Structured audit logging

## 🔄 Deployment

### Development
```bash
cargo run
```

### Production (Docker)
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /app/target/release/kenya_backend .
CMD ["./kenya_backend"]
```

### Production (Direct)
```bash
cargo build --release
./target/release/kenya_backend
```

### Environment Setup
1. **Database**: Initialize PostgreSQL database
2. **Environment**: Set production environment variables
3. **Security**: Configure firewall and network access
4. **Monitoring**: Set up log aggregation and monitoring
5. **Backup**: Configure database backup procedures

## ⚠️ Security Warnings

### Critical Configuration
- **CHANGE DEFAULT JWT SECRET**: The default JWT secret MUST be changed in production
- **SECURE DATABASE**: Use PostgreSQL with encrypted connections in production
- **HTTPS ONLY**: Never run authentication over HTTP in production
- **FIREWALL ACCESS**: Restrict network access to authorized systems only
- **MONITOR LOGS**: Set up alerts for security events

### Default Credentials
- **TEMPORARY PASSWORD**: Generated at first startup and displayed in logs
- **IMMEDIATE CHANGE REQUIRED**: System forces password change on first login
- **LOG SECURITY**: Ensure startup logs are secured and not accessible to unauthorized users

## 📞 Support

For security incidents or questions:
- **Technical Issues**: Review logs and error messages
- **Security Concerns**: Follow incident response procedures
- **Configuration Help**: Refer to environment variable documentation

---

**© 2024 Kenya FSFVI Authentication System**
**Built with 🦀 Rust for Maximum Security and Performance**