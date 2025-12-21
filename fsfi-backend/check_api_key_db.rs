// Quick script to check if the API key exists in the database
// Run with: cargo run --bin check_api_key_db

use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://fsfi_dev:dev_password_123@localhost:5433/fsfi_dev_db".to_string());

    println!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    println!("\n=== Checking API Key ===");
    println!("API Key: fsfi_live_pAriE02bwqiQ8aZZMD3aGH8YyM0FNhyd");
    println!("Expected Hash: 29dfb8717deb4fddfba6ee19c69bec942e4e3267721ca7c01302272184852e15\n");

    // Check if exact hash exists
    let result = sqlx::query!(
        r#"
        SELECT
            k.id,
            k.name,
            k.key_hash,
            k.key_prefix,
            k.status::text as "status!",
            k.scopes,
            k.expires_at,
            k.created_at,
            g.country_name,
            u.full_name,
            u.email
        FROM api_keys k
        JOIN governments g ON k.government_id = g.id
        JOIN users u ON k.created_by_user_id = u.id
        WHERE k.key_hash = $1
        "#,
        "29dfb8717deb4fddfba6ee19c69bec942e4e3267721ca7c01302272184852e15"
    )
    .fetch_optional(&pool)
    .await?;

    if let Some(record) = result {
        println!("✓ API KEY FOUND!");
        println!("  ID: {}", record.id);
        println!("  Name: {}", record.name);
        println!("  Prefix: {}", record.key_prefix);
        println!("  Status: {}", record.status);
        println!("  Scopes: {}", record.scopes);
        println!("  Expires: {:?}", record.expires_at);
        println!("  Created: {}", record.created_at);
        println!("  Government: {}", record.country_name);
        println!("  User: {} ({})", record.full_name, record.email);
    } else {
        println!("✗ API KEY NOT FOUND IN DATABASE");
        println!("\nSearching for all API keys for user df4688ac-77de-4c16-8562-405aa7a83787...\n");

        let user_keys = sqlx::query!(
            r#"
            SELECT
                k.id,
                k.name,
                k.key_hash,
                k.key_prefix,
                k.status::text as "status!",
                k.created_at
            FROM api_keys k
            WHERE k.created_by_user_id = $1
            ORDER BY k.created_at DESC
            "#,
            uuid::Uuid::parse_str("df4688ac-77de-4c16-8562-405aa7a83787")?
        )
        .fetch_all(&pool)
        .await?;

        if user_keys.is_empty() {
            println!("  No API keys found for this user");
        } else {
            println!("  Found {} API key(s):", user_keys.len());
            for key in user_keys {
                println!("    - {} | {} | {} | {}", key.name, key.key_prefix, key.status, key.key_hash);
            }
        }
    }

    Ok(())
}
