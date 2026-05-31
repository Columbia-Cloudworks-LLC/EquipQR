-- Account deletion schema attribution: tombstones, denormalized names, safe FKs,
-- and prepare_account_deletion orchestration RPC.

BEGIN;

-- ============================================================================
-- 1. Profile tombstone columns
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

COMMENT ON COLUMN public.profiles.deleted_at IS
  'Set when account deletion prep runs; profile row may remain until Auth user deletion.';
COMMENT ON COLUMN public.profiles.deleted_reason IS
  'Operational reason for account deletion (self_service, dsr_admin, etc.).';

-- ============================================================================
-- 2. Missing denormalized attribution columns
-- ============================================================================

ALTER TABLE public.pm_status_history
  ADD COLUMN IF NOT EXISTS changed_by_name text;

ALTER TABLE public.equipment_status_history
  ADD COLUMN IF NOT EXISTS changed_by_name text;

ALTER TABLE public.equipment_location_history
  ADD COLUMN IF NOT EXISTS changed_by_name text;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.part_alternate_groups
  ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.part_identifiers
  ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.part_alternate_groups
  ADD COLUMN IF NOT EXISTS verified_by_name text;

-- Legal evidence retention on terms acceptances
ALTER TABLE public.terms_acceptances
  ADD COLUMN IF NOT EXISTS accepted_by_email text;

UPDATE public.terms_acceptances ta
SET accepted_by_email = u.email
FROM auth.users u
WHERE ta.user_id = u.id
  AND ta.accepted_by_email IS NULL;

-- ============================================================================
-- 3. Nullable attribution FKs for org-owned records
-- ============================================================================

ALTER TABLE public.equipment_notes
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.work_order_notes
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.inventory_item_images
  ALTER COLUMN uploaded_by DROP NOT NULL;

ALTER TABLE public.inventory_items
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.inventory_transactions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.part_alternate_groups
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.part_identifiers
  ALTER COLUMN created_by DROP NOT NULL;

-- Helper: swap FK delete behavior when constraint exists
DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_created_by_fkey') THEN
    ALTER TABLE public.inventory_items DROP CONSTRAINT inventory_items_created_by_fkey;
    ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_transactions_user_id_fkey') THEN
    ALTER TABLE public.inventory_transactions DROP CONSTRAINT inventory_transactions_user_id_fkey;
    ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'part_alternate_groups_created_by_fkey') THEN
    ALTER TABLE public.part_alternate_groups DROP CONSTRAINT part_alternate_groups_created_by_fkey;
    ALTER TABLE public.part_alternate_groups ADD CONSTRAINT part_alternate_groups_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'part_identifiers_created_by_fkey') THEN
    ALTER TABLE public.part_identifiers DROP CONSTRAINT part_identifiers_created_by_fkey;
    ALTER TABLE public.part_identifiers ADD CONSTRAINT part_identifiers_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_note_images_uploaded_by_fkey') THEN
    ALTER TABLE public.equipment_note_images DROP CONSTRAINT equipment_note_images_uploaded_by_fkey;
    ALTER TABLE public.equipment_note_images ADD CONSTRAINT equipment_note_images_uploaded_by_fkey
      FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_notes_author_id_fkey') THEN
    ALTER TABLE public.equipment_notes DROP CONSTRAINT equipment_notes_author_id_fkey;
    ALTER TABLE public.equipment_notes ADD CONSTRAINT equipment_notes_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_work_order_notes_author') THEN
    ALTER TABLE public.work_order_notes DROP CONSTRAINT fk_work_order_notes_author;
    ALTER TABLE public.work_order_notes ADD CONSTRAINT fk_work_order_notes_author
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_images_uploaded_by_fkey') THEN
    ALTER TABLE public.inventory_item_images DROP CONSTRAINT inventory_item_images_uploaded_by_fkey;
    ALTER TABLE public.inventory_item_images ADD CONSTRAINT inventory_item_images_uploaded_by_fkey
      FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_location_history_changed_by_fkey') THEN
    ALTER TABLE public.equipment_location_history DROP CONSTRAINT equipment_location_history_changed_by_fkey;
  END IF;
  ALTER TABLE public.equipment_location_history
    ADD CONSTRAINT equipment_location_history_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_order_costs_created_by_fkey') THEN
    ALTER TABLE public.work_order_costs DROP CONSTRAINT work_order_costs_created_by_fkey;
  END IF;
  ALTER TABLE public.work_order_costs
    ADD CONSTRAINT work_order_costs_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_created_by_admin_fkey') THEN
    ALTER TABLE public.work_orders DROP CONSTRAINT work_orders_created_by_admin_fkey;
  END IF;
  ALTER TABLE public.work_orders
    ADD CONSTRAINT work_orders_created_by_admin_fkey
    FOREIGN KEY (created_by_admin) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_created_by_fkey') THEN
    ALTER TABLE public.work_orders DROP CONSTRAINT work_orders_created_by_fkey;
  END IF;
  ALTER TABLE public.work_orders
    ADD CONSTRAINT work_orders_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_assignee_id_fkey') THEN
    ALTER TABLE public.work_orders DROP CONSTRAINT work_orders_assignee_id_fkey;
  END IF;
  ALTER TABLE public.work_orders
    ADD CONSTRAINT work_orders_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pm_status_history_changed_by_fkey') THEN
    ALTER TABLE public.pm_status_history DROP CONSTRAINT pm_status_history_changed_by_fkey;
  END IF;
  ALTER TABLE public.pm_status_history
    ADD CONSTRAINT pm_status_history_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_status_history_changed_by_fkey') THEN
    ALTER TABLE public.equipment_status_history DROP CONSTRAINT equipment_status_history_changed_by_fkey;
  END IF;
  ALTER TABLE public.equipment_status_history
    ADD CONSTRAINT equipment_status_history_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

