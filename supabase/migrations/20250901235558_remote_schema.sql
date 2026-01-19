

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






-- Create ENUM types idempotently (handle existing types)
DO $$ 
BEGIN
    CREATE TYPE "public"."equipment_status" AS ENUM (
        'active',
        'maintenance',
        'inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "public"."equipment_status" OWNER TO "postgres";


DO $$ 
BEGIN
    CREATE TYPE "public"."organization_plan" AS ENUM (
        'free',
        'premium'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "public"."organization_plan" OWNER TO "postgres";


DO $$ 
BEGIN
    CREATE TYPE "public"."team_member_role" AS ENUM (
        'owner',
        'manager',
        'technician',
        'requestor',
        'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "public"."team_member_role" OWNER TO "postgres";


DO $$ 
BEGIN
    CREATE TYPE "public"."work_order_priority" AS ENUM (
        'low',
        'medium',
        'high'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "public"."work_order_priority" OWNER TO "postgres";


DO $$ 
BEGIN
    CREATE TYPE "public"."work_order_status" AS ENUM (
        'submitted',
        'accepted',
        'assigned',
        'in_progress',
        'on_hold',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "public"."work_order_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_billable_members"("org_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.organization_members om
  JOIN public.profiles p ON om.user_id = p.id
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member'); -- Exclude owners from billing
$$;


ALTER FUNCTION "public"."calculate_billable_members"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_admin_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_admin_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_admin_with_context"("user_uuid" "uuid", "org_id" "uuid", "bypass_context" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_admin_with_context"("user_uuid" "uuid", "org_id" "uuid", "bypass_context" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_exists_in_auth"("p_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_email_exists_in_auth"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_member_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."check_member_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_org_access_direct"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."check_org_access_direct"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_org_admin_secure"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."check_org_admin_secure"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
  );
$$;


ALTER FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
      AND tm.role::text = required_role
  );
$$;


ALTER FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_rls_context"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('app.rls_context', '', true);
END;
$$;


ALTER FUNCTION "public"."clear_rls_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text" DEFAULT NULL::"text", "p_assignee_id" "uuid" DEFAULT NULL::"uuid", "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_due_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_completed_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_has_pm" boolean DEFAULT false, "p_pm_status" "text" DEFAULT 'pending'::"text", "p_pm_completion_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_pm_notes" "text" DEFAULT NULL::"text", "p_pm_checklist_data" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text" DEFAULT NULL::"text", "p_invited_by" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation_bypass"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text" DEFAULT NULL::"text", "p_invited_by" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_invitation_bypass"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation_bypass_optimized"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text" DEFAULT NULL::"text", "p_invited_by" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_invitation_bypass_optimized"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation_with_context"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text" DEFAULT NULL::"text", "p_invited_by" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_invitation_with_context"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."expire_old_invitations"() IS 'Expires old pending invitations with recursion protection to prevent infinite loops';



CREATE OR REPLACE FUNCTION "public"."get_current_billing_period"() RETURNS TABLE("period_start" timestamp with time zone, "period_end" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    date_trunc('month', CURRENT_TIMESTAMP) AS period_start,
    (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 second') AS period_end;
$$;


ALTER FUNCTION "public"."get_current_billing_period"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_id"() IS 'Optimized function to get current user ID for RLS policies - reduces auth.uid() calls';



CREATE OR REPLACE FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "organization_name" "text", "email" "text", "role" "text", "status" "text", "expires_at" timestamp with time zone, "message" "text", "invited_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") IS 'Securely retrieves invitation details by token - validates user email matches invitation before returning data';



CREATE OR REPLACE FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "status" "text", "message" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "accepted_at" timestamp with time zone, "declined_at" timestamp with time zone, "expired_at" timestamp with time zone, "slot_reserved" boolean, "slot_purchase_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitations_bypass_optimized"("user_uuid" "uuid", "org_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "status" "text", "message" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "accepted_at" timestamp with time zone, "declined_at" timestamp with time zone, "expired_at" timestamp with time zone, "slot_reserved" boolean, "slot_purchase_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_invitations_bypass_optimized"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") RETURNS TABLE("id" "uuid", "work_order_id" "uuid", "completed_at" timestamp with time zone, "completed_by" "uuid", "work_order_title" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "email_private" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_exemptions"("org_id" "uuid") RETURNS TABLE("exemption_type" "text", "exemption_value" integer, "reason" "text", "expires_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    be.exemption_type,
    be.exemption_value,
    be.reason,
    be.expires_at
  FROM public.billing_exemptions be
  WHERE be.organization_id = org_id
    AND be.is_active = true
    AND (be.expires_at IS NULL OR be.expires_at > now());
$$;


ALTER FUNCTION "public"."get_organization_exemptions"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "email_private" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") IS 'Securely retrieves member profile respecting email privacy settings';



CREATE OR REPLACE FUNCTION "public"."get_organization_premium_features"("org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_organization_premium_features"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_slot_availability"("org_id" "uuid") RETURNS TABLE("total_purchased" integer, "used_slots" integer, "available_slots" integer, "current_period_start" timestamp with time zone, "current_period_end" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_organization_slot_availability"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_slot_availability_with_exemptions"("org_id" "uuid") RETURNS TABLE("total_purchased" integer, "used_slots" integer, "available_slots" integer, "exempted_slots" integer, "current_period_start" timestamp with time zone, "current_period_end" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_organization_slot_availability_with_exemptions"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "status" "text", "message" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "accepted_at" timestamp with time zone, "declined_at" timestamp with time zone, "expired_at" timestamp with time zone, "slot_reserved" boolean, "slot_purchase_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_managed_teams"("user_uuid" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "organization_id" "uuid", "is_only_manager" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_managed_teams"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role
  FROM organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND status = 'active'
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org_role_secure"("user_uuid" "uuid", "org_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role
  FROM public.organization_members
  WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND status = 'active'
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_org_role_secure"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization_membership"("user_uuid" "uuid") RETURNS TABLE("organization_id" "uuid", "role" "text", "status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT om.organization_id, om.role, om.status
  FROM public.organization_members om
  WHERE om.user_id = user_uuid AND om.status = 'active';
$$;


ALTER FUNCTION "public"."get_user_organization_membership"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") RETURNS TABLE("organization_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = user_uuid 
    AND om.status = 'active';
$$;


ALTER FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "role" "text", "joined_date" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT tm.team_id, t.name as team_name, tm.role::text, tm.joined_date
  FROM public.team_members tm
  JOIN public.teams t ON tm.team_id = t.id
  WHERE tm.user_id = user_uuid 
    AND t.organization_id = org_id;
$$;


ALTER FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_invitation_account_creation"("p_invitation_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_invitation_account_creation"("p_invitation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_membership_billing_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_membership_billing_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Insert user profile (this part already exists)
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );

  -- Create a new organization for the user
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', 'My Organization'),
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_team_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Set team_id to null for all equipment assigned to the deleted team
  UPDATE public.equipment 
  SET team_id = NULL, updated_at = now()
  WHERE team_id = OLD.id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_team_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_team_manager_removal"("user_uuid" "uuid", "org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_team_manager_removal"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") IS 'Consolidated function to check organization admin status - replaces multiple similar functions';



CREATE OR REPLACE FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = user_uuid 
      AND organization_id = org_id 
      AND status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") IS 'Consolidated function to check organization membership - replaces multiple similar functions';



CREATE OR REPLACE FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") IS 'Optimized function to check admin access - uses indexed lookups';



CREATE OR REPLACE FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") IS 'Optimized function to check organization membership - replaces complex EXISTS subqueries';



CREATE OR REPLACE FUNCTION "public"."leave_organization_safely"("org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."leave_organization_safely"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_pm_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_pm_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_work_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_work_order_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text" DEFAULT 'Reverted by admin'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text" DEFAULT 'Reverted by admin'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_bypass_triggers"("bypass" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('app.bypass_triggers', bypass::text, true);
END;
$$;


ALTER FUNCTION "public"."set_bypass_triggers"("bypass" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_geocoded_locations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_geocoded_locations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_rls_context"("context_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('app.rls_context', context_name, true);
END;
$$;


ALTER FUNCTION "public"."set_rls_context"("context_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text" DEFAULT 'manual'::"text", "p_work_order_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.organizations 
  SET 
    billable_members = public.calculate_billable_members(org_id),
    last_billing_calculation = now()
  WHERE id = org_id;
END;
$$;


ALTER FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organization_member_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_organization_member_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pm_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pm_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_work_order_costs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_work_order_costs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_member_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_member_limit"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."billing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "event_data" "jsonb" DEFAULT '{}'::"jsonb",
    "amount_change" numeric(10,2) DEFAULT 0,
    "effective_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false,
    CONSTRAINT "billing_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['member_added'::"text", 'member_removed'::"text", 'plan_upgraded'::"text", 'plan_downgraded'::"text", 'storage_used'::"text", 'feature_enabled'::"text", 'feature_disabled'::"text"])))
);


ALTER TABLE "public"."billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_exemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "exemption_type" "text" DEFAULT 'user_licenses'::"text" NOT NULL,
    "exemption_value" integer DEFAULT 0 NOT NULL,
    "reason" "text",
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_exemptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_exemptions" IS 'Billing exemptions table - Access restricted to organization admins only for security';



CREATE TABLE IF NOT EXISTS "public"."billing_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "usage_type" "text" NOT NULL,
    "usage_value" integer NOT NULL,
    "billing_period_start" timestamp with time zone NOT NULL,
    "billing_period_end" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."billing_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contacts" (
    "customer_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_contacts_role_check" CHECK (("role" = ANY (ARRAY['customer_viewer'::"text", 'customer_requestor'::"text", 'customer_manager'::"text"])))
);


ALTER TABLE "public"."customer_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "name" "text",
    "address" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "manufacturer" "text" NOT NULL,
    "model" "text" NOT NULL,
    "serial_number" "text" NOT NULL,
    "status" "public"."equipment_status" DEFAULT 'active'::"public"."equipment_status" NOT NULL,
    "location" "text" NOT NULL,
    "installation_date" "date" NOT NULL,
    "warranty_expiration" "date",
    "last_maintenance" "date",
    "notes" "text",
    "image_url" "text",
    "custom_attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "last_known_location" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid",
    "working_hours" numeric DEFAULT 0,
    "default_pm_template_id" "uuid",
    "import_id" "text",
    "customer_id" "uuid"
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_note_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_note_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "description" "text",
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by_name" "text"
);


ALTER TABLE "public"."equipment_note_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "hours_worked" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone DEFAULT "now"(),
    "author_name" "text"
);


ALTER TABLE "public"."equipment_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_working_hours_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "old_hours" numeric,
    "new_hours" numeric NOT NULL,
    "hours_added" numeric,
    "updated_by" "uuid" NOT NULL,
    "updated_by_name" "text",
    "update_source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "work_order_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipment_working_hours_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geocoded_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "input_text" "text" NOT NULL,
    "normalized_text" "text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "formatted_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."geocoded_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitation_performance_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "execution_time_ms" numeric NOT NULL,
    "success" boolean NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invitation_performance_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_removal_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "removed_user_id" "uuid" NOT NULL,
    "removed_user_name" "text" NOT NULL,
    "removed_user_role" "text" NOT NULL,
    "removed_by" "uuid" NOT NULL,
    "teams_transferred" integer DEFAULT 0,
    "new_manager_id" "uuid",
    "removal_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."member_removal_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_invitations" boolean DEFAULT true,
    "email_work_orders" boolean DEFAULT true,
    "email_equipment_alerts" boolean DEFAULT true,
    "email_billing" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['work_order_request'::"text", 'work_order_accepted'::"text", 'work_order_assigned'::"text", 'work_order_completed'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "message" "text",
    "invitation_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by" "uuid",
    "slot_reserved" boolean DEFAULT false,
    "slot_purchase_id" "uuid",
    "declined_at" timestamp with time zone,
    "expired_at" timestamp with time zone,
    "offers_account_creation" boolean DEFAULT false,
    CONSTRAINT "organization_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"]))),
    CONSTRAINT "organization_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_invitations" IS 'RLS policies updated to use security definer functions to prevent circular dependencies';



CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slot_purchase_id" "uuid",
    "activated_slot_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."organization_members" REPLICA IDENTITY FULL;


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_members" IS 'RLS simplified to prevent circular dependency. Admin permissions handled at application level.';



CREATE TABLE IF NOT EXISTS "public"."organization_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "slot_type" "text" DEFAULT 'user_license'::"text" NOT NULL,
    "purchased_slots" integer DEFAULT 0 NOT NULL,
    "used_slots" integer DEFAULT 0 NOT NULL,
    "billing_period_start" timestamp with time zone NOT NULL,
    "billing_period_end" timestamp with time zone NOT NULL,
    "stripe_payment_intent_id" "text",
    "amount_paid_cents" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_subscription_id" "text",
    "stripe_price_id" "text",
    "auto_renew" boolean DEFAULT true
);

ALTER TABLE ONLY "public"."organization_slots" REPLICA IDENTITY FULL;


ALTER TABLE "public"."organization_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "feature_type" "text" NOT NULL,
    "quantity" integer DEFAULT 1,
    "unit_price_cents" integer NOT NULL,
    "billing_cycle" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "plan" "public"."organization_plan" DEFAULT 'free'::"public"."organization_plan" NOT NULL,
    "member_count" integer DEFAULT 1 NOT NULL,
    "max_members" integer DEFAULT 5 NOT NULL,
    "features" "text"[] DEFAULT ARRAY['Equipment Management'::"text", 'Work Orders'::"text", 'Team Management'::"text"] NOT NULL,
    "billing_cycle" "text",
    "next_billing_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "billable_members" integer DEFAULT 0,
    "storage_used_mb" integer DEFAULT 0,
    "fleet_map_enabled" boolean DEFAULT false,
    "last_billing_calculation" timestamp with time zone DEFAULT "now"(),
    "logo" "text",
    "background_color" "text",
    "customers_feature_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."logo" IS 'URL or path to organization logo image';



COMMENT ON COLUMN "public"."organizations"."background_color" IS 'Hex color code for organization branding (e.g., #ff0000)';



CREATE TABLE IF NOT EXISTS "public"."pm_checklist_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_protected" boolean DEFAULT false NOT NULL,
    "template_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pm_checklist_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pm_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pm_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preventative_maintenance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "checklist_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "notes" "text",
    "is_historical" boolean DEFAULT false NOT NULL,
    "historical_completion_date" timestamp with time zone,
    "historical_notes" "text",
    "template_id" "uuid",
    CONSTRAINT "preventative_maintenance_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."preventative_maintenance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_private" boolean DEFAULT false
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles table - Access restricted to users own profile and organization members only for security';



COMMENT ON COLUMN "public"."profiles"."email_private" IS 'When true, email is hidden from organization members (except admins). Default: false (email visible to org members)';



CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "scanned_by" "uuid" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location" "text",
    "notes" "text"
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slot_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "purchased_by" "uuid" NOT NULL,
    "slot_type" "text" DEFAULT 'user_license'::"text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price_cents" integer DEFAULT 1000 NOT NULL,
    "total_amount_cents" integer NOT NULL,
    "stripe_payment_intent_id" "text",
    "stripe_session_id" "text",
    "billing_period_start" timestamp with time zone NOT NULL,
    "billing_period_end" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."slot_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_event_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "subscription_id" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_event_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "stripe_customer_id" "text",
    "subscribed" boolean DEFAULT false NOT NULL,
    "subscription_tier" "text",
    "subscription_end" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."team_member_role" DEFAULT 'technician'::"public"."team_member_role" NOT NULL,
    "joined_date" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_license_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_license_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "event_id" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."webhook_events" IS 'Idempotency gate for external webhooks (e.g., Stripe). A row per processed event_id.';



CREATE TABLE IF NOT EXISTS "public"."work_order_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_price_cents" integer DEFAULT 0 NOT NULL,
    "total_price_cents" integer GENERATED ALWAYS AS ("round"(("quantity" * ("unit_price_cents")::numeric))) STORED,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "work_order_costs_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "work_order_costs_unit_price_cents_check" CHECK (("unit_price_cents" >= 0))
);


ALTER TABLE "public"."work_order_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_order_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note_id" "uuid",
    "uploaded_by_name" "text"
);


ALTER TABLE "public"."work_order_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_order_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "hours_worked" numeric(5,2) DEFAULT 0,
    "is_private" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_name" "text"
);


ALTER TABLE "public"."work_order_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "old_status" "public"."work_order_status",
    "new_status" "public"."work_order_status" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_historical_creation" boolean DEFAULT false
);


ALTER TABLE "public"."work_order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "public"."work_order_priority" DEFAULT 'medium'::"public"."work_order_priority" NOT NULL,
    "status" "public"."work_order_status" DEFAULT 'submitted'::"public"."work_order_status" NOT NULL,
    "assignee_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" timestamp with time zone,
    "estimated_hours" integer,
    "completed_date" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "acceptance_date" timestamp with time zone,
    "has_pm" boolean DEFAULT false NOT NULL,
    "pm_required" boolean DEFAULT false NOT NULL,
    "created_by_name" "text",
    "assignee_name" "text",
    "is_historical" boolean DEFAULT false NOT NULL,
    "historical_start_date" timestamp with time zone,
    "historical_notes" "text",
    "created_by_admin" "uuid",
    "team_id" "uuid"
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_exemptions"
    ADD CONSTRAINT "billing_exemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_usage"
    ADD CONSTRAINT "billing_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("customer_id", "user_id");



ALTER TABLE ONLY "public"."customer_sites"
    ADD CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_note_images"
    ADD CONSTRAINT "equipment_note_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_organization_id_serial_number_key" UNIQUE ("organization_id", "serial_number");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_working_hours_history"
    ADD CONSTRAINT "equipment_working_hours_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geocoded_locations"
    ADD CONSTRAINT "geocoded_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_performance_logs"
    ADD CONSTRAINT "invitation_performance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_removal_audit"
    ADD CONSTRAINT "member_removal_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_slots"
    ADD CONSTRAINT "organization_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_unique_name_per_org" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."pm_status_history"
    ADD CONSTRAINT "pm_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "preventative_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slot_purchases"
    ADD CONSTRAINT "slot_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slot_purchases"
    ADD CONSTRAINT "slot_purchases_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."stripe_event_logs"
    ADD CONSTRAINT "stripe_event_logs_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."stripe_event_logs"
    ADD CONSTRAINT "stripe_event_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_exemptions"
    ADD CONSTRAINT "unique_active_exemption" UNIQUE ("organization_id", "exemption_type", "is_active");



ALTER TABLE ONLY "public"."organization_slots"
    ADD CONSTRAINT "unique_org_billing_period" UNIQUE ("organization_id", "billing_period_start");



COMMENT ON CONSTRAINT "unique_org_billing_period" ON "public"."organization_slots" IS 'Ensures one slot record per organization per billing period for proper upsert operations';



ALTER TABLE ONLY "public"."user_license_subscriptions"
    ADD CONSTRAINT "user_license_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_license_subscriptions"
    ADD CONSTRAINT "user_license_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_images"
    ADD CONSTRAINT "work_order_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_notes"
    ADD CONSTRAINT "work_order_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_status_history"
    ADD CONSTRAINT "work_order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "geocoded_locations_org_norm_unique" ON "public"."geocoded_locations" USING "btree" ("organization_id", "normalized_text");



CREATE INDEX "idx_billing_events_organization_id" ON "public"."billing_events" USING "btree" ("organization_id");



CREATE INDEX "idx_billing_events_user_id" ON "public"."billing_events" USING "btree" ("user_id");



CREATE INDEX "idx_billing_usage_organization_id" ON "public"."billing_usage" USING "btree" ("organization_id");



CREATE INDEX "idx_customer_contacts_customer_id" ON "public"."customer_contacts" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_contacts_user_id" ON "public"."customer_contacts" USING "btree" ("user_id");



CREATE INDEX "idx_customer_sites_customer_id" ON "public"."customer_sites" USING "btree" ("customer_id");



CREATE INDEX "idx_customers_organization_id" ON "public"."customers" USING "btree" ("organization_id");



CREATE INDEX "idx_equipment_customer_id" ON "public"."equipment" USING "btree" ("customer_id");



CREATE INDEX "idx_equipment_default_pm_template" ON "public"."equipment" USING "btree" ("default_pm_template_id");



CREATE INDEX "idx_equipment_import_id" ON "public"."equipment" USING "btree" ("import_id") WHERE ("import_id" IS NOT NULL);



CREATE INDEX "idx_equipment_note_images_equipment_note_id" ON "public"."equipment_note_images" USING "btree" ("equipment_note_id");



CREATE INDEX "idx_equipment_note_images_uploaded_by" ON "public"."equipment_note_images" USING "btree" ("uploaded_by");



CREATE INDEX "idx_equipment_notes_author_id" ON "public"."equipment_notes" USING "btree" ("author_id");



CREATE INDEX "idx_equipment_notes_equipment_author" ON "public"."equipment_notes" USING "btree" ("equipment_id", "author_id");



CREATE INDEX "idx_equipment_notes_equipment_created" ON "public"."equipment_notes" USING "btree" ("equipment_id", "created_at");



CREATE INDEX "idx_equipment_notes_equipment_id" ON "public"."equipment_notes" USING "btree" ("equipment_id");



CREATE INDEX "idx_equipment_notes_last_modified_by" ON "public"."equipment_notes" USING "btree" ("last_modified_by");



CREATE INDEX "idx_equipment_organization_id" ON "public"."equipment" USING "btree" ("organization_id");



CREATE INDEX "idx_equipment_team_id" ON "public"."equipment" USING "btree" ("team_id");



CREATE INDEX "idx_invitations_offers_account_creation" ON "public"."organization_invitations" USING "btree" ("offers_account_creation") WHERE ("offers_account_creation" = true);



CREATE INDEX "idx_notes_author_id" ON "public"."notes" USING "btree" ("author_id");



CREATE INDEX "idx_notes_equipment_id" ON "public"."notes" USING "btree" ("equipment_id");



CREATE INDEX "idx_org_invitations_org_status_optimized" ON "public"."organization_invitations" USING "btree" ("organization_id", "status") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "idx_org_invitations_pending_unique" ON "public"."organization_invitations" USING "btree" ("organization_id", "lower"(TRIM(BOTH FROM "email"))) WHERE ("status" = 'pending'::"text");



COMMENT ON INDEX "public"."idx_org_invitations_pending_unique" IS 'Ensures only one pending invitation per email per organization, while allowing multiple expired/declined invitations for re-inviting';



CREATE INDEX "idx_org_members_nonrecursive_admin_check" ON "public"."organization_members" USING "btree" ("organization_id", "user_id", "role", "status") WHERE (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_org_members_nonrecursive_member_check" ON "public"."organization_members" USING "btree" ("organization_id", "user_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_org_members_org_admin_status_optimized" ON "public"."organization_members" USING "btree" ("organization_id", "role", "status") WHERE (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_org_members_org_role_status" ON "public"."organization_members" USING "btree" ("organization_id", "role", "status");



CREATE INDEX "idx_org_members_user_org_role_status_optimized" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "role", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_org_members_user_org_status" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "status");



CREATE INDEX "idx_organization_invitations_accepted_by" ON "public"."organization_invitations" USING "btree" ("accepted_by");



CREATE INDEX "idx_organization_invitations_email_org" ON "public"."organization_invitations" USING "btree" ("email", "organization_id");



CREATE INDEX "idx_organization_invitations_invited_by" ON "public"."organization_invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_organization_invitations_org_status" ON "public"."organization_invitations" USING "btree" ("organization_id", "status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_organization_invitations_organization_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_invitations_slot_purchase_id" ON "public"."organization_invitations" USING "btree" ("slot_purchase_id");



CREATE INDEX "idx_organization_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");



CREATE INDEX "idx_organization_members_org_role_status" ON "public"."organization_members" USING "btree" ("organization_id", "role", "status") WHERE (("status" = 'active'::"text") AND ("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])));



CREATE INDEX "idx_organization_members_org_status" ON "public"."organization_members" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_organization_members_organization_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_slot_purchase_id" ON "public"."organization_members" USING "btree" ("slot_purchase_id");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organization_members_user_org_active" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_organization_members_user_org_status" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_organization_members_user_status" ON "public"."organization_members" USING "btree" ("user_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_organization_slots_organization_id" ON "public"."organization_slots" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_subscriptions_organization_id" ON "public"."organization_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_pm_historical" ON "public"."preventative_maintenance" USING "btree" ("is_historical", "organization_id");



CREATE INDEX "idx_preventative_maintenance_completed_by" ON "public"."preventative_maintenance" USING "btree" ("completed_by");



CREATE INDEX "idx_preventative_maintenance_created_by" ON "public"."preventative_maintenance" USING "btree" ("created_by");



CREATE INDEX "idx_preventative_maintenance_equipment_id" ON "public"."preventative_maintenance" USING "btree" ("equipment_id");



CREATE INDEX "idx_preventative_maintenance_organization_id" ON "public"."preventative_maintenance" USING "btree" ("organization_id");



CREATE INDEX "idx_preventative_maintenance_work_order_id" ON "public"."preventative_maintenance" USING "btree" ("work_order_id");



CREATE INDEX "idx_scans_equipment_id" ON "public"."scans" USING "btree" ("equipment_id");



CREATE INDEX "idx_scans_scanned_by" ON "public"."scans" USING "btree" ("scanned_by");



CREATE INDEX "idx_slot_purchases_organization_id" ON "public"."slot_purchases" USING "btree" ("organization_id");



CREATE INDEX "idx_slot_purchases_purchased_by" ON "public"."slot_purchases" USING "btree" ("purchased_by");



CREATE INDEX "idx_stripe_event_logs_subscription_id" ON "public"."stripe_event_logs" USING "btree" ("subscription_id");



CREATE INDEX "idx_stripe_event_logs_type" ON "public"."stripe_event_logs" USING "btree" ("type");



CREATE INDEX "idx_subscribers_user_id" ON "public"."subscribers" USING "btree" ("user_id");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_team_members_user_team" ON "public"."team_members" USING "btree" ("user_id", "team_id");



CREATE INDEX "idx_teams_organization_id" ON "public"."teams" USING "btree" ("organization_id");



CREATE INDEX "idx_user_license_subscriptions_organization_id" ON "public"."user_license_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_work_order_costs_created_by" ON "public"."work_order_costs" USING "btree" ("created_by");



CREATE INDEX "idx_work_order_costs_work_order_id" ON "public"."work_order_costs" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_images_note_id" ON "public"."work_order_images" USING "btree" ("note_id");



CREATE INDEX "idx_work_order_images_uploaded_by" ON "public"."work_order_images" USING "btree" ("uploaded_by");



CREATE INDEX "idx_work_order_images_work_order_id" ON "public"."work_order_images" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_notes_author_id" ON "public"."work_order_notes" USING "btree" ("author_id");



CREATE INDEX "idx_work_order_notes_work_order_id" ON "public"."work_order_notes" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_orders_assignee_id" ON "public"."work_orders" USING "btree" ("assignee_id");



CREATE INDEX "idx_work_orders_assignee_status" ON "public"."work_orders" USING "btree" ("assignee_id", "status") WHERE ("assignee_id" IS NOT NULL);



CREATE INDEX "idx_work_orders_created_by" ON "public"."work_orders" USING "btree" ("created_by");



CREATE INDEX "idx_work_orders_created_date" ON "public"."work_orders" USING "btree" ("created_date");



CREATE INDEX "idx_work_orders_due_date" ON "public"."work_orders" USING "btree" ("due_date");



CREATE INDEX "idx_work_orders_equipment_id" ON "public"."work_orders" USING "btree" ("equipment_id");



CREATE INDEX "idx_work_orders_equipment_status" ON "public"."work_orders" USING "btree" ("equipment_id", "status");



CREATE INDEX "idx_work_orders_historical" ON "public"."work_orders" USING "btree" ("is_historical", "organization_id");



CREATE INDEX "idx_work_orders_org_due_date" ON "public"."work_orders" USING "btree" ("organization_id", "due_date") WHERE ("due_date" IS NOT NULL);



CREATE INDEX "idx_work_orders_org_status" ON "public"."work_orders" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_work_orders_organization_id" ON "public"."work_orders" USING "btree" ("organization_id");



CREATE INDEX "idx_work_orders_priority" ON "public"."work_orders" USING "btree" ("priority");



CREATE INDEX "idx_work_orders_status" ON "public"."work_orders" USING "btree" ("status");



CREATE INDEX "idx_work_orders_team_id" ON "public"."work_orders" USING "btree" ("team_id");



CREATE UNIQUE INDEX "organization_subscriptions_org_feature_unique" ON "public"."organization_subscriptions" USING "btree" ("organization_id", "feature_type");



CREATE OR REPLACE TRIGGER "before_team_delete" BEFORE DELETE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_team_deletion"();



CREATE OR REPLACE TRIGGER "expire_invitations_trigger" AFTER INSERT OR UPDATE ON "public"."organization_invitations" FOR EACH STATEMENT EXECUTE FUNCTION "public"."expire_old_invitations"();



CREATE OR REPLACE TRIGGER "expire_old_invitations_trigger" AFTER INSERT ON "public"."organization_invitations" FOR EACH STATEMENT EXECUTE FUNCTION "public"."expire_old_invitations"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."notes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_equipment_notes" BEFORE UPDATE ON "public"."equipment_notes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_notifications" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_organization_slots" BEFORE UPDATE ON "public"."organization_slots" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_slot_purchases" BEFORE UPDATE ON "public"."slot_purchases" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_user_license_subscriptions" BEFORE UPDATE ON "public"."user_license_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_work_order_notes" BEFORE UPDATE ON "public"."work_order_notes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "organization_member_billing_update" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."handle_membership_billing_update"();



CREATE OR REPLACE TRIGGER "pm_status_change_trigger" AFTER UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."log_pm_status_change"();



CREATE OR REPLACE TRIGGER "trg_pm_checklist_templates_touch" BEFORE UPDATE ON "public"."pm_checklist_templates" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_geocoded_locations_updated_at" BEFORE UPDATE ON "public"."geocoded_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_geocoded_locations_updated_at"();



CREATE OR REPLACE TRIGGER "trg_work_orders_touch" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_member_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_member_count"();



CREATE OR REPLACE TRIGGER "trigger_update_pm_updated_at" BEFORE UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."update_pm_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_member_limit" BEFORE INSERT OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."validate_member_limit"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_organization_invitations_updated_at" BEFORE UPDATE ON "public"."organization_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_organization_subscriptions_updated_at" BEFORE UPDATE ON "public"."organization_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_subscribers_updated_at" BEFORE UPDATE ON "public"."subscribers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_work_orders_updated_at" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "work_order_costs_updated_at" BEFORE UPDATE ON "public"."work_order_costs" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_order_costs_updated_at"();



CREATE OR REPLACE TRIGGER "work_order_status_change_trigger" AFTER UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_work_order_status_change"();



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_exemptions"
    ADD CONSTRAINT "billing_exemptions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."billing_exemptions"
    ADD CONSTRAINT "billing_exemptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_usage"
    ADD CONSTRAINT "billing_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_sites"
    ADD CONSTRAINT "customer_sites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_default_pm_template_id_fkey" FOREIGN KEY ("default_pm_template_id") REFERENCES "public"."pm_checklist_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_note_images"
    ADD CONSTRAINT "equipment_note_images_equipment_note_id_fkey" FOREIGN KEY ("equipment_note_id") REFERENCES "public"."equipment_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_note_images"
    ADD CONSTRAINT "equipment_note_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "fk_pm_equipment" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "fk_pm_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "fk_pm_work_order" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_notes"
    ADD CONSTRAINT "fk_work_order_notes_author" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."geocoded_locations"
    ADD CONSTRAINT "geocoded_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_slot_purchase_id_fkey" FOREIGN KEY ("slot_purchase_id") REFERENCES "public"."slot_purchases"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_slot_purchase_id_fkey" FOREIGN KEY ("slot_purchase_id") REFERENCES "public"."slot_purchases"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_slots"
    ADD CONSTRAINT "organization_slots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pm_status_history"
    ADD CONSTRAINT "pm_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pm_status_history"
    ADD CONSTRAINT "pm_status_history_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "public"."preventative_maintenance"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "preventative_maintenance_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."pm_checklist_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."slot_purchases"
    ADD CONSTRAINT "slot_purchases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slot_purchases"
    ADD CONSTRAINT "slot_purchases_purchased_by_fkey" FOREIGN KEY ("purchased_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_license_subscriptions"
    ADD CONSTRAINT "user_license_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_images"
    ADD CONSTRAINT "work_order_images_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."work_order_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_status_history"
    ADD CONSTRAINT "work_order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_order_status_history"
    ADD CONSTRAINT "work_order_status_history_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create historical PM" ON "public"."preventative_maintenance" FOR INSERT WITH CHECK ((("is_historical" = true) AND "public"."is_org_admin"("auth"."uid"(), "organization_id")));



CREATE POLICY "Admins can create historical work orders" ON "public"."work_orders" FOR INSERT WITH CHECK ((("is_historical" = true) AND "public"."is_org_admin"("auth"."uid"(), "organization_id") AND ("created_by_admin" = "auth"."uid"())));



CREATE POLICY "Admins can delete work orders" ON "public"."work_orders" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Admins can delete working hours history" ON "public"."equipment_working_hours_history" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND "public"."is_org_admin"("auth"."uid"(), "e"."organization_id")))));



CREATE POLICY "Admins can insert PM history" ON "public"."pm_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_admin"("auth"."uid"(), "pm"."organization_id")))) AND ("changed_by" = "auth"."uid"())));



CREATE POLICY "Admins can insert PM status history" ON "public"."pm_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_admin"("auth"."uid"(), "pm"."organization_id")))) AND ("changed_by" = "auth"."uid"())));



