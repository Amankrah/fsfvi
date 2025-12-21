// ============================================================================
// DATABASE FIX UTILITY
// ============================================================================
// Applies migration 007_fix_optional_fields.sql to existing database
// This fixes sensitivity_parameter and weight fields without deleting users
// ============================================================================

use sqlx::SqlitePool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("============================================================================");
    println!("DATABASE FIX UTILITY - Fix Optional Fields");
    println!("============================================================================");
    println!();

    // Get database URL
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    println!("📦 Connecting to database: {}", database_url);

    let pool = SqlitePool::connect(&database_url).await?;

    println!("✅ Connected successfully");
    println!();

    // Check current state
    println!("🔍 Checking current state...");
    let count_before: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM fsfvi_data WHERE sensitivity_parameter = 0.0 OR weight = 0.0"
    )
    .fetch_one(&pool)
    .await?;

    println!("   Found {} records with 0 values that need fixing", count_before);
    println!();

    if count_before == 0 {
        println!("✅ No records need fixing. Database is already correct!");
        return Ok(());
    }

    // Apply fix for sensitivity_parameter
    println!("🔧 Fixing sensitivity_parameter...");
    let updated_sensitivity = sqlx::query(
        "UPDATE fsfvi_data SET sensitivity_parameter = NULL WHERE sensitivity_parameter = 0.0"
    )
    .execute(&pool)
    .await?;

    println!("   Updated {} records", updated_sensitivity.rows_affected());

    // Apply fix for weight
    println!("🔧 Fixing weight...");
    let updated_weight = sqlx::query(
        "UPDATE fsfvi_data SET weight = NULL WHERE weight = 0.0"
    )
    .execute(&pool)
    .await?;

    println!("   Updated {} records", updated_weight.rows_affected());
    println!();

    // Verify the fix
    println!("✅ Verifying fix...");
    let count_after: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM fsfvi_data WHERE sensitivity_parameter = 0.0 OR weight = 0.0"
    )
    .fetch_one(&pool)
    .await?;

    println!("   Records with 0 values remaining: {}", count_after);
    println!();

    // Show sample data
    println!("📊 Sample data after fix:");
    let samples: Vec<(String, Option<f64>, Option<f64>)> = sqlx::query_as(
        "SELECT component_type, sensitivity_parameter, weight FROM fsfvi_data LIMIT 3"
    )
    .fetch_all(&pool)
    .await?;

    for (component_type, sensitivity, weight) in samples {
        println!("   - {}: sensitivity={:?}, weight={:?}",
            component_type, sensitivity, weight);
    }
    println!();

    println!("============================================================================");
    println!("✅ SUCCESS: Database fixed successfully!");
    println!("============================================================================");
    println!();
    println!("🚀 You can now restart the backend server:");
    println!("   cargo run --release");
    println!();

    Ok(())
}
