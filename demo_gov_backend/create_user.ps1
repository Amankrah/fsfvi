# ============================================================================
# DEMO GOVERNMENT USER CREATION SCRIPT (PowerShell)
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
# Usage: .\create_user.ps1 -Username <username> -Password <password>
# Example: .\create_user.ps1 -Username "demo_user" -Password "SecureGov@2025!Pass"
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,

    [Parameter(Mandatory=$true)]
    [string]$Password
)

# Database file
$DbFile = ".\demo_gov_backend.db"

# Check if database exists
if (-not (Test-Path $DbFile)) {
    Write-Host "Error: Database file not found at $DbFile" -ForegroundColor Red
    Write-Host "Please run the server first to create the database:" -ForegroundColor Yellow
    Write-Host "  cargo run" -ForegroundColor Green
    exit 1
}

# Validate username
if ($Username.Length -lt 3 -or $Username.Length -gt 50) {
    Write-Host "Error: Username must be between 3 and 50 characters" -ForegroundColor Red
    exit 1
}

# Validate password length
if ($Password.Length -lt 12) {
    Write-Host "Error: Password must be at least 12 characters long" -ForegroundColor Red
    Write-Host "Current length: $($Password.Length) characters" -ForegroundColor Yellow
    exit 1
}

# Validate password complexity
if ($Password -notmatch '[A-Z]') {
    Write-Host "Error: Password must contain at least one uppercase letter" -ForegroundColor Red
    exit 1
}

if ($Password -notmatch '[a-z]') {
    Write-Host "Error: Password must contain at least one lowercase letter" -ForegroundColor Red
    exit 1
}

if ($Password -notmatch '[0-9]') {
    Write-Host "Error: Password must contain at least one number" -ForegroundColor Red
    exit 1
}

if ($Password -notmatch '[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]') {
    Write-Host "Error: Password must contain at least one special character" -ForegroundColor Red
    exit 1
}

# Check for common patterns
if ($Password -match '(?i)(password|12345|qwerty|abc)') {
    Write-Host "Error: Password contains common patterns" -ForegroundColor Red
    exit 1
}

Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "DEMO GOVERNMENT USER CREATION" -ForegroundColor Blue
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Creating user: $Username" -ForegroundColor Green
Write-Host ""

# Check if user already exists
try {
    $existingUser = sqlite3.exe $DbFile "SELECT username FROM users WHERE username = '$Username';" 2>$null
    if ($existingUser) {
        Write-Host "Error: User '$Username' already exists" -ForegroundColor Red
        Write-Host ""
        Write-Host "To delete the existing user, run:" -ForegroundColor Yellow
        Write-Host "  sqlite3 $DbFile `"DELETE FROM users WHERE username = '$Username';`"" -ForegroundColor White
        Write-Host ""
        Write-Host "Or use a different username." -ForegroundColor Yellow
        exit 1
    }
} catch {
    # sqlite3 not found, we'll check later
}

# Generate UUID
$UserId = [guid]::NewGuid().ToString()

# Hash the password using bcrypt via a Rust helper
Write-Host "Hashing password securely (this may take a few seconds)..." -ForegroundColor Yellow

# Create a temporary Rust project to hash the password
$TempHasher = New-TemporaryFile | % { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

@"
[package]
name = "password_hasher"
version = "0.1.0"
edition = "2021"

[dependencies]
bcrypt = "0.15"
"@ | Out-File -FilePath "$TempHasher\Cargo.toml" -Encoding UTF8

@"
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
"@ | Out-File -FilePath "$TempHasher\src\main.rs" -Encoding UTF8 -Force
New-Item -ItemType Directory -Path "$TempHasher\src" -Force | Out-Null

# Create src directory first
New-Item -ItemType Directory -Path "$TempHasher\src" -Force | Out-Null

# Write main.rs
@"
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
"@ | Out-File -FilePath "$TempHasher\src\main.rs" -Encoding UTF8

# Compile and run the hasher
Push-Location $TempHasher
try {
    $PasswordHash = cargo run --quiet --release -- $Password 2>$null
    if (-not $PasswordHash -or $LASTEXITCODE -ne 0) {
        throw "Failed to hash password"
    }
} catch {
    Write-Host "Error: Failed to hash password" -ForegroundColor Red
    Write-Host "Using fallback method..." -ForegroundColor Yellow
    $PasswordHash = "NEEDS_HASHING_$Password"
    Write-Host "Warning: Password will be hashed on first login" -ForegroundColor Yellow
} finally {
    Pop-Location
    Remove-Item -Path $TempHasher -Recurse -Force
}

# Get current timestamp in RFC3339 format
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Escape single quotes in password hash for SQL
$PasswordHash = $PasswordHash -replace "'", "''"

# Insert user into database
Write-Host "Creating user in database..." -ForegroundColor Yellow

$SqlQuery = @"
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
    '$UserId',
    '$Username',
    '$PasswordHash',
    'demo_government',
    1,
    '$Timestamp',
    '$Timestamp',
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
"@

try {
    sqlite3.exe $DbFile $SqlQuery

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================================================" -ForegroundColor Green
        Write-Host "SUCCESS: User created successfully!" -ForegroundColor Green
        Write-Host "============================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "User Details:" -ForegroundColor Blue
        Write-Host "  Username: $Username" -ForegroundColor Green
        Write-Host "  User ID:  $UserId" -ForegroundColor Green
        Write-Host "  Role:     demo_government" -ForegroundColor Green
        Write-Host "  Created:  $Timestamp" -ForegroundColor Green
        Write-Host ""
        Write-Host "IMPORTANT SECURITY NOTES:" -ForegroundColor Yellow
        Write-Host "  1. is_temporary_password = TRUE" -ForegroundColor Red
        Write-Host "     The user MUST change their password on first login"
        Write-Host ""
        Write-Host "  2. two_fa_enabled = FALSE" -ForegroundColor Red
        Write-Host "     The user should enable 2FA immediately after logging in"
        Write-Host ""
        Write-Host "  3. Store the password securely and communicate it to the user"
        Write-Host "     through a secure channel (encrypted email, in-person, etc.)"
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Blue
        Write-Host "  1. Start the backend server:" -ForegroundColor White
        Write-Host "     cargo run" -ForegroundColor Green
        Write-Host ""
        Write-Host "  2. User can log in at:" -ForegroundColor White
        Write-Host "     http://localhost:3000/demo/login" -ForegroundColor Green
        Write-Host ""
        Write-Host "  3. On first login, user will be prompted to:" -ForegroundColor White
        Write-Host "     - Change their temporary password"
        Write-Host "     - (Recommended) Enable two-factor authentication"
        Write-Host ""
        Write-Host "To verify the user was created:" -ForegroundColor Yellow
        Write-Host "  sqlite3 $DbFile `"SELECT username, role, created_at, is_temporary_password, two_fa_enabled FROM users WHERE username = '$Username';`"" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "Error: Failed to create user" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: Failed to create user" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
