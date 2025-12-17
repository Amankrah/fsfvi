-- Add api_key_expiry_days to users table
-- This field controls the default expiration period for API keys created by this user
-- Set by admin during user creation, cannot be changed by the developer

ALTER TABLE users
ADD COLUMN api_key_expiry_days INTEGER;

-- Add constraint: if set, must be between 1 and 730 days (max 2 years)
ALTER TABLE users
ADD CONSTRAINT valid_api_key_expiry CHECK (
    api_key_expiry_days IS NULL OR
    (api_key_expiry_days >= 1 AND api_key_expiry_days <= 730)
);

-- Add comment explaining the field
COMMENT ON COLUMN users.api_key_expiry_days IS
'Default expiration period in days for API keys created by this user. Set by admin during user creation. NULL means API keys never expire.';
