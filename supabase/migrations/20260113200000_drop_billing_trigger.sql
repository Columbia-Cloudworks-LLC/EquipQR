-- ============================================================================
-- Migration: Drop Deprecated Billing Trigger
-- 
-- Purpose: Remove the organization_member_billing_update trigger which causes
-- errors when updating member roles. The trigger tries to insert 'member_updated'
-- into billing_events, but this event_type is not in the allowed check constraint.
-- 
-- Root Cause: The billing_events_event_type_check constraint only allows:
--   'member_added', 'member_removed', 'plan_upgraded', 'plan_downgraded',
--   'storage_used', 'feature_enabled', 'feature_disabled'
-- But the trigger inserts 'member_updated' on role changes.
-- 
-- Impact: Fixes ownership transfer acceptance and any role/status updates.
-- Billing is already deprecated, so this trigger is no longer needed.
-- ============================================================================

-- Drop the billing trigger that fires on organization_members changes
DROP TRIGGER IF EXISTS organization_member_billing_update ON organization_members;

-- Optional: Also drop the function if no longer used elsewhere
-- Keeping the function for now in case it's referenced by other code
-- DROP FUNCTION IF EXISTS handle_membership_billing_update();
