drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

alter table "public"."inventory_items" drop constraint "inventory_items_quantity_on_hand_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_invitation_atomic(p_invitation_token uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  invitation_record RECORD;
  org_name TEXT;
  result jsonb;
BEGIN
  -- Get invitation details
  SELECT id, organization_id, email, role, status, expires_at, accepted_by
  INTO invitation_record
  FROM organization_invitations
  WHERE invitation_token = p_invitation_token;
  
  -- Validate invitation exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Validate invitation status
  IF invitation_record.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has already been processed');
  END IF;
  
  -- Validate invitation not expired
  IF invitation_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;
  
  -- Validate user email matches invitation email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id 
      AND lower(trim(email)) = lower(trim(invitation_record.email))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email does not match invitation email');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id 
      AND organization_id = invitation_record.organization_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  END IF;
  
  -- Begin the atomic acceptance process
  
  -- 1. Update invitation status
  UPDATE organization_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id,
    updated_at = now()
  WHERE id = invitation_record.id;
  
  -- 2. Create organization membership
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status
  ) VALUES (
    invitation_record.organization_id,
    p_user_id,
    invitation_record.role,
    'active'
  );
  
  -- Get organization name for response
  SELECT name INTO org_name
  FROM organizations
  WHERE id = invitation_record.organization_id;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'organization_name', COALESCE(org_name, 'Unknown Organization'),
    'role', invitation_record.role
  );
  
  RETURN result;
  
EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to accept invitation: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.adjust_inventory_quantity(p_item_id uuid, p_delta integer, p_reason text, p_work_order_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
  v_organization_id UUID;
  v_transaction_type inventory_transaction_type;
  v_user_id UUID;
BEGIN
  -- Get the current user's ID from auth context
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate that delta is non-zero (zero adjustments are not meaningful)
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Inventory adjustment delta cannot be zero';
  END IF;
  
  -- Lock the inventory item row for update (optimistic locking)
  -- This prevents race conditions by ensuring only one transaction can modify
  -- the row at a time, and all transactions see the most current quantity
  SELECT quantity_on_hand, organization_id
  INTO v_current_quantity, v_organization_id
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;
  
  -- Check if item exists
  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_item_id;
  END IF;
  
  -- Verify user has access to this organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = v_user_id
    AND organization_id = v_organization_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User does not have access to this organization';
  END IF;
  
  -- Calculate new quantity
  v_new_quantity := v_current_quantity + p_delta;
  
  -- Validate stock levels for negative adjustments (reductions)
  -- This prevents overselling when multiple users attempt to use the same part
  IF p_delta < 0 AND v_new_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: requested % units, but only % available',
      ABS(p_delta), v_current_quantity;
  END IF;
  
  -- Warn if new quantity is suspiciously low (but still allow it for restocks)
  IF v_new_quantity < -1000 THEN
    RAISE WARNING 'Inventory item % for org % adjusted by user % to suspiciously low quantity: %', 
      p_item_id, v_organization_id, v_user_id, v_new_quantity;
  END IF;
  
  -- Determine transaction type
  IF p_work_order_id IS NOT NULL THEN
    v_transaction_type := 'work_order';
  ELSIF p_delta < 0 THEN
    v_transaction_type := 'usage';
  ELSIF p_delta > 0 THEN
    -- p_delta > 0 (already validated that delta != 0)
    v_transaction_type := 'restock';
  END IF;
  
  -- Update inventory quantity
  UPDATE public.inventory_items
  SET 
    quantity_on_hand = v_new_quantity,
    updated_at = NOW()
  WHERE id = p_item_id;
  
  -- Insert transaction record
  INSERT INTO public.inventory_transactions (
    inventory_item_id,
    organization_id,
    user_id,
    previous_quantity,
    new_quantity,
    change_amount,
    transaction_type,
    work_order_id,
    notes
  ) VALUES (
    p_item_id,
    v_organization_id,
    v_user_id,
    v_current_quantity,
    v_new_quantity,
    p_delta,
    v_transaction_type,
    p_work_order_id,
    p_reason
  );
  
  -- Return new quantity
  RETURN v_new_quantity;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.billing_is_disabled()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Billing is disabled by default
  -- This can be overridden by setting a flag in the database if needed
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, assume billing is disabled for safety
    RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_billable_members(org_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.organization_members om
  JOIN public.profiles p ON om.user_id = p.id
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member'); -- Exclude owners from billing
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_organization_billing(org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_users INTEGER;
  storage_mb INTEGER;
  result jsonb;
BEGIN
  -- Get active user count (excluding owners)
  SELECT COUNT(*)::INTEGER INTO active_users
  FROM public.organization_members om
  JOIN public.profiles p ON om.user_id = p.id
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member');

  -- Get storage usage
  SELECT COALESCE(storage_used_mb, 0)::INTEGER INTO storage_mb
  FROM public.organizations
  WHERE id = org_id;

  -- Build result JSON
  result := jsonb_build_object(
    'organization_id', org_id,
    'active_users', active_users,
    'storage_mb', storage_mb,
    'user_license_cost', active_users * 1000, -- $10.00 per user in cents
    'storage_overage_cost', GREATEST(0, storage_mb - 1000) * 10, -- $0.10 per MB over 1GB
    'calculated_at', now()
  );

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_invitation_atomic(user_uuid uuid, invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  org_id uuid;
  invited_by_user uuid;
  is_admin_result boolean := false;
BEGIN
  -- Get invitation details
  SELECT organization_id, invited_by 
  INTO org_id, invited_by_user
  FROM organization_invitations
  WHERE id = invitation_id;
  
  -- If user created the invitation, they can manage it
  IF invited_by_user = user_uuid THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin
  IF org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members
      WHERE user_id = user_uuid 
        AND organization_id = org_id 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ) INTO is_admin_result;
    
    RETURN is_admin_result;
  END IF;
  
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_invitation_optimized(user_uuid uuid, invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  org_id uuid;
  invited_by_user uuid;
  is_admin_result boolean := false;
BEGIN
  -- Get invitation details
  SELECT organization_id, invited_by 
  INTO org_id, invited_by_user
  FROM organization_invitations
  WHERE id = invitation_id;
  
  -- If user created the invitation, they can manage it
  IF invited_by_user = user_uuid THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin
  IF org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members
      WHERE user_id = user_uuid 
        AND organization_id = org_id 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ) INTO is_admin_result;
    
    RETURN is_admin_result;
  END IF;
  
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_invitation_safe(user_uuid uuid, invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
  is_admin boolean := false;
  is_inviter boolean := false;
BEGIN
  SELECT organization_id, (invited_by = user_uuid) 
  INTO org_id, is_inviter
  FROM organization_invitations
  WHERE id = invitation_id;
  
  IF is_inviter THEN
    RETURN true;
  END IF;
  
  IF org_id IS NOT NULL THEN
    SELECT public.check_admin_bypass_fixed(user_uuid, org_id) INTO is_admin;
    RETURN is_admin;
  END IF;
  
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_admin_bypass_fixed(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  result boolean := false;
BEGIN
  -- Direct query without RLS interference
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_admin_permission_safe(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result boolean := false;
BEGIN
  -- Use the raw bypass function
  SELECT public.raw_check_admin_bypass(user_uuid, org_id) INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return false on any error
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_admin_with_context(user_uuid uuid, org_id uuid, bypass_context text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result boolean := false;
  current_context text;
BEGIN
  -- Get the current context from session variable
  current_context := current_setting('app.rls_context', true);
  
  -- If we're in a bypass context (like invitation creation), use direct query
  IF current_context = 'invitation_bypass' OR bypass_context = 'invitation_bypass' THEN
    -- Direct query without RLS interference for invitation context
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members
      WHERE user_id = user_uuid 
        AND organization_id = org_id 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ) INTO result;
  ELSE
    -- Normal RLS-aware query for regular contexts
    SELECT EXISTS (
      SELECT 1 
      FROM organization_members
      WHERE user_id = user_uuid 
        AND organization_id = org_id 
        AND role IN ('owner', 'admin')
        AND status = 'active'
        AND user_id = auth.uid() -- Only check for current user in normal context
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_email_exists_in_auth(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  email_exists boolean := false;
BEGIN
  -- Check if email exists in auth.users table
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE lower(trim(email)) = lower(trim(p_email))
  ) INTO email_exists;
  
  RETURN email_exists;
EXCEPTION WHEN OTHERS THEN
  -- Return true on error to be safe (don't create account if we can't verify)
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_member_bypass_fixed(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  result boolean := false;
BEGIN
  -- Direct query without RLS interference
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  ) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_org_access_direct(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_org_access_secure(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_org_admin_secure(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_team_access_secure(user_uuid uuid, team_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_team_role_secure(user_uuid uuid, team_uuid uuid, required_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
      AND tm.role::text = required_role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_quickbooks_oauth_sessions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.quickbooks_oauth_sessions
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < (now() - interval '7 days');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_rls_context()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.rls_context', '', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_historical_work_order_with_pm(p_organization_id uuid, p_equipment_id uuid, p_title text, p_description text, p_priority public.work_order_priority, p_status public.work_order_status, p_historical_start_date timestamp with time zone, p_historical_notes text DEFAULT NULL::text, p_assignee_id uuid DEFAULT NULL::uuid, p_team_id uuid DEFAULT NULL::uuid, p_due_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_completed_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_has_pm boolean DEFAULT false, p_pm_status text DEFAULT 'pending'::text, p_pm_completion_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_pm_notes text DEFAULT NULL::text, p_pm_checklist_data jsonb DEFAULT '[]'::jsonb)
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
    IF NOT is_org_admin(auth.uid(), p_organization_id) THEN
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
        team_id,
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
        p_team_id,
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_invitation_atomic(p_organization_id uuid, p_email text, p_role text, p_message text DEFAULT NULL::text, p_invited_by uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  invitation_id uuid;
  admin_check_result boolean := false;
BEGIN
  -- Direct admin check - completely bypass RLS
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = p_invited_by 
      AND organization_id = p_organization_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO admin_check_result;
  
  IF NOT admin_check_result THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: User does not have admin privileges';
  END IF;

  -- Check for existing PENDING invitation only (now that we allow multiple expired/declined)
  IF EXISTS (
    SELECT 1 FROM organization_invitations 
    WHERE organization_id = p_organization_id 
      AND lower(trim(email)) = lower(trim(p_email))
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for this email';
  END IF;

  -- Direct insert with minimal overhead
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    message,
    invited_by,
    expires_at,
    status,
    invitation_token
  ) VALUES (
    p_organization_id,
    lower(trim(p_email)),
    p_role,
    p_message,
    p_invited_by,
    now() + interval '7 days',
    'pending',
    gen_random_uuid()
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
  
EXCEPTION 
  WHEN SQLSTATE '23505' THEN
    -- Handle the new partial unique constraint violation
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for this email';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'INVITATION_ERROR: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_invitation_bypass(p_organization_id uuid, p_email text, p_role text, p_message text DEFAULT NULL::text, p_invited_by uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_id uuid;
  is_admin boolean;
BEGIN
  -- Use the fixed bypass function
  SELECT public.check_admin_bypass_fixed(p_invited_by, p_organization_id) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User % does not have permission to create invitations for organization %', p_invited_by, p_organization_id;
  END IF;

  -- Direct INSERT without any RLS triggers
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    message,
    invited_by,
    expires_at,
    status,
    invitation_token
  ) VALUES (
    p_organization_id,
    lower(trim(p_email)),
    p_role,
    p_message,
    p_invited_by,
    now() + interval '7 days',
    'pending',
    gen_random_uuid()
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to create invitation for %: %', p_email, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_invitation_bypass_optimized(p_organization_id uuid, p_email text, p_role text, p_message text DEFAULT NULL::text, p_invited_by uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  invitation_id uuid;
  admin_check_result boolean := false;
BEGIN
  -- Direct admin check without any RLS interference
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = p_invited_by 
      AND organization_id = p_organization_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) INTO admin_check_result;
  
  IF NOT admin_check_result THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: User does not have admin privileges for organization %', p_organization_id;
  END IF;

  -- Check for existing invitation
  IF EXISTS (
    SELECT 1 FROM organization_invitations 
    WHERE organization_id = p_organization_id 
      AND lower(trim(email)) = lower(trim(p_email))
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for %', p_email;
  END IF;

  -- Direct INSERT with minimal overhead
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    message,
    invited_by,
    expires_at,
    status,
    invitation_token
  ) VALUES (
    p_organization_id,
    lower(trim(p_email)),
    p_role,
    p_message,
    p_invited_by,
    now() + interval '7 days',
    'pending',
    gen_random_uuid()
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
  
EXCEPTION 
  WHEN SQLSTATE '23505' THEN
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An invitation to this email already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'INVITATION_ERROR: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_invitation_with_context(p_organization_id uuid, p_email text, p_role text, p_message text DEFAULT NULL::text, p_invited_by uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_id uuid;
  admin_check_result boolean := false;
BEGIN
  -- Set the bypass context for this operation
  PERFORM public.set_rls_context('invitation_bypass');
  
  -- Check admin privileges using context-aware function
  SELECT public.check_admin_with_context(p_invited_by, p_organization_id, 'invitation_bypass') INTO admin_check_result;
  
  IF NOT admin_check_result THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'PERMISSION_DENIED: User does not have admin privileges for organization %', p_organization_id;
  END IF;

  -- Check for existing invitation
  IF EXISTS (
    SELECT 1 FROM organization_invitations 
    WHERE organization_id = p_organization_id 
      AND lower(trim(email)) = lower(trim(p_email))
      AND status = 'pending'
  ) THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An active invitation already exists for %', p_email;
  END IF;

  -- Insert invitation
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    message,
    invited_by,
    expires_at,
    status,
    invitation_token
  ) VALUES (
    p_organization_id,
    lower(trim(p_email)),
    p_role,
    p_message,
    p_invited_by,
    now() + interval '7 days',
    'pending',
    gen_random_uuid()
  ) RETURNING id INTO invitation_id;
  
  -- Clear the context
  PERFORM public.clear_rls_context();
  
  RETURN invitation_id;
  
EXCEPTION 
  WHEN SQLSTATE '23505' THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'DUPLICATE_INVITATION: An invitation to this email already exists';
  WHEN OTHERS THEN
    PERFORM public.clear_rls_context();
    RAISE EXCEPTION 'INVITATION_ERROR: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_quickbooks_oauth_session(p_organization_id uuid, p_redirect_url text DEFAULT NULL::text)
 RETURNS TABLE(session_token text, nonce text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user_id UUID;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_nonce TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create OAuth session';
  END IF;

  -- Validate user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of the specified organization';
  END IF;

  -- Validate user is admin/owner (only admins can connect QuickBooks)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can connect QuickBooks';
  END IF;

  -- Generate session token (32 random bytes, base64 encoded = 44 chars)
  -- gen_random_bytes() is from pgcrypto extension in extensions schema
  v_session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Generate nonce for CSRF protection
  v_nonce := encode(gen_random_bytes(16), 'hex');
  
  -- Session expires in 1 hour
  v_expires_at := NOW() + INTERVAL '1 hour';

  -- Insert session
  INSERT INTO public.quickbooks_oauth_sessions (
    session_token,
    organization_id,
    user_id,
    nonce,
    redirect_url,
    expires_at
  ) VALUES (
    v_session_token,
    p_organization_id,
    v_user_id,
    v_nonce,
    p_redirect_url,
    v_expires_at
  );

  RETURN QUERY SELECT v_session_token, v_nonce, v_expires_at;
END;
$function$
;

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
  SELECT wo.*, t.name as team_name, e.name as equipment_name
  INTO wo_record
  FROM public.work_orders wo
  LEFT JOIN public.teams t ON wo.team_id = t.id
  LEFT JOIN public.equipment e ON wo.equipment_id = e.id
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
$function$
;

CREATE OR REPLACE FUNCTION public.disconnect_quickbooks(p_organization_id uuid, p_realm_id text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of the specified organization';
  END IF;

  -- Validate user is admin/owner (only admins can disconnect QuickBooks)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can disconnect QuickBooks';
  END IF;

  -- Delete credentials (using SECURITY DEFINER to bypass RLS)
  IF p_realm_id IS NOT NULL THEN
    -- Delete specific realm
    DELETE FROM public.quickbooks_credentials
    WHERE organization_id = p_organization_id
    AND realm_id = p_realm_id;
  ELSE
    -- Delete all credentials for organization
    DELETE FROM public.quickbooks_credentials
    WHERE organization_id = p_organization_id;
  END IF;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count = 0 THEN
    RETURN QUERY SELECT false::BOOLEAN, 'No QuickBooks connection found to disconnect'::TEXT;
  ELSE
    RETURN QUERY SELECT true::BOOLEAN, 'QuickBooks disconnected successfully'::TEXT;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_old_invitations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if we're already inside this trigger to prevent recursion
  IF current_setting('app.expire_invitations_running', true) = 'true' THEN
    RETURN NULL;
  END IF;
  
  -- Set the flag to indicate we're running
  PERFORM set_config('app.expire_invitations_running', 'true', true);
  
  -- Mark invitations as expired if they're past expiration and still pending
  UPDATE public.organization_invitations
  SET 
    status = 'expired',
    expired_at = now(),
    updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND expired_at IS NULL;
    
  -- Clear the flag
  PERFORM set_config('app.expire_invitations_running', 'false', true);
  
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_billing_period()
 RETURNS TABLE(period_start timestamp with time zone, period_end timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    date_trunc('month', CURRENT_TIMESTAMP) AS period_start,
    (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 second') AS period_end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_global_pm_template_names()
 RETURNS TABLE(name text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT t.name
  FROM public.pm_checklist_templates t
  WHERE t.organization_id IS NULL
  ORDER BY t.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token_secure(p_token uuid)
 RETURNS TABLE(id uuid, organization_id uuid, organization_name text, email text, role text, status text, expires_at timestamp with time zone, message text, invited_by_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_email text;
BEGIN
  -- First check if the invitation exists and get the email
  SELECT oi.email INTO invitation_email
  FROM organization_invitations oi
  WHERE oi.invitation_token = p_token
    AND oi.status = 'pending'
    AND oi.expires_at > now();
  
  -- If no valid invitation found, return empty
  IF invitation_email IS NULL THEN
    RETURN;
  END IF;
  
  -- Verify the current user's email matches the invitation email
  IF auth.email() IS NULL OR lower(trim(auth.email())) != lower(trim(invitation_email)) THEN
    RETURN;
  END IF;
  
  -- Return the invitation details with organization and inviter info
  RETURN QUERY
  SELECT 
    oi.id,
    oi.organization_id,
    o.name as organization_name,
    oi.email,
    oi.role,
    oi.status,
    oi.expires_at,
    oi.message,
    p.name as invited_by_name
  FROM organization_invitations oi
  JOIN organizations o ON o.id = oi.organization_id
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE oi.invitation_token = p_token
    AND oi.status = 'pending'
    AND oi.expires_at > now()
    AND lower(trim(oi.email)) = lower(trim(auth.email()));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_invitations_atomic(user_uuid uuid, org_id uuid)
 RETURNS TABLE(id uuid, email text, role text, status text, message text, created_at timestamp with time zone, expires_at timestamp with time zone, accepted_at timestamp with time zone, declined_at timestamp with time zone, expired_at timestamp with time zone, slot_reserved boolean, slot_purchase_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  is_admin_result boolean := false;
BEGIN
  -- Direct admin check
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  ) INTO is_admin_result;
  
  IF is_admin_result THEN
    -- Admins see all invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
    ORDER BY oi.created_at DESC;
  ELSE
    -- Regular users see only their own invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
      AND oi.invited_by = user_uuid
    ORDER BY oi.created_at DESC;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_invitations_bypass_optimized(user_uuid uuid, org_id uuid)
 RETURNS TABLE(id uuid, email text, role text, status text, message text, created_at timestamp with time zone, expires_at timestamp with time zone, accepted_at timestamp with time zone, declined_at timestamp with time zone, expired_at timestamp with time zone, slot_reserved boolean, slot_purchase_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  is_admin_result boolean := false;
BEGIN
  -- Direct admin check with explicit table qualification
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')  -- Explicitly qualify as om.role
      AND om.status = 'active'
  ) INTO is_admin_result;
  
  IF is_admin_result THEN
    -- Admins see all invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
    ORDER BY oi.created_at DESC;
  ELSE
    -- Regular users see only their own invitations
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
      AND oi.invited_by = user_uuid
    ORDER BY oi.created_at DESC;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_completed_pm(equipment_uuid uuid)
 RETURNS TABLE(id uuid, work_order_id uuid, completed_at timestamp with time zone, completed_by uuid, work_order_title text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    pm.id,
    pm.work_order_id,
    pm.completed_at,
    pm.completed_by,
    wo.title as work_order_title
  FROM preventative_maintenance pm
  JOIN work_orders wo ON pm.work_order_id = wo.id
  WHERE pm.equipment_id = equipment_uuid 
    AND pm.status = 'completed'
    AND pm.completed_at IS NOT NULL
  ORDER BY pm.completed_at DESC
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_member_profiles_secure(org_id uuid)
 RETURNS TABLE(id uuid, name text, email text, created_at timestamp with time zone, updated_at timestamp with time zone, email_private boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
      AND organization_id = org_id 
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: not a member of this organization';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    CASE 
      WHEN p.email_private = true AND p.id != auth.uid() THEN NULL
      ELSE p.email
    END as email,
    p.created_at,
    p.updated_at,
    p.email_private
  FROM profiles p
  JOIN organization_members om ON p.id = om.user_id
  WHERE om.organization_id = org_id 
    AND om.status = 'active';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_exemptions(org_id uuid)
 RETURNS TABLE(exemption_type text, exemption_value integer, reason text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    be.exemption_type,
    be.exemption_value,
    be.reason,
    be.expires_at
  FROM public.billing_exemptions be
  WHERE be.organization_id = org_id
    AND be.is_active = true
    AND (be.expires_at IS NULL OR be.expires_at > now());
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_member_profile(member_user_id uuid)
 RETURNS TABLE(id uuid, name text, email text, email_private boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    CASE 
      WHEN p.id = auth.uid() THEN p.email  -- User can see their own email
      ELSE NULL  -- Other users' emails are not returned
    END as email,
    p.email_private,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = member_user_id
    AND (
      p.id = auth.uid() OR p.id IN (
        SELECT om.user_id 
        FROM organization_members om
        WHERE om.organization_id IN (
          SELECT om2.organization_id 
          FROM organization_members om2 
          WHERE om2.user_id = auth.uid() 
            AND om2.status = 'active'
        )
        AND om.status = 'active'
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_premium_features(org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  fleet_map_active BOOLEAN DEFAULT false;
BEGIN
  -- Check if fleet map is active
  SELECT EXISTS(
    SELECT 1 FROM public.organization_subscriptions
    WHERE organization_id = org_id
    AND feature_type = 'fleet_map'
    AND status = 'active'
    AND current_period_end > now()
  ) INTO fleet_map_active;

  result := jsonb_build_object(
    'organization_id', org_id,
    'fleet_map_enabled', fleet_map_active,
    'premium_features', CASE
      WHEN fleet_map_active THEN jsonb_build_array('Fleet Map')
      ELSE jsonb_build_array()
    END
  );

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_slot_availability(org_id uuid)
 RETURNS TABLE(total_purchased integer, used_slots integer, available_slots integer, current_period_start timestamp with time zone, current_period_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_slot_record RECORD;
  actual_used_slots INTEGER;
BEGIN
  -- Find currently active slots (where now() is between start and end dates)
  SELECT 
    COALESCE(SUM(os.purchased_slots), 0)::INTEGER as total_purchased,
    MIN(os.billing_period_start) as period_start,
    MAX(os.billing_period_end) as period_end
  INTO active_slot_record
  FROM public.organization_slots os
  WHERE os.organization_id = org_id
    AND os.billing_period_start <= now()
    AND os.billing_period_end >= now();
    
  -- Count actual active members (excluding owners from billing)
  SELECT COUNT(*)::INTEGER INTO actual_used_slots
  FROM public.organization_members om
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member'); -- Exclude owners from slot usage
    
  -- Return the values with proper calculation
  total_purchased := COALESCE(active_slot_record.total_purchased, 0);
  used_slots := actual_used_slots;
  available_slots := GREATEST(0, total_purchased - actual_used_slots); -- Ensure never negative
  current_period_start := COALESCE(active_slot_record.period_start, now());
  current_period_end := COALESCE(active_slot_record.period_end, now());
  
  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_slot_availability_with_exemptions(org_id uuid)
 RETURNS TABLE(total_purchased integer, used_slots integer, available_slots integer, exempted_slots integer, current_period_start timestamp with time zone, current_period_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_slot_record RECORD;
  actual_used_slots INTEGER;
  exemption_value INTEGER DEFAULT 0;
BEGIN
  -- Get active exemptions
  SELECT COALESCE(SUM(be.exemption_value), 0)::INTEGER INTO exemption_value
  FROM public.billing_exemptions be
  WHERE be.organization_id = org_id
    AND be.exemption_type = 'user_licenses'
    AND be.is_active = true
    AND (be.expires_at IS NULL OR be.expires_at > now());
    
  -- Find currently active purchased slots
  SELECT 
    COALESCE(SUM(os.purchased_slots), 0)::INTEGER as total_purchased,
    MIN(os.billing_period_start) as period_start,
    MAX(os.billing_period_end) as period_end
  INTO active_slot_record
  FROM public.organization_slots os
  WHERE os.organization_id = org_id
    AND os.billing_period_start <= now()
    AND os.billing_period_end >= now();
    
  -- Count actual active members (excluding owners from billing)
  SELECT COUNT(*)::INTEGER INTO actual_used_slots
  FROM public.organization_members om
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member');
    
  -- Calculate totals including exemptions
  total_purchased := COALESCE(active_slot_record.total_purchased, 0);
  used_slots := actual_used_slots;
  exempted_slots := exemption_value;
  available_slots := GREATEST(0, total_purchased + exempted_slots - actual_used_slots);
  current_period_start := COALESCE(active_slot_record.period_start, now());
  current_period_end := COALESCE(active_slot_record.period_end, now());
  
  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_quickbooks_connection_status(p_organization_id uuid)
 RETURNS TABLE(is_connected boolean, realm_id text, connected_at timestamp with time zone, access_token_expires_at timestamp with time zone, refresh_token_expires_at timestamp with time zone, is_access_token_valid boolean, is_refresh_token_valid boolean, scopes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_credentials RECORD;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validate user is a member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of the specified organization';
  END IF;

  -- Validate user is admin/owner (only admins can view connection status)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can view QuickBooks connection status';
  END IF;

  -- Query credentials (using SECURITY DEFINER to bypass RLS)
  SELECT 
    qc.realm_id,
    qc.created_at,
    qc.access_token_expires_at,
    qc.refresh_token_expires_at,
    qc.scopes
  INTO v_credentials
  FROM public.quickbooks_credentials qc
  WHERE qc.organization_id = p_organization_id
  ORDER BY qc.created_at DESC
  LIMIT 1;

  -- If no credentials found, return not connected
  IF v_credentials IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      false::BOOLEAN,
      false::BOOLEAN,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Return connection status with non-sensitive metadata
  RETURN QUERY SELECT 
    true::BOOLEAN,
    v_credentials.realm_id,
    v_credentials.created_at,
    v_credentials.access_token_expires_at,
    v_credentials.refresh_token_expires_at,
    (v_credentials.access_token_expires_at > NOW())::BOOLEAN,
    (v_credentials.refresh_token_expires_at > NOW())::BOOLEAN,
    v_credentials.scopes;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_system_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  user_id_result uuid;
BEGIN
  -- Try to get an org owner/admin first
  SELECT user_id INTO user_id_result
  FROM organization_members
  WHERE role IN ('owner', 'admin') AND status = 'active'
  ORDER BY joined_date ASC
  LIMIT 1;
  
  -- If no owner/admin, try any active org member
  IF user_id_result IS NULL THEN
    SELECT user_id INTO user_id_result
    FROM organization_members
    WHERE status = 'active'
    ORDER BY joined_date ASC
    LIMIT 1;
  END IF;
  
  -- If still no user, try any profile
  IF user_id_result IS NULL THEN
    SELECT id INTO user_id_result
    FROM profiles
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN user_id_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_invitations_safe(user_uuid uuid, org_id uuid)
 RETURNS TABLE(id uuid, email text, role text, status text, message text, created_at timestamp with time zone, expires_at timestamp with time zone, accepted_at timestamp with time zone, declined_at timestamp with time zone, expired_at timestamp with time zone, slot_reserved boolean, slot_purchase_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use the fixed bypass function
  IF public.check_admin_bypass_fixed(user_uuid, org_id) THEN
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
    ORDER BY oi.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT 
      oi.id, oi.email, oi.role, oi.status, oi.message,
      oi.created_at, oi.expires_at, oi.accepted_at, 
      oi.declined_at, oi.expired_at, oi.slot_reserved, 
      oi.slot_purchase_id
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
      AND oi.invited_by = user_uuid
    ORDER BY oi.created_at DESC;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_managed_teams(user_uuid uuid)
 RETURNS TABLE(team_id uuid, team_name text, organization_id uuid, is_only_manager boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.organization_id,
    (
      SELECT COUNT(*) = 1
      FROM team_members tm2 
      WHERE tm2.team_id = t.id 
      AND tm2.role = 'manager'
    ) as is_only_manager
  FROM teams t
  JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid 
    AND tm.role = 'manager';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_org_role_direct(user_uuid uuid, org_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND status = 'active'
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_org_role_secure(user_uuid uuid, org_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND status = 'active'
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_organization_membership(user_uuid uuid)
 RETURNS TABLE(organization_id uuid, role text, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT om.organization_id, om.role, om.status
  FROM public.organization_members om
  WHERE om.user_id = user_uuid AND om.status = 'active';
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid)
 RETURNS TABLE(organization_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = user_uuid 
    AND om.status = 'active';
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_team_memberships(user_uuid uuid, org_id uuid)
 RETURNS TABLE(team_id uuid, team_name text, role text, joined_date timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tm.team_id, t.name as team_name, tm.role::text, tm.joined_date
  FROM public.team_members tm
  JOIN public.teams t ON tm.team_id = t.id
  WHERE tm.user_id = user_uuid 
    AND t.organization_id = org_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_teams_for_notifications(user_uuid uuid)
 RETURNS TABLE(organization_id uuid, organization_name text, team_id uuid, team_name text, user_role text, has_access boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    t.id as team_id,
    t.name as team_name,
    COALESCE(tm.role::text, om.role) as user_role,
    CASE 
      WHEN om.role IN ('owner', 'admin') THEN true
      WHEN tm.role IN ('technician', 'requestor', 'manager') THEN true
      ELSE false
    END as has_access
  FROM public.organizations o
  JOIN public.organization_members om ON o.id = om.organization_id
  JOIN public.teams t ON o.id = t.organization_id
  LEFT JOIN public.team_members tm ON t.id = tm.team_id AND tm.user_id = user_uuid
  WHERE om.user_id = user_uuid
    AND om.status = 'active'
    AND (
      om.role IN ('owner', 'admin') OR 
      tm.role IN ('technician', 'requestor', 'manager')
    )
  ORDER BY o.name, t.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_invitation_account_creation(p_invitation_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  result jsonb;
BEGIN
  -- Get invitation details
  SELECT id, organization_id, email, role, status
  INTO invitation_record
  FROM organization_invitations
  WHERE id = p_invitation_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid invitation'
    );
  END IF;
  
  -- Update invitation status to accepted
  UPDATE organization_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id,
    updated_at = now()
  WHERE id = p_invitation_id;
  
  -- Create organization membership
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status
  ) VALUES (
    invitation_record.organization_id,
    p_user_id,
    invitation_record.role,
    'active'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'role', invitation_record.role
  );
  
EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User is already a member of this organization'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Failed to process invitation: ' || SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_membership_billing_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update billing metrics for the affected organization
  IF TG_OP = 'INSERT' THEN
    PERFORM public.update_organization_billing_metrics(NEW.organization_id);
    
    -- Log billing event
    INSERT INTO public.billing_events (organization_id, event_type, user_id, event_data)
    VALUES (
      NEW.organization_id, 
      'member_added', 
      NEW.user_id,
      jsonb_build_object('role', NEW.role, 'status', NEW.status)
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_organization_billing_metrics(OLD.organization_id);
    
    -- Log billing event
    INSERT INTO public.billing_events (organization_id, event_type, user_id, event_data)
    VALUES (
      OLD.organization_id, 
      'member_removed', 
      OLD.user_id,
      jsonb_build_object('role', OLD.role, 'status', OLD.status)
    );
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update for both old and new organizations if changed
    IF OLD.organization_id != NEW.organization_id THEN
      PERFORM public.update_organization_billing_metrics(OLD.organization_id);
      PERFORM public.update_organization_billing_metrics(NEW.organization_id);
    ELSE
      PERFORM public.update_organization_billing_metrics(NEW.organization_id);
    END IF;
    
    -- Log billing event if role or status changed
    IF OLD.role != NEW.role OR OLD.status != NEW.status THEN
      INSERT INTO public.billing_events (organization_id, event_type, user_id, event_data)
      VALUES (
        NEW.organization_id, 
        'member_updated', 
        NEW.user_id,
        jsonb_build_object(
          'old_role', OLD.role, 
          'new_role', NEW.role,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
  org_name text;
  invited_name text;
BEGIN
  -- Insert user profile (this part already exists)
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );

  -- Get the organization name from user metadata (or use default)
  org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');

  -- Check if user is signing up via invitation
  IF NEW.raw_user_meta_data ? 'invited_organization_id' THEN
    -- Fetch the inviter's organization name from the database
    SELECT name INTO invited_name 
    FROM public.organizations 
    WHERE id = (NEW.raw_user_meta_data->>'invited_organization_id')::uuid;
  ELSIF NEW.raw_user_meta_data ? 'invited_organization_name' THEN
    -- Use the invited organization name from metadata (fallback)
    invited_name := NEW.raw_user_meta_data->>'invited_organization_name';
  END IF;

  -- Enforce: Cannot create an organization with the same name as the inviter's
  IF invited_name IS NOT NULL AND lower(trim(org_name)) = lower(trim(invited_name)) THEN
    RAISE EXCEPTION 'ORGANIZATION_NAME_CONFLICT_WITH_INVITED'
      USING DETAIL = 'Choose a different organization name than the one inviting you.';
  END IF;

  -- Create a new organization for the user
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    org_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (
    new_org_id,
    NEW.id,
    'owner',
    'active'
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_team_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set team_id to null for all equipment assigned to the deleted team
  UPDATE public.equipment 
  SET team_id = NULL, updated_at = now()
  WHERE team_id = OLD.id;
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_team_manager_removal(user_uuid uuid, org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  team_record RECORD;
  org_owner_id uuid;
  transfer_count INTEGER := 0;
  result jsonb;
BEGIN
  -- Get organization owner
  SELECT user_id INTO org_owner_id
  FROM organization_members
  WHERE organization_id = org_id 
    AND role = 'owner' 
    AND status = 'active'
  LIMIT 1;
  
  IF org_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No organization owner found');
  END IF;
  
  -- Handle teams where user is the only manager
  FOR team_record IN 
    SELECT team_id, team_name, is_only_manager
    FROM get_user_managed_teams(user_uuid)
    WHERE organization_id = org_id AND is_only_manager = true
  LOOP
    -- Add organization owner as manager if not already a member
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (team_record.team_id, org_owner_id, 'manager')
    ON CONFLICT (team_id, user_id) 
    DO UPDATE SET role = 'manager';
    
    transfer_count := transfer_count + 1;
  END LOOP;
  
  -- Remove user from all teams in the organization
  DELETE FROM team_members 
  WHERE user_id = user_uuid 
    AND team_id IN (
      SELECT id FROM teams WHERE organization_id = org_id
    );
  
  result := jsonb_build_object(
    'success', true,
    'teams_transferred', transfer_count,
    'new_manager_id', org_owner_id
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_quickbooks_token_refresh()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  current_user_role text;
  cron_job_id text;
BEGIN
  -- Authorization check: Only allow postgres superuser in pg_cron context
  -- pg_cron executes jobs as the postgres superuser and sets cron.job_id
  SELECT rolname
  INTO current_user_role
  FROM pg_roles
  WHERE oid = current_user::oid;

  -- Detect pg_cron context via cron.job_id (NULL when not running under pg_cron)
  cron_job_id := current_setting('cron.job_id', true);

  -- Check that the caller is postgres and that this is running inside a pg_cron job
  IF current_user_role != 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by the pg_cron scheduler as postgres';
  END IF;

  -- Retrieve the service role key from vault
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- Retrieve the Supabase URL from vault
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF service_role_key IS NULL OR supabase_url IS NULL THEN
    RAISE WARNING 'QuickBooks token refresh skipped: vault secrets not configured';
    RETURN;
  END IF;

  -- Basic validation of Supabase URL from vault (defense-in-depth)
  -- Ensure it is an https Supabase project URL to avoid SSRF/misconfiguration issues
  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'QuickBooks token refresh skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;
  -- Call the edge function and capture request ID
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/quickbooks-refresh-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  ) INTO request_id;

  -- Verify request was scheduled
  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule QuickBooks token refresh request';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_admin(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_organization_admin(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_organization_member(user_uuid uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.leave_organization_safely(org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  owner_count INTEGER;
  result jsonb;
BEGIN
  -- Get user's role in the organization
  SELECT role INTO user_role
  FROM organization_members
  WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND status = 'active';
  
  IF user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this organization');
  END IF;
  
  -- Prevent last owner from leaving
  IF user_role = 'owner' THEN
    SELECT COUNT(*) INTO owner_count
    FROM organization_members
    WHERE organization_id = org_id 
      AND role = 'owner' 
      AND status = 'active';
    
    IF owner_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot leave as the last owner');
    END IF;
  END IF;
  
  -- Preserve user attribution and handle team transfers
  PERFORM preserve_user_attribution(auth.uid());
  PERFORM handle_team_manager_removal(auth.uid(), org_id);
  
  -- Remove the user
  DELETE FROM organization_members
  WHERE user_id = auth.uid() 
    AND organization_id = org_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Successfully left organization');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.list_pm_templates(org_id uuid)
 RETURNS TABLE(id uuid, organization_id uuid, name text, description text, template_data jsonb, is_protected boolean, created_by uuid, updated_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT 
    t.id,
    t.organization_id,
    t.name,
    t.description,
    t.template_data,
    t.is_protected,
    t.created_by,
    t.updated_by,
    t.created_at,
    t.updated_at
  FROM public.pm_checklist_templates t
  WHERE t.organization_id IS NULL 
     OR t.organization_id = org_id
  ORDER BY t.organization_id NULLS FIRST, t.name;
$function$
;

CREATE OR REPLACE FUNCTION public.log_invitation_performance(function_name text, execution_time_ms numeric, success boolean, error_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log to a simple table for monitoring (create if not exists)
  CREATE TABLE IF NOT EXISTS invitation_performance_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name text NOT NULL,
    execution_time_ms numeric NOT NULL,
    success boolean NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
  );
  
  INSERT INTO invitation_performance_logs (
    function_name, 
    execution_time_ms, 
    success, 
    error_message
  ) VALUES (
    function_name, 
    execution_time_ms, 
    success, 
    error_message
  );
EXCEPTION WHEN OTHERS THEN
  -- Silently fail to avoid blocking main operations
  NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_pm_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if status actually changed and it's not a revert operation
  IF OLD.status IS DISTINCT FROM NEW.status 
     AND NOT EXISTS (
       SELECT 1 FROM pm_status_history 
       WHERE pm_id = NEW.id 
       AND changed_at > now() - interval '1 second'
       AND changed_by = auth.uid()
     ) THEN
    INSERT INTO pm_status_history (
      pm_id, old_status, new_status, changed_by, reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), 'Status updated'
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_work_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if status actually changed and it's not a revert operation
  IF OLD.status IS DISTINCT FROM NEW.status 
     AND NOT EXISTS (
       SELECT 1 FROM work_order_status_history 
       WHERE work_order_id = NEW.id 
       AND changed_at > now() - interval '1 second'
       AND changed_by = auth.uid()
     ) THEN
    INSERT INTO work_order_status_history (
      work_order_id, old_status, new_status, changed_by, reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status, auth.uid(), 'Status updated'
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.preserve_user_attribution(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_name TEXT;
BEGIN
  -- Get user name from profiles
  SELECT name INTO user_name 
  FROM profiles 
  WHERE id = user_uuid;
  
  IF user_name IS NULL THEN
    user_name := 'Unknown User';
  END IF;
  
  -- Update work orders created by user
  UPDATE work_orders 
  SET created_by_name = user_name
  WHERE created_by = user_uuid 
    AND created_by_name IS NULL;
  
  -- Update work orders assigned to user
  UPDATE work_orders 
  SET assignee_name = user_name
  WHERE assignee_id = user_uuid 
    AND assignee_name IS NULL;
  
  -- Update work order notes
  UPDATE work_order_notes 
  SET author_name = user_name
  WHERE author_id = user_uuid 
    AND author_name IS NULL;
  
  -- Update equipment notes
  UPDATE equipment_notes 
  SET author_name = user_name
  WHERE author_id = user_uuid 
    AND author_name IS NULL;
  
  -- Update work order images
  UPDATE work_order_images 
  SET uploaded_by_name = user_name
  WHERE uploaded_by = user_uuid 
    AND uploaded_by_name IS NULL;
  
  -- Update equipment note images
  UPDATE equipment_note_images 
  SET uploaded_by_name = user_name
  WHERE uploaded_by = user_uuid 
    AND uploaded_by_name IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_quickbooks_tokens_manual()
 RETURNS TABLE(credentials_count integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cred_count INTEGER;
BEGIN
  -- Count credentials that might need refresh
  SELECT COUNT(*) INTO cred_count
  FROM public.quickbooks_credentials
  WHERE access_token_expires_at < (NOW() + INTERVAL '15 minutes')
    AND refresh_token_expires_at > NOW();
  
  -- Trigger the refresh function
  PERFORM public.invoke_quickbooks_token_refresh();
  
  RETURN QUERY SELECT 
    cred_count,
    'Token refresh triggered for ' || cred_count || ' credentials. Check edge function logs for results.'::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.release_reserved_slot(org_id uuid, invitation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  billing_period RECORD;
BEGIN
  -- Get current billing period
  SELECT * INTO billing_period FROM public.get_current_billing_period();
  
  -- Release the slot by decrementing used_slots
  UPDATE public.organization_slots
  SET 
    used_slots = GREATEST(0, used_slots - 1),
    updated_at = now()
  WHERE organization_id = org_id
    AND billing_period_start <= billing_period.period_start
    AND billing_period_end >= billing_period.period_end;
  
  -- Mark invitation as no longer reserving slot
  UPDATE public.organization_invitations
  SET 
    slot_reserved = false,
    updated_at = now()
  WHERE id = invitation_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_organization_member_safely(user_uuid uuid, org_id uuid, removed_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  user_name TEXT;
  owner_count INTEGER;
  team_result jsonb;
  result jsonb;
BEGIN
  -- Get user details
  SELECT om.role, p.name 
  INTO user_role, user_name
  FROM organization_members om
  JOIN profiles p ON om.user_id = p.id
  WHERE om.user_id = user_uuid 
    AND om.organization_id = org_id 
    AND om.status = 'active';
  
  IF user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this organization');
  END IF;
  
  -- Check if this is the last owner
  IF user_role = 'owner' THEN
    SELECT COUNT(*) INTO owner_count
    FROM organization_members
    WHERE organization_id = org_id 
      AND role = 'owner' 
      AND status = 'active';
    
    IF owner_count <= 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last owner of the organization');
    END IF;
  END IF;
  
  -- Preserve user attribution in historical records
  PERFORM preserve_user_attribution(user_uuid);
  
  -- Handle team management transfers
  SELECT handle_team_manager_removal(user_uuid, org_id) INTO team_result;
  
  IF NOT (team_result->>'success')::boolean THEN
    RETURN team_result;
  END IF;
  
  -- Remove user from organization
  DELETE FROM organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id;
  
  -- Create audit log entry with 'general' notification type
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    org_id,
    removed_by,
    'general',
    'Member Removed',
    CONCAT(COALESCE(user_name, 'Unknown User'), ' was removed from the organization'),
    jsonb_build_object(
      'removed_user_id', user_uuid,
      'removed_user_name', user_name,
      'removed_user_role', user_role,
      'teams_transferred', team_result->'teams_transferred',
      'removed_by', removed_by,
      'timestamp', now()
    )
  );
  
  result := jsonb_build_object(
    'success', true,
    'removed_user_name', user_name,
    'removed_user_role', user_role,
    'teams_transferred', team_result->'teams_transferred',
    'new_manager_id', team_result->'new_manager_id'
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reserve_slot_for_invitation(org_id uuid, invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  slot_available BOOLEAN := FALSE;
  billing_period RECORD;
  slot_record RECORD;
BEGIN
  -- Get current billing period
  SELECT * INTO billing_period FROM public.get_current_billing_period();
  
  -- Check if slots are available and get the first available slot record
  SELECT * INTO slot_record
  FROM public.organization_slots
  WHERE organization_id = org_id
    AND billing_period_start <= billing_period.period_start
    AND billing_period_end >= billing_period.period_end
    AND (purchased_slots - used_slots) > 0
  ORDER BY created_at
  FOR UPDATE;
  
  IF FOUND THEN
    -- Reserve the slot by incrementing used_slots
    UPDATE public.organization_slots
    SET 
      used_slots = used_slots + 1,
      updated_at = now()
    WHERE id = slot_record.id;
    
    -- Mark invitation as having reserved slot
    UPDATE public.organization_invitations
    SET 
      slot_reserved = true,
      updated_at = now()
    WHERE id = invitation_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revert_pm_completion(p_pm_id uuid, p_reason text DEFAULT 'Reverted by admin'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_status text;
  org_id uuid;
  result jsonb;
BEGIN
  -- Get current status and org
  SELECT status, organization_id INTO current_status, org_id
  FROM preventative_maintenance
  WHERE id = p_pm_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PM record not found');
  END IF;
  
  -- Check if user is admin
  IF NOT is_org_admin(auth.uid(), org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  -- Only allow reverting from completed
  IF current_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only revert completed PM records');
  END IF;
  
  -- Insert history record
  INSERT INTO pm_status_history (
    pm_id, old_status, new_status, changed_by, reason, metadata
  ) VALUES (
    p_pm_id, current_status, 'pending', auth.uid(), p_reason,
    jsonb_build_object('reverted_from', current_status, 'reverted_at', now())
  );
  
  -- Update PM status
  UPDATE preventative_maintenance 
  SET 
    status = 'pending',
    completed_at = NULL,
    completed_by = NULL,
    updated_at = now()
  WHERE id = p_pm_id;
  
  RETURN jsonb_build_object('success', true, 'old_status', current_status, 'new_status', 'pending');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revert_work_order_status(p_work_order_id uuid, p_reason text DEFAULT 'Reverted by admin'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_status work_order_status;
  org_id uuid;
  result jsonb;
BEGIN
  -- Get current status and org
  SELECT status, organization_id INTO current_status, org_id
  FROM work_orders
  WHERE id = p_work_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;
  
  -- Check if user is admin
  IF NOT is_org_admin(auth.uid(), org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  -- Only allow reverting from completed or cancelled
  IF current_status NOT IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only revert completed or cancelled work orders');
  END IF;
  
  -- Insert history record
  INSERT INTO work_order_status_history (
    work_order_id, old_status, new_status, changed_by, reason, metadata
  ) VALUES (
    p_work_order_id, current_status, 'accepted', auth.uid(), p_reason,
    jsonb_build_object('reverted_from', current_status, 'reverted_at', now())
  );
  
  -- Update work order status
  UPDATE work_orders 
  SET 
    status = 'accepted',
    completed_date = NULL,
    updated_at = now()
  WHERE id = p_work_order_id;
  
  RETURN jsonb_build_object('success', true, 'old_status', current_status, 'new_status', 'accepted');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_bypass_triggers(bypass boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.bypass_triggers', bypass::text, true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_geocoded_locations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_rls_context(context_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.rls_context', context_name, true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.should_notify_user_for_work_order(user_uuid uuid, work_order_team_id uuid, work_order_status text, organization_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  notification_enabled boolean := false;
  status_enabled boolean := false;
BEGIN
  -- Check if user has notification settings for this team
  SELECT 
    ns.enabled,
    (ns.statuses @> to_jsonb(ARRAY[work_order_status]))
  INTO notification_enabled, status_enabled
  FROM public.notification_settings ns
  WHERE ns.user_id = user_uuid 
    AND ns.team_id = work_order_team_id
    AND ns.organization_id = organization_uuid;
  
  -- If no settings found, default to false (opt-in)
  IF notification_enabled IS NULL THEN
    RETURN false;
  END IF;
  
  -- Return true only if notifications are enabled AND the specific status is enabled
  RETURN notification_enabled AND status_enabled;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_stripe_subscription_slots(org_id uuid, subscription_id text, quantity integer, period_start timestamp with time zone, period_end timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Upsert organization slots based on Stripe subscription
  INSERT INTO public.organization_slots (
    organization_id,
    slot_type,
    purchased_slots,
    used_slots,
    billing_period_start,
    billing_period_end,
    stripe_subscription_id,
    amount_paid_cents
  )
  VALUES (
    org_id,
    'user_license',
    quantity,
    0, -- Reset used slots for new period
    period_start,
    period_end,
    subscription_id,
    quantity * 1000 -- $10 per slot in cents
  )
  ON CONFLICT (organization_id, billing_period_start) 
  DO UPDATE SET
    purchased_slots = EXCLUDED.purchased_slots,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    amount_paid_cents = EXCLUDED.amount_paid_cents,
    updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_work_order_primary_equipment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- When a new primary equipment is set or updated
    IF NEW.is_primary THEN
        -- First, unset any other primary equipment for this work order
        UPDATE public.work_order_equipment 
        SET is_primary = false 
        WHERE work_order_id = NEW.work_order_id 
          AND id != NEW.id 
          AND is_primary = true;
        
        -- Update the work_orders table with the new primary equipment
        UPDATE public.work_orders 
        SET equipment_id = NEW.equipment_id 
        WHERE id = NEW.work_order_id;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.update_equipment_working_hours(p_equipment_id uuid, p_new_hours numeric, p_update_source text DEFAULT 'manual'::text, p_work_order_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_hours numeric;
  user_name text;
  org_id uuid;
  result jsonb;
BEGIN
  -- Get current hours and organization
  SELECT working_hours, organization_id INTO current_hours, org_id
  FROM equipment
  WHERE id = p_equipment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Equipment not found');
  END IF;
  
  -- Check permissions
  IF NOT (
    is_org_admin(auth.uid(), org_id) 
    OR (
      is_org_member(auth.uid(), org_id) 
      AND EXISTS (
        SELECT 1 FROM equipment e
        WHERE e.id = p_equipment_id
        AND e.team_id IS NOT NULL 
        AND e.team_id IN (
          SELECT tm.team_id FROM team_members tm 
          WHERE tm.user_id = auth.uid()
        )
      )
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  -- Get user name
  SELECT name INTO user_name FROM profiles WHERE id = auth.uid();
  
  -- Update equipment working hours
  UPDATE equipment 
  SET 
    working_hours = p_new_hours,
    updated_at = now()
  WHERE id = p_equipment_id;
  
  -- Create history entry
  INSERT INTO equipment_working_hours_history (
    equipment_id,
    old_hours,
    new_hours,
    hours_added,
    updated_by,
    updated_by_name,
    update_source,
    work_order_id,
    notes
  ) VALUES (
    p_equipment_id,
    current_hours,
    p_new_hours,
    p_new_hours - COALESCE(current_hours, 0),
    auth.uid(),
    user_name,
    p_update_source,
    p_work_order_id,
    p_notes
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_hours', current_hours,
    'new_hours', p_new_hours,
    'hours_added', p_new_hours - COALESCE(current_hours, 0)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_notification_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_organization_billing_metrics(org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.organizations 
  SET 
    billable_members = public.calculate_billable_members(org_id),
    last_billing_calculation = now()
  WHERE id = org_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_organization_member_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = NEW.organization_id AND status = 'active'
    )
    WHERE id = NEW.organization_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = OLD.organization_id AND status = 'active'
    )
    WHERE id = OLD.organization_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new organizations if organization_id changed
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = OLD.organization_id AND status = 'active'
    )
    WHERE id = OLD.organization_id;
    
    UPDATE organizations 
    SET member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = NEW.organization_id AND status = 'active'
    )
    WHERE id = NEW.organization_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_pm_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quickbooks_credentials_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quickbooks_export_logs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_quickbooks_team_customers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_work_order_costs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_access(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- All users have access when billing is disabled
  -- Simplified to not depend on user_entitlements view (which is created in later migration)
  RETURN billing_is_disabled();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_invitation_for_account_creation(p_invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  email_exists boolean;
  result jsonb;
BEGIN
  -- Get invitation details
  SELECT id, organization_id, email, role, status, expires_at, invited_by
  INTO invitation_record
  FROM organization_invitations
  WHERE id = p_invitation_id;
  
  -- Validate invitation exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invitation not found'
    );
  END IF;
  
  -- Validate invitation status
  IF invitation_record.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invitation is not pending'
    );
  END IF;
  
  -- Validate invitation not expired
  IF invitation_record.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invitation has expired'
    );
  END IF;
  
  -- Check if email already exists in auth system
  SELECT public.check_email_exists_in_auth(invitation_record.email) INTO email_exists;
  
  IF email_exists THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User already exists in the system'
    );
  END IF;
  
  -- Return success with invitation details
  RETURN jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', invitation_record.id,
      'organization_id', invitation_record.organization_id,
      'email', invitation_record.email,
      'role', invitation_record.role,
      'invited_by', invitation_record.invited_by
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Validation failed: ' || SQLERRM
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_member_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT member_count, max_members INTO current_count, max_count
    FROM organizations WHERE id = NEW.organization_id;
    
    IF current_count >= max_count THEN
      RAISE EXCEPTION 'Organization has reached maximum member limit of %', max_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_quickbooks_oauth_session(p_session_token text)
 RETURNS TABLE(organization_id uuid, user_id uuid, nonce text, redirect_url text, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session RECORD;
BEGIN
  -- Look up session
  SELECT 
    s.organization_id,
    s.user_id,
    s.nonce,
    s.redirect_url,
    s.expires_at,
    s.used_at
  INTO v_session
  FROM public.quickbooks_oauth_sessions s
  WHERE s.session_token = p_session_token;

  -- Check if session exists
  IF v_session IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Check if session is expired
  IF v_session.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Check if session was already used (prevent replay attacks)
  IF v_session.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Mark session as used
  UPDATE public.quickbooks_oauth_sessions
  SET used_at = NOW()
  WHERE session_token = p_session_token;

  -- Return session data
  RETURN QUERY SELECT 
    v_session.organization_id,
    v_session.user_id,
    v_session.nonce,
    v_session.redirect_url,
    true::BOOLEAN;
END;
$function$
;


