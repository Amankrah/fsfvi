-- Migration: Add api_key_expiry_days to governments table for unified API key expiration policy
-- Date: 2025-12-16
--
-- CRITICAL BUSINESS LOGIC CHANGE:
-- ================================
-- This migration implements a critical architectural fix for government-level API key expiration.
--
-- PROBLEM STATEMENT:
-- ------------------
-- Previously, API key expiration was inconsistent:
-- - Users had individual `api_key_expiry_days` settings
-- - This caused API keys from the SAME government to have DIFFERENT expiration policies
-- - When viewing government dashboard vs user dashboard, expiration dates appeared different
-- - This violates the principle that Government is the parent entity holding the contract
--
-- SOLUTION:
-- ---------
-- - Add `api_key_expiry_days` field to `governments` table (the authoritative source)
-- - Remove conceptual reliance on user-level api_key_expiry_days for key generation
-- - ALL API keys created by users under a government inherit the GOVERNMENT'S expiration policy
-- - This ensures consistency: One government = One unified API key expiration policy
--
-- SECURITY RATIONALE:
-- -------------------
-- 1. Government is the billable/accountable entity
-- 2. Users are just representatives of that government
-- 3. All API keys under one government MUST follow the SAME security policies
-- 4. Simplifies audit: "What's this government's API key policy?" has ONE clear answer
--
-- DATA MIGRATION STRATEGY:
-- ------------------------
-- 1. Add the new column with a sensible default (365 days)
-- 2. Do NOT remove user.api_key_expiry_days yet (keep for backward compatibility/audit trail)
-- 3. Backend will prioritize government.api_key_expiry_days over user.api_key_expiry_days
-- 4. Future migration can optionally remove user.api_key_expiry_days after transition period

-- Step 1: Add api_key_expiry_days to governments table
ALTER TABLE governments
ADD COLUMN IF NOT EXISTS api_key_expiry_days INTEGER;

-- Step 2: Set default value for existing governments
-- Strategy: Use 365 days (1 year) as a reasonable default for production governments
-- Admins can adjust this per-government as needed
UPDATE governments
SET api_key_expiry_days = 365
WHERE api_key_expiry_days IS NULL;

-- Step 3: Add constraint to ensure valid range (1-730 days, or NULL for no expiration)
ALTER TABLE governments
ADD CONSTRAINT governments_api_key_expiry_days_check
CHECK (api_key_expiry_days IS NULL OR (api_key_expiry_days >= 1 AND api_key_expiry_days <= 730));

-- Step 4: Add index for query performance (admins filtering by expiry policy)
CREATE INDEX IF NOT EXISTS idx_governments_api_key_expiry
ON governments(api_key_expiry_days)
WHERE api_key_expiry_days IS NOT NULL;

-- Step 5: Add comment explaining the field's purpose
COMMENT ON COLUMN governments.api_key_expiry_days IS
'Default API key expiration in days for ALL users under this government.
This is the authoritative source for API key expiration policy.
Range: 1-730 days, or NULL for no expiration.
All developer users inherit this value when creating API keys.';

-- BACKWARD COMPATIBILITY NOTE:
-- ----------------------------
-- The `users.api_key_expiry_days` column is KEPT for now to maintain backward compatibility
-- and as an audit trail. The backend will be updated to prioritize
-- `governments.api_key_expiry_days` when creating new API keys.
--
-- Future migrations may remove `users.api_key_expiry_days` after confirming the transition
-- is complete and all systems are using the new government-level policy.

-- DATA INTEGRITY CHECK:
-- ---------------------
-- After running this migration, admins should review and adjust api_key_expiry_days
-- for each government to match their security requirements and contractual obligations.
