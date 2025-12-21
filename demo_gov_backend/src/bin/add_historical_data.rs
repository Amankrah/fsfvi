// ============================================================================
// ADD HISTORICAL DATA UTILITY
// ============================================================================
// Adds historical FSFVI data for FY 2021-2024 to existing database
// ============================================================================

use sqlx::SqlitePool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("============================================================================");
    println!("ADD HISTORICAL DATA - FY 2021-2024");
    println!("============================================================================");
    println!();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    println!("📦 Connecting to: {}", database_url);
    let pool = SqlitePool::connect(&database_url).await?;
    println!("✅ Connected\n");

    // Check existing data
    println!("🔍 Checking existing data...");
    let existing: Vec<(i32, i64)> = sqlx::query_as(
        "SELECT fiscal_year, COUNT(*) as count FROM fsfvi_data
         WHERE government_id = 'demo_government'
         GROUP BY fiscal_year
         ORDER BY fiscal_year"
    )
    .fetch_all(&pool)
    .await?;

    for (year, count) in &existing {
        println!("   FY {}: {} components", year, count);
    }
    println!();

    // Read the entire migration file
    println!("📥 Loading historical data migration...");
    let migration_sql = include_str!("../../migrations/008_historical_fsfvi_data.sql");

    // Execute the entire SQL file as a script
    println!("💾 Executing SQL statements...");

    // Parse multi-line INSERT statements
    // Strategy: Find each "INSERT" and collect everything until the next ";"
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
    let final_data: Vec<(i32, i64)> = sqlx::query_as(
        "SELECT fiscal_year, COUNT(*) as count FROM fsfvi_data
         WHERE government_id = 'demo_government'
         GROUP BY fiscal_year
         ORDER BY fiscal_year"
    )
    .fetch_all(&pool)
    .await?;

    for (year, count) in &final_data {
        println!("   FY {}: {} components", year, count);
    }
    println!();

    if inserted > 0 || skipped > 0 {
        println!("============================================================================");
        println!("✅ SUCCESS: Historical data ready!");
        println!("============================================================================");
        println!();
        println!("🚀 Restart the backend and refresh the browser");
        println!();
    } else {
        println!("============================================================================");
        println!("⚠️  WARNING: No data was inserted or found");
        println!("============================================================================");
        println!();
    }

    Ok(())
}
