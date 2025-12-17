-- Diagnostic Script for Emmanuel Kwofie Login Issue
-- Email: emmanuel@fsfi.org
-- This script checks all authentication requirements

-- ============================================================================
-- CHECK 1: User Account Details
-- ============================================================================
SELECT
    '=== USER ACCOUNT DETAILS ===' as check_type,
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status as user_status,
    u.mfa_enabled,
    u.failed_login_attempts,
    u.locked_until,
    u.last_login,
    CASE
        WHEN u.status = 'active' THEN '✓ PASS'
        ELSE '✗ FAIL - User not active'
    END as user_status_check,
    CASE
        WHEN u.locked_until IS NULL OR u.locked_until < NOW() THEN '✓ PASS'
        ELSE '✗ FAIL - Account is locked until ' || u.locked_until::text
    END as lock_status_check
FROM users u
WHERE u.email = 'emmanuel@fsfi.org';

-- ============================================================================
-- CHECK 2: Government Account Status (CRITICAL!)
-- ============================================================================
SELECT
    '=== GOVERNMENT ACCOUNT STATUS ===' as check_type,
    g.id,
    g.country_code,
    g.country_name,
    g.government_name,
    g.government_type,
    g.tier,
    g.status as government_status,
    g.contact_email,
    g.api_quota_daily,
    g.api_quota_monthly,
    CASE
        WHEN g.status = 'active' THEN '✓ PASS'
        ELSE '✗ FAIL - Government status is: ' || g.status::text
    END as government_status_check
FROM governments g
JOIN users u ON u.government_id = g.id
WHERE u.email = 'emmanuel@fsfi.org';

-- ============================================================================
-- CHECK 3: Combined Authentication Requirements
-- ============================================================================
SELECT
    '=== COMBINED AUTH CHECK ===' as check_type,
    u.email,
    u.status as user_status,
    g.status as government_status,
    CASE
        WHEN u.status = 'active' AND g.status = 'active' AND (u.locked_until IS NULL OR u.locked_until < NOW())
        THEN '✓✓✓ ALL CHECKS PASS - Authentication should work!'
        ELSE '✗✗✗ FAILED - See details below'
    END as overall_status,
    CASE WHEN u.status = 'active' THEN '✓' ELSE '✗' END as user_active,
    CASE WHEN g.status = 'active' THEN '✓' ELSE '✗' END as gov_active,
    CASE WHEN u.locked_until IS NULL OR u.locked_until < NOW() THEN '✓' ELSE '✗' END as not_locked,
    CASE WHEN u.mfa_enabled THEN 'MFA Required' ELSE 'No MFA' END as mfa_requirement
FROM users u
JOIN governments g ON u.government_id = g.id
WHERE u.email = 'emmanuel@fsfi.org';

-- ============================================================================
-- CHECK 4: Password Hash (for debugging)
-- ============================================================================
SELECT
    '=== PASSWORD HASH INFO ===' as check_type,
    u.email,
    LEFT(u.password_hash, 50) || '...' as password_hash_preview,
    LENGTH(u.password_hash) as hash_length,
    CASE
        WHEN u.password_hash LIKE '$argon2id$%' THEN '✓ PASS - Valid Argon2id format'
        ELSE '✗ FAIL - Invalid hash format'
    END as hash_format_check
FROM users u
WHERE u.email = 'emmanuel@fsfi.org';

-- ============================================================================
-- CHECK 5: Recent Login Attempts (Audit Logs)
-- ============================================================================
SELECT
    '=== RECENT LOGIN ATTEMPTS ===' as check_type,
    timestamp,
    action,
    response_status,
    ip_address,
    error_message,
    CASE
        WHEN response_status = 200 THEN '✓ Success'
        WHEN response_status = 401 THEN '✗ Unauthorized'
        WHEN response_status = 403 THEN '✗ Forbidden'
        ELSE '? Unknown: ' || response_status::text
    END as status_meaning
FROM audit_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'emmanuel@fsfi.org')
    AND action IN ('login', 'login_failed')
ORDER BY timestamp DESC
LIMIT 10;

-- ============================================================================
-- SUMMARY: What needs to be fixed?
-- ============================================================================
SELECT
    '=== ACTION ITEMS ===' as summary,
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM users WHERE email = 'emmanuel@fsfi.org')
        THEN '1. User does not exist - needs to be created'
        WHEN (SELECT status FROM users WHERE email = 'emmanuel@fsfi.org') != 'active'
        THEN '2. User status is not active - run: UPDATE users SET status = ''active'' WHERE email = ''emmanuel@fsfi.org'';'
        WHEN (SELECT status FROM governments g JOIN users u ON g.id = u.government_id WHERE u.email = 'emmanuel@fsfi.org') != 'active'
        THEN '3. Government status is not active - run: UPDATE governments SET status = ''active'' WHERE id = (SELECT government_id FROM users WHERE email = ''emmanuel@fsfi.org'');'
        WHEN (SELECT locked_until FROM users WHERE email = 'emmanuel@fsfi.org') > NOW()
        THEN '4. Account is locked - run: UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE email = ''emmanuel@fsfi.org'';'
        ELSE '5. Basic checks pass - issue is likely password mismatch. Generate new hash: cargo run --bin hash_password "f:8.2sc#udM}d|Sk"'
    END as recommended_action;
