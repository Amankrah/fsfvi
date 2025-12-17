use actix_web::{web, HttpResponse, Responder};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    government::{GovernmentDetail, GovernmentListItem},
    ApiResponse,
};

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/governments")
            .route("", web::get().to(list_governments))
            .route("/{id}", web::get().to(get_government)),
    );
}

async fn list_governments(db_pool: web::Data<PgPool>) -> impl Responder {
    let governments = sqlx::query_as!(
        GovernmentListItem,
        r#"
        SELECT
            id,
            country_code,
            country_name,
            government_name,
            government_type as "government_type: crate::models::government::GovernmentType",
            tier as "tier: crate::models::government::AccessTier",
            status as "status: crate::models::government::GovernmentStatus",
            contact_email,
            primary_contact_name,
            primary_contact_title,
            created_at,
            activated_at
        FROM governments
        ORDER BY country_name
        "#
    )
    .fetch_all(db_pool.get_ref())
    .await;

    match governments {
        Ok(govs) => HttpResponse::Ok().json(ApiResponse::success(govs)),
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Database error".to_string())),
    }
}

async fn get_government(id: web::Path<Uuid>, db_pool: web::Data<PgPool>) -> impl Responder {
    let result = sqlx::query!(
        r#"
        SELECT
            id,
            country_code,
            country_name,
            government_name,
            government_type as "government_type: crate::models::government::GovernmentType",
            tier as "tier: crate::models::government::AccessTier",
            status as "status: crate::models::government::GovernmentStatus",
            contact_email,
            contact_phone,
            primary_contact_name,
            primary_contact_title,
            api_quota_daily,
            api_quota_monthly,
            allowed_endpoints,
            ip_whitelist,
            created_at,
            activated_at,
            expires_at,
            max_active_api_keys,
            mandatory_rotation_days,
            api_key_expiry_days
        FROM governments
        WHERE id = $1
        "#,
        *id
    )
    .fetch_optional(db_pool.get_ref())
    .await;

    match result {
        Ok(Some(row)) => {
            // Parse JSONB fields from serde_json::Value
            let allowed_endpoints: Vec<String> = serde_json::from_value(row.allowed_endpoints)
                .unwrap_or_default();

            let ip_whitelist: Option<Vec<String>> = row.ip_whitelist
                .and_then(|v| serde_json::from_value(v).ok());

            let gov = GovernmentDetail {
                id: row.id,
                country_code: row.country_code,
                country_name: row.country_name,
                government_name: row.government_name,
                government_type: row.government_type,
                tier: row.tier,
                status: row.status,
                contact_email: row.contact_email,
                contact_phone: row.contact_phone,
                primary_contact_name: row.primary_contact_name,
                primary_contact_title: row.primary_contact_title,
                api_quota_daily: row.api_quota_daily,
                api_quota_monthly: row.api_quota_monthly,
                allowed_endpoints,
                ip_whitelist,
                created_at: row.created_at,
                activated_at: row.activated_at,
                expires_at: row.expires_at,
                max_active_api_keys: row.max_active_api_keys,
                mandatory_rotation_days: row.mandatory_rotation_days,
                api_key_expiry_days: row.api_key_expiry_days,
            };

            HttpResponse::Ok().json(ApiResponse::success(gov))
        }
        Ok(None) => {
            HttpResponse::NotFound().json(ApiResponse::<()>::error("Government not found".to_string()))
        }
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Database error".to_string())),
    }
}
