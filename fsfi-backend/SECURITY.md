# Security Policy

## Reporting Security Vulnerabilities

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please report security vulnerabilities to: **security@fsfi.org**

We will acknowledge receipt within 24 hours and provide a detailed response within 72 hours.

## Security Measures

### Authentication & Authorization

1. **JWT Tokens**
   - Access tokens expire in 1 hour
   - Refresh tokens expire in 30 days
   - Tokens use HS256 algorithm
   - Refresh tokens can be revoked

2. **API Keys**
   - Hashed using SHA-256
   - Prefix stored for identification
   - Can be revoked at any time
   - Support expiration dates
   - Scoped permissions

3. **Password Security**
   - Hashed using Argon2
   - Minimum 8 characters required
   - Account lockout after 5 failed attempts (30 minutes)
   - No password reset via email (admin-managed)

### Network Security

1. **Firewall (UFW)**
   - Default deny incoming
   - SSH restricted to specific IPs
   - Only ports 22, 80, 443 open

2. **Rate Limiting**
   - 10 requests/second for general API
   - 5 requests/minute for authentication
   - Configurable per-government quotas
   - Nginx-level and application-level limits

3. **DDoS Protection**
   - Nginx rate limiting
   - Connection limits
   - Request size limits (10MB)

### Application Security

1. **Security Headers**
   - Strict-Transport-Security (HSTS)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection
   - Content-Security-Policy
   - Referrer-Policy

2. **Input Validation**
   - All inputs validated using `validator` crate
   - SQL injection prevention (parameterized queries)
   - XSS prevention
   - CSRF protection

3. **Dependency Security**
   - Regular `cargo audit` scans
   - Automatic security updates
   - Minimal dependencies

### Infrastructure Security

1. **SSH Hardening**
   - Public key authentication only
   - No root login
   - No password authentication
   - Rate limiting (MaxAuthTries: 3)

2. **Fail2ban**
   - SSH brute force protection
   - Nginx authentication protection
   - Automatic IP banning

3. **Automatic Updates**
   - Unattended security upgrades
   - Daily package list updates
   - Automatic reboot at 02:00 UTC if needed

4. **Audit Logging**
   - All file changes tracked
   - Configuration changes logged
   - System logs sent to CloudWatch

### Data Security

1. **Database**
   - PostgreSQL with SSL
   - Encrypted connections
   - Regular backups
   - Access restricted to application

2. **Sensitive Data**
   - API keys hashed before storage
   - Passwords hashed with Argon2
   - JWT secrets never logged
   - Environment variables for secrets

3. **Audit Trail**
   - All API calls logged
   - User actions tracked
   - IP addresses recorded
   - Partitioned logs for performance

## Security Checklist for Deployment

### Pre-Deployment

- [ ] Generate strong JWT_SECRET (64 bytes)
- [ ] Generate strong ENCRYPTION_KEY (32 bytes)
- [ ] Set strong database password
- [ ] Configure IP whitelist for SSH
- [ ] Review and update allowed CORS origins
- [ ] Set up SSL certificates
- [ ] Configure CloudWatch credentials

### Post-Deployment

- [ ] Verify firewall rules with `sudo ufw status`
- [ ] Test Fail2ban with `sudo fail2ban-client status`
- [ ] Check SSH configuration
- [ ] Verify SSL certificate
- [ ] Test rate limiting
- [ ] Review audit logs
- [ ] Set up monitoring alerts
- [ ] Test backup and restore procedures

### Ongoing Maintenance

- [ ] Weekly: Review audit logs
- [ ] Weekly: Check for failed login attempts
- [ ] Monthly: Review user access
- [ ] Monthly: Rotate API keys
- [ ] Quarterly: Security audit
- [ ] Quarterly: Penetration testing
- [ ] Yearly: Disaster recovery test

## Incident Response Plan

### 1. Detection
- Monitor CloudWatch logs for anomalies
- Review Fail2ban reports
- Check rate limit violations
- Monitor API quota usage

### 2. Containment
```bash
# Immediately stop compromised instance
aws ec2 stop-instances --instance-ids i-xxxxx

# Or disable specific user/API key
UPDATE users SET status = 'locked' WHERE id = 'user-id';
UPDATE api_keys SET status = 'revoked' WHERE id = 'key-id';
```

### 3. Investigation
- Create forensic snapshot
- Review audit logs
- Check access logs
- Identify attack vector

### 4. Recovery
- Deploy new hardened instance
- Rotate all credentials
- Update security groups
- Apply patches

### 5. Post-Incident
- Document incident
- Update security procedures
- Notify affected parties
- Implement additional controls

## Security Contact

- **Security Team**: security@fsfi.org
- **Emergency**: +1-xxx-xxx-xxxx (24/7)
- **PGP Key**: Available at https://fsfi.org/pgp

## Compliance

This system is designed to comply with:
- GDPR (General Data Protection Regulation)
- SOC 2 Type II
- ISO 27001
- Government security standards

## Security Updates

Subscribe to security updates at: https://fsfi.org/security-updates

Last updated: 2025-12-12
