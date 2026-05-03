-- =============================================================================
-- Migration: Clear Supabase performance advisor findings and dedup QuickBooks cron job
-- Issue: #722 (Sub-change 1 of 3)
-- Date: 2026-05-03
--
-- This migration is part of the bundle authorized in Change Record on issue #722.
-- It is intentionally idempotent (DROP ... IF EXISTS / CREATE ... IF NOT EXISTS)
-- so partial replays during local dev or branching environments do not error.
--
-- Sections:
--   PART 1: RLS init-plan rewrites (8 policies on 2 tables)
--           Wraps `auth.uid()` in `(select auth.uid())` so Postgres evaluates
--           the auth function ONCE per query instead of per row.
--           Advisor finding: auth_rls_initplan
--
--   PART 2: Drop redundant `customers_admins_select` policy
--           is_org_admin is a strict subset of is_org_member (admins still pass
--           is_org_member because both check organization_members with
--           status = 'active'; admin adds the role IN ('owner','admin') filter).
--           Customers SELECT access for admins is therefore preserved through
--           customers_members_select. Mutation policies (customers_admins_insert,
--           customers_admins_update) remain unchanged.
--           Advisor finding: multiple_permissive_policies
--
--   PART 3: Add 2 missing FK covering indexes
--           Advisor finding: unindexed_foreign_keys
--
--   PART 4: Drop ~55 unused indexes
--           Filter: advisor `unused_index` flag + idx_scan = 0 + source migration
--           timestamp < 20260403000000 (deployed > 30 days ago as of 2026-05-03).
--           NOTE: 22 of these were added by the 20260401121000_fix_advisor_perf_bucket.sql
--           migration that addressed unindexed_foreign_keys advisor findings on then-new
--           tables. Postgres' query planner has not used them in the ~30 days since,
--           so they are net write amplification with no read benefit. If future
--           query patterns make any of them useful, re-add via a future migration.
--           Advisor finding: unused_index
--
--   PART 5: Idempotently unschedule duplicate `quickbooks-token-refresh` cron job
--           The newer `refresh-quickbooks-tokens` job (15-min schedule, has
--           cron.job_id SECURITY DEFINER guard, vault-based credentials, and
--           URL-validation regex) supersedes this older 10-min job, which has
--           none of those protections.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: RLS init-plan rewrites
-- =============================================================================

-- 1a. organization_google_export_destinations: 4 policies
DROP POLICY IF EXISTS google_export_destinations_select ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_select
  ON public.organization_google_export_destinations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS google_export_destinations_insert ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_insert
  ON public.organization_google_export_destinations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS google_export_destinations_update ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_update
  ON public.organization_google_export_destinations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS google_export_destinations_delete ON public.organization_google_export_destinations;
CREATE POLICY google_export_destinations_delete
  ON public.organization_google_export_destinations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_google_export_destinations.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- 1b. record_export_artifacts: 4 policies (service_role policy at the end is unchanged)
DROP POLICY IF EXISTS record_export_artifacts_select ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_select
  ON public.record_export_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS record_export_artifacts_insert ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_insert
  ON public.record_export_artifacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS record_export_artifacts_update ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_update
  ON public.record_export_artifacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS record_export_artifacts_delete ON public.record_export_artifacts;
CREATE POLICY record_export_artifacts_delete
  ON public.record_export_artifacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = record_export_artifacts.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- PART 2: Drop redundant customers_admins_select policy
-- =============================================================================
DROP POLICY IF EXISTS customers_admins_select ON public.customers;

COMMENT ON TABLE public.customers IS
  'Customer / account records, RLS-scoped to organization members. Read access is granted via customers_members_select (admins are a subset of members and inherit access through that policy). Mutation access is restricted to admins via customers_admins_insert and customers_admins_update.';

-- =============================================================================
-- PART 3: Missing FK covering indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_organization_google_export_destinations_configured_by
  ON public.organization_google_export_destinations (configured_by);

CREATE INDEX IF NOT EXISTS idx_record_export_artifacts_last_exported_by
  ON public.record_export_artifacts (last_exported_by);

-- =============================================================================
-- PART 4: Drop unused indexes (advisor unused_index, idx_scan = 0, > 30 days old)
-- =============================================================================
-- Sourced from the 20260401121000_fix_advisor_perf_bucket migration (22 indexes
-- added to clear unindexed_foreign_keys advisor findings on tables that did not
-- end up with the projected query patterns):
DROP INDEX IF EXISTS public.idx_dsr_request_events_actor_id;
DROP INDEX IF EXISTS public.idx_dsr_requests_completed_by;
DROP INDEX IF EXISTS public.idx_dsr_requests_user_id;
DROP INDEX IF EXISTS public.idx_dsr_requests_verified_by;
DROP INDEX IF EXISTS public.idx_google_workspace_oauth_sessions_organization_id;
DROP INDEX IF EXISTS public.idx_google_workspace_oauth_sessions_user_id;
DROP INDEX IF EXISTS public.idx_inventory_items_created_by;
DROP INDEX IF EXISTS public.idx_organization_member_claims_claimed_user_id;
DROP INDEX IF EXISTS public.idx_organization_member_claims_created_by;
DROP INDEX IF EXISTS public.idx_organization_role_grants_pending_applied_user_id;
DROP INDEX IF EXISTS public.idx_organization_role_grants_pending_created_by;
DROP INDEX IF EXISTS public.idx_part_alternate_groups_created_by;
DROP INDEX IF EXISTS public.idx_part_alternate_groups_verified_by;
DROP INDEX IF EXISTS public.idx_part_compatibility_rules_created_by;
DROP INDEX IF EXISTS public.idx_part_compatibility_rules_verified_by;
DROP INDEX IF EXISTS public.idx_part_identifiers_created_by;
DROP INDEX IF EXISTS public.idx_parts_managers_assigned_by;
DROP INDEX IF EXISTS public.idx_quickbooks_oauth_sessions_organization_id;
DROP INDEX IF EXISTS public.idx_quickbooks_oauth_sessions_user_id;
DROP INDEX IF EXISTS public.idx_teams_team_lead_id;
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_organization_id;
DROP INDEX IF EXISTS public.idx_workspace_domains_organization_id;

