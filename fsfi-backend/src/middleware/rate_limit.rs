// Rate limiting is handled by actix-governor middleware
// This file contains helper functions for quota management

use crate::utils::error::AppError;

/// Check if a request exceeds daily quota
/// Returns Ok(()) if within quota, Err(AppError::RateLimitExceeded) if quota exceeded
pub async fn check_daily_quota(
    government_id: uuid::Uuid,
    db_pool: &sqlx::PgPool,
) -> Result<(), AppError> {
    let today = chrono::Utc::now().date_naive();

    let usage = sqlx::query!(
        r#"
        SELECT COALESCE(SUM(request_count), 0) as "total!: i64"
        FROM api_usage
        WHERE government_id = $1 AND date = $2
        "#,
        government_id,
        today
    )
    .fetch_one(db_pool)
    .await
    .map_err(AppError::DatabaseError)?;

    let quota = sqlx::query!(
        "SELECT api_quota_daily FROM governments WHERE id = $1",
        government_id
    )
    .fetch_one(db_pool)
    .await
    .map_err(AppError::DatabaseError)?;

    if usage.total >= quota.api_quota_daily as i64 {
        return Err(AppError::RateLimitExceeded(format!(
            "Daily quota of {} requests exceeded (current: {})",
            quota.api_quota_daily, usage.total
        )));
    }

    Ok(())
}

/// Increment API usage counter
pub async fn increment_api_usage(
    government_id: uuid::Uuid,
    api_key_id: Option<uuid::Uuid>,
    endpoint: &str,
    response_time_ms: i64,
    is_error: bool,
    db_pool: &sqlx::PgPool,
) -> Result<(), sqlx::Error> {
    let today = chrono::Utc::now().date_naive();
    let error_count = if is_error { 1 } else { 0 };

    sqlx::query!(
        r#"
        INSERT INTO api_usage (
            id, government_id, api_key_id, date, endpoint,
            request_count, error_count, total_response_time_ms
        )
        VALUES ($1, $2, $3, $4, $5, 1, $6, $7)
        ON CONFLICT (government_id, api_key_id, date, endpoint)
        DO UPDATE SET
            request_count = api_usage.request_count + 1,
            error_count = api_usage.error_count + $6,
            total_response_time_ms = api_usage.total_response_time_ms + $7,
            updated_at = NOW()
        "#,
        uuid::Uuid::new_v4(),
        government_id,
        api_key_id,
        today,
        endpoint,
        error_count,
        response_time_ms
    )
    .execute(db_pool)
    .await?;

    Ok(())
}
