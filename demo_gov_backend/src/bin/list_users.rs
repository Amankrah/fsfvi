// ============================================================================
// DEMO GOVERNMENT USER LISTING UTILITY
// ============================================================================
// This binary lists all government users in the database with their details.
//
// Usage: cargo run --bin list_users
// ============================================================================

use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

#[derive(Debug)]
struct UserInfo {
    id: String,
    username: String,
    role: String,
    is_temporary_password: bool,
    is_locked: bool,
    login_attempts: i32,
    two_fa_enabled: bool,
    created_at: DateTime<Utc>,
    last_login: Option<DateTime<Utc>>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("============================================================================");
    println!("DEMO GOVERNMENT USERS LIST");
    println!("============================================================================");
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

    // Fetch all users
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            username,
            role,
            is_temporary_password,
            is_locked,
            login_attempts,
            two_fa_enabled,
            created_at,
            last_login
        FROM users
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await?;

    let users: Vec<UserInfo> = rows
        .into_iter()
        .map(|row| {
            // ID might be stored as BLOB (UUID bytes) or TEXT, handle both
            let id_value: String = row.try_get::<String, _>("id")
                .or_else(|_| {
                    // Try to get as bytes and convert to UUID string
                    row.try_get::<Vec<u8>, _>("id")
                        .and_then(|bytes| {
                            if bytes.len() == 16 {
                                Uuid::from_slice(&bytes)
                                    .map(|uuid| uuid.to_string())
                                    .map_err(|e| sqlx::Error::Decode(Box::new(e)))
                            } else {
                                String::from_utf8(bytes)
                                    .map_err(|e| sqlx::Error::Decode(Box::new(e)))
                            }
                        })
                })
                .unwrap_or_else(|_| "unknown".to_string());

            UserInfo {
                id: id_value,
                username: row.get("username"),
                role: row.get("role"),
                is_temporary_password: row.get("is_temporary_password"),
                is_locked: row.get("is_locked"),
                login_attempts: row.get("login_attempts"),
                two_fa_enabled: row.get("two_fa_enabled"),
                created_at: row.get("created_at"),
                last_login: row.get("last_login"),
            }
        })
        .collect();

    if users.is_empty() {
        println!("📭 No users found in the database.");
        println!();
        println!("To create a new user, run:");
        println!("  cargo run --bin create_user -- <username> <password>");
        println!();
        return Ok(());
    }

    println!("Found {} user(s):", users.len());
    println!();
    println!("{}", "─".repeat(80));

    for (i, user) in users.iter().enumerate() {
        println!();
        println!("User #{}", i + 1);
        println!("  Username:      {}", user.username);
        println!("  User ID:       {}", user.id);
        println!("  Role:          {}", user.role);
        println!("  Created:       {}", user.created_at.format("%Y-%m-%d %H:%M:%S UTC"));

        if let Some(last_login) = user.last_login {
            println!("  Last Login:    {}", last_login.format("%Y-%m-%d %H:%M:%S UTC"));
        } else {
            println!("  Last Login:    Never");
        }

        // Security status
        println!();
        println!("  Security Status:");

        // Account status
        if user.is_locked {
            println!("    Account:           🔒 LOCKED");
        } else {
            println!("    Account:           ✅ Active");
        }

        // Password status
        if user.is_temporary_password {
            println!("    Password:          ⚡ TEMPORARY (must change on login)");
        } else {
            println!("    Password:          ✅ Permanent");
        }

        // 2FA status
        if user.two_fa_enabled {
            println!("    2FA:               ✅ Enabled");
        } else {
            println!("    2FA:               ⚠️  Disabled (recommended to enable)");
        }

        // Login attempts
        if user.login_attempts > 0 {
            println!("    Failed Attempts:   ⚠️  {} (max 5 before lockout)", user.login_attempts);
        } else {
            println!("    Failed Attempts:   0");
        }

        println!();
        println!("{}", "─".repeat(80));
    }

    println!();
    println!("📊 Summary:");
    println!("  Total users:        {}", users.len());
    println!("  Active:             {}", users.iter().filter(|u| !u.is_locked).count());
    println!("  Locked:             {}", users.iter().filter(|u| u.is_locked).count());
    println!("  With 2FA:           {}", users.iter().filter(|u| u.two_fa_enabled).count());
    println!("  Temp passwords:     {}", users.iter().filter(|u| u.is_temporary_password).count());
    println!();

    // Security recommendations
    let needs_password_change = users.iter().filter(|u| u.is_temporary_password).count();
    let needs_2fa = users.iter().filter(|u| !u.two_fa_enabled).count();

    if needs_password_change > 0 || needs_2fa > 0 {
        println!("⚠️  Security Recommendations:");
        if needs_password_change > 0 {
            println!("  • {} user(s) have temporary passwords - ensure they change on first login", needs_password_change);
        }
        if needs_2fa > 0 {
            println!("  • {} user(s) do not have 2FA enabled - recommend enabling for enhanced security", needs_2fa);
        }
        println!();
    }

    Ok(())
}