CREATE POLICY "Admins can insert work order history" ON "public"."work_order_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_status_history"."work_order_id") AND "public"."is_org_admin"("auth"."uid"(), "wo"."organization_id")))) AND ("changed_by" = "auth"."uid"())));



CREATE POLICY "Admins can update historical PM" ON "public"."preventative_maintenance" FOR UPDATE USING ((("is_historical" = true) AND "public"."is_org_admin"("auth"."uid"(), "organization_id")));



CREATE POLICY "Admins can update historical work orders" ON "public"."work_orders" FOR UPDATE USING ((("is_historical" = true) AND "public"."is_org_admin"("auth"."uid"(), "organization_id")));



CREATE POLICY "Admins can update working hours history" ON "public"."equipment_working_hours_history" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND "public"."is_org_admin"("auth"."uid"(), "e"."organization_id")))));



CREATE POLICY "Admins can view billing events" ON "public"."billing_events" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Org admins can view removal audit" ON "public"."member_removal_audit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "member_removal_audit"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Prevent unauthorized billing_events deletes" ON "public"."billing_events" FOR DELETE USING (false);



CREATE POLICY "Prevent unauthorized billing_events updates" ON "public"."billing_events" FOR UPDATE USING (false);



CREATE POLICY "Prevent unauthorized billing_usage deletes" ON "public"."billing_usage" FOR DELETE USING (false);



