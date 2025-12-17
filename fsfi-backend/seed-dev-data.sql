-- Development seed data for FSFI Backend
-- This script creates test governments and users for local development

-- Clean existing data (development only!)
TRUNCATE TABLE api_usage, api_keys, refresh_tokens, audit_logs, users, governments CASCADE;

-- Insert test governments
INSERT INTO governments (
    id, country_code, country_name, government_name,
    government_type, tier, status, contact_email,
    primary_contact_name, primary_contact_title,
    api_quota_daily, api_quota_monthly, allowed_endpoints
) VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'KE',
        'Kenya',
        'Ministry of Agriculture, Kenya',
        'federal',
        'premium',
        'active',
        'admin@agriculture.ke.gov',
        'John Kamau',
        'Director of IT',
        50000,
        1500000,
        '["*"]'::jsonb
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'UG',
        'Uganda',
        'Ministry of Agriculture, Animal Industry and Fisheries',
        'federal',
        'standard',
        'active',
        'admin@maaif.go.ug',
        'Sarah Nakato',
        'IT Manager',
        10000,
        300000,
        '["*"]'::jsonb
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'TZ',
        'Tanzania',
        'Ministry of Agriculture',
        'federal',
        'basic',
        'active',
        'admin@agriculture.go.tz',
        'Hassan Mwinyi',
        'Systems Administrator',
        1000,
        30000,
        '["read:data", "read:analytics"]'::jsonb
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'RW',
        'Rwanda',
        'Ministry of Agriculture and Animal Resources',
        'federal',
        'standard',
        'pending',
        'admin@minagri.gov.rw',
        'Marie Uwera',
        'Chief Technology Officer',
        10000,
        300000,
        '["*"]'::jsonb
    );

-- Insert test users
-- Password for all test users: Test123!@#
-- Hash generated with Argon2: $argon2id$v=19$m=19456,t=2,p=1$...(you'll need to generate this)
INSERT INTO users (
    id, government_id, email, password_hash,
    full_name, title, role, status
) VALUES
    -- Kenya Admin
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'john.kamau@agriculture.ke.gov',
        '$argon2id$v=19$m=19456,t=2,p=1$aSI3SzkAYqn5GQckjpvazQ$T5rL6h8zJ5Ky8vJxGXkVlcqMxB7OjhEQc7qFGVnvWZU',
        'John Kamau',
        'Director of IT',
        'admin',
        'active'
    ),
    -- Kenya Developer
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '11111111-1111-1111-1111-111111111111',
        'developer@agriculture.ke.gov',
        '$argon2id$v=19$m=19456,t=2,p=1$aSI3SzkAYqn5GQckjpvazQ$T5rL6h8zJ5Ky8vJxGXkVlcqMxB7OjhEQc7qFGVnvWZU',
        'Grace Wanjiru',
        'Senior Developer',
        'developer',
        'active'
    ),
    -- Uganda Admin
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '22222222-2222-2222-2222-222222222222',
        'sarah.nakato@maaif.go.ug',
        '$argon2id$v=19$m=19456,t=2,p=1$aSI3SzkAYqn5GQckjpvazQ$T5rL6h8zJ5Ky8vJxGXkVlcqMxB7OjhEQc7qFGVnvWZU',
        'Sarah Nakato',
        'IT Manager',
        'admin',
        'active'
    ),
    -- Tanzania Analyst
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        '33333333-3333-3333-3333-333333333333',
        'hassan.mwinyi@agriculture.go.tz',
        '$argon2id$v=19$m=19456,t=2,p=1$aSI3SzkAYqn5GQckjpvazQ$T5rL6h8zJ5Ky8vJxGXkVlcqMxB7OjhEQc7qFGVnvWZU',
        'Hassan Mwinyi',
        'Data Analyst',
        'analyst',
        'active'
    );

-- Output summary
SELECT
    'Governments Created' as type,
    COUNT(*) as count
FROM governments
UNION ALL
SELECT
    'Users Created' as type,
    COUNT(*) as count
FROM users;

-- Display created accounts
SELECT
    g.country_name,
    u.email,
    u.role,
    u.status,
    'Test123!@#' as password
FROM users u
JOIN governments g ON u.government_id = g.id
ORDER BY g.country_name, u.role;
