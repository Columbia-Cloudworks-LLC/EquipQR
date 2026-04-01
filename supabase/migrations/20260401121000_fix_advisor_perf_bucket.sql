-- Migration: fix_advisor_perf_bucket
-- Purpose: Address Supabase performance advisor findings
-- Baseline counts: unindexed_foreign_keys=22, unused_index=86
-- Changes:
--   1. Add 22 covering indexes for unindexed foreign keys
--   2. Drop 16 unused indexes on deprecated billing/part-picker tables
-- Note: 70 remaining unused indexes are intentionally retained (support RLS/FKs/active features)

-- ROLLBACK for Section B (dropped indexes):
--   CREATE INDEX idx_billing_events_organization_id ON public.billing_events USING btree (organization_id);
--   CREATE INDEX idx_billing_events_user_id ON public.billing_events USING btree (user_id);
--   CREATE INDEX idx_billing_exemptions_granted_by ON public.billing_exemptions USING btree (granted_by);
--   CREATE INDEX idx_billing_usage_organization_id ON public.billing_usage USING btree (organization_id);
--   CREATE INDEX idx_organization_subscriptions_organization_id ON public.organization_subscriptions USING btree (organization_id);
--   CREATE INDEX idx_slot_purchases_organization_id ON public.slot_purchases USING btree (organization_id);
--   CREATE INDEX idx_slot_purchases_purchased_by ON public.slot_purchases USING btree (purchased_by);
--   CREATE INDEX idx_user_license_subscriptions_organization_id ON public.user_license_subscriptions USING btree (organization_id);
--   CREATE INDEX idx_organization_slots_organization_id ON public.organization_slots USING btree (organization_id);
--   CREATE INDEX idx_organization_invitations_slot_purchase_id ON public.organization_invitations USING btree (slot_purchase_id);
--   CREATE INDEX idx_organization_members_slot_purchase_id ON public.organization_members USING btree (slot_purchase_id);
--   CREATE INDEX idx_subscribers_user_id ON public.subscribers USING btree (user_id);
--   CREATE INDEX ix_listing_distributor ON public.distributor_listing USING btree (distributor_id);
--   CREATE INDEX ix_listing_part ON public.distributor_listing USING btree (part_id);
--   CREATE INDEX ix_part_identifier_normalized ON public.part_identifier USING btree (normalized_value);
--   CREATE INDEX ix_part_identifier_part ON public.part_identifier USING btree (part_id);

BEGIN;

-- =============================================================================
-- Section A: Add Missing Foreign Key Indexes (22 indexes)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_dsr_request_events_actor_id
  ON public.dsr_request_events USING btree (actor_id);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_completed_by
  ON public.dsr_requests USING btree (completed_by);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_user_id
  ON public.dsr_requests USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_verified_by
  ON public.dsr_requests USING btree (verified_by);

CREATE INDEX IF NOT EXISTS idx_google_workspace_oauth_sessions_organization_id
  ON public.google_workspace_oauth_sessions USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_google_workspace_oauth_sessions_user_id
  ON public.google_workspace_oauth_sessions USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by
  ON public.inventory_items USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_organization_member_claims_claimed_user_id
  ON public.organization_member_claims USING btree (claimed_user_id);

CREATE INDEX IF NOT EXISTS idx_organization_member_claims_created_by
  ON public.organization_member_claims USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_organization_role_grants_pending_applied_user_id
  ON public.organization_role_grants_pending USING btree (applied_user_id);

CREATE INDEX IF NOT EXISTS idx_organization_role_grants_pending_created_by
  ON public.organization_role_grants_pending USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_part_alternate_groups_created_by
  ON public.part_alternate_groups USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_part_alternate_groups_verified_by
  ON public.part_alternate_groups USING btree (verified_by);

CREATE INDEX IF NOT EXISTS idx_part_compatibility_rules_created_by
  ON public.part_compatibility_rules USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_part_compatibility_rules_verified_by
  ON public.part_compatibility_rules USING btree (verified_by);

CREATE INDEX IF NOT EXISTS idx_part_identifiers_created_by
  ON public.part_identifiers USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_parts_managers_assigned_by
  ON public.parts_managers USING btree (assigned_by);

CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_organization_id
  ON public.quickbooks_oauth_sessions USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_user_id
  ON public.quickbooks_oauth_sessions USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id
  ON public.teams USING btree (team_lead_id);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_organization_id
  ON public.user_dashboard_preferences USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_workspace_domains_organization_id
  ON public.workspace_domains USING btree (organization_id);

