// ============================================================================
// DEMO GOVERNMENT USER DELETION UTILITY
// ============================================================================
// This binary deletes a government user from the database.
//
// CRITICAL: Use with extreme caution on production systems.
// This permanently deletes user data and cannot be undone.
//
// Usage: cargo run --bin delete_user -- <username>
// Example: cargo run --bin delete_user -- demo_user
// ============================================================================

use sqlx::SqlitePool;
use std::env;
use std::io::{self, Write};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        eprintln!("============================================================================");
        eprintln!("DEMO GOVERNMENT USER DELETION UTILITY");
        eprintln!("============================================================================");
        eprintln!();
        eprintln!("Usage: {} <username>", args[0]);
        eprintln!();
        eprintln!("Example:");
        eprintln!("  cargo run --bin delete_user -- demo_user");
        eprintln!();
        eprintln!("⚠️  WARNING: This permanently deletes the user and cannot be undone!");
        eprintln!();
        std::process::exit(1);
    }

    let username = &args[1];

    println!("============================================================================");
    println!("DEMO GOVERNMENT USER DELETION");
    println!("============================================================================");
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

    // Check if user exists
    let existing_user: Option<(String, String, String)> = sqlx::query_as(
        "SELECT id, username, role FROM users WHERE username = ?"
    )
    .bind(username)
    .fetch_optional(&pool)
    .await?;

    match existing_user {
        None => {
            eprintln!("❌ Error: User '{}' does not exist", username);
            std::process::exit(1);
        }
        Some((id, user, role)) => {
            println!();
            println!("Found user:");
            println!("  Username: {}", user);
            println!("  User ID:  {}", id);
            println!("  Role:     {}", role);
            println!();
            println!("⚠️  WARNING: This will PERMANENTLY delete the user!");
            println!("This action CANNOT be undone.");
            println!();
            print!("Type 'DELETE {}' to confirm: ", username);
            io::stdout().flush()?;

            let mut confirmation = String::new();
            io::stdin().read_line(&mut confirmation)?;
            let confirmation = confirmation.trim();

            if confirmation != format!("DELETE {}", username) {
                println!();
                println!("❌ Deletion cancelled. Confirmation did not match.");
                std::process::exit(1);
            }

            println!();
            println!("🗑️  Deleting user...");

            let result = sqlx::query("DELETE FROM users WHERE username = ?")
                .bind(username)
                .execute(&pool)
                .await?;

            if result.rows_affected() > 0 {
                println!();
                println!("✅ SUCCESS: User '{}' has been deleted", username);
                println!();
            } else {
                eprintln!("❌ Error: User deletion failed (no rows affected)");
                std::process::exit(1);
            }
        }
    }

    Ok(())
}
