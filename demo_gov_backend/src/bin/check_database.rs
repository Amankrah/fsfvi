// ============================================================================
// DATABASE DIAGNOSTIC UTILITY
// ============================================================================
// Check actual values in the database for debugging
// ============================================================================

use sqlx::SqlitePool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("============================================================================");
    println!("DATABASE DIAGNOSTIC - Check FSFVI Data");
    println!("============================================================================");
    println!();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./demo_gov_backend.db".to_string());

    println!("📦 Connecting to: {}", database_url);
    let pool = SqlitePool::connect(&database_url).await?;
    println!("✅ Connected\n");

    // Check all fsfvi_data records
    println!("📊 All FSFVI Data Records:");
    println!("{:<40} {:<25} {:<25}", "component_type", "sensitivity_parameter", "weight");
    println!("{}", "-".repeat(90));

    let rows: Vec<(String, Option<f64>, Option<f64>)> = sqlx::query_as(
        "SELECT component_type, sensitivity_parameter, weight FROM fsfvi_data ORDER BY component_type"
    )
    .fetch_all(&pool)
    .await?;

    for (component_type, sensitivity, weight) in &rows {
        println!(
            "{:<40} {:<25} {:<25}",
            component_type,
            match sensitivity {
                Some(v) => format!("{}", v),
                None => "NULL".to_string(),
            },
            match weight {
                Some(v) => format!("{}", v),
                None => "NULL".to_string(),
            }
        );
    }

    println!();
    println!("Total records: {}", rows.len());
    println!();

    // Count problem records
    let count_with_zero: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM fsfvi_data WHERE
         (sensitivity_parameter IS NOT NULL AND sensitivity_parameter = 0.0) OR
         (weight IS NOT NULL AND weight = 0.0)"
    )
    .fetch_one(&pool)
    .await?;

    println!("🔍 Records with 0.0 values: {}", count_with_zero);

    let count_null_sensitivity: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM fsfvi_data WHERE sensitivity_parameter IS NULL"
    )
    .fetch_one(&pool)
    .await?;

    println!("🔍 Records with NULL sensitivity_parameter: {}", count_null_sensitivity);

    let count_null_weight: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM fsfvi_data WHERE weight IS NULL"
    )
    .fetch_one(&pool)
    .await?;

    println!("🔍 Records with NULL weight: {}", count_null_weight);
    println!();

    // Show table schema
    println!("📋 Table Schema for 'fsfvi_data':");
    let pragma_info: Vec<(i32, String, String, i32, Option<String>, i32)> = sqlx::query_as(
        "PRAGMA table_info(fsfvi_data)"
    )
    .fetch_all(&pool)
    .await?;

    for (_, name, type_name, notnull, dflt_value, _) in pragma_info {
        if name == "sensitivity_parameter" || name == "weight" {
            println!("  {}: {} (NOT NULL: {}, DEFAULT: {:?})",
                name, type_name, notnull, dflt_value);
        }
    }

    println!();
    println!("============================================================================");
    Ok(())
}