ALTER TABLE public.terms_acceptances
  ALTER COLUMN user_id DROP NOT NULL;

DO $guard$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'terms_acceptances_user_id_fkey') THEN
    ALTER TABLE public.terms_acceptances DROP CONSTRAINT terms_acceptances_user_id_fkey;
  END IF;
  ALTER TABLE public.terms_acceptances
    ADD CONSTRAINT terms_acceptances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;

-- ============================================================================
-- 4. Extended attribution preservation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.snapshot_account_deletion_attribution(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_name text;
BEGIN
  SELECT name INTO v_user_name FROM public.profiles WHERE id = p_user_id;
  IF v_user_name IS NULL THEN
    v_user_name := 'Unknown User';
  END IF;

  PERFORM public.preserve_user_attribution(p_user_id);

  UPDATE public.work_order_status_history
  SET changed_by_name = v_user_name
  WHERE changed_by = p_user_id AND changed_by_name IS NULL;

  UPDATE public.work_order_costs
  SET created_by_name = v_user_name
  WHERE created_by = p_user_id AND created_by_name IS NULL;

  UPDATE public.preventative_maintenance
  SET created_by_name = v_user_name
  WHERE created_by = p_user_id AND created_by_name IS NULL;

  UPDATE public.preventative_maintenance
  SET completed_by_name = v_user_name
  WHERE completed_by = p_user_id AND completed_by_name IS NULL;

  UPDATE public.inventory_transactions
  SET user_name = v_user_name
  WHERE user_id = p_user_id AND user_name IS NULL;

  UPDATE public.inventory_item_images
  SET uploaded_by_name = v_user_name
  WHERE uploaded_by = p_user_id AND uploaded_by_name IS NULL;

  UPDATE public.pm_status_history
  SET changed_by_name = v_user_name
  WHERE changed_by = p_user_id AND changed_by_name IS NULL;

  UPDATE public.equipment_status_history
  SET changed_by_name = v_user_name
  WHERE changed_by = p_user_id AND changed_by_name IS NULL;

  UPDATE public.equipment_location_history
  SET changed_by_name = v_user_name
  WHERE changed_by = p_user_id AND changed_by_name IS NULL;

  UPDATE public.equipment_working_hours_history
  SET updated_by_name = v_user_name
  WHERE updated_by = p_user_id AND updated_by_name IS NULL;

  UPDATE public.inventory_items
  SET created_by_name = v_user_name
  WHERE created_by = p_user_id AND created_by_name IS NULL;

  UPDATE public.part_alternate_groups
  SET created_by_name = v_user_name
  WHERE created_by = p_user_id AND created_by_name IS NULL;

  UPDATE public.part_identifiers
  SET created_by_name = v_user_name
  WHERE created_by = p_user_id AND created_by_name IS NULL;

  UPDATE public.audit_log
  SET actor_name = coalesce(actor_name, v_user_name)
  WHERE actor_id = p_user_id;

  UPDATE public.dsr_request_events
  SET actor_email = NULL
  WHERE actor_id = p_user_id;
END;
$$;

-- ============================================================================
-- 5. prepare_account_deletion — idempotent SQL prep
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(
  p_user_id uuid,
  p_dsr_request_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile record;
  v_user_email text;
  v_actor_email text;
  v_display_name text;
  v_personal_org_id uuid;
  v_domain_counts jsonb := '{}'::jsonb;
  v_storage_work_items jsonb := '[]'::jsonb;
  v_rows integer;
  v_already_prepared boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id AND p_actor_id IS DISTINCT FROM auth.uid() THEN
    IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  SELECT id, name, email, avatar_url, deleted_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', p_user_id;
  END IF;

  v_already_prepared := v_profile.deleted_at IS NOT NULL;
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  v_display_name := coalesce(nullif(trim(v_profile.name), ''), 'Unknown User');

  IF p_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email FROM auth.users WHERE id = p_actor_id;
  END IF;

  PERFORM public.snapshot_account_deletion_attribution(p_user_id);

  -- Redact audit actor email while preserving actor_name snapshots
  UPDATE public.audit_log
  SET actor_email = NULL
  WHERE actor_id = p_user_id;

  -- Clear personal/session rows
  DELETE FROM public.notification_preferences WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('notification_preferences_deleted', v_rows);

  DELETE FROM public.notification_settings WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('notification_settings_deleted', v_rows);

  DELETE FROM public.notifications WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('notifications_deleted', v_rows);

  DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('push_subscriptions_deleted', v_rows);

  DELETE FROM public.quickbooks_oauth_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('quickbooks_oauth_sessions_deleted', v_rows);

  DELETE FROM public.google_workspace_oauth_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('google_workspace_oauth_sessions_deleted', v_rows);

  DELETE FROM public.user_dashboard_preferences WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('user_dashboard_preferences_deleted', v_rows);

  DELETE FROM public.organization_invitations
  WHERE lower(email) = lower(coalesce(v_user_email, v_profile.email, ''));
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('organization_invitations_deleted', v_rows);

  DELETE FROM public.scans WHERE scanned_by = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('scans_deleted', v_rows);

  DELETE FROM public.export_request_log WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_domain_counts := v_domain_counts || jsonb_build_object('export_request_log_deleted', v_rows);

  UPDATE public.terms_acceptances
  SET accepted_by_email = coalesce(accepted_by_email, v_user_email, v_profile.email)
  WHERE user_id = p_user_id;

  -- Null profile-scoped attribution FKs after snapshots
  UPDATE public.equipment_notes SET author_id = NULL WHERE author_id = p_user_id;
  UPDATE public.work_order_notes SET author_id = NULL WHERE author_id = p_user_id;
  UPDATE public.work_orders SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.work_orders SET assignee_id = NULL WHERE assignee_id = p_user_id;
  UPDATE public.work_orders SET created_by_admin = NULL WHERE created_by_admin = p_user_id;
  UPDATE public.equipment_note_images SET uploaded_by = NULL WHERE uploaded_by = p_user_id;
  UPDATE public.inventory_item_images SET uploaded_by = NULL WHERE uploaded_by = p_user_id;
  UPDATE public.inventory_items SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.inventory_transactions SET user_id = NULL WHERE user_id = p_user_id;
  UPDATE public.part_alternate_groups SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.part_identifiers SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.pm_status_history SET changed_by = NULL WHERE changed_by = p_user_id;
  UPDATE public.equipment_status_history SET changed_by = NULL WHERE changed_by = p_user_id;
  UPDATE public.equipment_location_history SET changed_by = NULL WHERE changed_by = p_user_id;

  -- Tombstone / redact profile PII while keeping display name for org evidence
  UPDATE public.profiles
  SET
    email = NULL,
    avatar_url = NULL,
    email_private = true,
    limit_sensitive_pi = true,
    deleted_at = coalesce(deleted_at, now()),
    deleted_reason = coalesce(deleted_reason, CASE WHEN p_dsr_request_id IS NULL THEN 'self_service' ELSE 'dsr_fulfillment' END),
    updated_at = now()
  WHERE id = p_user_id;

  SELECT po.organization_id INTO v_personal_org_id
  FROM public.personal_organizations po
  WHERE po.user_id = p_user_id;

  v_storage_work_items := jsonb_build_array(
    jsonb_build_object(
      'bucket', 'user-avatars',
      'action', 'delete',
      'path_prefix', p_user_id::text,
      'reason', 'personal_avatar'
    )
  );

  IF v_personal_org_id IS NOT NULL THEN
    v_storage_work_items := v_storage_work_items || jsonb_build_array(
      jsonb_build_object(
        'bucket', 'organization-logos',
        'action', 'delete_personal_org_assets',
        'organization_id', v_personal_org_id,
        'reason', 'personal_organization_cleanup'
      )
    );
  END IF;

  v_storage_work_items := v_storage_work_items || jsonb_build_array(
    jsonb_build_object(
      'bucket', 'work-order-images',
      'action', 'reassign_owner',
      'path_prefix', p_user_id::text,
      'reason', 'preserve_org_work_order_evidence'
    ),
    jsonb_build_object(
      'bucket', 'equipment-note-images',
      'action', 'reassign_owner',
      'path_prefix', p_user_id::text,
      'reason', 'preserve_org_equipment_note_evidence'
    )
  );

  IF p_dsr_request_id IS NOT NULL THEN
    INSERT INTO public.dsr_request_events (
      dsr_request_id, event_type, actor_id, actor_email, summary, details
    ) VALUES (
      p_dsr_request_id,
      'fulfillment_step_completed',
      coalesce(p_actor_id, p_user_id),
      v_actor_email,
      'Account deletion SQL preparation completed',
      jsonb_build_object(
        'domain', 'account_deletion_prep',
        'already_prepared', v_already_prepared,
        'domain_counts', v_domain_counts,
        'storage_work_items', v_storage_work_items,
        'display_name_preserved', v_display_name
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_prepared', v_already_prepared,
    'display_name_preserved', v_display_name,
    'domain_counts', v_domain_counts,
    'storage_work_items', v_storage_work_items,
    'personal_organization_id', v_personal_org_id
  );
END;
$$;

COMMENT ON FUNCTION public.prepare_account_deletion(uuid, uuid, uuid) IS
  'Idempotent SQL preparation for account deletion: snapshot org-context names, '
  'redact personal profile/auth-adjacent data, delete personal rows, and emit storage work items.';

REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid, uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.snapshot_account_deletion_attribution(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.snapshot_account_deletion_attribution(uuid) TO service_role;

-- ============================================================================
-- 6. Refresh preview_account_deletion for new attribution columns / FK posture
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_account_deletion(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid;
  v_profile record;
  v_user_email text;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_personal_data jsonb := '{}'::jsonb;
  v_organization_data jsonb := '{}'::jsonb;
  v_storage_actions jsonb := '[]'::jsonb;
  v_auth_fk_blockers jsonb := '[]'::jsonb;
  v_eligible boolean := true;
  v_personal_org_id uuid;
  v_missing_attribution integer := 0;
  v_row record;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NOT NULL AND v_caller IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Access denied: preview_account_deletion is self-service only';
  END IF;

  SELECT id, name, email, avatar_url, deleted_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', p_user_id;
  END IF;

  IF v_profile.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible_for_self_service', false,
      'blockers', jsonb_build_array(jsonb_build_object(
        'code', 'manual_review_required',
        'message', 'This account has already been marked for deletion.',
        'details', jsonb_build_object('deleted_at', v_profile.deleted_at)
      )),
      'personal_data', '{}'::jsonb,
      'organization_data', '{}'::jsonb,
      'storage_actions', '[]'::jsonb,
      'auth_fk_blockers', '[]'::jsonb,
      'warnings', '[]'::jsonb
    );
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

  SELECT po.organization_id
  INTO v_personal_org_id
  FROM public.personal_organizations po
  WHERE po.user_id = p_user_id;

  v_personal_data := jsonb_build_object(
    'profile', jsonb_build_object('has_avatar', v_profile.avatar_url IS NOT NULL),
    'notification_preferences', (SELECT count(*)::int FROM public.notification_preferences np WHERE np.user_id = p_user_id),
    'notification_settings', (SELECT count(*)::int FROM public.notification_settings ns WHERE ns.user_id = p_user_id),
    'notifications', (SELECT count(*)::int FROM public.notifications n WHERE n.user_id = p_user_id),
    'push_subscriptions', (SELECT count(*)::int FROM public.push_subscriptions ps WHERE ps.user_id = p_user_id),
    'quickbooks_oauth_sessions', (SELECT count(*)::int FROM public.quickbooks_oauth_sessions q WHERE q.user_id = p_user_id),
    'google_workspace_oauth_sessions', (SELECT count(*)::int FROM public.google_workspace_oauth_sessions g WHERE g.user_id = p_user_id),
    'user_dashboard_preferences', (SELECT count(*)::int FROM public.user_dashboard_preferences udp WHERE udp.user_id = p_user_id),
    'export_request_log', (SELECT count(*)::int FROM public.export_request_log erl WHERE erl.user_id = p_user_id),
    'tickets', (SELECT count(*)::int FROM public.tickets t WHERE t.user_id = p_user_id),
    'personal_organization_id', v_personal_org_id
  );

  v_organization_data := jsonb_build_object(
    'owned_non_personal_orgs', (
      SELECT count(*)::int
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id
      LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
      WHERE om.user_id = p_user_id AND om.role = 'owner' AND om.status = 'active' AND po.organization_id IS NULL
    ),
    'active_memberships', (SELECT count(*)::int FROM public.organization_members om WHERE om.user_id = p_user_id AND om.status = 'active'),
    'work_orders_created', (SELECT count(*)::int FROM public.work_orders wo WHERE wo.created_by = p_user_id),
    'work_order_notes_authored', (SELECT count(*)::int FROM public.work_order_notes wn WHERE wn.author_id = p_user_id),
    'work_order_images_uploaded', (SELECT count(*)::int FROM public.work_order_images wi WHERE wi.uploaded_by = p_user_id),
    'equipment_notes_authored', (SELECT count(*)::int FROM public.equipment_notes en WHERE en.author_id = p_user_id),
    'equipment_note_images_uploaded', (SELECT count(*)::int FROM public.equipment_note_images eni WHERE eni.uploaded_by = p_user_id),
    'inventory_items_created', (SELECT count(*)::int FROM public.inventory_items ii WHERE ii.created_by = p_user_id),
    'inventory_transactions', (SELECT count(*)::int FROM public.inventory_transactions it WHERE it.user_id = p_user_id),
    'audit_log_actor_rows', (SELECT count(*)::int FROM public.audit_log al WHERE al.actor_id = p_user_id),
    'dsr_requests', (
      SELECT count(*)::int FROM public.dsr_requests dr
      WHERE dr.user_id = p_user_id OR lower(dr.requester_email) = lower(coalesce(v_user_email, v_profile.email, ''))
    )
  );

  FOR v_row IN
    SELECT o.id AS organization_id, o.name AS organization_name,
      (SELECT count(*)::int FROM public.organization_members om2
        WHERE om2.organization_id = o.id AND om2.user_id <> p_user_id AND om2.status = 'active') AS other_active_members
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
    WHERE om.user_id = p_user_id AND om.role = 'owner' AND om.status = 'active' AND po.organization_id IS NULL
      AND (
        EXISTS (SELECT 1 FROM public.organization_members om2 WHERE om2.organization_id = o.id AND om2.user_id <> p_user_id AND om2.status = 'active')
        OR EXISTS (SELECT 1 FROM public.equipment e WHERE e.organization_id = o.id)
        OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.organization_id = o.id)
        OR EXISTS (SELECT 1 FROM public.inventory_items ii WHERE ii.organization_id = o.id)
      )
  LOOP
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'sole_owner_of_shared_org',
      'message', 'Transfer organization ownership or delete the organization before deleting your account.',
      'details', jsonb_build_object(
        'organization_id', v_row.organization_id,
        'organization_name', v_row.organization_name,
        'other_active_members', v_row.other_active_members
      )
    ));
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.ownership_transfer_requests otr
    WHERE otr.status = 'pending' AND (otr.from_user_id = p_user_id OR otr.to_user_id = p_user_id)
  ) THEN
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'pending_ownership_transfer',
      'message', 'Resolve pending organization ownership transfers before deleting your account.',
      'details', jsonb_build_object('pending_count', (
        SELECT count(*)::int FROM public.ownership_transfer_requests otr
        WHERE otr.status = 'pending' AND (otr.from_user_id = p_user_id OR otr.to_user_id = p_user_id)
      ))
    ));
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_personal_org_merge_requests wpm
    WHERE wpm.status = 'pending'
      AND (wpm.requested_by_user_id = p_user_id OR wpm.requested_for_user_id = p_user_id)
  ) THEN
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'pending_workspace_merge',
      'message', 'Complete or cancel pending workspace merge requests before deleting your account.',
      'details', jsonb_build_object('pending_count', (
        SELECT count(*)::int FROM public.workspace_personal_org_merge_requests wpm
        WHERE wpm.status = 'pending'
          AND (wpm.requested_by_user_id = p_user_id OR wpm.requested_for_user_id = p_user_id)
      ))
    ));
  END IF;

  -- Blocker: missing attribution columns (schema gap only) -------------------
  SELECT count(*)::int
  INTO v_missing_attribution
  FROM (
    VALUES
      ('work_orders', 'created_by_name'),
      ('work_orders', 'assignee_name'),
      ('work_order_notes', 'author_name'),
      ('work_order_images', 'uploaded_by_name'),
      ('equipment_notes', 'author_name'),
      ('equipment_note_images', 'uploaded_by_name'),
      ('pm_status_history', 'changed_by_name'),
      ('equipment_status_history', 'changed_by_name'),
      ('equipment_location_history', 'changed_by_name'),
      ('inventory_items', 'created_by_name')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = required.table_name
      AND c.column_name = required.column_name
  );

  IF v_missing_attribution > 0 THEN
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'missing_attribution_snapshot',
      'message', 'Required attribution snapshot columns are missing from the database schema.',
      'details', jsonb_build_object('missing_columns', v_missing_attribution)
    ));
  END IF;

  v_storage_actions := jsonb_build_array(
    jsonb_build_object('bucket', 'user-avatars', 'action', 'delete', 'count', CASE WHEN v_profile.avatar_url IS NOT NULL THEN 1 ELSE 0 END, 'reason', 'personal_avatar'),
    jsonb_build_object('bucket', 'work-order-images', 'action', 'preserve_or_reassign_owner', 'count', (SELECT count(*)::int FROM public.work_order_images wi WHERE wi.uploaded_by = p_user_id), 'reason', 'organization_work_order_evidence'),
    jsonb_build_object('bucket', 'equipment-note-images', 'action', 'preserve_or_reassign_owner', 'count', (SELECT count(*)::int FROM public.equipment_note_images eni WHERE eni.uploaded_by = p_user_id), 'reason', 'organization_equipment_note_evidence'),
    jsonb_build_object('bucket', 'inventory-item-images', 'action', 'preserve', 'count', (SELECT count(*)::int FROM public.inventory_item_images iii WHERE iii.uploaded_by = p_user_id), 'reason', 'organization_inventory_evidence')
  );

  RETURN jsonb_build_object(
    'eligible_for_self_service', v_eligible,
    'blockers', v_blockers,
    'personal_data', v_personal_data,
    'organization_data', v_organization_data,
    'storage_actions', v_storage_actions,
    'auth_fk_blockers', v_auth_fk_blockers,
    'warnings', v_warnings,
    'requester_email', coalesce(v_user_email, v_profile.email),
    'requester_name', v_profile.name
  );
END;
$$;

COMMIT;