-- =============================================================================
-- Section B: Conservative Unused Index Cleanup
-- Drop only indexes on deprecated/dead tables.
-- Billing tables deprecated in 20251028012503_deprecate_billing.
-- Global part picker removed in 20251210163000.
-- =============================================================================

-- ---- Billing tables (deprecated) ----

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_billing_events_organization_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_billing_events_organization_id';
    DROP INDEX IF EXISTS public.idx_billing_events_organization_id;
  ELSE
    RAISE NOTICE 'Index idx_billing_events_organization_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_billing_events_user_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_billing_events_user_id';
    DROP INDEX IF EXISTS public.idx_billing_events_user_id;
  ELSE
    RAISE NOTICE 'Index idx_billing_events_user_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_billing_exemptions_granted_by'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_billing_exemptions_granted_by';
    DROP INDEX IF EXISTS public.idx_billing_exemptions_granted_by;
  ELSE
    RAISE NOTICE 'Index idx_billing_exemptions_granted_by does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_billing_usage_organization_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_billing_usage_organization_id';
    DROP INDEX IF EXISTS public.idx_billing_usage_organization_id;
  ELSE
    RAISE NOTICE 'Index idx_billing_usage_organization_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_organization_subscriptions_organization_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_organization_subscriptions_organization_id';
    DROP INDEX IF EXISTS public.idx_organization_subscriptions_organization_id;
  ELSE
    RAISE NOTICE 'Index idx_organization_subscriptions_organization_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_slot_purchases_organization_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_slot_purchases_organization_id';
    DROP INDEX IF EXISTS public.idx_slot_purchases_organization_id;
  ELSE
    RAISE NOTICE 'Index idx_slot_purchases_organization_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_slot_purchases_purchased_by'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_slot_purchases_purchased_by';
    DROP INDEX IF EXISTS public.idx_slot_purchases_purchased_by;
  ELSE
    RAISE NOTICE 'Index idx_slot_purchases_purchased_by does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_user_license_subscriptions_organization_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_user_license_subscriptions_organization_id';
    DROP INDEX IF EXISTS public.idx_user_license_subscriptions_organization_id;
  ELSE
    RAISE NOTICE 'Index idx_user_license_subscriptions_organization_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_organization_slots_organization_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_organization_slots_organization_id';
    DROP INDEX IF EXISTS public.idx_organization_slots_organization_id;
  ELSE
    RAISE NOTICE 'Index idx_organization_slots_organization_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_organization_invitations_slot_purchase_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_organization_invitations_slot_purchase_id';
    DROP INDEX IF EXISTS public.idx_organization_invitations_slot_purchase_id;
  ELSE
    RAISE NOTICE 'Index idx_organization_invitations_slot_purchase_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_organization_members_slot_purchase_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_organization_members_slot_purchase_id';
    DROP INDEX IF EXISTS public.idx_organization_members_slot_purchase_id;
  ELSE
    RAISE NOTICE 'Index idx_organization_members_slot_purchase_id does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_subscribers_user_id'
  ) THEN
    RAISE NOTICE 'Dropping unused index: idx_subscribers_user_id';
    DROP INDEX IF EXISTS public.idx_subscribers_user_id;
  ELSE
    RAISE NOTICE 'Index idx_subscribers_user_id does not exist, skipping';
  END IF;
END $$;

-- ---- Global part picker tables (removed) ----

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'ix_listing_distributor'
  ) THEN
    RAISE NOTICE 'Dropping unused index: ix_listing_distributor';
    DROP INDEX IF EXISTS public.ix_listing_distributor;
  ELSE
    RAISE NOTICE 'Index ix_listing_distributor does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'ix_listing_part'
  ) THEN
    RAISE NOTICE 'Dropping unused index: ix_listing_part';
    DROP INDEX IF EXISTS public.ix_listing_part;
  ELSE
    RAISE NOTICE 'Index ix_listing_part does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'ix_part_identifier_normalized'
  ) THEN
    RAISE NOTICE 'Dropping unused index: ix_part_identifier_normalized';
    DROP INDEX IF EXISTS public.ix_part_identifier_normalized;
  ELSE
    RAISE NOTICE 'Index ix_part_identifier_normalized does not exist, skipping';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'ix_part_identifier_part'
  ) THEN
    RAISE NOTICE 'Dropping unused index: ix_part_identifier_part';
    DROP INDEX IF EXISTS public.ix_part_identifier_part;
  ELSE
    RAISE NOTICE 'Index ix_part_identifier_part does not exist, skipping';
  END IF;
END $$;

COMMIT;
