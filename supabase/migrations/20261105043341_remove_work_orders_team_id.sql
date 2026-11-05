-- =============================================================================
-- Migration: Remove work_orders.team_id
--
-- Work orders do not belong to teams. Equipment belongs to a team, and a work
-- order's team is always its equipment's team (equipment.team_id via
-- work_orders.equipment_id). The denormalized work_orders.team_id column drifted
-- from equipment.team_id when equipment moved teams, and kept attracting new
-- code that read or wrote it. This migration repoints every database consumer
-- to equipment.team_id and drops the column.
--
-- Consumers repointed to equipment.team_id:
--   can_access_work_order_costs, is_work_order_team_manager,
--   create_work_order_notifications, update_work_order_note,
--   export_work_orders_csv_rows, RLS policy
--   work_order_notes_insert_organization_members
-- Writers removed:
--   validate_work_order_assignee (trigger sync), audit_work_order_changes,
--   create_historical_work_order_with_pm (both overloads lose p_team_id),
--   migrate_personal_org_to_workspace_for_user,
--   migrate_personal_orgs_to_workspace
-- Also fixes export_work_orders_csv_rows comparing enum columns to text
-- parameters (status/priority), which failed at execution.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.can_access_work_order_costs(p_work_order_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_orders wo
    LEFT JOIN public.equipment e ON e.id = wo.equipment_id
    WHERE wo.id = p_work_order_id
      AND (
        public.is_org_operational_admin(p_user_id, wo.organization_id)
        OR (
          public.is_org_member(p_user_id, wo.organization_id)
          AND (
            wo.assignee_id = p_user_id
            OR (
              e.team_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.team_id = e.team_id
                  AND tm.user_id = p_user_id
                  AND tm.role::text IN ('owner', 'manager', 'technician')
              )
            )
          )
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_work_order_team_manager(p_user_id uuid, p_work_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_orders wo
    LEFT JOIN public.equipment e ON e.id = wo.equipment_id
    JOIN public.team_members tm ON tm.team_id = e.team_id
    WHERE wo.id = p_work_order_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('owner'::public.team_member_role, 'manager'::public.team_member_role)
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_work_order_notifications(work_order_uuid uuid, new_status text, changed_by_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  wo_record record;
  user_id_to_notify uuid;
  notification_title text;
  notification_message text;
BEGIN
  -- Get work order details
  -- A work order's team is its equipment's team.
  SELECT wo.*, e.team_id AS team_id, t.name as team_name, e.name as equipment_name
  INTO wo_record
  FROM public.work_orders wo
  LEFT JOIN public.equipment e ON wo.equipment_id = e.id
  LEFT JOIN public.teams t ON e.team_id = t.id
  WHERE wo.id = work_order_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Create notification title and message
  notification_title := 'Work Order ' || REPLACE(INITCAP(new_status), '_', ' ');
  notification_message := 'Work order "' || wo_record.title || '"';
  
  IF wo_record.equipment_name IS NOT NULL THEN
    notification_message := notification_message || ' for ' || wo_record.equipment_name;
  END IF;
  
  notification_message := notification_message || ' has been ' || REPLACE(new_status, '_', ' ') || '.';
  
  -- Find users who should be notified based on their notification settings
  FOR user_id_to_notify IN
    SELECT DISTINCT om.user_id
    FROM public.organization_members om
    LEFT JOIN public.team_members tm ON tm.user_id = om.user_id AND tm.team_id = wo_record.team_id
    WHERE om.organization_id = wo_record.organization_id
      AND om.status = 'active'
      AND om.user_id != changed_by_user_id
      AND (
        -- Organization admins/owners get access to all teams
        om.role IN ('owner', 'admin') OR
        -- Team members with appropriate roles
        tm.role IN ('technician', 'requestor', 'manager')
      )
      AND public.should_notify_user_for_work_order(om.user_id, wo_record.team_id, new_status, wo_record.organization_id)
  LOOP
    -- Insert notification
    INSERT INTO public.notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      wo_record.organization_id,
      user_id_to_notify,
      'work_order_' || new_status,
      notification_title,
      notification_message,
      jsonb_build_object('work_order_id', work_order_uuid, 'team_id', wo_record.team_id),
      false
    );
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_work_order_note(p_organization_id uuid, p_work_order_id uuid, p_note_id uuid, p_content text DEFAULT NULL::text, p_is_private boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.work_order_notes%ROWTYPE;
  v_changes jsonb := '{}'::jsonb;
  v_team_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  IF NOT public.can_edit_work_order_note(v_user_id, p_organization_id, p_work_order_id, p_note_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT won.* INTO v_note
  FROM public.work_order_notes won
  JOIN public.work_orders wo ON wo.id = won.work_order_id
  WHERE won.id = p_note_id
    AND won.work_order_id = p_work_order_id
    AND wo.organization_id = p_organization_id
  FOR UPDATE OF won;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF p_content IS NOT NULL AND p_content IS DISTINCT FROM v_note.content THEN
    v_changes := v_changes || jsonb_build_object(
      'content', jsonb_build_object('old', v_note.content, 'new', p_content)
    );
  END IF;

  IF p_is_private IS NOT NULL AND p_is_private IS DISTINCT FROM v_note.is_private THEN
    SELECT e.team_id INTO v_team_id
    FROM public.work_orders wo
    LEFT JOIN public.equipment e ON e.id = wo.equipment_id
    WHERE wo.id = p_work_order_id;

    IF NOT (
      public.is_org_operational_admin(v_user_id, p_organization_id)
      OR public.is_work_order_team_manager(v_user_id, p_work_order_id)
      OR (
        v_note.author_id = v_user_id
        AND (v_team_id IS NULL OR NOT public.is_team_viewer_or_requestor(v_user_id, v_team_id))
      )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Permission denied for visibility change');
    END IF;

    v_changes := v_changes || jsonb_build_object(
      'is_private', jsonb_build_object('old', v_note.is_private, 'new', p_is_private)
    );
  END IF;

  IF v_changes = '{}'::jsonb THEN
    RETURN jsonb_build_object('success', true, 'note_id', p_note_id, 'unchanged', true);
  END IF;

  UPDATE public.work_order_notes
  SET
    content = COALESCE(p_content, content),
    is_private = COALESCE(p_is_private, is_private),
    last_modified_by = v_user_id,
    last_modified_at = now(),
    updated_at = now()
  WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'work_order',
    p_work_order_id,
    (SELECT wo.title FROM public.work_orders wo WHERE wo.id = p_work_order_id),
    'UPDATE',
    v_changes,
    jsonb_build_object('note_id', p_note_id, 'source', 'work_order_note_editor')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to update note: ' || SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.export_work_orders_csv_rows(p_organization_id uuid, p_columns text[] DEFAULT ARRAY['title'::text, 'status'::text, 'priority'::text, 'assignee_name'::text, 'team_name'::text, 'equipment_name'::text, 'created_date'::text], p_status text DEFAULT NULL::text, p_team_id uuid DEFAULT NULL::uuid, p_priority text DEFAULT NULL::text, p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_accessible_team_ids uuid[] DEFAULT NULL::uuid[], p_limit integer DEFAULT 50000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50000), 1), 50000);
  v_is_admin boolean;
  v_team_ids uuid[];
  v_rows jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_org_member((SELECT auth.uid()), p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: not an active organization member'
      USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.is_org_admin((SELECT auth.uid()), p_organization_id);

  IF NOT v_is_admin THEN
    -- Scoped exporters (requestor/viewer) — intersect client team list with
    -- real memberships so callers cannot widen scope.
    SELECT COALESCE(array_agg(tm.team_id), ARRAY[]::uuid[])
    INTO v_team_ids
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = (SELECT auth.uid())
      AND t.organization_id = p_organization_id
      AND tm.role IN ('requestor'::public.team_member_role, 'viewer'::public.team_member_role);

    IF p_accessible_team_ids IS NOT NULL THEN
      v_team_ids := ARRAY(
        SELECT unnest(v_team_ids)
        INTERSECT
        SELECT unnest(p_accessible_team_ids)
      );
    END IF;

    IF cardinality(v_team_ids) = 0 THEN
      RETURN '[]'::jsonb;
    END IF;
  ELSE
    v_team_ids := p_accessible_team_ids;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(shaped)::jsonb ORDER BY shaped.created_date DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.status,
      wo.priority,
      wo.assignee_name,
      t.name AS team_name,
      eq.name AS equipment_name,
      wo.created_date,
      wo.due_date,
      wo.completed_date,
      wo.estimated_hours,
      wo.has_pm
    FROM public.work_orders wo
    LEFT JOIN public.equipment eq ON eq.id = wo.equipment_id
    LEFT JOIN public.teams t ON t.id = eq.team_id
    WHERE wo.organization_id = p_organization_id
      AND wo.equipment_id IS NOT NULL
      AND (v_team_ids IS NULL OR eq.team_id = ANY (v_team_ids))
      AND (p_status IS NULL OR wo.status::text = p_status)
      AND (p_team_id IS NULL OR eq.team_id = p_team_id)
      AND (p_priority IS NULL OR wo.priority::text = p_priority)
      AND (p_date_from IS NULL OR wo.created_date >= p_date_from)
      AND (p_date_to IS NULL OR wo.created_date <= p_date_to)
    ORDER BY wo.created_date DESC
    LIMIT v_limit
  ) shaped;

  RETURN (
    SELECT COALESCE(jsonb_agg(
      (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_obj)
        WHERE key = ANY (p_columns || ARRAY['id']::text[])
      )
    ), '[]'::jsonb)
    FROM jsonb_array_elements(v_rows) AS row_obj
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.migrate_personal_org_to_workspace_for_user(p_workspace_org_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_org_name text;
  v_personal_org_id uuid;
  v_stats jsonb := jsonb_build_object(
    'users_migrated', 0,
    'teams_migrated', 0,
    'equipment_migrated', 0,
    'work_orders_migrated', 0,
    'inventory_items_migrated', 0,
    'pm_templates_migrated', 0,
    'pm_records_migrated', 0,
    'customers_migrated', 0,
    'conflicts_resolved', 0
  );
  v_team_id_map jsonb := '{}'::jsonb;
  v_equipment_id_map jsonb := '{}'::jsonb;
  v_inventory_id_map jsonb := '{}'::jsonb;
  v_pm_template_id_map jsonb := '{}'::jsonb;
  v_conflict_count int := 0;
  v_team_id uuid;
  v_new_team_id uuid;
  v_equipment_id uuid;
  v_new_equipment_id uuid;
  v_inventory_id uuid;
  v_new_inventory_id uuid;
  v_pm_template_id uuid;
  v_new_pm_template_id uuid;
  v_serial_number text;
  v_team_name text;
  v_sku text;
  v_template_name text;
  v_user_name text;
  v_user_email text;
  v_pm_count int;
  v_customer_count int;
  v_work_order_count int;
  v_equipment_count int;
  v_user_stats jsonb;
  v_is_personal_org boolean;
BEGIN
  -- Acquire advisory lock to prevent concurrent migrations for the same user/org
  PERFORM pg_advisory_xact_lock(hashtext(p_workspace_org_id::text || ':' || p_user_id::text));

  -- Validate workspace org exists and is not a personal org
  SELECT name, (EXISTS (SELECT 1 FROM public.personal_organizations WHERE organization_id = p_workspace_org_id)) 
  INTO v_workspace_org_name, v_is_personal_org
  FROM public.organizations
  WHERE id = p_workspace_org_id;

  IF v_workspace_org_name IS NULL THEN
    RAISE EXCEPTION 'Workspace organization not found';
  END IF;

  IF v_is_personal_org THEN
    RAISE EXCEPTION 'Target organization is a personal organization. Cannot migrate to personal org.';
  END IF;

  -- Resolve the user's personal organization
  SELECT organization_id INTO v_personal_org_id
  FROM public.personal_organizations
  WHERE user_id = p_user_id;

  IF v_personal_org_id IS NULL THEN
    RAISE EXCEPTION 'No personal organization found for user';
  END IF;

  SELECT name, email INTO v_user_name, v_user_email
  FROM public.profiles WHERE id = p_user_id;

  -- Initialize per-user stats for notification payload
  v_user_stats := jsonb_build_object(
    'equipment_migrated', 0,
    'work_orders_migrated', 0,
    'inventory_items_migrated', 0
  );

  -- ========================================================================
  -- STEP 1: Migrate Teams
  -- ========================================================================
  FOR v_team_id IN
    SELECT id FROM public.teams
    WHERE organization_id = v_personal_org_id
  LOOP
    SELECT name INTO v_team_name
    FROM public.teams WHERE id = v_team_id;

    SELECT id INTO v_new_team_id
    FROM public.teams
    WHERE organization_id = p_workspace_org_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(v_team_name));

    IF v_new_team_id IS NOT NULL THEN
      v_team_name := v_team_name || '-migrated';
      v_conflict_count := v_conflict_count + 1;
    END IF;

    UPDATE public.teams
    SET organization_id = p_workspace_org_id,
        name = v_team_name,
        updated_at = NOW()
    WHERE id = v_team_id;

    v_team_id_map := v_team_id_map || jsonb_build_object(v_team_id::text, v_team_id::text);
    v_stats := jsonb_set(v_stats, '{teams_migrated}', to_jsonb((v_stats->>'teams_migrated')::int + 1));
  END LOOP;

  -- ========================================================================
  -- STEP 2: Migrate Equipment
  -- ========================================================================
  FOR v_equipment_id IN
    SELECT id FROM public.equipment
    WHERE organization_id = v_personal_org_id
  LOOP
    SELECT serial_number INTO v_serial_number
    FROM public.equipment WHERE id = v_equipment_id;

    IF v_serial_number IS NOT NULL THEN
      SELECT id INTO v_new_equipment_id
      FROM public.equipment
      WHERE organization_id = p_workspace_org_id
        AND LOWER(TRIM(serial_number)) = LOWER(TRIM(v_serial_number));

      IF v_new_equipment_id IS NOT NULL THEN
        v_serial_number := v_serial_number || '-migrated';
        v_conflict_count := v_conflict_count + 1;
      END IF;
    END IF;

    UPDATE public.equipment
    SET organization_id = p_workspace_org_id,
        serial_number = COALESCE(v_serial_number, serial_number),
        updated_at = NOW()
    WHERE id = v_equipment_id;

    v_equipment_id_map := v_equipment_id_map || jsonb_build_object(v_equipment_id::text, v_equipment_id::text);
    v_stats := jsonb_set(v_stats, '{equipment_migrated}', to_jsonb((v_stats->>'equipment_migrated')::int + 1));
    v_user_stats := jsonb_set(v_user_stats, '{equipment_migrated}', to_jsonb((v_user_stats->>'equipment_migrated')::int + 1));
  END LOOP;

  -- ========================================================================
  -- STEP 3: Migrate Work Orders
  -- ========================================================================
  UPDATE public.work_orders
  SET organization_id = p_workspace_org_id,
      updated_at = NOW()
  WHERE organization_id = v_personal_org_id;

  GET DIAGNOSTICS v_work_order_count = ROW_COUNT;
  v_stats := jsonb_set(v_stats, '{work_orders_migrated}', to_jsonb((v_stats->>'work_orders_migrated')::int + v_work_order_count));
  v_user_stats := jsonb_set(v_user_stats, '{work_orders_migrated}', to_jsonb((v_user_stats->>'work_orders_migrated')::int + v_work_order_count));

  -- ========================================================================
  -- STEP 4: Migrate Inventory Items
  -- ========================================================================
  FOR v_inventory_id IN
    SELECT id FROM public.inventory_items
    WHERE organization_id = v_personal_org_id
  LOOP
    SELECT sku INTO v_sku
    FROM public.inventory_items WHERE id = v_inventory_id;

    IF v_sku IS NOT NULL THEN
      SELECT id INTO v_new_inventory_id
      FROM public.inventory_items
      WHERE organization_id = p_workspace_org_id
        AND LOWER(TRIM(sku)) = LOWER(TRIM(v_sku));

      IF v_new_inventory_id IS NOT NULL THEN
        v_sku := v_sku || '-migrated';
        v_conflict_count := v_conflict_count + 1;
      END IF;
    END IF;

    UPDATE public.inventory_items
    SET organization_id = p_workspace_org_id,
        sku = COALESCE(v_sku, sku),
        updated_at = NOW()
    WHERE id = v_inventory_id;

    v_inventory_id_map := v_inventory_id_map || jsonb_build_object(v_inventory_id::text, v_inventory_id::text);
    v_stats := jsonb_set(v_stats, '{inventory_items_migrated}', to_jsonb((v_stats->>'inventory_items_migrated')::int + 1));
    v_user_stats := jsonb_set(v_user_stats, '{inventory_items_migrated}', to_jsonb((v_user_stats->>'inventory_items_migrated')::int + 1));
  END LOOP;

  UPDATE public.inventory_transactions
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  -- ========================================================================
  -- STEP 5: Migrate Preventative Maintenance Records
  -- ========================================================================
  UPDATE public.preventative_maintenance
  SET organization_id = p_workspace_org_id,
      updated_at = NOW()
  WHERE organization_id = v_personal_org_id;

  GET DIAGNOSTICS v_pm_count = ROW_COUNT;
  v_stats := jsonb_set(v_stats, '{pm_records_migrated}', to_jsonb((v_stats->>'pm_records_migrated')::int + v_pm_count));

  -- ========================================================================
  -- STEP 6: Migrate PM Templates & Compatibility Rules
  -- ========================================================================
  FOR v_pm_template_id IN
    SELECT id FROM public.pm_checklist_templates
    WHERE organization_id = v_personal_org_id
  LOOP
    SELECT name INTO v_template_name
    FROM public.pm_checklist_templates WHERE id = v_pm_template_id;

    SELECT id INTO v_new_pm_template_id
    FROM public.pm_checklist_templates
    WHERE organization_id = p_workspace_org_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(v_template_name));

    IF v_new_pm_template_id IS NOT NULL THEN
      v_template_name := v_template_name || '-migrated';
      v_conflict_count := v_conflict_count + 1;
    END IF;

    UPDATE public.pm_checklist_templates
    SET organization_id = p_workspace_org_id,
        name = v_template_name,
        updated_at = NOW()
    WHERE id = v_pm_template_id;

    v_pm_template_id_map := v_pm_template_id_map || jsonb_build_object(v_pm_template_id::text, v_pm_template_id::text);
    v_stats := jsonb_set(v_stats, '{pm_templates_migrated}', to_jsonb((v_stats->>'pm_templates_migrated')::int + 1));
  END LOOP;

  UPDATE public.pm_template_compatibility_rules
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  -- ========================================================================
  -- STEP 7: Migrate Part Compatibility & Alternates
  -- ========================================================================
  UPDATE public.part_alternate_groups
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  SELECT COUNT(*) INTO v_equipment_count
  FROM public.part_identifiers pi1
  WHERE pi1.organization_id = v_personal_org_id
    AND EXISTS (
      SELECT 1 FROM public.part_identifiers pi2
      WHERE pi2.organization_id = p_workspace_org_id
        AND pi2.identifier_type = pi1.identifier_type
        AND pi2.norm_value = pi1.norm_value
    );
  v_conflict_count := v_conflict_count + COALESCE(v_equipment_count, 0);

  UPDATE public.part_identifiers
  SET organization_id = p_workspace_org_id,
      norm_value = CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.part_identifiers pi2
          WHERE pi2.organization_id = p_workspace_org_id
            AND pi2.identifier_type = part_identifiers.identifier_type
            AND pi2.norm_value = part_identifiers.norm_value
            AND pi2.id != part_identifiers.id
        )
        THEN part_identifiers.norm_value || '-migrated'
        ELSE part_identifiers.norm_value
      END
  WHERE organization_id = v_personal_org_id;

  -- ========================================================================
  -- STEP 8: Migrate Customers & Geocoded Locations
  -- ========================================================================
  UPDATE public.customers
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  GET DIAGNOSTICS v_customer_count = ROW_COUNT;
  v_stats := jsonb_set(v_stats, '{customers_migrated}', to_jsonb((v_stats->>'customers_migrated')::int + v_customer_count));

  UPDATE public.geocoded_locations
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  -- ========================================================================
  -- STEP 9: Migrate Configuration Data
  -- ========================================================================
  UPDATE public.notification_settings
  SET organization_id = p_workspace_org_id,
      team_id = CASE 
        WHEN team_id IS NOT NULL AND v_team_id_map ? team_id::text 
        THEN team_id 
        ELSE NULL 
      END
  WHERE organization_id = v_personal_org_id;

  UPDATE public.parts_managers
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  UPDATE public.export_request_log
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  UPDATE public.organization_invitations
  SET organization_id = p_workspace_org_id
  WHERE organization_id = v_personal_org_id;

  -- ========================================================================
  -- STEP 10: Update User Memberships
  -- ========================================================================
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (p_workspace_org_id, p_user_id, 'member', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  DELETE FROM public.organization_members
  WHERE organization_id = v_personal_org_id
    AND user_id = p_user_id;

  DELETE FROM public.personal_organizations
  WHERE organization_id = v_personal_org_id
    AND user_id = p_user_id;

  v_stats := jsonb_set(v_stats, '{users_migrated}', to_jsonb((v_stats->>'users_migrated')::int + 1));

  -- ========================================================================
  -- STEP 11: Send Notification to Migrated User
  -- ========================================================================
  INSERT INTO public.notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data,
    is_global
  ) VALUES (
    p_workspace_org_id,
    p_user_id,
    'workspace_migration',
    'Your organization has been migrated',
    'Your personal organization has been merged into ' || v_workspace_org_name || '. All your equipment, work orders, and data are now part of the workspace organization.',
    jsonb_build_object(
      'workspace_org_id', p_workspace_org_id,
      'workspace_org_name', v_workspace_org_name,
      'equipment_count', (v_user_stats->>'equipment_migrated')::int,
      'work_orders_count', (v_user_stats->>'work_orders_migrated')::int,
      'inventory_count', (v_user_stats->>'inventory_items_migrated')::int
    ),
    false
  );

  -- ========================================================================
  -- STEP 12: Delete Empty Personal Organization
  -- ========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_personal_org_id
  ) THEN
    DELETE FROM public.organizations
    WHERE id = v_personal_org_id;
  END IF;

  v_stats := jsonb_set(v_stats, '{conflicts_resolved}', to_jsonb(v_conflict_count));

  RETURN v_stats;
END;
$function$;

CREATE OR REPLACE FUNCTION public.migrate_personal_orgs_to_workspace(p_workspace_org_id uuid, p_domain text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_domain text;
  v_workspace_org_name text;
  v_personal_org_record RECORD;
  v_migrated_users uuid[];
  v_stats jsonb := jsonb_build_object(
    'users_migrated', 0,
    'teams_migrated', 0,
    'equipment_migrated', 0,
    'work_orders_migrated', 0,
    'inventory_items_migrated', 0,
    'pm_templates_migrated', 0,
    'pm_records_migrated', 0,
    'customers_migrated', 0,
    'conflicts_resolved', 0
  );
  v_team_id_map jsonb := '{}'::jsonb;
  v_equipment_id_map jsonb := '{}'::jsonb;
  v_inventory_id_map jsonb := '{}'::jsonb;
  v_pm_template_id_map jsonb := '{}'::jsonb;
  v_conflict_count int := 0;
  v_team_id uuid;
  v_new_team_id uuid;
  v_equipment_id uuid;
  v_new_equipment_id uuid;
  v_inventory_id uuid;
  v_new_inventory_id uuid;
  v_pm_template_id uuid;
  v_new_pm_template_id uuid;
  v_serial_number text;
  v_team_name text;
  v_sku text;
  v_template_name text;
  v_user_id uuid;
  v_user_name text;
  v_user_email text;
  v_pm_count int;
  v_customer_count int;
  v_work_order_count int;
  v_equipment_count int;
  v_user_stats jsonb;
  v_is_personal_org boolean;
BEGIN
  v_domain := public.normalize_domain(p_domain);

  -- Acquire advisory lock to prevent concurrent migrations for the same workspace org
  -- Using workspace org ID as lock key to serialize migrations per org
  PERFORM pg_advisory_xact_lock(hashtext(p_workspace_org_id::text));

  -- Validate workspace org exists and is not a personal org
  SELECT name, (EXISTS (SELECT 1 FROM public.personal_organizations WHERE organization_id = p_workspace_org_id)) 
  INTO v_workspace_org_name, v_is_personal_org
  FROM public.organizations
  WHERE id = p_workspace_org_id;

  IF v_workspace_org_name IS NULL THEN
    RAISE EXCEPTION 'Workspace organization not found';
  END IF;

  IF v_is_personal_org THEN
    RAISE EXCEPTION 'Target organization is a personal organization. Cannot migrate to personal org.';
  END IF;

  -- Find all personal orgs for users with matching domain
  FOR v_personal_org_record IN
    SELECT 
      po.organization_id as personal_org_id,
      po.user_id,
      p.name as user_name,
      p.email as user_email
    FROM public.personal_organizations po
    JOIN public.profiles p ON p.id = po.user_id
    WHERE public.normalize_domain(split_part(public.normalize_email(p.email), '@', 2)) = v_domain
      AND po.organization_id != p_workspace_org_id
  LOOP
    v_user_id := v_personal_org_record.user_id;
    v_user_name := v_personal_org_record.user_name;
    v_user_email := v_personal_org_record.user_email;

    -- Initialize per-user stats for accurate notification data
    v_user_stats := jsonb_build_object(
      'equipment_migrated', 0,
      'work_orders_migrated', 0,
      'inventory_items_migrated', 0
    );

    -- ========================================================================
    -- STEP 1: Migrate Teams (must be first - referenced by equipment/work_orders)
    -- ========================================================================
    FOR v_team_id IN
      SELECT id FROM public.teams
      WHERE organization_id = v_personal_org_record.personal_org_id
    LOOP
      -- Check for duplicate team name
      SELECT name INTO v_team_name
      FROM public.teams WHERE id = v_team_id;

      -- Check if team name already exists in workspace org
      SELECT id INTO v_new_team_id
      FROM public.teams
      WHERE organization_id = p_workspace_org_id
        AND LOWER(TRIM(name)) = LOWER(TRIM(v_team_name));

      IF v_new_team_id IS NOT NULL THEN
        -- Conflict: rename the migrating team
        v_team_name := v_team_name || '-migrated';
        v_conflict_count := v_conflict_count + 1;
      END IF;

      -- Update team organization_id and name (if renamed)
      UPDATE public.teams
      SET organization_id = p_workspace_org_id,
          name = v_team_name,
          updated_at = NOW()
      WHERE id = v_team_id;

      -- Store mapping for equipment/work_order updates
      v_team_id_map := v_team_id_map || jsonb_build_object(v_team_id::text, v_team_id::text);
      v_stats := jsonb_set(v_stats, '{teams_migrated}', to_jsonb((v_stats->>'teams_migrated')::int + 1));
    END LOOP;

    -- ========================================================================
    -- STEP 2: Migrate Equipment (referenced by work_orders, notes, scans, etc.)
    -- ========================================================================
    FOR v_equipment_id IN
      SELECT id FROM public.equipment
      WHERE organization_id = v_personal_org_record.personal_org_id
    LOOP
      -- Check for duplicate serial number
      SELECT serial_number INTO v_serial_number
      FROM public.equipment WHERE id = v_equipment_id;

      IF v_serial_number IS NOT NULL THEN
        -- Check if serial number already exists in workspace org
        SELECT id INTO v_new_equipment_id
        FROM public.equipment
        WHERE organization_id = p_workspace_org_id
          AND LOWER(TRIM(serial_number)) = LOWER(TRIM(v_serial_number));

        IF v_new_equipment_id IS NOT NULL THEN
          -- Conflict: rename the serial number
          v_serial_number := v_serial_number || '-migrated';
          v_conflict_count := v_conflict_count + 1;
        END IF;
      END IF;

      -- Update equipment organization_id, serial_number (if renamed), and team_id (if team was migrated)
      -- Note: team_id is preserved if it exists in the migrated teams map, otherwise kept as-is
      -- (equipment may have team_id pointing to a team that wasn't migrated, which is fine)
      UPDATE public.equipment
      SET organization_id = p_workspace_org_id,
          serial_number = COALESCE(v_serial_number, serial_number),
          updated_at = NOW()
      WHERE id = v_equipment_id;

      -- Store mapping
      v_equipment_id_map := v_equipment_id_map || jsonb_build_object(v_equipment_id::text, v_equipment_id::text);
      v_stats := jsonb_set(v_stats, '{equipment_migrated}', to_jsonb((v_stats->>'equipment_migrated')::int + 1));
      v_user_stats := jsonb_set(v_user_stats, '{equipment_migrated}', to_jsonb((v_user_stats->>'equipment_migrated')::int + 1));
    END LOOP;

    -- ========================================================================
    -- STEP 3: Migrate Work Orders (referenced by work_order_equipment, costs, etc.)
    -- ========================================================================
    UPDATE public.work_orders
    SET organization_id = p_workspace_org_id,
        updated_at = NOW()
    WHERE organization_id = v_personal_org_record.personal_org_id;

    GET DIAGNOSTICS v_work_order_count = ROW_COUNT;
    v_stats := jsonb_set(v_stats, '{work_orders_migrated}', to_jsonb((v_stats->>'work_orders_migrated')::int + v_work_order_count));
    v_user_stats := jsonb_set(v_user_stats, '{work_orders_migrated}', to_jsonb((v_user_stats->>'work_orders_migrated')::int + v_work_order_count));

    -- ========================================================================
    -- STEP 4: Migrate Inventory Items (referenced by transactions, identifiers)
    -- ========================================================================
    FOR v_inventory_id IN
      SELECT id FROM public.inventory_items
      WHERE organization_id = v_personal_org_record.personal_org_id
    LOOP
      -- Check for duplicate SKU
      SELECT sku INTO v_sku
      FROM public.inventory_items WHERE id = v_inventory_id;

      IF v_sku IS NOT NULL THEN
        -- Check if SKU already exists in workspace org
        SELECT id INTO v_new_inventory_id
        FROM public.inventory_items
        WHERE organization_id = p_workspace_org_id
          AND LOWER(TRIM(sku)) = LOWER(TRIM(v_sku));

        IF v_new_inventory_id IS NOT NULL THEN
          -- Conflict: rename the SKU
          v_sku := v_sku || '-migrated';
          v_conflict_count := v_conflict_count + 1;
        END IF;
      END IF;

      -- Update inventory item organization_id and sku (if renamed)
      UPDATE public.inventory_items
      SET organization_id = p_workspace_org_id,
          sku = COALESCE(v_sku, sku),
          updated_at = NOW()
      WHERE id = v_inventory_id;

      -- Store mapping
      v_inventory_id_map := v_inventory_id_map || jsonb_build_object(v_inventory_id::text, v_inventory_id::text);
      v_stats := jsonb_set(v_stats, '{inventory_items_migrated}', to_jsonb((v_stats->>'inventory_items_migrated')::int + 1));
      v_user_stats := jsonb_set(v_user_stats, '{inventory_items_migrated}', to_jsonb((v_user_stats->>'inventory_items_migrated')::int + 1));
    END LOOP;

    -- Migrate inventory transactions
    -- Note: inventory_item_id references are preserved as-is since items are migrated above
    UPDATE public.inventory_transactions
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- ========================================================================
    -- STEP 5: Migrate Preventative Maintenance Records
    -- ========================================================================
    UPDATE public.preventative_maintenance
    SET organization_id = p_workspace_org_id,
        updated_at = NOW()
    WHERE organization_id = v_personal_org_record.personal_org_id;

    GET DIAGNOSTICS v_pm_count = ROW_COUNT;
    v_stats := jsonb_set(v_stats, '{pm_records_migrated}', to_jsonb((v_stats->>'pm_records_migrated')::int + v_pm_count));

    -- ========================================================================
    -- STEP 6: Migrate PM Templates & Compatibility Rules
    -- ========================================================================
    FOR v_pm_template_id IN
      SELECT id FROM public.pm_checklist_templates
      WHERE organization_id = v_personal_org_record.personal_org_id
    LOOP
      -- Check for duplicate template name
      SELECT name INTO v_template_name
      FROM public.pm_checklist_templates WHERE id = v_pm_template_id;

      -- Check if template name already exists in workspace org
      SELECT id INTO v_new_pm_template_id
      FROM public.pm_checklist_templates
      WHERE organization_id = p_workspace_org_id
        AND LOWER(TRIM(name)) = LOWER(TRIM(v_template_name));

      IF v_new_pm_template_id IS NOT NULL THEN
        -- Conflict: rename the template
        v_template_name := v_template_name || '-migrated';
        v_conflict_count := v_conflict_count + 1;
      END IF;

      -- Update template organization_id and name (if renamed)
      UPDATE public.pm_checklist_templates
      SET organization_id = p_workspace_org_id,
          name = v_template_name,
          updated_at = NOW()
      WHERE id = v_pm_template_id;

      -- Store mapping
      v_pm_template_id_map := v_pm_template_id_map || jsonb_build_object(v_pm_template_id::text, v_pm_template_id::text);
      v_stats := jsonb_set(v_stats, '{pm_templates_migrated}', to_jsonb((v_stats->>'pm_templates_migrated')::int + 1));
    END LOOP;

    -- Update PM template compatibility rules
    UPDATE public.pm_template_compatibility_rules
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- ========================================================================
    -- STEP 7: Migrate Part Compatibility & Alternates
    -- ========================================================================
    UPDATE public.part_alternate_groups
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- Handle part identifiers conflicts (append -migrated to norm_value)
    -- Count conflicts first
    SELECT COUNT(*) INTO v_equipment_count
    FROM public.part_identifiers pi1
    WHERE pi1.organization_id = v_personal_org_record.personal_org_id
      AND EXISTS (
        SELECT 1 FROM public.part_identifiers pi2
        WHERE pi2.organization_id = p_workspace_org_id
          AND pi2.identifier_type = pi1.identifier_type
          AND pi2.norm_value = pi1.norm_value
      );
    v_conflict_count := v_conflict_count + COALESCE(v_equipment_count, 0);

    -- Update part identifiers with conflict resolution
    UPDATE public.part_identifiers
    SET organization_id = p_workspace_org_id,
        norm_value = CASE 
          WHEN EXISTS (
            SELECT 1 FROM public.part_identifiers pi2
            WHERE pi2.organization_id = p_workspace_org_id
              AND pi2.identifier_type = part_identifiers.identifier_type
              AND pi2.norm_value = part_identifiers.norm_value
              AND pi2.id != part_identifiers.id
          )
          THEN part_identifiers.norm_value || '-migrated'
          ELSE part_identifiers.norm_value
        END
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- ========================================================================
    -- STEP 8: Migrate Customers & Geocoded Locations
    -- ========================================================================
    UPDATE public.customers
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    GET DIAGNOSTICS v_customer_count = ROW_COUNT;
    v_stats := jsonb_set(v_stats, '{customers_migrated}', to_jsonb((v_stats->>'customers_migrated')::int + v_customer_count));

    UPDATE public.geocoded_locations
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- ========================================================================
    -- STEP 9: Migrate Configuration Data
    -- ========================================================================
    -- Update notification_settings (team_id references are handled by team migration)
    UPDATE public.notification_settings
    SET organization_id = p_workspace_org_id,
        team_id = CASE 
          WHEN team_id IS NOT NULL AND v_team_id_map ? team_id::text 
          THEN team_id 
          ELSE NULL 
        END
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- Update parts_managers
    UPDATE public.parts_managers
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- Migrate export_request_log
    UPDATE public.export_request_log
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- Migrate organization_invitations
    UPDATE public.organization_invitations
    SET organization_id = p_workspace_org_id
    WHERE organization_id = v_personal_org_record.personal_org_id;

    -- ========================================================================
    -- STEP 10: Update User Memberships
    -- ========================================================================
    -- Add user to workspace org as member (if not already present)
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (p_workspace_org_id, v_user_id, 'member', 'active')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Delete personal org membership record
    DELETE FROM public.organization_members
    WHERE organization_id = v_personal_org_record.personal_org_id
      AND user_id = v_user_id;

    -- Delete personal_organizations record
    DELETE FROM public.personal_organizations
    WHERE organization_id = v_personal_org_record.personal_org_id
      AND user_id = v_user_id;

    -- Track migrated user
    v_migrated_users := array_append(v_migrated_users, v_user_id);
    v_stats := jsonb_set(v_stats, '{users_migrated}', to_jsonb((v_stats->>'users_migrated')::int + 1));

    -- ========================================================================
    -- STEP 11: Send Notification to Migrated User
    -- ========================================================================
    INSERT INTO public.notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      p_workspace_org_id,
      v_user_id,
      'workspace_migration',
      'Your organization has been migrated',
      'Your personal organization has been merged into ' || v_workspace_org_name || '. All your equipment, work orders, and data are now part of the workspace organization.',
      jsonb_build_object(
        'workspace_org_id', p_workspace_org_id,
        'workspace_org_name', v_workspace_org_name,
        'equipment_count', (v_user_stats->>'equipment_migrated')::int,
        'work_orders_count', (v_user_stats->>'work_orders_migrated')::int,
        'inventory_count', (v_user_stats->>'inventory_items_migrated')::int
      ),
      false
    );

    -- ========================================================================
    -- STEP 12: Delete Empty Personal Organization
    -- ========================================================================
    -- Only delete if no other members exist
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = v_personal_org_record.personal_org_id
    ) THEN
      DELETE FROM public.organizations
      WHERE id = v_personal_org_record.personal_org_id;
    END IF;

  END LOOP;

  -- Update conflicts resolved count
  v_stats := jsonb_set(v_stats, '{conflicts_resolved}', to_jsonb(v_conflict_count));

  RETURN v_stats;
END;
$function$;

-- create_historical_work_order_with_pm: signature changes (p_team_id removed),
-- so drop both overloads and recreate them with the same grants.
DROP FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb);
DROP FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.create_historical_work_order_with_pm(p_organization_id uuid, p_equipment_id uuid, p_title text, p_description text, p_priority work_order_priority, p_status work_order_status, p_historical_start_date timestamp with time zone, p_historical_notes text DEFAULT NULL::text, p_assignee_id uuid DEFAULT NULL::uuid, p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_completed_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_has_pm boolean DEFAULT false, p_pm_status text DEFAULT 'pending'::text, p_pm_completion_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_pm_notes text DEFAULT NULL::text, p_pm_checklist_data jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    work_order_id UUID;
    pm_id UUID;
    result JSONB;
    default_checklist JSONB;
BEGIN
    -- Check if user is admin
    IF NOT is_org_operational_admin(auth.uid(), p_organization_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Create historical work order with has_pm field
    INSERT INTO work_orders (
        organization_id,
        equipment_id,
        title,
        description,
        priority,
        status,
        assignee_id,
        due_date,
        completed_date,
        has_pm,  -- ADD THIS FIELD
        is_historical,
        historical_start_date,
        historical_notes,
        created_by_admin,
        created_by,
        created_date
    ) VALUES (
        p_organization_id,
        p_equipment_id,
        p_title,
        p_description,
        p_priority,
        p_status,
        p_assignee_id,
        p_due_date,
        p_completed_date,
        p_has_pm,  -- SET THE VALUE
        true,
        p_historical_start_date,
        p_historical_notes,
        auth.uid(),
        auth.uid(),
        p_historical_start_date
    ) RETURNING id INTO work_order_id;
    
    -- Create PM if requested
    IF p_has_pm THEN
        -- Use default forklift checklist if no checklist data provided or empty
        IF p_pm_checklist_data IS NULL OR jsonb_array_length(p_pm_checklist_data) = 0 THEN
            -- Default forklift PM checklist
            default_checklist := '[
                {"id": "visual_001", "title": "Mast and Forks", "description": "Check mast for damage, cracks, or bent components. Inspect forks for cracks, bends, or excessive wear.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_002", "title": "Hydraulic System", "description": "Check for hydraulic fluid leaks around cylinders, hoses, and fittings.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_003", "title": "Tires and Wheels", "description": "Inspect tires for wear, cuts, or embedded objects. Check wheel bolts for tightness.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_004", "title": "Overhead Guard", "description": "Check overhead guard for damage, cracks, or loose bolts.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "visual_005", "title": "Load Backrest", "description": "Inspect load backrest for damage and proper attachment.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
                {"id": "engine_001", "title": "Engine Oil Level", "description": "Check engine oil level and top off if necessary. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_002", "title": "Coolant Level", "description": "Check radiator coolant level and condition. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_003", "title": "Air Filter", "description": "Inspect air filter for dirt and debris. Replace if necessary.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_004", "title": "Belt Condition", "description": "Check drive belts for proper tension, cracks, or fraying.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "engine_005", "title": "Battery", "description": "Check battery terminals for corrosion and ensure secure connections.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
                {"id": "electrical_001", "title": "Warning Lights", "description": "Test all warning lights and indicators on the dashboard.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
                {"id": "electrical_002", "title": "Horn", "description": "Test horn operation for proper sound and function.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
                {"id": "electrical_003", "title": "Work Lights", "description": "Test all work lights for proper operation.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
                {"id": "operational_001", "title": "Steering", "description": "Test steering for smooth operation and proper response.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "operational_002", "title": "Brakes", "description": "Test service and parking brake operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "operational_003", "title": "Hydraulic Functions", "description": "Test lift, lower, tilt, and side shift functions for smooth operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "operational_004", "title": "Transmission", "description": "Test forward and reverse operation for smooth engagement.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
                {"id": "safety_001", "title": "Seat Belt", "description": "Check seat belt for proper operation and condition.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
                {"id": "safety_002", "title": "Dead Man Switch", "description": "Test operator presence system and dead man switch.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
                {"id": "safety_003", "title": "Load Capacity Plate", "description": "Verify load capacity plate is visible and legible.", "condition": "good", "required": true, "section": "Safety Features", "completed": false}
            ]'::jsonb;
        ELSE
            default_checklist := p_pm_checklist_data;
        END IF;
        
        INSERT INTO preventative_maintenance (
            work_order_id,
            equipment_id,
            organization_id,
            status,
            completed_at,
            completed_by,
            notes,
            checklist_data,
            is_historical,
            historical_completion_date,
            historical_notes,
            created_by
        ) VALUES (
            work_order_id,
            p_equipment_id,
            p_organization_id,
            p_pm_status,
            CASE WHEN p_pm_status = 'completed' THEN COALESCE(p_pm_completion_date, p_completed_date) ELSE NULL END,
            CASE WHEN p_pm_status = 'completed' THEN auth.uid() ELSE NULL END,
            p_pm_notes,
            default_checklist,  -- Use the checklist (default or provided)
            true,
            p_pm_completion_date,
            CONCAT('Historical PM - ', p_pm_notes),
            auth.uid()
        ) RETURNING id INTO pm_id;
    END IF;
    
    -- Create status history entry
    INSERT INTO work_order_status_history (
        work_order_id,
        old_status,
        new_status,
        changed_by,
        reason,
        is_historical_creation,
        metadata
    ) VALUES (
        work_order_id,
        NULL,
        p_status,
        auth.uid(),
        'Historical work order created',
        true,
        jsonb_build_object(
            'historical_start_date', p_historical_start_date,
            'has_pm', p_has_pm,
            'pm_id', pm_id
        )
    );
    
    result := jsonb_build_object(
        'success', true,
        'work_order_id', work_order_id,
        'pm_id', pm_id,
        'has_pm', p_has_pm
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'error', 'Failed to create historical work order: ' || SQLERRM
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.create_historical_work_order_with_pm(p_organization_id uuid, p_equipment_id uuid, p_title text, p_description text, p_priority work_order_priority, p_status work_order_status, p_historical_start_date timestamp with time zone, p_historical_notes text DEFAULT NULL::text, p_assignee_id uuid DEFAULT NULL::uuid, p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_completed_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_has_pm boolean DEFAULT false, p_pm_status text DEFAULT 'pending'::text, p_pm_completion_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_pm_notes text DEFAULT NULL::text, p_pm_checklist_data jsonb DEFAULT '[]'::jsonb, p_timeline_events jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  work_order_id uuid;
  pm_id uuid;
  result jsonb;
  default_checklist jsonb;
  v_timeline_events jsonb;
  v_replace_result jsonb;
BEGIN
  IF NOT public.is_org_operational_admin(auth.uid(), p_organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  v_timeline_events := COALESCE(
    p_timeline_events,
    public.synthesize_historical_timeline_events(
      p_historical_start_date,
      p_completed_date,
      p_status,
      p_assignee_id
    )
  );

  INSERT INTO public.work_orders (
    organization_id,
    equipment_id,
    title,
    description,
    priority,
    status,
    assignee_id,
    due_date,
    completed_date,
    has_pm,
    is_historical,
    historical_start_date,
    historical_notes,
    created_by_admin,
    created_by,
    created_date
  ) VALUES (
    p_organization_id,
    p_equipment_id,
    p_title,
    p_description,
    p_priority,
    p_status,
    p_assignee_id,
    p_due_date,
    p_completed_date,
    p_has_pm,
    true,
    p_historical_start_date,
    p_historical_notes,
    auth.uid(),
    auth.uid(),
    p_historical_start_date
  ) RETURNING id INTO work_order_id;

  IF p_has_pm THEN
    IF p_pm_checklist_data IS NULL OR jsonb_array_length(p_pm_checklist_data) = 0 THEN
      default_checklist := '[
        {"id": "visual_001", "title": "Mast and Forks", "description": "Check mast for damage, cracks, or bent components. Inspect forks for cracks, bends, or excessive wear.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_002", "title": "Hydraulic System", "description": "Check for hydraulic fluid leaks around cylinders, hoses, and fittings.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_003", "title": "Tires and Wheels", "description": "Inspect tires for wear, cuts, or embedded objects. Check wheel bolts for tightness.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_004", "title": "Overhead Guard", "description": "Check overhead guard for damage, cracks, or loose bolts.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_005", "title": "Load Backrest", "description": "Inspect load backrest for damage and proper attachment.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "engine_001", "title": "Engine Oil Level", "description": "Check engine oil level and top off if necessary. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_002", "title": "Coolant Level", "description": "Check radiator coolant level and condition. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_003", "title": "Air Filter", "description": "Inspect air filter for dirt and debris. Replace if necessary.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_004", "title": "Belt Condition", "description": "Check drive belts for proper tension, cracks, or fraying.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_005", "title": "Battery", "description": "Check battery terminals for corrosion and ensure secure connections.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "electrical_001", "title": "Warning Lights", "description": "Test all warning lights and indicators on the dashboard.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
        {"id": "electrical_002", "title": "Horn", "description": "Test horn operation for proper sound and function.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
        {"id": "electrical_003", "title": "Work Lights", "description": "Test all work lights for proper operation.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
        {"id": "operational_001", "title": "Steering", "description": "Test steering for smooth operation and proper response.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "operational_002", "title": "Brakes", "description": "Test service and parking brake operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "operational_003", "title": "Hydraulic Functions", "description": "Test lift, lower, tilt, and side shift functions for smooth operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "operational_004", "title": "Transmission", "description": "Test forward and reverse operation for smooth engagement.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "safety_001", "title": "Seat Belt", "description": "Check seat belt for proper operation and condition.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
        {"id": "safety_002", "title": "Dead Man Switch", "description": "Test operator presence system and dead man switch.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
        {"id": "safety_003", "title": "Load Capacity Plate", "description": "Verify load capacity plate is visible and legible.", "condition": "good", "required": true, "section": "Safety Features", "completed": false}
      ]'::jsonb;
    ELSE
      default_checklist := p_pm_checklist_data;
    END IF;

    INSERT INTO public.preventative_maintenance (
      work_order_id,
      equipment_id,
      organization_id,
      status,
      completed_at,
      completed_by,
      notes,
      checklist_data,
      is_historical,
      historical_completion_date,
      historical_notes,
      created_by
    ) VALUES (
      work_order_id,
      p_equipment_id,
      p_organization_id,
      p_pm_status,
      CASE WHEN p_pm_status = 'completed' THEN COALESCE(p_pm_completion_date, p_completed_date) ELSE NULL END,
      CASE WHEN p_pm_status = 'completed' THEN auth.uid() ELSE NULL END,
      p_pm_notes,
      default_checklist,
      true,
      p_pm_completion_date,
      CONCAT('Historical PM - ', p_pm_notes),
      auth.uid()
    ) RETURNING id INTO pm_id;
  END IF;

  v_replace_result := public.replace_historical_work_order_timeline(
    work_order_id,
    p_organization_id,
    v_timeline_events,
    true
  );

  IF COALESCE((v_replace_result ->> 'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Failed to initialize historical timeline: %', COALESCE(v_replace_result ->> 'error', 'unknown error');
  END IF;

  result := jsonb_build_object(
    'success', true,
    'work_order_id', work_order_id,
    'pm_id', pm_id,
    'has_pm', p_has_pm
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to create historical work order: ' || SQLERRM
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_historical_work_order_with_pm(uuid, uuid, text, text, public.work_order_priority, public.work_order_status, timestamp with time zone, text, uuid, timestamp with time zone, timestamp with time zone, boolean, text, timestamp with time zone, text, jsonb, jsonb) TO service_role;

DROP POLICY work_order_notes_insert_organization_members ON public.work_order_notes;
CREATE POLICY work_order_notes_insert_organization_members ON public.work_order_notes
  FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.work_orders wo
      LEFT JOIN public.equipment e ON e.id = wo.equipment_id
      WHERE wo.id = work_order_notes.work_order_id
        AND public.is_org_member((SELECT auth.uid()), wo.organization_id)
        AND wo.status <> 'cancelled'::public.work_order_status
        AND (
          public.is_org_operational_admin((SELECT auth.uid()), wo.organization_id)
          OR wo.created_by = (SELECT auth.uid())
          OR (
            e.team_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.team_members tm
              WHERE tm.user_id = (SELECT auth.uid())
                AND tm.team_id = e.team_id
                AND tm.role = ANY (ARRAY['owner'::public.team_member_role, 'manager'::public.team_member_role, 'technician'::public.team_member_role, 'requestor'::public.team_member_role])
            )
          )
        )
    )
    AND (
      NOT is_private
      OR EXISTS (
        SELECT 1
        FROM public.work_orders wo
        LEFT JOIN public.equipment e ON e.id = wo.equipment_id
        WHERE wo.id = work_order_notes.work_order_id
          AND public.is_org_member((SELECT auth.uid()), wo.organization_id)
          AND (
            public.is_org_operational_admin((SELECT auth.uid()), wo.organization_id)
            OR (
              e.team_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.user_id = (SELECT auth.uid())
                  AND tm.team_id = e.team_id
                  AND tm.role = ANY (ARRAY['owner'::public.team_member_role, 'manager'::public.team_member_role, 'technician'::public.team_member_role])
              )
            )
          )
      )
    )
  );

-- Trigger functions on work_orders: stop syncing (validate_work_order_assignee)
-- and auditing (audit_work_order_changes) the removed column.
CREATE OR REPLACE FUNCTION public.validate_work_order_assignee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_equipment_team_id UUID;
BEGIN
  -- Only validate when assignee_id or equipment_id changes
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       OLD.assignee_id IS DISTINCT FROM NEW.assignee_id OR
       OLD.equipment_id IS DISTINCT FROM NEW.equipment_id
     ))
  THEN
    -- Skip validation if assignee is NULL (unassigned is always allowed)
    IF NEW.assignee_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Validate the assignee
    IF NOT public.is_valid_work_order_assignee(
      NEW.equipment_id,
      NEW.organization_id,
      NEW.assignee_id
    ) THEN
      -- Get equipment team_id for better error message (filter by organization_id for multi-tenancy)
      SELECT team_id INTO v_equipment_team_id
      FROM equipment
      WHERE id = NEW.equipment_id
        AND organization_id = NEW.organization_id;

      IF v_equipment_team_id IS NULL THEN
        RAISE EXCEPTION 'Cannot assign work order: Equipment has no team. Assign a team to the equipment first.'
          USING ERRCODE = 'check_violation';
      ELSE
        RAISE EXCEPTION 'Invalid assignee: User must be a team member (manager/technician) or organization admin.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_work_order_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.title;
  ELSE
    v_entity_name := NEW.title;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'title', jsonb_build_object('old', NULL, 'new', NEW.title),
      'status', jsonb_build_object('old', NULL, 'new', NEW.status),
      'priority', jsonb_build_object('old', NULL, 'new', NEW.priority),
      'equipment_id', jsonb_build_object('old', NULL, 'new', NEW.equipment_id)
    );
    v_metadata := jsonb_build_object(
      'equipment_id', NEW.equipment_id,
      'created_by', NEW.created_by
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only track fields that changed
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      v_changes := v_changes || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      v_changes := v_changes || jsonb_build_object('assignee_id', jsonb_build_object('old', OLD.assignee_id, 'new', NEW.assignee_id));
      v_changes := v_changes || jsonb_build_object('assignee_name', jsonb_build_object('old', OLD.assignee_name, 'new', NEW.assignee_name));
    END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      v_changes := v_changes || jsonb_build_object('due_date', jsonb_build_object('old', OLD.due_date, 'new', NEW.due_date));
    END IF;
    IF OLD.completed_date IS DISTINCT FROM NEW.completed_date THEN
      v_changes := v_changes || jsonb_build_object('completed_date', jsonb_build_object('old', OLD.completed_date, 'new', NEW.completed_date));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours THEN
      v_changes := v_changes || jsonb_build_object('estimated_hours', jsonb_build_object('old', OLD.estimated_hours, 'new', NEW.estimated_hours));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('equipment_id', NEW.equipment_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'title', jsonb_build_object('old', OLD.title, 'new', NULL),
      'status', jsonb_build_object('old', OLD.status, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'work_order',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP INDEX IF EXISTS public.idx_work_orders_team_id;

ALTER TABLE public.work_orders DROP COLUMN team_id;

COMMIT;