CREATE POLICY "Prevent unauthorized billing_usage inserts" ON "public"."billing_usage" FOR INSERT WITH CHECK (false);



CREATE POLICY "Prevent unauthorized billing_usage updates" ON "public"."billing_usage" FOR UPDATE USING (false);



CREATE POLICY "Prevent unauthorized exemption deletes" ON "public"."billing_exemptions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "billing_exemptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'owner'::"text") AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Restrict license subscription deletes" ON "public"."user_license_subscriptions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "user_license_subscriptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Restrict purchases viewing to active org members" ON "public"."slot_purchases" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "slot_purchases"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Restrict slots viewing to active org members" ON "public"."organization_slots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_slots"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "System can insert removal audit" ON "public"."member_removal_audit" FOR INSERT WITH CHECK (true);



CREATE POLICY "System only billing_events inserts" ON "public"."billing_events" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create PM for their organization" ON "public"."preventative_maintenance" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Users can create work orders in their organization" ON "public"."work_orders" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text"))))));



CREATE POLICY "Users can create working hours history for accessible equipment" ON "public"."equipment_working_hours_history" FOR INSERT WITH CHECK ((("updated_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND ("public"."is_org_admin"("auth"."uid"(), "e"."organization_id") OR ("public"."is_org_member"("auth"."uid"(), "e"."organization_id") AND ("e"."team_id" IS NOT NULL) AND ("e"."team_id" IN ( SELECT "tm"."team_id"
           FROM "public"."team_members" "tm"
          WHERE ("tm"."user_id" = "auth"."uid"()))))))))));



