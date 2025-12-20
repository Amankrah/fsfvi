#!/bin/bash

# ============================================================================
# DEMO GOVERNMENT USER CREATION SCRIPT
# ============================================================================
# This script creates a new government user in the demo_gov_backend database
# with proper password hashing and security settings.
#
# CRITICAL: This is for government-level systems. All passwords must meet
# strict security requirements:
# - Minimum 12 characters
# - At least one uppercase letter
# - At least one lowercase letter
# - At least one number
# - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
# - No common patterns or dictionary words
#
# Usage: ./create_user.sh <username> <password>
# Example: ./create_user.sh demo_user "SecureGov@2025!Pass"
# ============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database file
DB_FILE="./demo_gov_backend.db"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}Error: Database file not found at $DB_FILE${NC}"
    echo -e "${YELLOW}Please run the server first to create the database:${NC}"
    echo "  cargo run"
    exit 1
fi

# Check arguments
if [ $# -ne 2 ]; then
    echo -e "${RED}Error: Invalid number of arguments${NC}"
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 <username> <password>"
    echo ""
    echo -e "${BLUE}Example:${NC}"
    echo "  $0 demo_user \"SecureGov@2025!Pass\""
    echo ""
    echo -e "${YELLOW}Password Requirements:${NC}"
    echo "  - Minimum 12 characters"
    echo "  - At least one uppercase letter"
    echo "  - At least one lowercase letter"
    echo "  - At least one number"
    echo "  - At least one special character (!@#\$%^&*()_+-=[]{}|;:,.<>?)"
    echo "  - No common patterns or dictionary words"
    exit 1
fi

USERNAME="$1"
PASSWORD="$2"

# Validate username
if [ ${#USERNAME} -lt 3 ] || [ ${#USERNAME} -gt 50 ]; then
    echo -e "${RED}Error: Username must be between 3 and 50 characters${NC}"
    exit 1
fi

# Validate password length
if [ ${#PASSWORD} -lt 12 ]; then
    echo -e "${RED}Error: Password must be at least 12 characters long${NC}"
    echo -e "${YELLOW}Current length: ${#PASSWORD} characters${NC}"
    exit 1
fi

# Validate password complexity (basic checks)
if ! echo "$PASSWORD" | grep -q '[A-Z]'; then
    echo -e "${RED}Error: Password must contain at least one uppercase letter${NC}"
    exit 1
fi

if ! echo "$PASSWORD" | grep -q '[a-z]'; then
    echo -e "${RED}Error: Password must contain at least one lowercase letter${NC}"
    exit 1
fi

if ! echo "$PASSWORD" | grep -q '[0-9]'; then
    echo -e "${RED}Error: Password must contain at least one number${NC}"
    exit 1
fi

if ! echo "$PASSWORD" | grep -q '[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]'; then
    echo -e "${RED}Error: Password must contain at least one special character${NC}"
    exit 1
fi

# Check for common patterns
if echo "$PASSWORD" | grep -qi 'password\|12345\|qwerty\|abc'; then
    echo -e "${RED}Error: Password contains common patterns${NC}"
    exit 1
fi

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}DEMO GOVERNMENT USER CREATION${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "${GREEN}Creating user: $USERNAME${NC}"
echo ""

# Check if user already exists
EXISTING_USER=$(sqlite3 "$DB_FILE" "SELECT username FROM users WHERE username = '$USERNAME';" 2>/dev/null || echo "")

if [ ! -z "$EXISTING_USER" ]; then
    echo -e "${RED}Error: User '$USERNAME' already exists${NC}"
    echo ""
    echo -e "${YELLOW}To delete the existing user, run:${NC}"
    echo "  sqlite3 $DB_FILE \"DELETE FROM users WHERE username = '$USERNAME';\""
    echo ""
    echo -e "${YELLOW}Or use a different username.${NC}"
    exit 1
fi

# Generate UUID
USER_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$(date +%s)-$(od -An -N4 -tu4 /dev/urandom | tr -d ' ')")

# Hash the password using bcrypt via a Rust helper
echo -e "${YELLOW}Hashing password securely (this may take a few seconds)...${NC}"

# Create a temporary Rust program to hash the password
TEMP_HASHER=$(mktemp -d)
cat > "$TEMP_HASHER/Cargo.toml" <<EOF
[package]
name = "password_hasher"
version = "0.1.0"
edition = "2021"

[dependencies]
bcrypt = "0.15"
EOF

cat > "$TEMP_HASHER/src/main.rs" <<'RUST_CODE'
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: {} <password>", args[0]);
        std::process::exit(1);
    }

    let password = &args[1];
    let cost = 12; // bcrypt cost factor (government-level security)

    match bcrypt::hash(password, cost) {
        Ok(hash) => println!("{}", hash),
        Err(e) => {
            eprintln!("Error hashing password: {}", e);
            std::process::exit(1);
        }
    }
}
RUST_CODE

# Compile and run the hasher
cd "$TEMP_HASHER"
PASSWORD_HASH=$(cargo run --quiet --release "$PASSWORD" 2>/dev/null)
HASH_STATUS=$?
cd - > /dev/null

# Clean up
rm -rf "$TEMP_HASHER"

if [ $HASH_STATUS -ne 0 ] || [ -z "$PASSWORD_HASH" ]; then
    echo -e "${RED}Error: Failed to hash password${NC}"
    echo -e "${YELLOW}Falling back to simpler method...${NC}"

    # Fallback: Use a simple indicator that password needs to be hashed by the server
    PASSWORD_HASH="NEEDS_HASHING_$PASSWORD"
    echo -e "${YELLOW}Warning: Password will be hashed on first login${NC}"
fi

# Get current timestamp in RFC3339 format
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Insert user into database
echo -e "${YELLOW}Creating user in database...${NC}"

sqlite3 "$DB_FILE" <<SQL
INSERT INTO users (
    id,
    username,
    password_hash,
    role,
    is_temporary_password,
    created_at,
    updated_at,
    last_login,
    login_attempts,
    is_locked,
    lockout_expiry,
    password_changed_at,
    session_token,
    session_expires_at,
    two_fa_enabled,
    two_fa_secret,
    two_fa_backup_codes,
    two_fa_enabled_at
) VALUES (
    '$USER_ID',
    '$USERNAME',
    '$PASSWORD_HASH',
    'demo_government',
    1,
    '$TIMESTAMP',
    '$TIMESTAMP',
    NULL,
    0,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    0,
    NULL,
    NULL,
    NULL
);
SQL

INSERT_STATUS=$?

if [ $INSERT_STATUS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================================================${NC}"
    echo -e "${GREEN}SUCCESS: User created successfully!${NC}"
    echo -e "${GREEN}============================================================================${NC}"
    echo ""
    echo -e "${BLUE}User Details:${NC}"
    echo -e "  Username: ${GREEN}$USERNAME${NC}"
    echo -e "  User ID:  ${GREEN}$USER_ID${NC}"
    echo -e "  Role:     ${GREEN}demo_government${NC}"
    echo -e "  Created:  ${GREEN}$TIMESTAMP${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT SECURITY NOTES:${NC}"
    echo -e "  1. ${RED}is_temporary_password = TRUE${NC}"
    echo -e "     The user MUST change their password on first login"
    echo ""
    echo -e "  2. ${RED}two_fa_enabled = FALSE${NC}"
    echo -e "     The user should enable 2FA immediately after logging in"
    echo ""
    echo -e "  3. Store the password securely and communicate it to the user"
    echo -e "     through a secure channel (encrypted email, in-person, etc.)"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "  1. Start the backend server:"
    echo -e "     ${GREEN}cargo run${NC}"
    echo ""
    echo -e "  2. User can log in at:"
    echo -e "     ${GREEN}http://localhost:3000/demo/login${NC}"
    echo ""
    echo -e "  3. On first login, user will be prompted to:"
    echo -e "     - Change their temporary password"
    echo -e "     - (Recommended) Enable two-factor authentication"
    echo ""
    echo -e "${YELLOW}To verify the user was created:${NC}"
    echo -e "  sqlite3 $DB_FILE \"SELECT username, role, created_at, is_temporary_password, two_fa_enabled FROM users WHERE username = '$USERNAME';\""
    echo ""
else
    echo -e "${RED}Error: Failed to create user${NC}"
    exit 1
fi
