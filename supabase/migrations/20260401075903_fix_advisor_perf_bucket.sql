BEGIN;

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

DROP INDEX IF EXISTS public.idx_billing_events_organization_id;
DROP INDEX IF EXISTS public.idx_billing_events_user_id;
DROP INDEX IF EXISTS public.idx_billing_exemptions_granted_by;
DROP INDEX IF EXISTS public.idx_billing_usage_organization_id;
DROP INDEX IF EXISTS public.idx_organization_subscriptions_organization_id;
DROP INDEX IF EXISTS public.idx_slot_purchases_organization_id;
DROP INDEX IF EXISTS public.idx_slot_purchases_purchased_by;
DROP INDEX IF EXISTS public.idx_user_license_subscriptions_organization_id;
DROP INDEX IF EXISTS public.idx_organization_slots_organization_id;
DROP INDEX IF EXISTS public.idx_organization_invitations_slot_purchase_id;
DROP INDEX IF EXISTS public.idx_organization_members_slot_purchase_id;
DROP INDEX IF EXISTS public.idx_subscribers_user_id;
DROP INDEX IF EXISTS public.ix_listing_distributor;
DROP INDEX IF EXISTS public.ix_listing_part;
DROP INDEX IF EXISTS public.ix_part_identifier_normalized;
DROP INDEX IF EXISTS public.ix_part_identifier_part;

COMMIT;