CREATE POLICY "Users can delete images they uploaded" ON "public"."equipment_note_images" FOR DELETE USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can delete their own work order images" ON "public"."work_order_images" FOR DELETE USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can manage their own notification preferences" ON "public"."notification_preferences" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update PM for their organization" ON "public"."preventative_maintenance" FOR UPDATE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update work orders in their organization" ON "public"."work_orders" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text"))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Users can upload images to their notes" ON "public"."equipment_note_images" FOR INSERT WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND ("e"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))))));



CREATE POLICY "Users can upload work order images" ON "public"."work_order_images" FOR INSERT WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_images"."work_order_id") AND ("wo"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))))));



CREATE POLICY "Users can view PM for their organization" ON "public"."preventative_maintenance" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Users can view PM history for their organization" ON "public"."pm_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_member"("auth"."uid"(), "pm"."organization_id")))));



CREATE POLICY "Users can view PM status history for their organization" ON "public"."pm_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_member"("auth"."uid"(), "pm"."organization_id")))));



CREATE POLICY "Users can view images for accessible notes" ON "public"."equipment_note_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND ("e"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))) AND ((NOT "en"."is_private") OR ("en"."author_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view work order history for their organization" ON "public"."work_order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_status_history"."work_order_id") AND "public"."is_org_member"("auth"."uid"(), "wo"."organization_id")))));



