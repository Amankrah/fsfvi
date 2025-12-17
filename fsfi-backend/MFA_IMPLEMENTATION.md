# Multi-Factor Authentication (MFA) Implementation

## Overview

Production-ready MFA implementation for the FSFI government-level system using **TOTP (Time-based One-Time Password)** with **AES-256-GCM encryption** for secrets at rest.

## Security Features

### Encryption
- **Algorithm**: AES-256-GCM (Authenticated Encryption with Associated Data)
- **Key Derivation**: SHA-256 hash of `ENCRYPTION_KEY` environment variable
- **Nonce**: Random 96-bit nonce per encryption (prevents replay attacks)
- **Authentication**: Built-in authentication tag prevents tampering

### TOTP Configuration
- **Algorithm**: SHA-1 (TOTP standard)
- **Digits**: 6-digit codes
- **Period**: 30 seconds
- **Time Window**: ±1 period (90 seconds total) for clock drift tolerance

### Backup Codes
- **Format**: 8-character alphanumeric (no ambiguous characters: 0, O, I, 1)
- **Quantity**: 10 codes per user
- **Storage**: SHA-256 hashed (one-way, like passwords)
- **Usage**: One-time use, marked as consumed

## Database Schema

### mfa_backup_codes Table
```sql
CREATE TABLE mfa_backup_codes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    code_number INTEGER NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_code_number UNIQUE (user_id, code_number)
);
```

## API Endpoints

All endpoints require JWT authentication (Developer or Admin role).

### 1. Setup MFA
**POST** `/api/v1/mfa/setup`

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "otpauth_url": "otpauth://totp/FSFI%20System:user@example.com?secret=...&issuer=FSFI%20System",
    "backup_codes": ["ABCD2345", "EFGH6789", ...],
    "instructions": "1. Scan the QR code..."
  }
}
```

**Process:**
1. Generates random 160-bit secret (base32-encoded)
2. Encrypts secret with AES-256-GCM
3. Stores encrypted secret in `users.mfa_secret`
4. Generates 10 backup codes and stores their hashes
5. Returns OTPAuth URL for QR code generation

### 2. Verify Setup
**POST** `/api/v1/mfa/verify-setup`

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "MFA successfully enabled",
    "mfa_enabled": true
  }
}
```

**Process:**
1. Decrypts MFA secret
2. Verifies TOTP code (±90 second window)
3. Sets `users.mfa_enabled = true` if valid

### 3. Disable MFA
**POST** `/api/v1/mfa/disable`

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "MFA successfully disabled",
    "mfa_enabled": false
  }
}
```

**Process:**
1. Verifies TOTP code
2. Sets `users.mfa_enabled = false` and `mfa_secret = NULL`
3. Deletes all backup codes

### 4. Verify Backup Code
**POST** `/api/v1/mfa/verify-backup-code`

**Request:**
```json
{
  "backup_code": "ABCD2345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Backup code verified successfully",
    "remaining_codes": 7,
    "warning": "You are running low on backup codes..."
  }
}
```

**Process:**
1. Fetches all unused backup codes
2. Hashes provided code and compares with stored hashes
3. Marks code as used (`used_at = NOW()`)
4. Returns remaining code count

## Login Flow Integration

When MFA is enabled for a user, the login endpoint:

1. Verifies email/password
2. Checks if `mfa_enabled = true`
3. If enabled:
   - **6-digit code**: Verifies as TOTP code
   - **8-character code**: Verifies as backup code
4. Only issues JWT tokens if MFA verification succeeds

### Login Request with MFA
```json
{
  "email": "user@government.example",
  "password": "SecurePassword123!",
  "mfa_code": "123456"  // 6-digit TOTP or 8-char backup code
}
```

## Environment Variables

```bash
# Required: Encryption key for MFA secrets (minimum 32 characters)
ENCRYPTION_KEY=your_production_encryption_key_min_32_chars_change_me
```

**⚠️ CRITICAL**: Use a strong, random encryption key in production. If this key is lost, all MFA secrets become unrecoverable and users will be locked out.

## Usage Example

### User Setup Flow

1. **User requests MFA setup**
   ```bash
   curl -X POST https://api.fsfi.example/api/v1/mfa/setup \
     -H "Authorization: Bearer <jwt_token>"
   ```

2. **User scans QR code** (generated from `otpauth_url`)
   - Use Google Authenticator, Authy, or any TOTP app
   - Or manually enter the `secret`

3. **User saves backup codes** (securely offline)

4. **User verifies setup**
   ```bash
   curl -X POST https://api.fsfi.example/api/v1/mfa/verify-setup \
     -H "Authorization: Bearer <jwt_token>" \
     -H "Content-Type: application/json" \
     -d '{"code": "123456"}'
   ```

5. **MFA is now enabled** for all future logins

### User Login Flow (with MFA)

```bash
curl -X POST https://api.fsfi.example/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@government.example",
    "password": "SecurePassword123!",
    "mfa_code": "123456"
  }'
