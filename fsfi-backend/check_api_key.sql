-- ============================================================================
-- Check if API Key Exists in Database
-- ============================================================================
-- API Key: fsfi_live_8Smv8OP90QFEJXhYwifC6BfmWhzonjnk
-- Expected SHA-256: fb1f1bd46d547289e10798ced9d864a3588b7cd33f8ba375b70b87faba7ad389
-- ============================================================================

-- 1. Check if the exact hash exists
SELECT
    'Hash Check' as check_type,
    k.id,
    k.name,
    k.key_hash,
    k.key_prefix,
    k.status,
    k.scopes,
    k.expires_at,
    k.created_at,
    g.country_name,
    g.government_name,
    u.full_name,
    u.email
FROM api_keys k
JOIN governments g ON k.government_id = g.id
JOIN users u ON k.created_by_user_id = u.id
WHERE k.key_hash = 'fb1f1bd46d547289e10798ced9d864a3588b7cd33f8ba375b70b87faba7ad389';

-- 2. Show all API keys for the government (00000000-0000-0000-0000-000000000000)
SELECT
    'All Keys for Government' as check_type,
    k.id,
    k.name,
    k.key_hash,
    k.key_prefix,
    k.status,
    k.scopes,
    k.expires_at,
    k.revoked_at,
    k.created_at
FROM api_keys k
WHERE k.government_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY k.created_at DESC;

-- 3. Show all API keys for Emmanuel Kwofie
SELECT
    'All Keys for User Emmanuel' as check_type,
    k.id,
    k.name,
    k.key_hash,
    k.key_prefix,
    k.status,
    k.scopes,
    k.expires_at,
    k.revoked_at,
    k.created_at
FROM api_keys k
WHERE k.created_by_user_id = 'df4688ac-77de-4c16-8562-405aa7a83787'::uuid
ORDER BY k.created_at DESC;

-- 4. Show the user and government details
SELECT
    'User & Government Info' as check_type,
    u.id as user_id,
    u.email,
    u.full_name,
    u.role,
    u.status as user_status,
    g.id as government_id,
    g.country_name,
    g.government_name,
    g.status as gov_status,
    g.allowed_endpoints
FROM users u
JOIN governments g ON u.government_id = g.id
WHERE u.id = 'df4688ac-77de-4c16-8562-405aa7a83787'::uuid;