CREATE POLICY "Users can view work order images" ON "public"."work_order_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_images"."work_order_id") AND ("wo"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text"))))))));



CREATE POLICY "Users can view work orders in their organization" ON "public"."work_orders" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Users can view working hours history for accessible equipment" ON "public"."equipment_working_hours_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND ("public"."is_org_admin"("auth"."uid"(), "e"."organization_id") OR ("public"."is_org_member"("auth"."uid"(), "e"."organization_id") AND ("e"."team_id" IS NOT NULL) AND ("e"."team_id" IN ( SELECT "tm"."team_id"
           FROM "public"."team_members" "tm"
          WHERE ("tm"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "admins_delete_equipment" ON "public"."equipment" FOR DELETE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_delete_equipment_note_images" ON "public"."equipment_note_images" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND "public"."is_org_admin"("auth"."uid"(), "e"."organization_id")))));



CREATE POLICY "admins_delete_equipment_notes" ON "public"."equipment_notes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_admin"("auth"."uid"(), "e"."organization_id")))));



CREATE POLICY "admins_delete_teams" ON "public"."teams" FOR DELETE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_delete_work_orders" ON "public"."work_orders" FOR DELETE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_manage_all_costs" ON "public"."work_order_costs" USING ("public"."is_org_admin"("auth"."uid"(), ( SELECT "work_orders"."organization_id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."id" = "work_order_costs"."work_order_id")))) WITH CHECK ("public"."is_org_admin"("auth"."uid"(), ( SELECT "work_orders"."organization_id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."id" = "work_order_costs"."work_order_id"))));



CREATE POLICY "admins_manage_equipment" ON "public"."equipment" FOR UPDATE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_manage_org_members_fixed" ON "public"."organization_members" USING ("public"."is_org_admin"("auth"."uid"(), "organization_id")) WITH CHECK ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_manage_subscriptions" ON "public"."organization_subscriptions" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_subscriptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_subscriptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "admins_manage_team_members" ON "public"."team_members" USING ("public"."is_org_admin"("auth"."uid"(), ( SELECT "teams"."organization_id"
   FROM "public"."teams"
  WHERE ("teams"."id" = "team_members"."team_id")))) WITH CHECK ("public"."is_org_admin"("auth"."uid"(), ( SELECT "teams"."organization_id"
   FROM "public"."teams"
  WHERE ("teams"."id" = "team_members"."team_id"))));



CREATE POLICY "admins_manage_teams" ON "public"."teams" FOR INSERT WITH CHECK ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_only_delete_members" ON "public"."organization_members" FOR DELETE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_only_update_members" ON "public"."organization_members" FOR UPDATE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "admins_update_teams" ON "public"."teams" FOR UPDATE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "authenticated_can_read_global_templates" ON "public"."pm_checklist_templates" FOR SELECT USING ((("organization_id" IS NULL) AND (("auth"."uid"() IS NOT NULL) OR ("auth"."role"() = 'service_role'::"text"))));



CREATE POLICY "authenticated_users_own_data_only" ON "public"."subscribers" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated_users_update_own_data" ON "public"."subscribers" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "authors_manage_own_notes" ON "public"."equipment_notes" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_exemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_contacts_admins_insert" ON "public"."customer_contacts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contacts"."customer_id") AND "public"."is_org_admin"("auth"."uid"(), "c"."organization_id")))));



