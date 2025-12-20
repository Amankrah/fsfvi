// ============================================================================
// DEMO GOVERNMENT PASSWORD RESET UTILITY
// ============================================================================
// This binary resets a user's password (for emergency recovery)
//
// Usage: cargo run --bin reset_password -- <username> <new_password>
// ============================================================================

use bcrypt;
use chrono::Utc;
use sqlx::SqlitePool;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();

    if args.len() != 3 {
        eprintln!("Usage: cargo run --bin reset_password -- <username> <new_password>");
        std::process::exit(1);
    }

    let username = &args[1];
    let new_password = &args[2];

    println!("============================================================================");
    println!("DEMO GOVERNMENT PASSWORD RESET");
    println!("============================================================================");
    println!();
    println!("⚠️  WARNING: This will reset the password for user '{}'", username);
    println!();

    // Password validation
    if new_password.len() < 12 {
        eprintln!("❌ Error: Password must be at least 12 characters long");
        eprintln!("   Current length: {} characters", new_password.len());
        std::process::exit(1);
    }

    // Check complexity
    let has_uppercase = new_password.chars().any(|c| c.is_uppercase());
    let has_lowercase = new_password.chars().any(|c| c.is_lowercase());
    let has_digit = new_password.chars().any(|c| c.is_numeric());
    let has_special = new_password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c));

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
        eprintln!("❌ Error: Password must contain at least one special character (!@#$%^&*...)");
        std::process::exit(1);
    }

    println!("✅ Password meets complexity requirements");
    println!();

    // Connect to database
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    println!("📦 Connecting to database: {}", database_url);
    println!();

    let pool = SqlitePool::connect(&database_url)
        .await
        .map_err(|e| {
            eprintln!("❌ Error: Failed to connect to database: {}", e);
            eprintln!();
            eprintln!("💡 Make sure the database exists. Run the server first:");
            eprintln!("   cargo run");
            e
        })?;

    // Check if user exists
    let user_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM users WHERE username = ?"
    )
    .bind(username)
    .fetch_one(&pool)
    .await?;

    if !user_exists {
        eprintln!("❌ Error: User '{}' not found in database", username);
        eprintln!();
        eprintln!("To see all users, run:");
        eprintln!("   cargo run --bin list_users");
        std::process::exit(1);
    }

    println!("✅ User '{}' found", username);
    println!();

    // Hash the new password with bcrypt
    println!("🔒 Hashing new password securely (this may take a few seconds)...");
    let bcrypt_cost = 12;
    let password_hash = bcrypt::hash(new_password, bcrypt_cost)?;
    println!("✅ Password hashed successfully");
    println!();

    // Update password
    println!("💾 Updating password in database...");
    let now = Utc::now();

    sqlx::query(
        r#"
        UPDATE users
        SET password_hash = ?,
            is_temporary_password = ?,
            updated_at = ?,
            password_changed_at = ?,
            login_attempts = 0,
            is_locked = FALSE,
            lockout_expiry = NULL
        WHERE username = ?
        "#
    )
    .bind(&password_hash)
    .bind(true) // Set as temporary password so user must change it
    .bind(now)
    .bind(now)
    .bind(username)
    .execute(&pool)
    .await?;

    println!("============================================================================");
    println!("✅ SUCCESS: Password reset successfully!");
    println!("============================================================================");
    println!();
    println!("📋 Password Details:");
    println!("  Username:           {}", username);
    println!("  Password:           {} (bcrypt)", new_password);
    println!("  Temporary:          YES (user must change on next login)");
    println!("  Account unlocked:   YES");
    println!("  Failed attempts:    Reset to 0");
    println!();
    println!("⚠️  SECURITY NOTES:");
    println!("  1. is_temporary_password = TRUE");
    println!("     The user MUST change their password on next login");
    println!();
    println!("  2. The account has been unlocked and login attempts reset");
    println!();
    println!("  3. Store this password securely and communicate it to the user");
    println!("     through a secure channel");
    println!();
    println!("🚀 Next Steps:");
    println!("  User can now log in at: http://localhost:3000/demo/login");
    println!();

    Ok(())
}
