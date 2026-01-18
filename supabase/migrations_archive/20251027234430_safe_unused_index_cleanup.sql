-- Conservative Unused Index Cleanup
-- Only drops indexes confirmed as 100% safe to remove
-- Generated: 2025-01-26
--
-- Analysis: After reviewing advisor recommendations for 38 "unused" indexes:
-- Most indexes flagged as "unused" by the advisor are actually needed for:
-- 1. RLS policy filtering (is_org_admin, is_org_member, user_owns patterns)
-- 2. Foreign key constraints
-- 3. Admin/reporting queries that may run infrequently
-- 4. Potential future features
--
-- We're taking a conservative approach: only dropping indexes confirmed to be
-- completely redundant and unused.
--
-- ROLLBACK: This migration only drops 1 index. To rollback, recreate:
-- CREATE INDEX "idx_teams_team_lead_id" ON "public"."teams" ("team_lead_id");

BEGIN;

-- =============================================================================
-- Safe Index Cleanup: Only idx_teams_team_lead_id
-- =============================================================================

-- teams.team_lead_id index is flagged as unused and:
-- 1. Not used in any RLS policies
-- 2. Not referenced by foreign key (profiles.id is the FK, not team_lead_id directly)
-- 3. Existing index: idx_teams_org, idx_teams_organization_id cover org filtering
-- 4. team_lead_id queries can use existing indexes efficiently

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'teams'
    AND indexname = 'idx_teams_team_lead_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_teams_team_lead_id';
    DROP INDEX IF EXISTS "public"."idx_teams_team_lead_id";
  ELSE
    RAISE NOTICE 'Index idx_teams_team_lead_id does not exist, skipping';
  END IF;
END $$;

-- Note: We are NOT dropping other "unused" indexes because:
-- - idx_equipment_customer_id, idx_equipment_default_pm_template_id: Support foreign keys
-- - idx_billing_events_organization_id, idx_billing_events_user_id: Needed for billing queries
-- - idx_customer_contacts_user_id, idx_customer_sites_customer_id: Support RLS filtering
-- - idx_customers_organization_id: CRITICAL for RLS filtering
-- - idx_equipment_notes_author_id, idx_equipment_notes_last_modified_by: Support user_owns RLS
-- - idx_notes_author_id, idx_notes_equipment_id: Support RLS on notes table
-- - All organization_invitations indexes: Support invitation management RLS
-- - idx_organization_members_slot_purchase_id: Needed for billing logic
-- - idx_organization_slots_organization_id: Support RLS filtering  
-- - idx_pm_* indexes: Support preventative maintenance RLS
-- - idx_scans_scanned_by: Support user_owns RLS
-- - idx_slot_purchases_*: Support billing and RLS
-- - idx_work_order_*: Support work order RLS filtering
-- And many others that support RLS policies or foreign keys

COMMIT;