CREATE POLICY "customer_contacts_admins_select" ON "public"."customer_contacts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contacts"."customer_id") AND "public"."is_org_admin"("auth"."uid"(), "c"."organization_id")))));



CREATE POLICY "customer_contacts_admins_update" ON "public"."customer_contacts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contacts"."customer_id") AND "public"."is_org_admin"("auth"."uid"(), "c"."organization_id")))));



ALTER TABLE "public"."customer_sites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_sites_admins_insert" ON "public"."customer_sites" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_sites"."customer_id") AND "public"."is_org_admin"("auth"."uid"(), "c"."organization_id")))));



CREATE POLICY "customer_sites_admins_select" ON "public"."customer_sites" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_sites"."customer_id") AND "public"."is_org_admin"("auth"."uid"(), "c"."organization_id")))));



CREATE POLICY "customer_sites_admins_update" ON "public"."customer_sites" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_sites"."customer_id") AND "public"."is_org_admin"("auth"."uid"(), "c"."organization_id")))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_admins_insert" ON "public"."customers" FOR INSERT WITH CHECK ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "customers_admins_select" ON "public"."customers" FOR SELECT USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "customers_admins_update" ON "public"."customers" FOR UPDATE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "deny delete protected" ON "public"."pm_checklist_templates" FOR DELETE USING ((("organization_id" IS NOT NULL) AND "public"."is_org_admin"("auth"."uid"(), "organization_id") AND ("is_protected" = false)));



CREATE POLICY "deny_user_access_stripe_logs" ON "public"."stripe_event_logs" USING (false);