```

## Security Considerations

### Encryption Key Management
- Store `ENCRYPTION_KEY` in secure environment variables
- Use different keys for dev/staging/production
- Rotate keys periodically (requires re-encrypting all secrets)
- Never commit encryption keys to version control

### Backup Code Security
- Backup codes are hashed (SHA-256) - cannot be retrieved
- Warn users when < 3 codes remain
- Users should store codes in password manager or offline

### Time Synchronization
- TOTP requires server clock accuracy
- Use NTP to keep server time synchronized
- ±30 second tolerance allows for minor clock drift

### Account Recovery
- If MFA device is lost: Use backup codes
- If both lost: Admin must manually disable MFA in database

## Testing

Run encryption service tests:
```bash
cargo test encryption
```

Run MFA service tests:
```bash
cargo test mfa
```

## Dependencies

- `aes-gcm = "0.10"` - AES-256-GCM encryption
- `totp-lite = "2.0"` - TOTP code generation/verification
- `urlencoding = "2.1"` - OTPAuth URL encoding
- `sha2 = "0.10"` - SHA-256 for key derivation and backup code hashing
- `rand = "0.8"` - Cryptographically secure random number generation
- `base64 = "0.22"` - Base64 encoding for encrypted data

## Production Checklist

- [ ] Set strong `ENCRYPTION_KEY` (>= 32 characters)
- [ ] Ensure server time is NTP-synchronized
- [ ] Backup `ENCRYPTION_KEY` securely (encrypted backup)
- [ ] Document key rotation procedure
- [ ] Test MFA setup/login flow end-to-end
- [ ] Implement admin endpoint to force-disable MFA (emergency)
- [ ] Monitor failed MFA attempts (potential brute-force)
- [ ] Consider rate limiting on MFA verification endpoints

## Architecture

```
┌─────────────┐
│   Client    │
│ (Frontend)  │
└──────┬──────┘
       │
       │ POST /mfa/setup
       ▼
┌─────────────────────┐
│   MFA Handler       │
│  (handlers/mfa.rs)  │
└──────┬──────────────┘
       │
       │ generate_secret()
       ▼
┌─────────────────────┐      ┌──────────────────┐
│   MFA Service       │◄────►│ Encryption Svc   │
│ (services/mfa.rs)   │      │(services/encrypt)│
└──────┬──────────────┘      └──────────────────┘
       │                              │
       │ encrypt()                    │ AES-256-GCM
       ▼                              ▼
┌─────────────────────┐      ┌──────────────────┐
│    Database         │      │  ENCRYPTION_KEY  │
│  users.mfa_secret   │      │  (env variable)  │
│  (encrypted)        │      └──────────────────┘
└─────────────────────┘
```

## Files Changed/Created

### New Files
- `src/services/encryption.rs` - AES-256-GCM encryption service
- `src/services/mfa.rs` - TOTP and backup code management
- `src/handlers/mfa.rs` - MFA API endpoints
- `migrations/20250102000001_add_mfa_backup_codes.sql` - Backup codes table

### Modified Files
- `src/handlers/auth.rs` - Integrated MFA verification into login
- `src/handlers/mod.rs` - Added `pub mod mfa;`
- `src/services/mod.rs` - Added `pub mod encryption;` and `pub mod mfa;`
- `src/main.rs` - Registered MFA routes
- `Cargo.toml` - Added encryption and TOTP dependencies

## License

This implementation follows industry best practices for MFA security and is suitable for government-level authentication systems.
