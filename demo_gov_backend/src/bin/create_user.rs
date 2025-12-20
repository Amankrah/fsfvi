// ============================================================================
// DEMO GOVERNMENT USER CREATION UTILITY
// ============================================================================
// This binary creates a new government user with proper password hashing
// and security settings directly in the database.
//
// CRITICAL: This is for government-level systems. All passwords must meet
// strict security requirements.
//
// Usage: cargo run --bin create_user -- <username> <password>
// Example: cargo run --bin create_user -- demo_user "SecureGov@2025!Pass"
// ============================================================================

use bcrypt;
use chrono::Utc;
use sqlx::SqlitePool;
use std::env;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();

    if args.len() != 3 {
        eprintln!("============================================================================");
        eprintln!("DEMO GOVERNMENT USER CREATION UTILITY");
        eprintln!("============================================================================");
        eprintln!();
        eprintln!("Usage: {} <username> <password>", args[0]);
        eprintln!();
        eprintln!("Example:");
        eprintln!("  cargo run --bin create_user -- demo_user \"SecureGov@2025!Pass\"");
        eprintln!();
        eprintln!("Password Requirements:");
        eprintln!("  - Minimum 12 characters");
        eprintln!("  - At least one uppercase letter");
        eprintln!("  - At least one lowercase letter");
        eprintln!("  - At least one number");
        eprintln!("  - At least one special character (!@#$%^&*()_+-=[]{{}}|;:,.<>?)");
        eprintln!("  - No common patterns or dictionary words");
        eprintln!();
        std::process::exit(1);
    }

    let username = &args[1];
    let password = &args[2];

    // Validate username
    if username.len() < 3 || username.len() > 50 {
        eprintln!("❌ Error: Username must be between 3 and 50 characters");
        std::process::exit(1);
    }

    // Validate password length
    if password.len() < 12 {
        eprintln!("❌ Error: Password must be at least 12 characters long");
        eprintln!("   Current length: {} characters", password.len());
        std::process::exit(1);
    }

    // Validate password complexity
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_digit = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c));

    if !has_uppercase {
        eprintln!("❌ Error: Password must contain at least one uppercase letter");
        std::process::exit(1);
    }

    if !has_lowercase {
        eprintln!("❌ Error: Password must contain at least one lowercase letter");
        std::process::exit(1);
    }

    if !has_digit {
        eprintln!("❌ Error: Password must contain at least one number");
        std::process::exit(1);
    }

    if !has_special {
        eprintln!("❌ Error: Password must contain at least one special character");
        std::process::exit(1);
    }

    // Check for common patterns
    let password_lower = password.to_lowercase();
    if password_lower.contains("password")
        || password_lower.contains("12345")
        || password_lower.contains("qwerty")
        || password_lower.contains("abc") {
        eprintln!("❌ Error: Password contains common patterns");
        std::process::exit(1);
    }

    println!("============================================================================");
    println!("DEMO GOVERNMENT USER CREATION");
    println!("============================================================================");
    println!();
    println!("Creating user: {}", username);
    println!();

    // Connect to database
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    println!("📦 Connecting to database: {}", database_url);

    let pool = SqlitePool::connect(&database_url)
        .await
        .map_err(|e| {
            eprintln!("❌ Error: Failed to connect to database: {}", e);
            eprintln!();
            eprintln!("💡 Make sure the database exists. Run the server first:");
            eprintln!("   cargo run");
            e
        })?;

    // Check if user already exists
    let existing_user: Option<(String,)> = sqlx::query_as(
        "SELECT username FROM users WHERE username = ?"
    )
    .bind(username)
    .fetch_optional(&pool)
    .await?;

    if existing_user.is_some() {
        eprintln!("❌ Error: User '{}' already exists", username);
        eprintln!();
        eprintln!("To delete the existing user, run:");
        eprintln!("  cargo run --bin delete_user -- {}", username);
        eprintln!();
        eprintln!("Or use a different username.");
        std::process::exit(1);
    }

    // Hash the password
    println!("🔒 Hashing password securely (this may take a few seconds)...");

    let bcrypt_cost = 12; // Government-level security
    let password_hash = bcrypt::hash(password, bcrypt_cost)
        .map_err(|e| {
            eprintln!("❌ Error: Failed to hash password: {}", e);
            e
        })?;

    // Generate UUID
    let user_id = Uuid::new_v4();
    let timestamp = Utc::now();

    // Insert user into database
    println!("💾 Creating user in database...");

    sqlx::query(
        r#"
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
            ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL
        )
        "#
    )
    .bind(user_id.to_string())
    .bind(username)
    .bind(&password_hash)
    .bind("demo_government")
    .bind(true) // is_temporary_password
    .bind(timestamp)
    .bind(timestamp)
    .execute(&pool)
    .await
    .map_err(|e| {
        eprintln!("❌ Error: Failed to create user: {}", e);
        e
    })?;

    println!();
    println!("============================================================================");
    println!("✅ SUCCESS: User created successfully!");
    println!("============================================================================");
    println!();
    println!("📋 User Details:");
    println!("  Username: {}", username);
    println!("  User ID:  {}", user_id);
    println!("  Role:     demo_government");
    println!("  Created:  {}", timestamp.to_rfc3339());
    println!();
    println!("⚠️  IMPORTANT SECURITY NOTES:");
    println!("  1. ⚡ is_temporary_password = TRUE");
    println!("     The user MUST change their password on first login");
    println!();
    println!("  2. 🔐 two_fa_enabled = FALSE");
    println!("     The user should enable 2FA immediately after logging in");
    println!();
    println!("  3. 📧 Store the password securely and communicate it to the user");
    println!("     through a secure channel (encrypted email, in-person, etc.)");
    println!();
    println!("🚀 Next Steps:");
    println!("  1. Start the backend server:");
    println!("     cargo run");
    println!();
    println!("  2. User can log in at:");
    println!("     http://localhost:3000/demo/login");
    println!();
    println!("  3. On first login, user will be prompted to:");
    println!("     - Change their temporary password");
    println!("     - (Recommended) Enable two-factor authentication");
    println!();

    Ok(())
}