CREATE POLICY "edge_functions_manage_subscriptions" ON "public"."subscribers" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_note_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_working_hours_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geocoded_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "geocoded_locations_select_org_members" ON "public"."geocoded_locations" FOR SELECT USING ("public"."check_org_access_secure"("auth"."uid"(), "organization_id"));



CREATE POLICY "geocoded_locations_service_insert" ON "public"."geocoded_locations" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "geocoded_locations_service_update" ON "public"."geocoded_locations" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."invitation_performance_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invited_users_access_by_email" ON "public"."organization_invitations" FOR SELECT USING ((("auth"."email"() IS NOT NULL) AND ("lower"(TRIM(BOTH FROM "email")) = "lower"(TRIM(BOTH FROM "auth"."email"())))));



CREATE POLICY "invited_users_can_view_org_details" ON "public"."organizations" FOR SELECT USING (("public"."check_org_access_secure"("auth"."uid"(), "id") OR (EXISTS ( SELECT 1
   FROM "public"."organization_invitations" "oi"
  WHERE (("oi"."organization_id" = "organizations"."id") AND ("oi"."status" = 'pending'::"text") AND ("oi"."expires_at" > "now"()) AND ("auth"."email"() IS NOT NULL) AND ("lower"(TRIM(BOTH FROM "oi"."email")) = "lower"(TRIM(BOTH FROM "auth"."email"()))))))));



CREATE POLICY "invited_users_update_by_email" ON "public"."organization_invitations" FOR UPDATE USING ((("auth"."email"() IS NOT NULL) AND ("lower"(TRIM(BOTH FROM "email")) = "lower"(TRIM(BOTH FROM "auth"."email"()))) AND ("status" = 'pending'::"text")));



CREATE POLICY "manage org templates" ON "public"."pm_checklist_templates" USING ((("organization_id" IS NOT NULL) AND "public"."is_org_admin"("auth"."uid"(), "organization_id") AND ((NOT "is_protected") OR ("auth"."role"() = 'service_role'::"text")))) WITH CHECK ((("organization_id" IS NOT NULL) AND "public"."is_org_admin"("auth"."uid"(), "organization_id") AND ((NOT "is_protected") OR ("auth"."role"() = 'service_role'::"text"))));



ALTER TABLE "public"."member_removal_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members_access_work_orders" ON "public"."work_orders" USING ("public"."is_org_member"("auth"."uid"(), "organization_id")) WITH CHECK ("public"."is_org_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "members_can_read_org_templates" ON "public"."pm_checklist_templates" FOR SELECT USING ((("organization_id" IS NOT NULL) AND ("public"."is_org_member"("auth"."uid"(), "organization_id") OR ("auth"."role"() = 'service_role'::"text"))));



CREATE POLICY "members_create_notes" ON "public"."equipment_notes" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND "public"."is_org_member"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "equipment_notes"."equipment_id")))));



CREATE POLICY "members_read_own_record" ON "public"."organization_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "members_view_costs" ON "public"."work_order_costs" FOR SELECT USING ("public"."is_org_member"("auth"."uid"(), ( SELECT "work_orders"."organization_id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."id" = "work_order_costs"."work_order_id"))));



CREATE POLICY "members_view_invitations" ON "public"."organization_invitations" FOR SELECT USING ("public"."is_org_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "members_view_notes" ON "public"."equipment_notes" FOR SELECT USING (("public"."is_org_member"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "equipment_notes"."equipment_id"))) AND ((NOT "is_private") OR ("author_id" = "auth"."uid"()))));



CREATE POLICY "members_view_org_members_fixed" ON "public"."organization_members" FOR SELECT USING ("public"."is_org_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "members_view_team_members" ON "public"."team_members" FOR SELECT USING ("public"."is_org_member"("auth"."uid"(), ( SELECT "teams"."organization_id"
   FROM "public"."teams"
  WHERE ("teams"."id" = "team_members"."team_id"))));



CREATE POLICY "members_view_teams" ON "public"."teams" FOR SELECT USING ("public"."is_org_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "no_user_access_performance_logs" ON "public"."invitation_performance_logs" USING (false);



ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notes_delete_own_or_admin" ON "public"."notes" FOR DELETE USING ((("author_id" = "auth"."uid"()) OR "public"."check_org_admin_secure"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "notes"."equipment_id")))));



CREATE POLICY "notes_insert_organization_members" ON "public"."notes" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND "public"."check_org_access_secure"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "notes"."equipment_id")))));



CREATE POLICY "notes_select_organization_members" ON "public"."notes" FOR SELECT USING ("public"."check_org_access_secure"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "notes"."equipment_id"))));



CREATE POLICY "notes_update_own" ON "public"."notes" FOR UPDATE USING (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_admins_manage_license_subs" ON "public"."user_license_subscriptions" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "user_license_subscriptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "org_admins_manage_purchases" ON "public"."slot_purchases" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "slot_purchases"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "org_admins_manage_slots" ON "public"."organization_slots" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_slots"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "org_admins_view_exemptions" ON "public"."billing_exemptions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "billing_exemptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "org_members_view_license_subs" ON "public"."user_license_subscriptions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "user_license_subscriptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "org_members_view_member_profiles" ON "public"."profiles" FOR SELECT USING (("id" IN ( SELECT "om"."user_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" IN ( SELECT "om2"."organization_id"
           FROM "public"."organization_members" "om2"
          WHERE (("om2"."user_id" = "auth"."uid"()) AND ("om2"."status" = 'active'::"text")))) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs_members_can_view" ON "public"."organizations" FOR SELECT USING ("public"."check_org_access_secure"("auth"."uid"(), "id"));



CREATE POLICY "orgs_select_members" ON "public"."organizations" FOR SELECT USING ("public"."check_org_access_secure"("auth"."uid"(), "id"));



CREATE POLICY "orgs_update_admins" ON "public"."organizations" FOR UPDATE USING ("public"."check_org_admin_secure"("auth"."uid"(), "id"));



ALTER TABLE "public"."pm_checklist_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pm_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preventative_maintenance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_optimized" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_update_optimized" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scans_delete_admins" ON "public"."scans" FOR DELETE USING ("public"."check_org_admin_secure"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "scans"."equipment_id"))));



CREATE POLICY "scans_insert_organization_members" ON "public"."scans" FOR INSERT WITH CHECK ((("scanned_by" = "auth"."uid"()) AND "public"."check_org_access_secure"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "scans"."equipment_id")))));



CREATE POLICY "scans_select_organization_members" ON "public"."scans" FOR SELECT USING ("public"."check_org_access_secure"("auth"."uid"(), ( SELECT "equipment"."organization_id"
   FROM "public"."equipment"
  WHERE ("equipment"."id" = "scans"."equipment_id"))));



CREATE POLICY "scans_update_own" ON "public"."scans" FOR UPDATE USING (("scanned_by" = "auth"."uid"()));



CREATE POLICY "secure_admin_only_member_insert" ON "public"."organization_members" FOR INSERT WITH CHECK ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "secure_system_insert_exemptions" ON "public"."billing_exemptions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "billing_exemptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "secure_system_update_exemptions" ON "public"."billing_exemptions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "billing_exemptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "secure_token_invitation_access" ON "public"."organization_invitations" FOR SELECT USING ((("auth"."email"() IS NOT NULL) AND ("lower"(TRIM(BOTH FROM "email")) = "lower"(TRIM(BOTH FROM "auth"."email"()))) AND ("status" = 'pending'::"text") AND ("expires_at" > "now"())));



