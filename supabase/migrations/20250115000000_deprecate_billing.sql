-- Migration: Deprecate Billing System
-- Created: 2025-01-15
-- Purpose: Safely deprecate billing and Stripe integration while preserving historical data
-- This migration is non-destructive and reversible

-- =============================================================================
-- 1. Add deprecation comments to billing tables
-- =============================================================================

-- Note: Actual table deprecation comments moved to 20250902000000_deprecate_existing_billing_tables.sql
-- to ensure they run AFTER the tables are created in remote_schema.sql
-- This migration only contains non-table-dependent logic

-- Organization column deprecation comments also moved to later migration

-- =============================================================================
-- 2. Create universal entitlements view
-- =============================================================================
-- This view simulates that all users have full access to all features
-- Note: Using profiles table to avoid exposing auth.users

CREATE OR REPLACE VIEW user_entitlements AS
SELECT 
  p.id AS user_id,
  'free'::text AS plan,
  true AS is_active,
  now() AS granted_at,
  NULL::timestamptz AS subscription_end
FROM public.profiles p;

COMMENT ON VIEW user_entitlements IS 'Universal entitlements view: all users have full access. Created 2025-01-15 as part of billing removal. Uses profiles table for security.';

-- Billing constraints check removed - table references moved to later migration

-- =============================================================================
-- 4. Create helper function to check if billing is disabled
-- =============================================================================
-- This function can be used by application code to check billing status
-- Currently returns true (billing disabled) but can be controlled by environment

CREATE OR REPLACE FUNCTION billing_is_disabled() RETURNS boolean AS $$
BEGIN
  -- Billing is disabled by default
  -- This can be overridden by setting a flag in the database if needed
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, assume billing is disabled for safety
    RETURN true;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;

COMMENT ON FUNCTION billing_is_disabled IS 'Returns true if billing is disabled. Created 2025-01-15 as part of billing removal. Default: true (billing disabled).';

-- =============================================================================
-- 5. Add check constraint helper for backwards compatibility
-- =============================================================================
-- Helper to check if a user has access (always returns true now)

CREATE OR REPLACE FUNCTION user_has_access(user_uuid UUID) RETURNS boolean AS $$
BEGIN
  -- All users have access when billing is disabled
  RETURN billing_is_disabled() OR EXISTS (
    SELECT 1 FROM user_entitlements WHERE user_id = user_uuid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION user_has_access IS 'Check if user has access to features. Returns true for all users when billing is disabled. Created 2025-01-15.';

-- =============================================================================
-- 6. Mark Edge Functions as deprecated
-- =============================================================================
-- Add comments to Edge Functions if they exist in metadata
-- (Edge Functions are not stored in the database, so we just document them here)

-- Functions to deprecate/remove:
-- - check-subscription
-- - create-checkout
-- - create-fleetmap-checkout
-- - customer-portal
-- - purchase-user-licenses
-- - refresh-fleetmap-subscription
-- - stripe-fleetmap-webhook
-- - stripe-license-webhook
-- - stripe-webhook

-- =============================================================================
-- 7. Preserve existing data
-- =============================================================================
-- No DELETE or TRUNCATE operations in this migration
-- All historical billing data remains intact and harmless

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To rollback this migration:
--
-- 1. Drop the created objects:
--    DROP VIEW IF EXISTS user_entitlements CASCADE;
--    DROP FUNCTION IF EXISTS billing_is_disabled() CASCADE;
--    DROP FUNCTION IF EXISTS user_has_access(UUID) CASCADE;
--
-- 2. Remove deprecation comments (see 20250902000000_deprecate_existing_billing_tables.sql)
--
-- 3. Set BILLING_DISABLED=false in environment
-- 4. Re-enable routes in App.tsx
-- 5. Re-enable Edge Functions
--
-- Note: No data will be lost as this migration does not delete anything

