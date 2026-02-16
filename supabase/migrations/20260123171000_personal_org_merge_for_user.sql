-- ============================================================================
-- Migration: Per-user Personal Org Migration + Preview
--
-- Purpose: Provide explicit, consent-based migration for a single user's
--          personal organization into a Workspace organization, plus a
--          preview RPC for UI consent flows.
-- ============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Per-user migration helper
-- =============================================================================

CREATE OR REPLACE FUNCTION public.migrate_personal_org_to_workspace_for_user(
  p_workspace_org_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      team_id = CASE 
        WHEN team_id IS NOT NULL AND v_team_id_map ? team_id::text 
        THEN team_id 
        ELSE NULL 
      END,
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
$$;

COMMENT ON FUNCTION public.migrate_personal_org_to_workspace_for_user(uuid, uuid) IS
  'Migrates a single user''s personal organization into the workspace organization. Transfers all data, resolves conflicts, and sends a notification.';

-- =============================================================================
-- PART 2: Preview counts for consent UI
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_personal_org_merge_preview(
  p_workspace_org_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_personal_org_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_workspace_org_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of the specified organization');
  END IF;

  SELECT organization_id INTO v_personal_org_id
  FROM public.personal_organizations
  WHERE user_id = v_user_id;

  IF v_personal_org_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'has_personal_org', false);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'has_personal_org', true,
    'personal_org_id', v_personal_org_id,
    'equipment_count', (SELECT COUNT(*) FROM public.equipment WHERE organization_id = v_personal_org_id),
    'work_orders_count', (SELECT COUNT(*) FROM public.work_orders WHERE organization_id = v_personal_org_id),
    'pm_templates_count', (SELECT COUNT(*) FROM public.pm_checklist_templates WHERE organization_id = v_personal_org_id),
    'pm_records_count', (SELECT COUNT(*) FROM public.preventative_maintenance WHERE organization_id = v_personal_org_id),
    'inventory_items_count', (SELECT COUNT(*) FROM public.inventory_items WHERE organization_id = v_personal_org_id),
    'customers_count', (SELECT COUNT(*) FROM public.customers WHERE organization_id = v_personal_org_id),
    'teams_count', (SELECT COUNT(*) FROM public.teams WHERE organization_id = v_personal_org_id)
  );
END;
$$;

COMMENT ON FUNCTION public.get_personal_org_merge_preview(uuid) IS
  'Returns counts of personal org data for the authenticated user for consent UI.';

-- =============================================================================
-- PART 3: Grants
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.migrate_personal_org_to_workspace_for_user(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_personal_org_merge_preview(uuid) TO authenticated, service_role;

COMMIT;
