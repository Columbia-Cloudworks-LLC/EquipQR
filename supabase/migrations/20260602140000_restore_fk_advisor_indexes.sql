-- Migration: restore_fk_advisor_indexes
-- Purpose: Restore btree indexes on foreign-key columns flagged by Supabase
--          performance advisor lint unindexed_foreign_keys (Batch 1).
-- Context: Many of these indexes were added in 20260401121000_fix_advisor_perf_bucket
--          and later dropped in 20260503120000_clear_perf_advisors_and_dedup_cron for
--          zero idx_scan usage. Re-adding them clears advisor findings; write overhead
--          is acceptable on current table sizes.
-- Target: preview Supabase project (via preview branch deploy). Not production until
--         preview -> main release.
-- Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

BEGIN;

-- Customer / site
CREATE INDEX IF NOT EXISTS idx_customer_contacts_user_id
  ON public.customer_contacts USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_customer_sites_customer_id
  ON public.customer_sites USING btree (customer_id);

-- DSR / privacy
CREATE INDEX IF NOT EXISTS idx_dsr_request_events_actor_id
  ON public.dsr_request_events USING btree (actor_id);

CREATE INDEX IF NOT EXISTS idx_dsr_request_events_dsr_request_id
  ON public.dsr_request_events USING btree (dsr_request_id);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_completed_by
  ON public.dsr_requests USING btree (completed_by);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_organization_id
  ON public.dsr_requests USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_user_id
  ON public.dsr_requests USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_verified_by
  ON public.dsr_requests USING btree (verified_by);

-- Equipment and related history / notes
CREATE INDEX IF NOT EXISTS idx_equipment_customer_id
  ON public.equipment USING btree (customer_id);

CREATE INDEX IF NOT EXISTS idx_equipment_default_pm_template_id
  ON public.equipment USING btree (default_pm_template_id);

CREATE INDEX IF NOT EXISTS idx_equip_loc_history_changed_by
  ON public.equipment_location_history USING btree (changed_by);

CREATE INDEX IF NOT EXISTS idx_equipment_notes_author_id
  ON public.equipment_notes USING btree (author_id);

CREATE INDEX IF NOT EXISTS idx_equipment_notes_last_modified_by
  ON public.equipment_notes USING btree (last_modified_by);

CREATE INDEX IF NOT EXISTS idx_equipment_status_history_changed_by
  ON public.equipment_status_history USING btree (changed_by);

CREATE INDEX IF NOT EXISTS idx_notes_author_id
  ON public.notes USING btree (author_id);

CREATE INDEX IF NOT EXISTS idx_notes_equipment_id
  ON public.notes USING btree (equipment_id);

CREATE INDEX IF NOT EXISTS idx_scans_scanned_by
  ON public.scans USING btree (scanned_by);

-- Google Workspace / QuickBooks integration
CREATE INDEX IF NOT EXISTS idx_google_workspace_oauth_sessions_organization_id
  ON public.google_workspace_oauth_sessions USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_google_workspace_oauth_sessions_user_id
  ON public.google_workspace_oauth_sessions USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_organization_id
  ON public.quickbooks_export_logs USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_organization_id
  ON public.quickbooks_oauth_sessions USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_quickbooks_oauth_sessions_user_id
  ON public.quickbooks_oauth_sessions USING btree (user_id);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_item_images_inventory_item_id
  ON public.inventory_item_images USING btree (inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_item_images_uploaded_by
  ON public.inventory_item_images USING btree (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by
  ON public.inventory_items USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_item_id
  ON public.inventory_transactions USING btree (inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_work_order_id
  ON public.inventory_transactions USING btree (work_order_id);

-- Notification / org onboarding
CREATE INDEX IF NOT EXISTS idx_notification_settings_organization_id
  ON public.notification_settings USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_notification_settings_team_id
  ON public.notification_settings USING btree (team_id);

CREATE INDEX IF NOT EXISTS idx_organization_member_claims_claimed_user_id
  ON public.organization_member_claims USING btree (claimed_user_id);

CREATE INDEX IF NOT EXISTS idx_organization_member_claims_created_by
  ON public.organization_member_claims USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_organization_role_grants_pending_applied_user_id
  ON public.organization_role_grants_pending USING btree (applied_user_id);

CREATE INDEX IF NOT EXISTS idx_organization_role_grants_pending_created_by
  ON public.organization_role_grants_pending USING btree (created_by);

-- Parts / PM templates
CREATE INDEX IF NOT EXISTS idx_part_alternate_group_members_part_identifier_id
  ON public.part_alternate_group_members USING btree (part_identifier_id);

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

CREATE INDEX IF NOT EXISTS idx_pm_checklist_templates_created_by
  ON public.pm_checklist_templates USING btree (created_by);

CREATE INDEX IF NOT EXISTS idx_pm_checklist_templates_updated_by
  ON public.pm_checklist_templates USING btree (updated_by);

-- Teams / preferences / workspace
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id
  ON public.teams USING btree (team_lead_id);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_organization_id
  ON public.user_dashboard_preferences USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_workspace_domains_organization_id
  ON public.workspace_domains USING btree (organization_id);

-- Work orders
CREATE INDEX IF NOT EXISTS idx_work_order_costs_inventory_item_id
  ON public.work_order_costs USING btree (inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_work_order_equipment_equipment_id
  ON public.work_order_equipment USING btree (equipment_id);

CREATE INDEX IF NOT EXISTS idx_work_order_images_note_id
  ON public.work_order_images USING btree (note_id);

CREATE INDEX IF NOT EXISTS idx_work_order_notes_author_id
  ON public.work_order_notes USING btree (author_id);

COMMIT;
