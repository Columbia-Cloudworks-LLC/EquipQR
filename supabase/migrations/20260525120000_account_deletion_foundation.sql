-- Account deletion foundation: blocker taxonomy and read-only preview RPC.
-- Pass 1 of hybrid self-service account deletion.

BEGIN;

-- ============================================================================
-- Blocker codes (text convention for JSON payloads)
-- ============================================================================

COMMENT ON SCHEMA public IS
  'Account deletion blocker codes: sole_owner_of_shared_org, pending_ownership_transfer, '
  'missing_attribution_snapshot, auth_fk_blocker, unclassified_storage, '
  'pending_workspace_merge, manual_review_required';

-- ============================================================================
-- preview_account_deletion — read-only dry run
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

  -- Personal data counts -----------------------------------------------------
  v_personal_data := jsonb_build_object(
    'profile', jsonb_build_object('has_avatar', v_profile.avatar_url IS NOT NULL),
    'notification_preferences', (
      SELECT count(*)::int FROM public.notification_preferences np WHERE np.user_id = p_user_id
    ),
    'notification_settings', (
      SELECT count(*)::int FROM public.notification_settings ns WHERE ns.user_id = p_user_id
    ),
    'notifications', (
      SELECT count(*)::int FROM public.notifications n WHERE n.user_id = p_user_id
    ),
    'push_subscriptions', (
      SELECT count(*)::int FROM public.push_subscriptions ps WHERE ps.user_id = p_user_id
    ),
    'quickbooks_oauth_sessions', (
      SELECT count(*)::int FROM public.quickbooks_oauth_sessions q WHERE q.user_id = p_user_id
    ),
    'google_workspace_oauth_sessions', (
      SELECT count(*)::int FROM public.google_workspace_oauth_sessions g WHERE g.user_id = p_user_id
    ),
    'user_dashboard_preferences', (
      SELECT count(*)::int FROM public.user_dashboard_preferences udp WHERE udp.user_id = p_user_id
    ),
    'export_request_log', (
      SELECT count(*)::int FROM public.export_request_log erl WHERE erl.user_id = p_user_id
    ),
    'tickets', (
      SELECT count(*)::int FROM public.tickets t WHERE t.user_id = p_user_id
    ),
    'personal_organization_id', v_personal_org_id
  );

  -- Organization evidence counts ---------------------------------------------
  v_organization_data := jsonb_build_object(
    'owned_non_personal_orgs', (
      SELECT count(*)::int
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id
      LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
      WHERE om.user_id = p_user_id
        AND om.role = 'owner'
        AND om.status = 'active'
        AND po.organization_id IS NULL
    ),
    'active_memberships', (
      SELECT count(*)::int
      FROM public.organization_members om
      WHERE om.user_id = p_user_id
        AND om.status = 'active'
    ),
    'work_orders_created', (
      SELECT count(*)::int FROM public.work_orders wo WHERE wo.created_by = p_user_id
    ),
    'work_order_notes_authored', (
      SELECT count(*)::int FROM public.work_order_notes wn WHERE wn.author_id = p_user_id
    ),
    'work_order_images_uploaded', (
      SELECT count(*)::int FROM public.work_order_images wi WHERE wi.uploaded_by = p_user_id
    ),
    'equipment_notes_authored', (
      SELECT count(*)::int FROM public.equipment_notes en WHERE en.author_id = p_user_id
    ),
    'equipment_note_images_uploaded', (
      SELECT count(*)::int FROM public.equipment_note_images eni WHERE eni.uploaded_by = p_user_id
    ),
    'inventory_items_created', (
      SELECT count(*)::int FROM public.inventory_items ii WHERE ii.created_by = p_user_id
    ),
    'inventory_transactions', (
      SELECT count(*)::int FROM public.inventory_transactions it WHERE it.user_id = p_user_id
    ),
    'audit_log_actor_rows', (
      SELECT count(*)::int FROM public.audit_log al WHERE al.actor_id = p_user_id
    ),
    'dsr_requests', (
      SELECT count(*)::int FROM public.dsr_requests dr
      WHERE dr.user_id = p_user_id OR lower(dr.requester_email) = lower(coalesce(v_user_email, v_profile.email, ''))
    )
  );

  -- Blocker: sole owner of shared non-personal org ---------------------------
  FOR v_row IN
    SELECT o.id AS organization_id, o.name AS organization_name,
      (
        SELECT count(*)::int
        FROM public.organization_members om2
        WHERE om2.organization_id = o.id
          AND om2.user_id <> p_user_id
          AND om2.status = 'active'
      ) AS other_active_members,
      (
        SELECT count(*)::int FROM public.equipment e WHERE e.organization_id = o.id
      ) AS equipment_count,
      (
        SELECT count(*)::int FROM public.work_orders wo WHERE wo.organization_id = o.id
      ) AS work_order_count
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
    WHERE om.user_id = p_user_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND po.organization_id IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.organization_members om2
          WHERE om2.organization_id = o.id
            AND om2.user_id <> p_user_id
            AND om2.status = 'active'
        )
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
        'other_active_members', v_row.other_active_members,
        'equipment_count', v_row.equipment_count,
        'work_order_count', v_row.work_order_count
      )
    ));
  END LOOP;

  -- Blocker: pending ownership transfer --------------------------------------
  IF EXISTS (
    SELECT 1 FROM public.ownership_transfer_requests otr
    WHERE otr.status = 'pending'
      AND (otr.from_user_id = p_user_id OR otr.to_user_id = p_user_id)
  ) THEN
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'pending_ownership_transfer',
      'message', 'Resolve pending organization ownership transfers before deleting your account.',
      'details', jsonb_build_object(
        'pending_count', (
          SELECT count(*)::int FROM public.ownership_transfer_requests otr
          WHERE otr.status = 'pending'
            AND (otr.from_user_id = p_user_id OR otr.to_user_id = p_user_id)
        )
      )
    ));
  END IF;

  -- Blocker: pending workspace personal-org merge ----------------------------
  IF EXISTS (
    SELECT 1 FROM public.workspace_personal_org_merge_requests wpm
    WHERE wpm.status = 'pending'
      AND (wpm.requested_by_user_id = p_user_id OR wpm.requested_for_user_id = p_user_id)
  ) THEN
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'pending_workspace_merge',
      'message', 'Complete or cancel pending workspace merge requests before deleting your account.',
      'details', jsonb_build_object(
        'pending_count', (
          SELECT count(*)::int FROM public.workspace_personal_org_merge_requests wpm
          WHERE wpm.status = 'pending'
            AND (wpm.requested_by_user_id = p_user_id OR wpm.requested_for_user_id = p_user_id)
        )
      )
    ));
  END IF;

  -- Blocker: missing attribution snapshots -----------------------------------
  SELECT (
    (SELECT count(*)::int FROM public.work_orders wo
      WHERE wo.created_by = p_user_id AND wo.created_by_name IS NULL)
    + (SELECT count(*)::int FROM public.work_orders wo
      WHERE wo.assignee_id = p_user_id AND wo.assignee_name IS NULL)
    + (SELECT count(*)::int FROM public.work_order_notes wn
      WHERE wn.author_id = p_user_id AND wn.author_name IS NULL)
    + (SELECT count(*)::int FROM public.work_order_images wi
      WHERE wi.uploaded_by = p_user_id AND wi.uploaded_by_name IS NULL)
    + (SELECT count(*)::int FROM public.equipment_notes en
      WHERE en.author_id = p_user_id AND en.author_name IS NULL)
    + (SELECT count(*)::int FROM public.equipment_note_images eni
      WHERE eni.uploaded_by = p_user_id AND eni.uploaded_by_name IS NULL)
    + (SELECT count(*)::int FROM public.work_order_status_history wosh
      WHERE wosh.changed_by = p_user_id AND wosh.changed_by_name IS NULL)
    + (SELECT count(*)::int FROM public.work_order_costs woc
      WHERE woc.created_by = p_user_id AND woc.created_by_name IS NULL)
    + (SELECT count(*)::int FROM public.preventative_maintenance pm
      WHERE pm.created_by = p_user_id AND pm.created_by_name IS NULL)
    + (SELECT count(*)::int FROM public.preventative_maintenance pm
      WHERE pm.completed_by = p_user_id AND pm.completed_by_name IS NULL)
    + (SELECT count(*)::int FROM public.inventory_transactions it
      WHERE it.user_id = p_user_id AND it.user_name IS NULL)
    + (SELECT count(*)::int FROM public.inventory_item_images iii
      WHERE iii.uploaded_by = p_user_id AND iii.uploaded_by_name IS NULL)
    + (SELECT count(*)::int FROM public.equipment_working_hours_history ewh
      WHERE ewh.updated_by = p_user_id AND ewh.updated_by_name IS NULL)
  ) INTO v_missing_attribution;

  IF v_missing_attribution > 0 THEN
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'missing_attribution_snapshot',
      'message', 'Organization history records are missing display-name snapshots required for safe deletion.',
      'details', jsonb_build_object('rows_missing_names', v_missing_attribution)
    ));
  END IF;

  -- Auth FK blockers (RESTRICT / NO ACTION on org-owned rows) ----------------
  IF EXISTS (SELECT 1 FROM public.inventory_items ii WHERE ii.created_by = p_user_id) THEN
    v_auth_fk_blockers := v_auth_fk_blockers || jsonb_build_array(jsonb_build_object(
      'table', 'inventory_items', 'column', 'created_by', 'on_delete', 'RESTRICT',
      'row_count', (SELECT count(*)::int FROM public.inventory_items ii WHERE ii.created_by = p_user_id)
    ));
  END IF;

  IF EXISTS (SELECT 1 FROM public.inventory_transactions it WHERE it.user_id = p_user_id) THEN
    v_auth_fk_blockers := v_auth_fk_blockers || jsonb_build_array(jsonb_build_object(
      'table', 'inventory_transactions', 'column', 'user_id', 'on_delete', 'RESTRICT',
      'row_count', (SELECT count(*)::int FROM public.inventory_transactions it WHERE it.user_id = p_user_id)
    ));
  END IF;

  IF EXISTS (SELECT 1 FROM public.part_alternate_groups pag WHERE pag.created_by = p_user_id) THEN
    v_auth_fk_blockers := v_auth_fk_blockers || jsonb_build_array(jsonb_build_object(
      'table', 'part_alternate_groups', 'column', 'created_by', 'on_delete', 'RESTRICT',
      'row_count', (SELECT count(*)::int FROM public.part_alternate_groups pag WHERE pag.created_by = p_user_id)
    ));
  END IF;

  IF EXISTS (SELECT 1 FROM public.part_identifiers pi WHERE pi.created_by = p_user_id) THEN
    v_auth_fk_blockers := v_auth_fk_blockers || jsonb_build_array(jsonb_build_object(
      'table', 'part_identifiers', 'column', 'created_by', 'on_delete', 'RESTRICT',
      'row_count', (SELECT count(*)::int FROM public.part_identifiers pi WHERE pi.created_by = p_user_id)
    ));
  END IF;

  IF jsonb_array_length(v_auth_fk_blockers) > 0 THEN
    v_eligible := false;
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'auth_fk_blocker',
      'message', 'Organization inventory records still reference your account and must be reassigned before Auth deletion.',
      'details', jsonb_build_object('fk_blockers', v_auth_fk_blockers)
    ));
  END IF;

  -- Storage work items (DB-driven classification) ----------------------------
  v_storage_actions := v_storage_actions || jsonb_build_array(jsonb_build_object(
    'bucket', 'user-avatars',
    'action', 'delete',
    'count', CASE WHEN v_profile.avatar_url IS NOT NULL THEN 1 ELSE 0 END,
    'reason', 'personal_avatar'
  ));

  v_storage_actions := v_storage_actions || jsonb_build_array(jsonb_build_object(
    'bucket', 'work-order-images',
    'action', 'preserve_or_reassign_owner',
    'count', (SELECT count(*)::int FROM public.work_order_images wi WHERE wi.uploaded_by = p_user_id),
    'reason', 'organization_work_order_evidence'
  ));

  v_storage_actions := v_storage_actions || jsonb_build_array(jsonb_build_object(
    'bucket', 'equipment-note-images',
    'action', 'preserve_or_reassign_owner',
    'count', (SELECT count(*)::int FROM public.equipment_note_images eni WHERE eni.uploaded_by = p_user_id),
    'reason', 'organization_equipment_note_evidence'
  ));

  v_storage_actions := v_storage_actions || jsonb_build_array(jsonb_build_object(
    'bucket', 'inventory-item-images',
    'action', 'preserve',
    'count', (SELECT count(*)::int FROM public.inventory_item_images iii WHERE iii.uploaded_by = p_user_id),
    'reason', 'organization_inventory_evidence'
  ));

  -- Supplement with storage.objects when accessible
  BEGIN
    FOR v_row IN
      SELECT so.bucket_id, so.name
      FROM storage.objects so
      WHERE so.owner_id = p_user_id
        AND so.bucket_id IN ('landing-page-images', 'landing-page-videos')
    LOOP
      v_eligible := false;
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code', 'unclassified_storage',
        'message', 'Account owns marketing storage objects that cannot be auto-classified.',
        'details', jsonb_build_object('bucket', v_row.bucket_id, 'name', v_row.name)
      ));
    END LOOP;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code', 'storage_objects_unavailable',
        'message', 'Could not inspect storage.objects; classification uses database metadata only.'
      ));
  END;

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

COMMENT ON FUNCTION public.preview_account_deletion(uuid) IS
  'Read-only dry run for hybrid self-service account deletion. Returns eligibility, '
  'blockers, personal/org data counts, storage actions, and Auth FK blockers.';

REVOKE ALL ON FUNCTION public.preview_account_deletion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_account_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_account_deletion(uuid) TO service_role;

COMMIT;
