-- Migration: Deprecate Existing Billing Tables
-- Created: 2025-09-02 (runs AFTER remote_schema.sql creates the tables)
-- Purpose: Add deprecation comments to billing tables that exist in the schema
-- Note: This migration is split from 20250115000000 to ensure proper ordering

-- =============================================================================
-- 1. Add deprecation comments to billing tables that exist in remote_schema
-- =============================================================================

COMMENT ON TABLE user_license_subscriptions IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';
COMMENT ON TABLE billing_events IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';
COMMENT ON TABLE billing_usage IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';
COMMENT ON TABLE billing_exemptions IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';
COMMENT ON TABLE organization_subscriptions IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';
COMMENT ON TABLE stripe_event_logs IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';

-- =============================================================================
-- 2. Add deprecation comments to billing-related columns in organizations
-- =============================================================================

DO $$
BEGIN
  -- Deprecate subscription-related columns in organizations table (if they exist)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'stripe_customer_id') THEN
    EXECUTE 'COMMENT ON COLUMN organizations.stripe_customer_id IS ''DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'subscription_status') THEN
    EXECUTE 'COMMENT ON COLUMN organizations.subscription_status IS ''DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'plan_id') THEN
    EXECUTE 'COMMENT ON COLUMN organizations.plan_id IS ''DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.''';
  END IF;

  -- Deprecate billing-related columns in organizations table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'billing_cycle') THEN
    EXECUTE 'COMMENT ON COLUMN organizations.billing_cycle IS ''DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'next_billing_date') THEN
    EXECUTE 'COMMENT ON COLUMN organizations.next_billing_date IS ''DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'billable_members') THEN
    EXECUTE 'COMMENT ON COLUMN organizations.billable_members IS ''DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'last_billing_calculation') THEN
    EXECUTE 'COMMENT ON COLUMN organizations.last_billing_calculation IS ''DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.''';
  END IF;
END $$;

-- =============================================================================
-- 3. Document deprecated tables for future developers
-- =============================================================================

-- The following tables are deprecated but preserved for historical data:
-- - user_license_subscriptions: Stripe subscription data for user licenses
-- - billing_events: Historical billing event log
-- - billing_usage: Historical usage tracking
-- - billing_exemptions: Legacy exemption grants (e.g., free user licenses)
-- - organization_subscriptions: Organization-level subscription data
-- - stripe_event_logs: Stripe webhook event processing logs
--
-- All users now have full access via the user_entitlements view
-- created in migration 20250115000000_deprecate_billing.sql
--
-- If re-implementing monetization in the future:
-- 1. These tables can be dropped safely
-- 2. Create new schema from scratch with new product IDs
-- 3. Re-integrate Stripe with updated webhooks and Edge Functions

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To rollback this migration:
--
-- 1. Remove deprecation comments:
--    COMMENT ON TABLE user_license_subscriptions IS NULL;
--    COMMENT ON TABLE billing_events IS NULL;
--    COMMENT ON TABLE billing_usage IS NULL;
--    COMMENT ON TABLE billing_exemptions IS NULL;
--    COMMENT ON TABLE organization_subscriptions IS NULL;
--    COMMENT ON TABLE stripe_event_logs IS NULL;
--
-- 2. Remove column comments (optional - they're harmless)
--
-- Note: No data structures are modified - only comments are added

