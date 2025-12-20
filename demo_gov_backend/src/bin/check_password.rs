// ============================================================================
// PASSWORD VERIFICATION DIAGNOSTIC UTILITY
// ============================================================================
// This binary checks password verification for debugging authentication issues.
//
// Usage: cargo run --bin check_password -- <username> <password>
// ============================================================================

use sqlx::{SqlitePool, Row};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();

    if args.len() != 3 {
        eprintln!("Usage: cargo run --bin check_password -- <username> <password>");
        std::process::exit(1);
    }

    let username = &args[1];
    let password = &args[2];

    println!("============================================================================");
    println!("PASSWORD VERIFICATION DIAGNOSTIC");
    println!("============================================================================");
    println!();
    println!("Username: {}", username);
    println!("Password: {}", password);
    println!();

    // Connect to database
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    println!("📦 Connecting to database: {}", database_url);
    println!();

    let pool = SqlitePool::connect(&database_url).await?;

    // Fetch user using untyped query to handle BLOB/TEXT ID
    let result = sqlx::query(
        "SELECT id, username, password_hash FROM users WHERE username = ?"
    )
    .bind(username)
    .fetch_optional(&pool)
    .await?;

    match result {
        Some(user) => {
            let user_id: String = user.try_get("id").unwrap_or_else(|_| "unknown".to_string());
            let user_name: String = user.get("username");
            let password_hash: String = user.get("password_hash");

            println!("✅ User found:");
            println!("   ID: {}", user_id);
            println!("   Username: {}", user_name);
            println!();
            println!("🔍 Password hash analysis:");
            println!("   Length: {} characters", password_hash.len());
            println!("   First 20 chars: {}", &password_hash[..20.min(password_hash.len())]);
            println!();

            // Detect hash type
            if password_hash.starts_with("$argon2") {
                println!("   Hash type: Argon2");
                println!("   Algorithm: {}", &password_hash.split('$').nth(1).unwrap_or("unknown"));
            } else if password_hash.starts_with("$2") {
                println!("   Hash type: Bcrypt");
                println!("   Cost factor: {}", &password_hash.split('$').nth(2).unwrap_or("unknown"));
            } else {
                println!("   Hash type: Unknown/Other");
            }
            println!();

            // Try Argon2 verification
            println!("🔐 Testing Argon2 verification:");
            if password_hash.starts_with("$argon2") {
                use argon2::{Argon2, PasswordHash, PasswordVerifier};
                match PasswordHash::new(&password_hash) {
                    Ok(parsed_hash) => {
                        match Argon2::default().verify_password(password.as_bytes(), &parsed_hash) {
                            Ok(_) => println!("   ✅ Argon2 verification SUCCESS"),
                            Err(e) => println!("   ❌ Argon2 verification FAILED: {:?}", e),
                        }
                    }
                    Err(e) => println!("   ❌ Failed to parse Argon2 hash: {:?}", e),
                }
            } else {
                println!("   ⏭️  Skipped (not an Argon2 hash)");
            }
            println!();

            // Try bcrypt verification
            println!("🔐 Testing bcrypt verification:");
            if password_hash.starts_with("$2") {
                match bcrypt::verify(password, &password_hash) {
                    Ok(true) => println!("   ✅ Bcrypt verification SUCCESS"),
                    Ok(false) => println!("   ❌ Bcrypt verification FAILED (wrong password)"),
                    Err(e) => println!("   ❌ Bcrypt error: {:?}", e),
                }
            } else {
                println!("   ⏭️  Skipped (not a bcrypt hash)");
            }
            println!();

            println!("============================================================================");
        }
        None => {
            println!("❌ User '{}' not found in database", username);
            println!();
            println!("To see all users, run:");
            println!("   cargo run --bin list_users");
        }
    }

    Ok(())
}
