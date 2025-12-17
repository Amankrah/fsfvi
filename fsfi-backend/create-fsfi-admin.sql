-- Create FSFI Company Admin
-- This creates the master admin account for FSFI company to manage the entire system

-- Step 1: Create FSFI Company as a "government" entity (internal use)
INSERT INTO governments (
    id,
    country_code,
    country_name,
    government_name,
    government_type,
    tier,
    status,
    contact_email,
    primary_contact_name,
    primary_contact_title,
    api_quota_daily,
    api_quota_monthly,
    allowed_endpoints
) VALUES (
    '00000000-0000-0000-0000-000000000000',  -- Special UUID for FSFI company
    'XX',                                    -- Special code (XX = internal/admin)
    'FSFI Company',                          -- Internal designation
    'Food Systems Financial Intelligence',   -- Company name
    'federal',                               -- Type
    'premium',                               -- Highest tier
    'active',                                -- Active
    'admin@fsfi.org',                        -- FSFI admin email
    'FSFI System Administrator',             -- Contact name
    'Chief Administrator',                   -- Title
    999999,                                  -- Unlimited daily quota
    999999999,                               -- Unlimited monthly quota
    '["*"]'::jsonb                          -- All endpoints allowed
)
ON CONFLICT (id) DO UPDATE SET
    status = 'active',
    api_quota_daily = 999999,
    api_quota_monthly = 999999999;

-- Step 2: Create FSFI Admin User
-- Default password: Test123!@#
-- Hash: $argon2id$v=19$m=19456,t=2,p=1$w7PyV07c2RAAcE7SzRqz7w$UogObudbOYX3zE+qNPbiZIIFvs4MauYNwqKzW+dp3EQ
INSERT INTO users (
    id,
    government_id,
    email,
    password_hash,
    full_name,
    title,
    role,
    status,
    mfa_enabled
) VALUES (
    '00000000-0000-0000-0000-000000000001',  -- Special UUID for FSFI admin
    '00000000-0000-0000-0000-000000000000',  -- FSFI government ID
    'admin@fsfi.org',                        -- FSFI admin email
    '$argon2id$v=19$m=19456,t=2,p=1$w7PyV07c2RAAcE7SzRqz7w$UogObudbOYX3zE+qNPbiZIIFvs4MauYNwqKzW+dp3EQ',  -- Hash for Test123!@#
    'FSFI System Administrator',             -- Full name
    'Chief System Administrator',            -- Title
    'admin',                                 -- Admin role
    'active',                                -- Active status
    false                                    -- MFA disabled for initial setup
)
ON CONFLICT (email) DO UPDATE SET
    status = 'active',
    password_hash = '$argon2id$v=19$m=19456,t=2,p=1$w7PyV07c2RAAcE7SzRqz7w$UogObudbOYX3zE+qNPbiZIIFvs4MauYNwqKzW+dp3EQ',
    mfa_enabled = false;

-- Verify creation
SELECT
    'FSFI Admin Account Created Successfully' as status,
    u.email,
    u.full_name,
    u.role,
    u.status,
    'Test123!@#' as default_password,
    '⚠️ CHANGE THIS PASSWORD IMMEDIATELY!' as warning
FROM users u
WHERE u.id = '00000000-0000-0000-0000-000000000001';