-- Sourced from various feature migrations all > 30 days old:
DROP INDEX IF EXISTS public.idx_dsr_request_events_request;            -- 20260329000004
DROP INDEX IF EXISTS public.idx_dsr_requests_organization_id;          -- 20260402000003
DROP INDEX IF EXISTS public.idx_inventory_items_organization_id;       -- 20251210163001
DROP INDEX IF EXISTS public.idx_inventory_transactions_item_id;        -- 20251210163001
DROP INDEX IF EXISTS public.idx_inventory_transactions_work_order_id;  -- 20251210163001
DROP INDEX IF EXISTS public.idx_equipment_part_compatibility_equipment_id; -- 20251210163001
DROP INDEX IF EXISTS public.idx_pm_template_compat_rules_template;     -- 20260111020000
DROP INDEX IF EXISTS public.idx_pm_template_compat_rules_org;          -- 20260111030000
DROP INDEX IF EXISTS public.idx_part_alternate_groups_org;             -- 20260112000001
DROP INDEX IF EXISTS public.idx_part_identifiers_org;                  -- 20260112000001
DROP INDEX IF EXISTS public.idx_part_alternate_group_members_identifier; -- 20260112000001
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_org;            -- 20251202000002
DROP INDEX IF EXISTS public.idx_quickbooks_export_logs_work_order;     -- 20251202000002
DROP INDEX IF EXISTS public.idx_equip_loc_history_changed_by;          -- 20260208225350
DROP INDEX IF EXISTS public.idx_work_order_equipment_eq;               -- 20251028015448
DROP INDEX IF EXISTS public.idx_work_order_costs_inventory_item_id;    -- 20260111000002
DROP INDEX IF EXISTS public.idx_inventory_item_images_item_id;         -- 20260210180000
DROP INDEX IF EXISTS public.idx_inventory_item_images_uploaded_by;     -- 20260210180000
DROP INDEX IF EXISTS public.idx_google_export_destinations_organization_id; -- 20260402120000

-- Sourced from the 20260114000000_baseline migration (and earlier remote_schema):
DROP INDEX IF EXISTS public.idx_customer_contacts_user_id;
DROP INDEX IF EXISTS public.idx_customer_sites_customer_id;
DROP INDEX IF EXISTS public.idx_equipment_customer_id;
DROP INDEX IF EXISTS public.idx_equipment_default_pm_template_id;
DROP INDEX IF EXISTS public.idx_equipment_notes_author_id;
DROP INDEX IF EXISTS public.idx_equipment_notes_last_modified_by;
DROP INDEX IF EXISTS public.idx_notes_author_id;
DROP INDEX IF EXISTS public.idx_notes_equipment_id;
DROP INDEX IF EXISTS public.idx_notification_settings_organization_id;
DROP INDEX IF EXISTS public.idx_notification_settings_team_id;
DROP INDEX IF EXISTS public.idx_pm_checklist_templates_created_by;
DROP INDEX IF EXISTS public.idx_pm_checklist_templates_updated_by;
DROP INDEX IF EXISTS public.idx_scans_scanned_by;
DROP INDEX IF EXISTS public.idx_work_order_images_note_id;
DROP INDEX IF EXISTS public.idx_work_order_notes_author_id;

-- Indexes intentionally KEPT (source migration deployed within the last 30 days,
-- need more usage data before deciding to drop):
--   idx_record_export_artifacts_org              (20260405000000, 28 days ago)
--   idx_customers_account_owner                  (20260406000001, 27 days ago)
--   idx_teams_customer_id                        (20260406000002, 27 days ago)

-- =============================================================================
-- PART 5: Unschedule duplicate quickbooks-token-refresh cron job
-- =============================================================================
-- Two cron jobs were inadvertently scheduled to invoke
-- public.invoke_quickbooks_token_refresh():
--   * quickbooks-token-refresh (every 10 min) - scheduled by
--     20251201000002_setup_quickbooks_token_refresh_cron.sql (older, no
--     cron.job_id SECURITY DEFINER guard, no URL-validation regex,
--     uses current_setting() instead of vault.decrypted_secrets)
--   * refresh-quickbooks-tokens (every 15 min) - scheduled by
--     20251221120000_schedule_quickbooks_refresh.sql (newer, with the
--     cron.job_id guard, URL regex, and vault-based credentials)
-- The newer job supersedes the older. Drop the older one. The function itself
-- (public.invoke_quickbooks_token_refresh) was overwritten by the newer
-- migration's CREATE OR REPLACE so no function-level cleanup is needed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'quickbooks-token-refresh') THEN
    PERFORM cron.unschedule('quickbooks-token-refresh');
  END IF;
END;
$$;

COMMIT;
