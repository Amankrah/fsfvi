# Demo Government User Management

This document describes how to manage government users in the demo_gov_backend authentication system.

## Overview

The demo_gov_backend provides secure command-line utilities for managing government users. All passwords are hashed using bcrypt with cost factor 12 (government-level security).

## User Management Commands

### 1. Create a New User

Creates a new government user with a temporary password that must be changed on first login.

```bash
cargo run --bin create_user -- <username> <password>
```

**Example:**
```bash
cargo run --bin create_user -- fsfi_gov "SecureGov@2025!Pass"
```

**Password Requirements:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- No common patterns (password, 12345, qwerty, abc, etc.)

**Output:**
```
============================================================================
DEMO GOVERNMENT USER CREATION
============================================================================

Creating user: fsfi_gov

📦 Connecting to database: sqlite:./demo_gov_backend.db
🔒 Hashing password securely (this may take a few seconds)...
💾 Creating user in database...

============================================================================
✅ SUCCESS: User created successfully!
============================================================================

📋 User Details:
  Username: fsfi_gov
  User ID:  a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Role:     demo_government
  Created:  2025-12-19T16:30:00Z

⚠️  IMPORTANT SECURITY NOTES:
  1. ⚡ is_temporary_password = TRUE
     The user MUST change their password on first login

  2. 🔐 two_fa_enabled = FALSE
     The user should enable 2FA immediately after logging in

  3. 📧 Store the password securely and communicate it to the user
     through a secure channel (encrypted email, in-person, etc.)

🚀 Next Steps:
  1. Start the backend server:
     cargo run

  2. User can log in at:
     http://localhost:3000/demo/login

  3. On first login, user will be prompted to:
     - Change their temporary password
     - (Recommended) Enable two-factor authentication
```

### 2. List All Users

Displays all users with their security status and details.

```bash
cargo run --bin list_users
```

**Output:**
```
============================================================================
DEMO GOVERNMENT USERS LIST
============================================================================

📦 Connecting to database: sqlite:./demo_gov_backend.db

Found 2 user(s):

────────────────────────────────────────────────────────────────────────────────

User #1
  Username:      fsfi_gov
  User ID:       a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Role:          demo_government
  Created:       2025-12-19 16:30:00 UTC
  Last Login:    2025-12-19 16:35:00 UTC

  Security Status:
    Account:           ✅ Active
    Password:          ✅ Permanent
    2FA:               ✅ Enabled
    Failed Attempts:   0

────────────────────────────────────────────────────────────────────────────────

📊 Summary:
  Total users:        2
  Active:             2
  Locked:             0
  With 2FA:           1
  Temp passwords:     1

⚠️  Security Recommendations:
  • 1 user(s) have temporary passwords - ensure they change on first login
  • 1 user(s) do not have 2FA enabled - recommend enabling for enhanced security
```

### 3. Delete a User

Permanently deletes a user from the database (CANNOT BE UNDONE).

```bash
cargo run --bin delete_user -- <username>
```

**Example:**
```bash
cargo run --bin delete_user -- fsfi_gov
```

**Output:**
```
============================================================================
DEMO GOVERNMENT USER DELETION
============================================================================

📦 Connecting to database: sqlite:./demo_gov_backend.db

Found user:
  Username: fsfi_gov
  User ID:  a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Role:     demo_government

⚠️  WARNING: This will PERMANENTLY delete the user!
This action CANNOT be undone.

Type 'DELETE fsfi_gov' to confirm: DELETE fsfi_gov

🗑️  Deleting user...

✅ SUCCESS: User 'fsfi_gov' has been deleted
```

## Default User

The system automatically creates a default government user on first startup:

- **Username:** `demo_government`
- **Password:** `DemoGov@2025!SecurePass`
- **Role:** `demo_government`
- **Temporary Password:** YES (must be changed on first login)
- **2FA Enabled:** NO (should be enabled after first login)

## Security Best Practices

### For System Administrators:

1. **Always use strong passwords** that meet all complexity requirements
2. **Change default passwords immediately** on first deployment
3. **Enable 2FA** for all government users
4. **Communicate passwords securely** (encrypted email, in-person, secure messaging)
5. **Never store passwords in plain text**
6. **Review user access regularly** using `list_users` command
7. **Audit failed login attempts** to detect potential security threats
8. **Lock accounts** with excessive failed attempts (automatic after 5 attempts)

### For Government Users:

1. **Change temporary password** immediately on first login
2. **Enable two-factor authentication** (2FA) for enhanced security
3. **Use a password manager** to generate and store strong passwords
4. **Never share passwords** with anyone
5. **Log out** when finished using the system
6. **Report suspicious activity** to your system administrator

## User Lifecycle

### 1. User Creation
```
Administrator creates user → User receives credentials securely → is_temporary_password = TRUE
```

### 2. First Login
```
User logs in with temporary password → Prompted to change password → Password policy enforced
```

### 3. 2FA Setup (Recommended)
```
User navigates to security settings → Scans QR code with authenticator app → Saves backup codes → 2FA enabled
```

### 4. Normal Operation
```
User logs in with username + password + 2FA code (if enabled) → Access granted for 8 hours
```

### 5. Account Lockout
```
5 failed login attempts → Account locked for 30 minutes → Login attempts reset after successful login
```

## Troubleshooting

### User Already Exists
```
Error: User 'fsfi_gov' already exists

To delete the existing user, run:
  cargo run --bin delete_user -- fsfi_gov

Or use a different username.
```

**Solution:** Either delete the existing user or choose a different username.

### Database Not Found
```
Error: Failed to connect to database

Make sure the database exists. Run the server first:
  cargo run
```

**Solution:** Start the server at least once to create the database with migrations.

### Password Too Weak
```
Error: Password must be at least 12 characters long
Current length: 8 characters
```

**Solution:** Use a stronger password that meets all requirements. Example:
- ❌ Weak: `password123`
- ✅ Strong: `SecureGov@2025!Pass`

### User Cannot Login

**Possible causes:**
1. Incorrect username or password
2. Account is locked (5+ failed attempts)
3. 2FA code is incorrect or expired
4. Temporary password not yet changed

**Solutions:**
1. Verify credentials are correct
2. Check if account is locked using `list_users`
3. Wait 30 seconds for a new 2FA code
4. Complete password change flow

## Database Schema

Users are stored in the `users` table with the following critical fields:

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,              -- UUID
    username TEXT UNIQUE NOT NULL,    -- Government username
    password_hash TEXT NOT NULL,      -- Bcrypt hash (cost 12)
    role TEXT NOT NULL,               -- Always 'demo_government'
    is_temporary_password BOOLEAN,    -- TRUE for new users
    is_locked BOOLEAN,                -- TRUE if locked out
    login_attempts INTEGER,           -- Failed login count
    two_fa_enabled BOOLEAN,           -- 2FA status
    two_fa_secret TEXT,               -- TOTP secret
    created_at TIMESTAMP,             -- Creation time
    last_login TIMESTAMP,             -- Last successful login
    ...
);
```

## Security Audit

To audit security compliance:

```bash
# List all users with security status
cargo run --bin list_users

# Check for:
# - Users with temporary passwords
# - Users without 2FA enabled
# - Locked accounts
# - Failed login attempts
```

## Support

For issues or questions about user management:
- Check server logs: `cargo run` output
- Review audit logs in database: `security_events` table
- Contact the FSFVI technical team

---

**CRITICAL REMINDER:** This is a government-level authentication system. People's livelihoods and food security decisions depend on accurate, secure access to this platform. Always follow security best practices and treat user credentials with the highest level of care.