CREATE POLICY "service_role_delete_webhook_events" ON "public"."webhook_events" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_insert_webhook_events" ON "public"."webhook_events" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_manage_stripe_logs" ON "public"."stripe_event_logs" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_only_create_notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_only_performance_logs" ON "public"."invitation_performance_logs" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_select_webhook_events" ON "public"."webhook_events" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_update_webhook_events" ON "public"."webhook_events" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."slot_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_event_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_create_equipment" ON "public"."equipment" FOR INSERT WITH CHECK (("public"."is_org_admin"("auth"."uid"(), "organization_id") OR ("public"."is_org_member"("auth"."uid"(), "organization_id") AND ("team_id" IS NOT NULL) AND ("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = 'manager'::"public"."team_member_role")))))));



CREATE POLICY "team_members_view_equipment" ON "public"."equipment" FOR SELECT USING (("public"."is_org_admin"("auth"."uid"(), "organization_id") OR ("public"."is_org_member"("auth"."uid"(), "organization_id") AND ("team_id" IS NOT NULL) AND ("team_id" IN ( SELECT "tm"."team_id"
   FROM "public"."team_members" "tm"
  WHERE ("tm"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_license_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_create_invitations" ON "public"."organization_invitations" FOR INSERT WITH CHECK (("invited_by" = "auth"."uid"()));



CREATE POLICY "users_delete_own_invitations" ON "public"."organization_invitations" FOR DELETE USING (("invited_by" = "auth"."uid"()));



CREATE POLICY "users_manage_own_costs" ON "public"."work_order_costs" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "users_manage_own_invitations" ON "public"."organization_invitations" FOR UPDATE USING (("invited_by" = "auth"."uid"()));



CREATE POLICY "users_view_own_invitations" ON "public"."organization_invitations" FOR SELECT USING (("invited_by" = "auth"."uid"()));



CREATE POLICY "users_view_own_profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "view_org_subscriptions" ON "public"."organization_subscriptions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_subscriptions"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "view_org_usage" ON "public"."billing_usage" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "billing_usage"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_order_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_order_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_order_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_notes_delete_own" ON "public"."work_order_notes" FOR DELETE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "work_order_notes_insert_organization_members" ON "public"."work_order_notes" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND ("wo"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))))));



CREATE POLICY "work_order_notes_select_organization_members" ON "public"."work_order_notes" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND ("wo"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text"))))))) AND ((NOT "is_private") OR ("author_id" = "auth"."uid"()))));



CREATE POLICY "work_order_notes_update_own" ON "public"."work_order_notes" FOR UPDATE USING (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."work_order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organization_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organization_slots";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_admin_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_admin_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_admin_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_admin_with_context"("user_uuid" "uuid", "org_id" "uuid", "bypass_context" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_admin_with_context"("user_uuid" "uuid", "org_id" "uuid", "bypass_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_admin_with_context"("user_uuid" "uuid", "org_id" "uuid", "bypass_context" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_exists_in_auth"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_exists_in_auth"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_exists_in_auth"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_member_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_member_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_member_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_org_access_direct"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_org_access_direct"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_org_access_direct"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_org_admin_secure"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_org_admin_secure"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_org_admin_secure"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_rls_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."clear_rls_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_rls_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation_bypass"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation_bypass"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation_bypass"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation_bypass_optimized"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation_bypass_optimized"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation_bypass_optimized"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation_with_context"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation_with_context"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation_with_context"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitations_bypass_optimized"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitations_bypass_optimized"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitations_bypass_optimized"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_exemptions"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_exemptions"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_exemptions"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_premium_features"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_premium_features"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_premium_features"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_slot_availability"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_slot_availability"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_slot_availability"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_slot_availability_with_exemptions"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_slot_availability_with_exemptions"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_slot_availability_with_exemptions"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_managed_teams"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_managed_teams"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_managed_teams"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_role_secure"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_role_secure"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_role_secure"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organization_membership"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organization_membership"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_membership"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_invitation_account_creation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_invitation_account_creation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_invitation_account_creation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_membership_billing_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_membership_billing_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_membership_billing_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_team_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_team_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_team_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_team_manager_removal"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."handle_team_manager_removal"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_team_manager_removal"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_pm_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_pm_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_pm_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_work_order_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_work_order_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_work_order_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_bypass_triggers"("bypass" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_bypass_triggers"("bypass" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_bypass_triggers"("bypass" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_geocoded_locations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_geocoded_locations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_geocoded_locations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_rls_context"("context_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_rls_context"("context_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_rls_context"("context_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_member_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_member_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_member_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pm_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pm_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pm_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_member_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_member_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_member_limit"() TO "service_role";


















GRANT ALL ON TABLE "public"."billing_events" TO "anon";
GRANT ALL ON TABLE "public"."billing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_events" TO "service_role";



GRANT ALL ON TABLE "public"."billing_exemptions" TO "anon";
GRANT ALL ON TABLE "public"."billing_exemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_exemptions" TO "service_role";



GRANT ALL ON TABLE "public"."billing_usage" TO "anon";
GRANT ALL ON TABLE "public"."billing_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_usage" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contacts" TO "anon";
GRANT ALL ON TABLE "public"."customer_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."customer_sites" TO "anon";
GRANT ALL ON TABLE "public"."customer_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_sites" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_note_images" TO "anon";
GRANT ALL ON TABLE "public"."equipment_note_images" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_note_images" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_notes" TO "anon";
GRANT ALL ON TABLE "public"."equipment_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_notes" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "anon";
GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "service_role";



GRANT ALL ON TABLE "public"."geocoded_locations" TO "anon";
GRANT ALL ON TABLE "public"."geocoded_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."geocoded_locations" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_performance_logs" TO "anon";
GRANT ALL ON TABLE "public"."invitation_performance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_performance_logs" TO "service_role";



GRANT ALL ON TABLE "public"."member_removal_audit" TO "anon";
GRANT ALL ON TABLE "public"."member_removal_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."member_removal_audit" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organization_slots" TO "anon";
GRANT ALL ON TABLE "public"."organization_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_slots" TO "service_role";



GRANT ALL ON TABLE "public"."organization_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."organization_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "anon";
GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "service_role";



GRANT ALL ON TABLE "public"."pm_status_history" TO "anon";
GRANT ALL ON TABLE "public"."pm_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."preventative_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."preventative_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."preventative_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."slot_purchases" TO "anon";
GRANT ALL ON TABLE "public"."slot_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."slot_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_event_logs" TO "anon";
GRANT ALL ON TABLE "public"."stripe_event_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_event_logs" TO "service_role";



GRANT ALL ON TABLE "public"."subscribers" TO "anon";
GRANT ALL ON TABLE "public"."subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_license_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_license_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_license_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_costs" TO "anon";
GRANT ALL ON TABLE "public"."work_order_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_costs" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_images" TO "anon";
GRANT ALL ON TABLE "public"."work_order_images" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_images" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_notes" TO "anon";
GRANT ALL ON TABLE "public"."work_order_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_notes" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."work_order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT ALL ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
