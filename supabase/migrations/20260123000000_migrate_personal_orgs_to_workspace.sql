-- =============================================================================
-- Migration: Automatic Personal Org to Workspace Migration
-- Description: Migrates personal organizations to workspace organizations when
--              domain is claimed. Transfers all data and handles conflicts.
-- Author: System
-- Date: 2026-01-23
-- =============================================================================

-- =============================================================================
-- PART 1: Add workspace_migration notification type
-- =============================================================================

ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY[
    'work_order_request'::text, 
    'work_order_accepted'::text, 
    'work_order_assigned'::text, 
    'work_order_completed'::text,
    'work_order_submitted'::text,
    'work_order_in_progress'::text,
    'work_order_on_hold'::text,
    'work_order_cancelled'::text,
    'general'::text,
    'ownership_transfer_request'::text,
    'ownership_transfer_accepted'::text,
    'ownership_transfer_rejected'::text,
    'ownership_transfer_cancelled'::text,
    'member_removed'::text,
    'workspace_migration'::text
  ]));

-- =============================================================================
-- PART 2: Create migration function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.migrate_personal_orgs_to_workspace(
  p_workspace_org_id uuid,
  p_domain text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        team_id = CASE 
          WHEN team_id IS NOT NULL AND v_team_id_map ? team_id::text 
          THEN team_id 
          ELSE NULL 
        END,
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
$$;

COMMENT ON FUNCTION public.migrate_personal_orgs_to_workspace(uuid, text) IS 
  'Migrates all personal organizations for users with matching domain to the workspace organization. Transfers all data, handles conflicts, and sends notifications.';

-- =============================================================================
-- PART 3: Update auto_provision_workspace_organization to trigger migration
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_provision_workspace_organization(
  p_user_id uuid,
  p_domain text,
  p_organization_name text
)
RETURNS TABLE(
  organization_id uuid,
  domain text,
  already_existed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_org_id uuid;
  v_existing_org_id uuid;
  v_migration_stats jsonb;
BEGIN
  v_domain := public.normalize_domain(p_domain);

  -- Block consumer domains
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  -- Check if domain already has an organization
  SELECT d.organization_id INTO v_existing_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = v_domain;

  IF v_existing_org_id IS NOT NULL THEN
    -- Domain already claimed, return existing org
    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if user already owns a non-personal organization that could be reused
  -- This handles the "Full Reset" case where domain was unclaimed but org still exists
  SELECT o.id INTO v_existing_org_id
  FROM public.organizations o
  JOIN public.organization_members om ON om.organization_id = o.id
  LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
  WHERE om.user_id = p_user_id
    AND om.role = 'owner'
    AND om.status = 'active'
    AND po.organization_id IS NULL  -- Not a personal org
    AND o.name LIKE '%Organization%' -- Looks like an auto-provisioned workspace org
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_existing_org_id IS NOT NULL THEN
    -- Reuse existing org, just reclaim domain
    INSERT INTO public.workspace_domains (domain, organization_id)
    VALUES (v_domain, v_existing_org_id)
    ON CONFLICT (domain) DO UPDATE SET organization_id = v_existing_org_id;
    
    -- Trigger migration for any personal orgs that exist
    SELECT public.migrate_personal_orgs_to_workspace(v_existing_org_id, v_domain) INTO v_migration_stats;
    
    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Create new organization
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    p_organization_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  -- Create workspace_domains entry
  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id);

  -- Trigger migration for any personal orgs that exist for this domain
  SELECT public.migrate_personal_orgs_to_workspace(v_org_id, v_domain) INTO v_migration_stats;

  organization_id := v_org_id;
  domain := v_domain;
  already_existed := false;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.auto_provision_workspace_organization(uuid, text, text) IS 
  'Atomically provisions a new organization for a Google Workspace domain. Reuses existing non-personal orgs if user is owner to prevent duplicates after disconnect/reconnect. Automatically migrates personal orgs to workspace org when domain is claimed.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.migrate_personal_orgs_to_workspace(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_provision_workspace_organization(uuid, text, text) TO service_role;

-- =============================================================================
-- PART 4: Down Migration Notes
-- =============================================================================
-- 
-- To reverse this migration:
-- 
-- 1. The migrate_personal_orgs_to_workspace function cannot automatically reverse
--    migrations because data has been merged and conflicts resolved. Manual
--    intervention would be required to split data back to personal orgs.
-- 
-- 2. To remove the workspace_migration notification type:
--    ALTER TABLE public.notifications 
--      DROP CONSTRAINT IF EXISTS notifications_type_check;
--    ALTER TABLE public.notifications 
--      ADD CONSTRAINT notifications_type_check 
--      CHECK (type = ANY (ARRAY[
--        'work_order_request'::text, 
--        'work_order_accepted'::text, 
--        'work_order_assigned'::text, 
--        'work_order_completed'::text,
--        'work_order_submitted'::text,
--        'work_order_in_progress'::text,
--        'work_order_on_hold'::text,
--        'work_order_cancelled'::text,
--        'general'::text,
--        'ownership_transfer_request'::text,
--        'ownership_transfer_accepted'::text,
--        'ownership_transfer_rejected'::text,
--        'ownership_transfer_cancelled'::text,
--        'member_removed'::text
--      ]));
-- 
-- 3. To restore the previous auto_provision_workspace_organization function,
--    revert to the version from migration 20260121210534_fix_auto_provision_reuse_existing_orgs.sql
--    (removing the migration trigger calls).
-- 
-- NOTE: This migration is designed to be one-way. Reversing would require
--       complex data splitting logic and is not recommended.
