// ============================================================================
// ADD PEER COUNTRIES DATA UTILITY
// ============================================================================
// Adds peer country data (Rwanda, Ghana, Kenya) for FY 2025
// ============================================================================

use sqlx::SqlitePool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("============================================================================");
    println!("ADD PEER COUNTRIES DATA - FY 2025");
    println!("============================================================================");
    println!();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    println!("📦 Connecting to: {}", database_url);
    let pool = SqlitePool::connect(&database_url).await?;
    println!("✅ Connected\n");

    // Check existing data
    println!("🔍 Checking existing data...");
    let existing: Vec<(String, i32, i64)> = sqlx::query_as(
        "SELECT government_id, fiscal_year, COUNT(*) as count FROM fsfvi_data
         WHERE government_id IN ('rwanda', 'ghana', 'kenya')
         GROUP BY government_id, fiscal_year
         ORDER BY government_id, fiscal_year"
    )
    .fetch_all(&pool)
    .await?;

    if !existing.is_empty() {
        println!("   Found existing peer data:");
        for (gov, year, count) in &existing {
            println!("   {} FY {}: {} components", gov, year, count);
        }
    } else {
        println!("   No peer data found yet");
    }
    println!();

    // First, create user entries for peer countries
    println!("👥 Creating peer country user entries...");

    let peer_users = vec![
        ("rwanda", "rwanda_peer"),
        ("ghana", "ghana_peer"),
        ("kenya", "kenya_peer"),
    ];

    for (id, username) in &peer_users {
        match sqlx::query(
            "INSERT OR IGNORE INTO users (
                id, username, password_hash, role, is_temporary_password,
                created_at, updated_at, login_attempts, is_locked, two_fa_enabled
            ) VALUES (?, ?, 'DISABLED_PEER_COUNTRY_NO_LOGIN', 'peer_country', 0,
                     datetime('now'), datetime('now'), 0, 1, 0)"
        )
        .bind(id)
        .bind(username)
        .execute(&pool)
        .await
        {
            Ok(_) => println!("   ✓ Created user: {}", id),
            Err(e) => {
                if e.to_string().contains("UNIQUE constraint") {
                    println!("   ⏭  User {} already exists", id);
                } else {
                    eprintln!("   ❌ Failed to create user {}: {}", id, e);
                }
            }
        }
    }
    println!();

    // Read and execute the peer data migration
    println!("📥 Loading peer data migration...");
    let migration_sql = include_str!("../../migrations/009_peer_countries_data.sql");

    println!("💾 Executing SQL statements...");

    // Parse multi-line INSERT statements
    let mut statements: Vec<String> = Vec::new();
    let mut current_statement = String::new();
    let mut in_statement = false;

    for line in migration_sql.lines() {
        let trimmed = line.trim();

        // Skip empty lines and pure comment lines
        if trimmed.is_empty() || trimmed.starts_with("--") {
            continue;
        }

        // Check if this line starts an INSERT statement
        if trimmed.to_uppercase().starts_with("INSERT") {
            if !current_statement.is_empty() {
                // Save previous statement if exists
                statements.push(current_statement.clone());
            }
            current_statement = String::from(trimmed);
            in_statement = true;
        } else if in_statement {
            // Continue building the current statement
            current_statement.push(' ');
            current_statement.push_str(trimmed);
        }

        // Check if we've reached the end of the statement
        if in_statement && trimmed.ends_with(';') {
            statements.push(current_statement.clone());
            current_statement = String::new();
            in_statement = false;
        }
    }

    println!("   Found {} INSERT statements", statements.len());

    let mut inserted = 0;
    let mut skipped = 0;
    let mut errors = 0;

    for (idx, statement) in statements.iter().enumerate() {
        // Skip user creation statements (already done above)
        if statement.contains("INSERT OR IGNORE INTO users") {
            skipped += 1;
            println!("   ⏭  Statement {} skipped (user creation)", idx + 1);
            continue;
        }

        match sqlx::query(statement).execute(&pool).await {
            Ok(result) => {
                if result.rows_affected() > 0 {
                    inserted += result.rows_affected();
                    println!("   ✓ Statement {} inserted {} row(s)", idx + 1, result.rows_affected());
                } else {
                    skipped += 1;
                }
            }
            Err(e) => {
                // Ignore duplicate key errors
                if e.to_string().contains("UNIQUE constraint") {
                    skipped += 1;
                    println!("   ⏭  Statement {} skipped (already exists)", idx + 1);
                } else {
                    errors += 1;
                    eprintln!("   ❌ Statement {} error: {}", idx + 1, e);
                    eprintln!("      SQL: {}", &statement[..statement.len().min(100)]);
                }
            }
        }
    }

    println!();
    println!("✅ Inserted {} new records", inserted);
    println!("⏭️  Skipped {} existing records", skipped);
    if errors > 0 {
        println!("❌ Failed {} statements", errors);
    }
    println!();

    // Verify final state
    println!("📊 Final data state:");
    let final_data: Vec<(String, i32, i64)> = sqlx::query_as(
        "SELECT government_id, fiscal_year, COUNT(*) as count FROM fsfvi_data
         WHERE government_id IN ('demo_government', 'rwanda', 'ghana', 'kenya')
         GROUP BY government_id, fiscal_year
         ORDER BY government_id, fiscal_year"
    )
    .fetch_all(&pool)
    .await?;

    for (gov, year, count) in &final_data {
        println!("   {} FY {}: {} components", gov, year, count);
    }
    println!();

    if inserted > 0 || skipped > 0 {
        println!("============================================================================");
        println!("✅ SUCCESS: Peer countries data ready!");
        println!("============================================================================");
        println!();
        println!("🚀 Restart the backend and test peer comparison");
        println!();
    } else {
        println!("============================================================================");
        println!("⚠️  WARNING: No data was inserted or found");
        println!("============================================================================");
        println!();
    }

    Ok(())
}
