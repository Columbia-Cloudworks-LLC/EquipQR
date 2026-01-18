-- =============================================================================
-- BASELINE MIGRATION: Full schema snapshot as of 2026-01-14
-- =============================================================================
-- This file contains the complete public schema including:
--   - All ENUM types
--   - All tables and columns
--   - All functions and triggers
--   - All RLS policies (180 policies across 61 RLS-enabled tables)
--   - All grants for anon/authenticated/service_role
--
-- IMPORTANT: This baseline replaces all previous migrations for new environments.
-- Production/staging environments that have already run historical migrations
-- should NOT re-run this baseline; their schema is already current.
-- =============================================================================

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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';

-- Enable pgcrypto extension for password hashing (used by seed files)
-- In Supabase, extensions are installed in the extensions schema by default
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";



CREATE TYPE "public"."equipment_status" AS ENUM (
    'active',
    'maintenance',
    'inactive'
);


ALTER TYPE "public"."equipment_status" OWNER TO "postgres";


CREATE TYPE "public"."inventory_transaction_type" AS ENUM (
    'usage',
    'restock',
    'adjustment',
    'initial',
    'work_order'
);


ALTER TYPE "public"."inventory_transaction_type" OWNER TO "postgres";


CREATE TYPE "public"."model_match_type" AS ENUM (
    'any',
    'exact',
    'prefix',
    'wildcard'
);


ALTER TYPE "public"."model_match_type" OWNER TO "postgres";


CREATE TYPE "public"."organization_plan" AS ENUM (
    'free',
    'premium'
);


ALTER TYPE "public"."organization_plan" OWNER TO "postgres";


CREATE TYPE "public"."part_identifier_type" AS ENUM (
    'oem',
    'aftermarket',
    'sku',
    'mpn',
    'upc',
    'cross_ref'
);


ALTER TYPE "public"."part_identifier_type" OWNER TO "postgres";


CREATE TYPE "public"."team_member_role" AS ENUM (
    'owner',
    'manager',
    'technician',
    'requestor',
    'viewer'
);


ALTER TYPE "public"."team_member_role" OWNER TO "postgres";


CREATE TYPE "public"."verification_status" AS ENUM (
    'unverified',
    'verified',
    'deprecated'
);


ALTER TYPE "public"."verification_status" OWNER TO "postgres";


CREATE TYPE "public"."work_order_priority" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."work_order_priority" OWNER TO "postgres";


CREATE TYPE "public"."work_order_status" AS ENUM (
    'submitted',
    'accepted',
    'assigned',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled'
);


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


CREATE OR REPLACE FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_equipment_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.name;
  ELSE
    v_entity_name := NEW.name;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', NULL, 'new', NEW.name),
      'status', jsonb_build_object('old', NULL, 'new', NEW.status),
      'location', jsonb_build_object('old', NULL, 'new', NEW.location),
      'manufacturer', jsonb_build_object('old', NULL, 'new', NEW.manufacturer),
      'model', jsonb_build_object('old', NULL, 'new', NEW.model),
      'serial_number', jsonb_build_object('old', NULL, 'new', NEW.serial_number),
      'installation_date', jsonb_build_object('old', NULL, 'new', NEW.installation_date),
      'warranty_expiration', jsonb_build_object('old', NULL, 'new', NEW.warranty_expiration),
      'notes', jsonb_build_object('old', NULL, 'new', NEW.notes),
      'custom_attributes', jsonb_build_object('old', NULL, 'new', NEW.custom_attributes)
    );
    v_metadata := jsonb_build_object(
      'team_id', NEW.team_id,
      'default_pm_template_id', NEW.default_pm_template_id,
      'customer_id', NEW.customer_id
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only track fields that changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', OLD.location, 'new', NEW.location));
    END IF;
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      v_changes := v_changes || jsonb_build_object('team_id', jsonb_build_object('old', OLD.team_id, 'new', NEW.team_id));
    END IF;
    IF OLD.warranty_expiration IS DISTINCT FROM NEW.warranty_expiration THEN
      v_changes := v_changes || jsonb_build_object('warranty_expiration', jsonb_build_object('old', OLD.warranty_expiration, 'new', NEW.warranty_expiration));
    END IF;
    IF OLD.working_hours IS DISTINCT FROM NEW.working_hours THEN
      v_changes := v_changes || jsonb_build_object('working_hours', jsonb_build_object('old', OLD.working_hours, 'new', NEW.working_hours));
    END IF;
    IF OLD.last_maintenance IS DISTINCT FROM NEW.last_maintenance THEN
      v_changes := v_changes || jsonb_build_object('last_maintenance', jsonb_build_object('old', OLD.last_maintenance, 'new', NEW.last_maintenance));
    END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('old', OLD.notes, 'new', NEW.notes));
    END IF;
    IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
      v_changes := v_changes || jsonb_build_object('image_url', jsonb_build_object('old', OLD.image_url, 'new', NEW.image_url));
    END IF;
    IF OLD.manufacturer IS DISTINCT FROM NEW.manufacturer THEN
      v_changes := v_changes || jsonb_build_object('manufacturer', jsonb_build_object('old', OLD.manufacturer, 'new', NEW.manufacturer));
    END IF;
    IF OLD.model IS DISTINCT FROM NEW.model THEN
      v_changes := v_changes || jsonb_build_object('model', jsonb_build_object('old', OLD.model, 'new', NEW.model));
    END IF;
    IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
      v_changes := v_changes || jsonb_build_object('serial_number', jsonb_build_object('old', OLD.serial_number, 'new', NEW.serial_number));
    END IF;
    IF OLD.default_pm_template_id IS DISTINCT FROM NEW.default_pm_template_id THEN
      v_changes := v_changes || jsonb_build_object('default_pm_template_id', jsonb_build_object('old', OLD.default_pm_template_id, 'new', NEW.default_pm_template_id));
    END IF;
    IF OLD.installation_date IS DISTINCT FROM NEW.installation_date THEN
      v_changes := v_changes || jsonb_build_object('installation_date', jsonb_build_object('old', OLD.installation_date, 'new', NEW.installation_date));
    END IF;
    IF OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
      v_changes := v_changes || jsonb_build_object('customer_id', jsonb_build_object('old', OLD.customer_id, 'new', NEW.customer_id));
    END IF;
    IF OLD.custom_attributes IS DISTINCT FROM NEW.custom_attributes THEN
      v_changes := v_changes || jsonb_build_object('custom_attributes', jsonb_build_object('old', OLD.custom_attributes, 'new', NEW.custom_attributes));
    END IF;
    IF OLD.last_known_location IS DISTINCT FROM NEW.last_known_location THEN
      v_changes := v_changes || jsonb_build_object('last_known_location', jsonb_build_object('old', OLD.last_known_location, 'new', NEW.last_known_location));
    END IF;
    
    -- Skip if no tracked fields changed (e.g., only updated_at changed)
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', OLD.name, 'new', NULL),
      'status', jsonb_build_object('old', OLD.status, 'new', NULL),
      'manufacturer', jsonb_build_object('old', OLD.manufacturer, 'new', NULL),
      'model', jsonb_build_object('old', OLD.model, 'new', NULL),
      'serial_number', jsonb_build_object('old', OLD.serial_number, 'new', NULL),
      'location', jsonb_build_object('old', OLD.location, 'new', NULL),
      'custom_attributes', jsonb_build_object('old', OLD.custom_attributes, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'equipment',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_equipment_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_inventory_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.name;
  ELSE
    v_entity_name := NEW.name;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', NULL, 'new', NEW.name),
      'sku', jsonb_build_object('old', NULL, 'new', NEW.sku),
      'quantity_on_hand', jsonb_build_object('old', NULL, 'new', NEW.quantity_on_hand),
      'low_stock_threshold', jsonb_build_object('old', NULL, 'new', NEW.low_stock_threshold)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only track fields that changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.quantity_on_hand IS DISTINCT FROM NEW.quantity_on_hand THEN
      v_changes := v_changes || jsonb_build_object('quantity_on_hand', jsonb_build_object('old', OLD.quantity_on_hand, 'new', NEW.quantity_on_hand));
    END IF;
    IF OLD.low_stock_threshold IS DISTINCT FROM NEW.low_stock_threshold THEN
      v_changes := v_changes || jsonb_build_object('low_stock_threshold', jsonb_build_object('old', OLD.low_stock_threshold, 'new', NEW.low_stock_threshold));
    END IF;
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', OLD.location, 'new', NEW.location));
    END IF;
    IF OLD.default_unit_cost IS DISTINCT FROM NEW.default_unit_cost THEN
      v_changes := v_changes || jsonb_build_object('default_unit_cost', jsonb_build_object('old', OLD.default_unit_cost, 'new', NEW.default_unit_cost));
    END IF;
    IF OLD.sku IS DISTINCT FROM NEW.sku THEN
      v_changes := v_changes || jsonb_build_object('sku', jsonb_build_object('old', OLD.sku, 'new', NEW.sku));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', OLD.name, 'new', NULL),
      'sku', jsonb_build_object('old', OLD.sku, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'inventory_item',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_inventory_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_org_member_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Get member name from profiles
  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = OLD.user_id;
  ELSE
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  END IF;
  
  v_entity_name := COALESCE(v_entity_name, 'Unknown User');
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', NULL, 'new', NEW.role),
      'status', jsonb_build_object('old', NULL, 'new', NEW.status)
    );
    v_metadata := jsonb_build_object('user_id', NEW.user_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      v_changes := v_changes || jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('user_id', NEW.user_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', OLD.role, 'new', NULL),
      'status', jsonb_build_object('old', OLD.status, 'new', NULL)
    );
    v_metadata := jsonb_build_object('user_id', OLD.user_id);
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'organization_member',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_org_member_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_pm_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
  v_org_id UUID;
BEGIN
  -- Get organization_id from work_order
  IF TG_OP = 'DELETE' THEN
    SELECT wo.organization_id INTO v_org_id
    FROM public.work_orders wo
    WHERE wo.id = OLD.work_order_id;
    v_entity_name := 'PM for Work Order';
  ELSE
    SELECT wo.organization_id INTO v_org_id
    FROM public.work_orders wo
    WHERE wo.id = NEW.work_order_id;
    v_entity_name := 'PM for Work Order';
  END IF;
  
  -- Skip if we can't determine organization
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'status', jsonb_build_object('old', NULL, 'new', NEW.status),
      'template_id', jsonb_build_object('old', NULL, 'new', NEW.template_id)
    );
    v_metadata := jsonb_build_object('work_order_id', NEW.work_order_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.completed_at IS DISTINCT FROM NEW.completed_at THEN
      v_changes := v_changes || jsonb_build_object('completed_at', jsonb_build_object('old', OLD.completed_at, 'new', NEW.completed_at));
    END IF;
    IF OLD.completed_by IS DISTINCT FROM NEW.completed_by THEN
      v_changes := v_changes || jsonb_build_object('completed_by', jsonb_build_object('old', OLD.completed_by, 'new', NEW.completed_by));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('work_order_id', NEW.work_order_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'status', jsonb_build_object('old', OLD.status, 'new', NULL)
    );
    v_metadata := jsonb_build_object('work_order_id', OLD.work_order_id);
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    v_org_id,
    'preventative_maintenance',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_pm_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_team_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
BEGIN
  -- Determine entity name
  IF TG_OP = 'DELETE' THEN
    v_entity_name := OLD.name;
  ELSE
    v_entity_name := NEW.name;
  END IF;
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', NULL, 'new', NEW.name),
      'description', jsonb_build_object('old', NULL, 'new', NEW.description)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      v_changes := v_changes || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'name', jsonb_build_object('old', OLD.name, 'new', NULL)
    );
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    COALESCE(NEW.organization_id, OLD.organization_id),
    'team',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_team_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_team_member_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_changes JSONB := '{}';
  v_entity_name TEXT;
  v_metadata JSONB := '{}';
  v_org_id UUID;
BEGIN
  -- Get organization_id from team
  IF TG_OP = 'DELETE' THEN
    SELECT t.organization_id INTO v_org_id
    FROM public.teams t
    WHERE t.id = OLD.team_id;
    
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = OLD.user_id;
  ELSE
    SELECT t.organization_id INTO v_org_id
    FROM public.teams t
    WHERE t.id = NEW.team_id;
    
    SELECT COALESCE(p.name, 'Unknown User') INTO v_entity_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  END IF;
  
  -- Skip if we can't determine organization
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_entity_name := COALESCE(v_entity_name, 'Unknown User');
  
  -- Build changes object based on operation
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', NULL, 'new', NEW.role)
    );
    v_metadata := jsonb_build_object('team_id', NEW.team_id, 'user_id', NEW.user_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      v_changes := v_changes || jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role));
    END IF;
    
    -- Skip if no tracked fields changed
    IF v_changes = '{}'::JSONB THEN
      RETURN NEW;
    END IF;
    
    v_metadata := jsonb_build_object('team_id', NEW.team_id, 'user_id', NEW.user_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'role', jsonb_build_object('old', OLD.role, 'new', NULL)
    );
    v_metadata := jsonb_build_object('team_id', OLD.team_id, 'user_id', OLD.user_id);
  END IF;
  
  -- Log the audit entry
  PERFORM public.log_audit_entry(
    v_org_id,
    'team_member',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    TG_OP,
    v_changes,
    v_metadata
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_team_member_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_work_order_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
      'team_id', NEW.team_id,
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
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      v_changes := v_changes || jsonb_build_object('team_id', jsonb_build_object('old', OLD.team_id, 'new', NEW.team_id));
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
$$;


ALTER FUNCTION "public"."audit_work_order_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_email_val text;
  user_name_val text;
  org_name_val text;
  new_org_id uuid;
  result jsonb;
BEGIN
  -- Get user data from auth.users
  SELECT email, 
         COALESCE(raw_user_meta_data->>'name', email),
         COALESCE(raw_user_meta_data->>'organization_name', 'My Organization')
  INTO user_email_val, user_name_val, org_name_val
  FROM auth.users
  WHERE id = user_id_val;

  -- Check if user exists
  IF user_email_val IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users', user_id_val;
  END IF;

  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (id, email, name)
  VALUES (user_id_val, user_email_val, user_name_val)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name);

  -- Check if user already has an organization membership
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = user_id_val AND status = 'active'
  ) THEN
    -- Create organization
    INSERT INTO public.organizations (name, plan, member_count, max_members, features)
    VALUES (
      org_name_val,
      'free',
      1,
      5,
      ARRAY['Equipment Management', 'Work Orders', 'Team Management']
    )
    RETURNING id INTO new_org_id;

    -- Add user as owner
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (new_org_id, user_id_val, 'owner', 'active')
    ON CONFLICT DO NOTHING;

    result := jsonb_build_object(
      'success', true,
      'user_id', user_id_val,
      'organization_id', new_org_id,
      'message', 'Created profile and organization for user'
    );
  ELSE
    result := jsonb_build_object(
      'success', true,
      'user_id', user_id_val,
      'message', 'Profile created/updated, user already has organization membership'
    );
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") IS 'Backfills missing profile and organization data for a user. Used to fix users created before the auth.users trigger was in place.';



CREATE OR REPLACE FUNCTION "public"."billing_is_disabled"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."billing_is_disabled"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."billing_is_disabled"() IS 'Returns true if billing is disabled. Created 2025-01-15 as part of billing removal. Default: true (billing disabled).';



CREATE OR REPLACE FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rules_count INTEGER := 0;
  v_rule JSONB;
  v_manufacturer TEXT;
  v_model TEXT;
  v_manufacturer_norm TEXT;
  v_model_norm TEXT;
  v_match_type public.model_match_type;
  v_pattern_raw TEXT;
  v_pattern_norm TEXT;
  v_status public.verification_status;
  v_notes TEXT;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Verify the inventory item belongs to the specified organization
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE id = p_item_id
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Inventory item not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  -- Delete all existing rules for this item (within the transaction)
  DELETE FROM public.part_compatibility_rules
  WHERE inventory_item_id = p_item_id;

  -- Insert new rules from the JSONB array
  IF p_rules IS NOT NULL AND jsonb_array_length(p_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
    LOOP
      v_manufacturer := v_rule->>'manufacturer';
      v_model := v_rule->>'model';
      
      -- Skip rules with empty manufacturer
      IF v_manufacturer IS NOT NULL AND trim(v_manufacturer) <> '' THEN
        v_manufacturer_norm := lower(trim(v_manufacturer));
        
        -- Parse match_type (default to 'exact', or 'any' if model is null/empty)
        BEGIN
          v_match_type := COALESCE(
            (v_rule->>'match_type')::public.model_match_type,
            CASE 
              WHEN v_model IS NULL OR trim(v_model) = '' THEN 'any'::public.model_match_type
              ELSE 'exact'::public.model_match_type
            END
          );
        EXCEPTION WHEN invalid_text_representation THEN
          v_match_type := 'exact'::public.model_match_type;
        END;
        
        -- Set model_norm and pattern based on match_type
        CASE v_match_type
          WHEN 'any' THEN
            v_model_norm := NULL;
            v_pattern_raw := NULL;
            v_pattern_norm := NULL;
            
          WHEN 'exact' THEN
            v_model_norm := CASE 
              WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN lower(trim(v_model))
              ELSE NULL
            END;
            v_pattern_raw := NULL;
            v_pattern_norm := NULL;
            -- If model is null/empty for 'exact', treat as 'any'
            IF v_model_norm IS NULL THEN
              v_match_type := 'any'::public.model_match_type;
            END IF;
            
          WHEN 'prefix' THEN
            v_model_norm := NULL;  -- Not used for prefix matching
            v_pattern_raw := trim(v_model);
            v_pattern_norm := public.normalize_compatibility_pattern('prefix', v_model);
            
          WHEN 'wildcard' THEN
            v_model_norm := NULL;  -- Not used for wildcard matching
            v_pattern_raw := trim(v_model);
            v_pattern_norm := public.normalize_compatibility_pattern('wildcard', v_model);
        END CASE;
        
        -- Parse optional status and notes
        BEGIN
          v_status := COALESCE((v_rule->>'status')::public.verification_status, 'unverified'::public.verification_status);
        EXCEPTION WHEN invalid_text_representation THEN
          v_status := 'unverified'::public.verification_status;
        END;
        v_notes := v_rule->>'notes';
        
        -- Insert using NOT EXISTS to handle duplicates with partial unique indexes
        -- This avoids the ON CONFLICT issue with partial indexes
        INSERT INTO public.part_compatibility_rules (
          inventory_item_id,
          manufacturer,
          model,
          manufacturer_norm,
          model_norm,
          match_type,
          model_pattern_raw,
          model_pattern_norm,
          status,
          notes,
          created_by
        )
        SELECT
          p_item_id,
          trim(v_manufacturer),
          CASE WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN trim(v_model) ELSE NULL END,
          v_manufacturer_norm,
          v_model_norm,
          v_match_type,
          v_pattern_raw,
          v_pattern_norm,
          v_status,
          v_notes,
          auth.uid()
        WHERE NOT EXISTS (
          SELECT 1 FROM public.part_compatibility_rules pcr
          WHERE pcr.inventory_item_id = p_item_id
            AND pcr.manufacturer_norm = v_manufacturer_norm
            AND (
              -- Match NULL = NULL (any model rules)
              (pcr.model_norm IS NULL AND v_model_norm IS NULL)
              OR
              -- Match exact model values
              (pcr.model_norm = v_model_norm)
            )
        );
        
        -- Only count if actually inserted (no conflict)
        IF FOUND THEN
          v_rules_count := v_rules_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_rules_count;
END;
$$;


ALTER FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") IS 'Atomically replaces all compatibility rules for an inventory item. Supports match_type: any, exact, prefix, wildcard. Uses NOT EXISTS pattern to work with partial unique indexes. Uses a single transaction to ensure delete and insert are atomic.';



CREATE OR REPLACE FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rules_count INTEGER := 0;
  v_rule JSONB;
  v_manufacturer TEXT;
  v_model TEXT;
  v_manufacturer_norm TEXT;
  v_model_norm TEXT;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Verify the PM template is accessible (global or org-owned)
  IF NOT EXISTS (
    SELECT 1 FROM public.pm_checklist_templates
    WHERE id = p_template_id
      AND (organization_id IS NULL OR organization_id = p_organization_id)
  ) THEN
    RAISE EXCEPTION 'PM template not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  -- Delete all existing rules for this template AND organization (within the transaction)
  DELETE FROM public.pm_template_compatibility_rules
  WHERE pm_template_id = p_template_id
    AND organization_id = p_organization_id;

  -- Insert new rules from the JSONB array
  -- If this fails, the entire transaction (including the delete) rolls back
  IF p_rules IS NOT NULL AND jsonb_array_length(p_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
    LOOP
      v_manufacturer := v_rule->>'manufacturer';
      v_model := v_rule->>'model';
      
      -- Skip rules with empty manufacturer
      IF v_manufacturer IS NOT NULL AND trim(v_manufacturer) <> '' THEN
        v_manufacturer_norm := lower(trim(v_manufacturer));
        v_model_norm := CASE 
          WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN lower(trim(v_model))
          ELSE NULL
        END;
        
        -- Insert with ON CONFLICT DO NOTHING to handle duplicates silently
        INSERT INTO public.pm_template_compatibility_rules (
          pm_template_id,
          organization_id,
          manufacturer,
          model,
          manufacturer_norm,
          model_norm
        ) VALUES (
          p_template_id,
          p_organization_id,
          trim(v_manufacturer),
          CASE WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN trim(v_model) ELSE NULL END,
          v_manufacturer_norm,
          v_model_norm
        )
        ON CONFLICT (pm_template_id, organization_id, manufacturer_norm, model_norm) DO NOTHING;
        
        -- Only count if actually inserted (no conflict)
        IF FOUND THEN
          v_rules_count := v_rules_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_rules_count;
END;
$$;


ALTER FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") IS 'Atomically replaces all compatibility rules for a PM template within an organization. Uses a single transaction to ensure delete and insert are atomic. Works for both global templates and org-owned templates.';



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


CREATE OR REPLACE FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check organization role
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id
  AND status = 'active';
  
  -- Owners and admins can always manage inventory
  IF v_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a parts manager
  RETURN public.is_parts_manager(p_organization_id, p_user_id);
END;
$$;


ALTER FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user can manage inventory for the given organization. Returns TRUE for owners, admins, and parts managers.';



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


CREATE OR REPLACE FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role TEXT;
  v_can_manage BOOLEAN;
BEGIN
  -- Get user's membership info
  SELECT role, can_manage_quickbooks
  INTO v_role, v_can_manage
  FROM public.organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  -- No membership found
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Owners always have permission
  IF v_role = 'owner' THEN
    RETURN true;
  END IF;

  -- Admins need explicit permission
  IF v_role = 'admin' AND v_can_manage = true THEN
    RETURN true;
  END IF;

  -- Members and admins without explicit permission cannot manage QuickBooks
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") IS 'Checks if a user can manage QuickBooks for an organization. Owners always can. Admins only if can_manage_quickbooks flag is true.';



CREATE OR REPLACE FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transfer RECORD;
  v_current_user_id UUID;
  v_org_name TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get transfer request
  SELECT * INTO v_transfer
  FROM ownership_transfer_requests
  WHERE id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer request not found');
  END IF;
  
  -- Validate caller is the initiator (from_user)
  IF v_transfer.from_user_id != v_current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the initiator can cancel this transfer request');
  END IF;
  
  -- Validate request is still pending
  IF v_transfer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request has already been processed');
  END IF;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = v_transfer.organization_id;
  
  -- Cancel the transfer
  UPDATE ownership_transfer_requests
  SET status = 'cancelled', responded_at = NOW()
  WHERE id = p_transfer_id;
  
  -- Notify target user (GLOBAL - visible across all orgs)
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data,
    is_global
  ) VALUES (
    v_transfer.organization_id,
    v_transfer.to_user_id,
    'ownership_transfer_cancelled',
    'Ownership Transfer Cancelled',
    v_transfer.from_user_name || ' has cancelled the ownership transfer request for ' || v_org_name || '.',
    jsonb_build_object(
      'transfer_id', p_transfer_id,
      'organization_id', v_transfer.organization_id,
      'organization_name', v_org_name
    ),
    true  -- Mark as global notification
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfer request cancelled'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") IS 'Cancel a pending ownership transfer request. Only the initiator can call this.';



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


CREATE OR REPLACE FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_minute_count INTEGER;
  v_hour_count INTEGER;
BEGIN
  -- Check exports by this user in the last minute (max 5)
  SELECT COUNT(*) INTO v_minute_count
  FROM public.export_request_log
  WHERE user_id = p_user_id
    AND requested_at > NOW() - INTERVAL '1 minute';
  
  IF v_minute_count >= 5 THEN
    RETURN FALSE;
  END IF;
  
  -- Check exports by this organization in the last hour (max 50)
  SELECT COUNT(*) INTO v_hour_count
  FROM public.export_request_log
  WHERE organization_id = p_organization_id
    AND requested_at > NOW() - INTERVAL '1 hour';
  
  IF v_hour_count >= 50 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") IS 'Checks if a user/organization has exceeded export rate limits. Returns TRUE if export is allowed, FALSE if rate limited. Limits: 5 exports per user per minute, 50 exports per org per hour.';



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


CREATE OR REPLACE FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  current_storage_mb BIGINT;
  current_storage_gb NUMERIC;
  file_size_mb NUMERIC;
  would_exceed BOOLEAN;
  remaining_gb NUMERIC;
  result JSONB;
BEGIN
  -- Get current storage
  current_storage_mb := get_organization_storage_mb(org_id);
  current_storage_gb := current_storage_mb / 1024.0;
  file_size_mb := file_size_bytes / 1048576.0;
  
  -- Check if adding this file would exceed limit
  would_exceed := (current_storage_gb + (file_size_mb / 1024.0)) > max_storage_gb;
  remaining_gb := GREATEST(0, max_storage_gb - current_storage_gb);
  
  result := jsonb_build_object(
    'can_upload', NOT would_exceed,
    'current_storage_gb', ROUND(current_storage_gb, 2),
    'max_storage_gb', max_storage_gb,
    'file_size_mb', ROUND(file_size_mb, 2),
    'would_exceed', would_exceed,
    'remaining_gb', ROUND(remaining_gb, 2),
    'usage_percent', ROUND((current_storage_gb / max_storage_gb * 100)::numeric, 1)
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) IS 'Check if organization has storage space for a file. Returns JSON with quota info. Limit: 5GB by default. Created 2025-01-28.';



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


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.quickbooks_oauth_sessions
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() IS 'Cleans up expired OAuth sessions older than 24 hours. Can be called periodically.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_export_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.export_request_log
  WHERE requested_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_export_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_export_logs"() IS 'Removes export log entries older than 90 days. Run periodically via cron.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < (now() - interval '7 days');
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_notifications"() IS 'Cleans up notifications older than 7 days. Fixed search_path for security.';



CREATE OR REPLACE FUNCTION "public"."clear_rls_context"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('app.rls_context', '', true);
END;
$$;


ALTER FUNCTION "public"."clear_rls_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Return 0 if no rules provided
  IF p_rules IS NULL OR jsonb_array_length(p_rules) = 0 THEN
    RETURN 0;
  END IF;

  -- Count distinct equipment matching any rule
  SELECT COUNT(DISTINCT e.id)
  INTO v_count
  FROM public.equipment e
  WHERE e.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_rules) AS r
      WHERE 
        lower(trim(e.manufacturer)) = lower(trim(r->>'manufacturer'))
        AND (
          r->>'model' IS NULL 
          OR trim(r->>'model') = ''
          OR lower(trim(e.model)) = lower(trim(r->>'model'))
        )
    );

  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") IS 'Counts equipment matching the given PM template compatibility rules server-side. More efficient than client-side O(n*m) matching for large fleets.';



CREATE OR REPLACE FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Return 0 if no rules provided
  IF p_rules IS NULL OR jsonb_array_length(p_rules) = 0 THEN
    RETURN 0;
  END IF;

  -- Count distinct equipment matching any rule
  -- Each rule has: manufacturer (required), model (optional), match_type (optional, defaults to 'exact')
  -- match_type can be: 'any', 'exact', 'prefix', 'wildcard'
  SELECT COUNT(DISTINCT e.id)
  INTO v_count
  FROM public.equipment e
  WHERE e.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_rules) AS r
      WHERE 
        -- Manufacturer must match (case-insensitive, trimmed)
        lower(trim(e.manufacturer)) = lower(trim(r->>'manufacturer'))
        -- Model matching based on match_type
        AND (
          -- ANY: match any model
          COALESCE(r->>'match_type', 'exact') = 'any'
          OR r->>'model' IS NULL 
          OR trim(r->>'model') = ''
          
          -- EXACT: model must match exactly
          OR (
            COALESCE(r->>'match_type', 'exact') = 'exact'
            AND lower(trim(e.model)) = lower(trim(r->>'model'))
          )
          
          -- PREFIX: model starts with pattern
          OR (
            r->>'match_type' = 'prefix'
            AND lower(trim(e.model)) LIKE (lower(trim(r->>'model')) || '%')
          )
          
          -- WILDCARD: model matches pattern (already converted: * → %, ? → _)
          OR (
            r->>'match_type' = 'wildcard'
            AND lower(trim(e.model)) LIKE lower(trim(r->>'model'))
          )
        )
    );

  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") IS 'Counts equipment matching the given compatibility rules server-side. Supports match_type: any, exact (default), prefix, wildcard. Rules format: [{manufacturer: string, model: string|null, match_type?: string}, ...].';



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


CREATE OR REPLACE FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text" DEFAULT NULL::"text", "p_origin_url" "text" DEFAULT NULL::"text") RETURNS TABLE("session_token" "text", "nonce" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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

  -- Validate user has QuickBooks management permission
  IF NOT public.can_user_manage_quickbooks(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'You do not have permission to connect QuickBooks';
  END IF;

  -- Generate session token (32 random bytes, base64 encoded = 44 chars)
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
    origin_url,
    expires_at
  ) VALUES (
    v_session_token,
    p_organization_id,
    v_user_id,
    v_nonce,
    p_redirect_url,
    p_origin_url,
    v_expires_at
  );

  RETURN QUERY SELECT v_session_token, v_nonce, v_expires_at;
END;
$$;


ALTER FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") IS 'Creates a server-side OAuth session for QuickBooks connection. Returns session token to include in OAuth state. Validates user is admin/owner of organization.';



CREATE OR REPLACE FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") IS 'Creates notifications for work order status changes. Fixed search_path for security.';



CREATE OR REPLACE FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_org_name TEXT;
  v_member_count INTEGER;
  v_equipment_count INTEGER;
  v_work_order_count INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate caller is the owner
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_current_user_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can delete the organization');
  END IF;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  IF v_org_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Validate confirmation name matches
  IF LOWER(TRIM(p_confirmation_name)) != LOWER(TRIM(v_org_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization name does not match');
  END IF;
  
  -- Count active members (excluding owner)
  SELECT COUNT(*) INTO v_member_count
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND role != 'owner'
    AND status = 'active';
  
  -- If there are other members and not forcing, reject
  IF v_member_count > 0 AND NOT p_force THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot delete organization with active members. Remove all members first or use force option.',
      'member_count', v_member_count
    );
  END IF;
  
  -- Get counts for audit
  SELECT COUNT(*) INTO v_equipment_count
  FROM equipment WHERE organization_id = p_organization_id;
  
  SELECT COUNT(*) INTO v_work_order_count
  FROM work_orders WHERE organization_id = p_organization_id;
  
  -- Check if owner has another organization
  -- If not, create a personal org before deletion
  IF NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = v_current_user_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND om.organization_id != p_organization_id
  ) THEN
    -- Create new personal organization for owner
    DECLARE
      v_user_name TEXT;
      v_new_org_id UUID;
    BEGIN
      SELECT name INTO v_user_name
      FROM profiles WHERE id = v_current_user_id;
      
      INSERT INTO organizations (name, plan, member_count, max_members, features)
      VALUES (
        COALESCE(v_user_name, 'My') || '''s Organization',
        'free',
        1,
        5,
        ARRAY['Equipment Management', 'Work Orders', 'Team Management']
      )
      RETURNING id INTO v_new_org_id;
      
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES (v_new_org_id, v_current_user_id, 'owner', 'active');
    END;
  END IF;
  
  -- Delete the organization (CASCADE handles related data)
  DELETE FROM organizations WHERE id = p_organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Organization "' || v_org_name || '" has been deleted',
    'deleted_stats', jsonb_build_object(
      'equipment', v_equipment_count,
      'work_orders', v_work_order_count,
      'members_removed', v_member_count
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) IS 'Delete an organization. Only the owner can call this. Requires name confirmation.';



CREATE OR REPLACE FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text" DEFAULT NULL::"text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  -- Validate user has QuickBooks management permission
  IF NOT public.can_user_manage_quickbooks(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'You do not have permission to disconnect QuickBooks';
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
$$;


ALTER FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") IS 'Disconnects QuickBooks by deleting credentials for an organization. Only admin/owner can disconnect. Optionally specify realm_id to disconnect specific connection.';



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



CREATE OR REPLACE FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") RETURNS TABLE("group_id" "uuid", "group_name" "text", "group_status" "public"."verification_status", "group_verified" boolean, "group_notes" "text", "identifier_id" "uuid", "identifier_type" "public"."part_identifier_type", "identifier_value" "text", "identifier_manufacturer" "text", "inventory_item_id" "uuid", "inventory_name" "text", "inventory_sku" "text", "quantity_on_hand" integer, "low_stock_threshold" integer, "default_unit_cost" numeric, "location" "text", "image_url" "text", "is_in_stock" boolean, "is_low_stock" boolean, "is_primary" boolean, "is_source_item" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH item_groups AS (
    -- Find all groups containing this inventory item
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    WHERE pagm.inventory_item_id = p_inventory_item_id
    
    UNION
    
    -- Also find groups via identifiers linked to this item
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN public.part_identifiers pi ON pagm.part_identifier_id = pi.id
    WHERE pi.inventory_item_id = p_inventory_item_id
  )
  SELECT
    pag.id AS group_id,
    pag.name AS group_name,
    pag.status AS group_status,
    (pag.status = 'verified') AS group_verified,
    pag.notes AS group_notes,
    
    pi.id AS identifier_id,
    pi.identifier_type,
    pi.raw_value AS identifier_value,
    pi.manufacturer AS identifier_manufacturer,
    
    ii.id AS inventory_item_id,
    ii.name AS inventory_name,
    ii.sku AS inventory_sku,
    COALESCE(ii.quantity_on_hand, 0) AS quantity_on_hand,
    COALESCE(ii.low_stock_threshold, 5) AS low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    (COALESCE(ii.quantity_on_hand, 0) > 0) AS is_in_stock,
    (COALESCE(ii.quantity_on_hand, 0) <= COALESCE(ii.low_stock_threshold, 5)) AS is_low_stock,
    
    pagm.is_primary,
    (ii.id = p_inventory_item_id) AS is_source_item
    
  FROM item_groups ig
  INNER JOIN public.part_alternate_groups pag ON pag.id = ig.group_id
  INNER JOIN public.part_alternate_group_members pagm ON pagm.group_id = pag.id
  LEFT JOIN public.part_identifiers pi ON pi.id = pagm.part_identifier_id
  LEFT JOIN public.inventory_items ii ON ii.id = COALESCE(pagm.inventory_item_id, pi.inventory_item_id)
  
  WHERE pag.organization_id = p_organization_id
  
  ORDER BY
    pag.name,
    pagm.is_primary DESC,
    (ii.id = p_inventory_item_id) DESC,  -- Source item first
    (ii.quantity_on_hand > 0) DESC,  -- In-stock first
    ii.default_unit_cost ASC NULLS LAST,
    ii.name NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") IS 'Finds all alternate parts for a given inventory item. Returns all members of alternate groups containing this item.';



CREATE OR REPLACE FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") RETURNS TABLE("group_id" "uuid", "group_name" "text", "group_status" "public"."verification_status", "group_verified" boolean, "group_notes" "text", "identifier_id" "uuid", "identifier_type" "public"."part_identifier_type", "identifier_value" "text", "identifier_manufacturer" "text", "inventory_item_id" "uuid", "inventory_name" "text", "inventory_sku" "text", "quantity_on_hand" integer, "low_stock_threshold" integer, "default_unit_cost" numeric, "location" "text", "image_url" "text", "is_in_stock" boolean, "is_low_stock" boolean, "is_primary" boolean, "is_matching_input" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_norm_value TEXT;
  v_search_pattern TEXT;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Normalize the input part number
  v_norm_value := lower(trim(p_part_number));
  -- Create search pattern for ILIKE (prefix match)
  v_search_pattern := v_norm_value || '%';
  
  -- Return empty if no valid input
  IF v_norm_value IS NULL OR v_norm_value = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matching_identifiers AS (
    -- Find all identifiers matching the search term (exact or prefix)
    SELECT pi.id AS matched_id
    FROM public.part_identifiers pi
    WHERE pi.organization_id = p_organization_id
      AND (pi.norm_value = v_norm_value OR pi.norm_value ILIKE v_search_pattern)
  ),
  matching_groups AS (
    -- Find all groups containing those identifiers
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN matching_identifiers mi ON pagm.part_identifier_id = mi.matched_id
    
    UNION
    
    -- Also match by inventory item SKU or external_id (for items in groups)
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN public.inventory_items ii ON pagm.inventory_item_id = ii.id
    WHERE ii.organization_id = p_organization_id
      AND (
        lower(trim(ii.sku)) = v_norm_value
        OR lower(trim(ii.sku)) ILIKE v_search_pattern
        OR lower(trim(ii.external_id)) = v_norm_value
        OR lower(trim(ii.external_id)) ILIKE v_search_pattern
      )
  ),
  -- Results from alternate groups
  group_results AS (
    SELECT
      pag.id AS group_id,
      pag.name AS group_name,
      pag.status AS group_status,
      (pag.status = 'verified') AS group_verified,
      pag.notes AS group_notes,
      
      pi.id AS identifier_id,
      pi.identifier_type,
      pi.raw_value AS identifier_value,
      pi.manufacturer AS identifier_manufacturer,
      
      ii.id AS inventory_item_id,
      ii.name AS inventory_name,
      ii.sku AS inventory_sku,
      COALESCE(ii.quantity_on_hand, 0) AS quantity_on_hand,
      COALESCE(ii.low_stock_threshold, 5) AS low_stock_threshold,
      ii.default_unit_cost,
      ii.location,
      ii.image_url,
      (COALESCE(ii.quantity_on_hand, 0) > 0) AS is_in_stock,
      (COALESCE(ii.quantity_on_hand, 0) <= COALESCE(ii.low_stock_threshold, 5)) AS is_low_stock,
      
      pagm.is_primary,
      -- Mark if this row matches the input search term
      (
        (pi.norm_value IS NOT NULL AND (pi.norm_value = v_norm_value OR pi.norm_value ILIKE v_search_pattern))
        OR (ii.sku IS NOT NULL AND (lower(trim(ii.sku)) = v_norm_value OR lower(trim(ii.sku)) ILIKE v_search_pattern))
        OR (ii.external_id IS NOT NULL AND (lower(trim(ii.external_id)) = v_norm_value OR lower(trim(ii.external_id)) ILIKE v_search_pattern))
      ) AS is_matching_input
      
    FROM matching_groups mg
    INNER JOIN public.part_alternate_groups pag ON pag.id = mg.group_id
    INNER JOIN public.part_alternate_group_members pagm ON pagm.group_id = pag.id
    LEFT JOIN public.part_identifiers pi ON pi.id = pagm.part_identifier_id
    LEFT JOIN public.inventory_items ii ON ii.id = COALESCE(pagm.inventory_item_id, pi.inventory_item_id)
    WHERE pag.organization_id = p_organization_id
  ),
  -- Direct inventory matches (items NOT in any alternate group)
  direct_inventory_matches AS (
    SELECT
      NULL::UUID AS group_id,
      'Direct Match (No Alternates Defined)'::TEXT AS group_name,
      'unverified'::verification_status AS group_status,
      FALSE AS group_verified,
      NULL::TEXT AS group_notes,
      
      NULL::UUID AS identifier_id,
      NULL::part_identifier_type AS identifier_type,
      NULL::TEXT AS identifier_value,
      NULL::TEXT AS identifier_manufacturer,
      
      ii.id AS inventory_item_id,
      ii.name AS inventory_name,
      ii.sku AS inventory_sku,
      COALESCE(ii.quantity_on_hand, 0) AS quantity_on_hand,
      COALESCE(ii.low_stock_threshold, 5) AS low_stock_threshold,
      ii.default_unit_cost,
      ii.location,
      ii.image_url,
      (COALESCE(ii.quantity_on_hand, 0) > 0) AS is_in_stock,
      (COALESCE(ii.quantity_on_hand, 0) <= COALESCE(ii.low_stock_threshold, 5)) AS is_low_stock,
      
      TRUE AS is_primary,  -- Direct match is primary
      TRUE AS is_matching_input
      
    FROM public.inventory_items ii
    WHERE ii.organization_id = p_organization_id
      AND (
        lower(trim(ii.sku)) = v_norm_value
        OR lower(trim(ii.sku)) ILIKE v_search_pattern
        OR lower(trim(ii.external_id)) = v_norm_value
        OR lower(trim(ii.external_id)) ILIKE v_search_pattern
        OR lower(trim(ii.name)) ILIKE v_search_pattern
      )
      -- Exclude items that are already in alternate groups (to avoid duplicates)
      AND NOT EXISTS (
        SELECT 1 FROM public.part_alternate_group_members pagm
        WHERE pagm.inventory_item_id = ii.id
      )
      -- Also exclude items linked via part_identifiers in groups
      AND NOT EXISTS (
        SELECT 1 FROM public.part_identifiers pi
        INNER JOIN public.part_alternate_group_members pagm ON pagm.part_identifier_id = pi.id
        WHERE pi.inventory_item_id = ii.id
      )
  ),
  -- Combine results: group alternates first, then direct matches
  combined_results AS (
    SELECT * FROM group_results
    UNION ALL
    SELECT * FROM direct_inventory_matches
  )
  SELECT * FROM combined_results cr
  ORDER BY
    cr.group_name NULLS LAST,
    cr.is_primary DESC,
    cr.is_in_stock DESC,  -- In-stock first
    cr.default_unit_cost ASC NULLS LAST,
    cr.inventory_name NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") IS 'Looks up alternate/interchangeable parts by part number. Searches part_identifiers and inventory_items (by SKU/external_id/name), then returns all members of matching alternate groups with stock info. Also returns direct inventory matches for items not in any alternate group. Supports prefix matching for partial searches. Results are sorted: in-stock first, then by cost.';



CREATE OR REPLACE FUNCTION "public"."get_audit_actor_info"() RETURNS TABLE("actor_id" "uuid", "actor_name" "text", "actor_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_name TEXT;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'System'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  SELECT p.name, u.email 
  INTO v_name, v_email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = v_user_id;
  
  IF v_name IS NULL THEN
    v_name := COALESCE(v_email, 'Unknown User');
  END IF;
  
  RETURN QUERY SELECT v_user_id, v_name, v_email;
END;
$$;


ALTER FUNCTION "public"."get_audit_actor_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) RETURNS TABLE("inventory_item_id" "uuid", "name" "text", "sku" "text", "external_id" "text", "quantity_on_hand" integer, "low_stock_threshold" integer, "default_unit_cost" numeric, "location" "text", "image_url" "text", "match_type" "text", "has_alternates" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Return empty if no equipment IDs provided
  IF p_equipment_ids IS NULL OR array_length(p_equipment_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH compatible_parts AS (
    -- Direct links (org-safe by joining inventory_items and filtering organization_id)
    SELECT
      ii.id AS inv_item_id,
      ii.name AS item_name,
      ii.sku AS item_sku,
      ii.external_id AS item_external_id,
      ii.quantity_on_hand AS item_qty,
      ii.low_stock_threshold AS item_threshold,
      ii.default_unit_cost AS item_cost,
      ii.location AS item_location,
      ii.image_url AS item_image,
      'direct'::TEXT AS item_match_type
    FROM public.equipment_part_compatibility epc
    JOIN public.inventory_items ii ON ii.id = epc.inventory_item_id
    WHERE epc.equipment_id = ANY(p_equipment_ids)
      AND ii.organization_id = p_organization_id

    UNION

    -- Rule-based matches (with pattern support)
    SELECT
      ii.id AS inv_item_id,
      ii.name AS item_name,
      ii.sku AS item_sku,
      ii.external_id AS item_external_id,
      ii.quantity_on_hand AS item_qty,
      ii.low_stock_threshold AS item_threshold,
      ii.default_unit_cost AS item_cost,
      ii.location AS item_location,
      ii.image_url AS item_image,
      'rule'::TEXT AS item_match_type
    FROM public.equipment e
    JOIN public.part_compatibility_rules pcr
      ON pcr.manufacturer_norm = lower(trim(e.manufacturer))
      AND (
        -- ANY: match any model
        pcr.match_type = 'any'
        
        -- EXACT: model must match exactly
        OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
        
        -- PREFIX: model starts with pattern
        OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
        
        -- WILDCARD: model matches pattern
        OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
        
        -- Legacy: NULL model_norm means any model (backwards compat)
        OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
      )
    JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
      AND ii.organization_id = p_organization_id
    WHERE e.id = ANY(p_equipment_ids)
      AND e.organization_id = p_organization_id
  ),
  -- Deduplicate and add has_alternates flag
  parts_with_alternates AS (
    SELECT DISTINCT
      cp.inv_item_id,
      cp.item_name,
      cp.item_sku,
      cp.item_external_id,
      cp.item_qty,
      cp.item_threshold,
      cp.item_cost,
      cp.item_location,
      cp.item_image,
      cp.item_match_type,
      EXISTS (
        SELECT 1 FROM public.part_alternate_group_members pagm 
        WHERE pagm.inventory_item_id = cp.inv_item_id
      ) AS item_has_alternates
    FROM compatible_parts cp
  )
  -- Return with final sort: alternates first, then cheapest price, then by name
  -- NULLS LAST ensures items with prices appear before items without prices
  SELECT
    pwa.inv_item_id AS inventory_item_id,
    pwa.item_name AS name,
    pwa.item_sku AS sku,
    pwa.item_external_id AS external_id,
    pwa.item_qty AS quantity_on_hand,
    pwa.item_threshold AS low_stock_threshold,
    pwa.item_cost AS default_unit_cost,
    pwa.item_location AS location,
    pwa.item_image AS image_url,
    pwa.item_match_type AS match_type,
    pwa.item_has_alternates AS has_alternates
  FROM parts_with_alternates pwa
  ORDER BY pwa.item_has_alternates DESC, pwa.item_cost ASC NULLS LAST, pwa.item_name ASC;
END;
$$;


ALTER FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) IS 'Returns compatible inventory items for given equipment IDs. Combines direct links with rule-based matches including pattern matching. Includes has_alternates flag and sorts: alternates first, then cheapest price, then by name.';



CREATE OR REPLACE FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text" DEFAULT NULL::"text") RETURNS TABLE("inventory_item_id" "uuid", "name" "text", "sku" "text", "external_id" "text", "quantity_on_hand" integer, "low_stock_threshold" integer, "default_unit_cost" numeric, "location" "text", "image_url" "text", "match_type" "text", "rule_match_type" "public"."model_match_type", "rule_status" "public"."verification_status", "is_in_stock" boolean, "is_verified" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_mfr_norm TEXT;
  v_model_norm TEXT;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Normalize inputs
  v_mfr_norm := lower(trim(COALESCE(p_manufacturer, '')));
  v_model_norm := lower(trim(COALESCE(p_model, '')));
  
  -- Return empty if no manufacturer provided
  IF v_mfr_norm = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ii.id AS inventory_item_id,
    ii.name,
    ii.sku,
    ii.external_id,
    ii.quantity_on_hand,
    ii.low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    'rule'::TEXT AS match_type,
    pcr.match_type AS rule_match_type,
    pcr.status AS rule_status,
    (ii.quantity_on_hand > 0) AS is_in_stock,
    (pcr.status = 'verified') AS is_verified
  FROM public.part_compatibility_rules pcr
  JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE pcr.manufacturer_norm = v_mfr_norm
    AND (
      -- ANY: match any model
      pcr.match_type = 'any'
      
      -- EXACT: model must match exactly (or no model provided = match all)
      OR (
        pcr.match_type = 'exact' 
        AND (v_model_norm = '' OR pcr.model_norm = v_model_norm)
      )
      
      -- PREFIX: model starts with pattern
      OR (
        pcr.match_type = 'prefix' 
        AND v_model_norm <> ''
        AND v_model_norm LIKE (pcr.model_pattern_norm || '%')
      )
      
      -- WILDCARD: model matches pattern
      OR (
        pcr.match_type = 'wildcard' 
        AND v_model_norm <> ''
        AND v_model_norm LIKE pcr.model_pattern_norm
      )
      
      -- Legacy: NULL model_norm means any model
      OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
    )
  ORDER BY
    (pcr.status = 'verified') DESC,  -- Verified first
    (ii.quantity_on_hand > 0) DESC,  -- In-stock first
    ii.default_unit_cost ASC NULLS LAST,  -- Cheapest first
    ii.name;
END;
$$;


ALTER FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") IS 'Returns compatible inventory items for a given manufacturer and optional model. Does NOT require an equipment record. Matches against part_compatibility_rules. Results sorted: verified first, in-stock first, cheapest first.';



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



CREATE OR REPLACE FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") RETURNS TABLE("equipment_id" "uuid", "name" "text", "manufacturer" "text", "model" "text", "serial_number" "text", "status" "text", "location" "text", "matched_rule_id" "uuid", "matched_rule_manufacturer" "text", "matched_rule_model" "text", "matched_rule_match_type" "public"."model_match_type", "matched_rule_status" "public"."verification_status")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  -- Start from equipment (like the working function does)
  -- and find rules that match
  SELECT DISTINCT ON (e.id)
    e.id AS equipment_id,
    e.name::TEXT,
    e.manufacturer::TEXT,
    e.model::TEXT,
    e.serial_number::TEXT,
    e.status::TEXT,
    e.location::TEXT,
    pcr.id AS matched_rule_id,
    pcr.manufacturer::TEXT AS matched_rule_manufacturer,
    pcr.model::TEXT AS matched_rule_model,
    pcr.match_type AS matched_rule_match_type,
    pcr.status AS matched_rule_status
  FROM public.equipment e
  JOIN public.part_compatibility_rules pcr
    ON pcr.manufacturer_norm = lower(trim(e.manufacturer))
    AND (
      -- ANY: match any model from this manufacturer
      pcr.match_type = 'any'
      
      -- EXACT: model must match exactly
      OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
      
      -- PREFIX: model starts with pattern
      OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
      
      -- WILDCARD: model matches pattern
      OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
      
      -- Legacy: NULL model_norm with exact type means any model
      OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
    )
  JOIN public.inventory_items ii 
    ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE e.organization_id = p_organization_id
    AND pcr.inventory_item_id = p_item_id
  ORDER BY e.id, pcr.status DESC, e.name;
END;
$$;


ALTER FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") IS 'Returns equipment that matches the compatibility rules of a specific inventory item. This is the inverse of get_compatible_parts_for_equipment - used to show which equipment an inventory item is compatible with based on its manufacturer/model rules.';



CREATE OR REPLACE FUNCTION "public"."get_global_pm_template_names"() RETURNS TABLE("name" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT t.name
  FROM public.pm_checklist_templates t
  WHERE t.organization_id IS NULL
  ORDER BY t.name;
$$;


ALTER FUNCTION "public"."get_global_pm_template_names"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_global_pm_template_names"() IS 'Returns names of global PM templates (organization_id IS NULL). Fixed search_path for security.';



CREATE OR REPLACE FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "organization_name" "text", "email" "text", "role" "text", "status" "text", "expires_at" timestamp with time zone, "message" "text", "invited_by_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invitation_email text;
  current_user_email text;
BEGIN
  -- Get the current user's email (will be null if not authenticated)
  current_user_email := auth.email();
  
  -- First check if the invitation exists and get the email
  SELECT oi.email INTO invitation_email
  FROM organization_invitations oi
  WHERE oi.invitation_token = p_token
    AND oi.status = 'pending'
    AND oi.expires_at > now();
  
  -- If invitation not found or expired, return empty result
  IF invitation_email IS NULL THEN
    RETURN;
  END IF;
  
  -- If user is authenticated, validate their email matches the invitation
  IF current_user_email IS NOT NULL THEN
    IF lower(trim(invitation_email)) != lower(trim(current_user_email)) THEN
      -- Authenticated user's email doesn't match invitation - deny access
      RETURN;
    END IF;
  END IF;
  
  -- User is either:
  -- 1. Unauthenticated (can proceed to sign up)
  -- 2. Authenticated and email matches (can proceed to accept)
  -- Return the invitation details
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
    AND oi.expires_at > now();
END;
$$;


ALTER FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") IS 'Securely retrieves invitation details by token - allows unauthenticated users to view invitations for signup, validates authenticated users email matches';



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


CREATE OR REPLACE FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") RETURNS TABLE("template_id" "uuid", "template_name" "text", "template_description" "text", "is_protected" boolean, "template_organization_id" "uuid", "match_type" "text", "matched_manufacturer" "text", "matched_model" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_equipment_manufacturer TEXT;
  v_equipment_model TEXT;
  v_equipment_manufacturer_norm TEXT;
  v_equipment_model_norm TEXT;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Get equipment manufacturer and model
  SELECT e.manufacturer, e.model,
         lower(trim(e.manufacturer)), lower(trim(e.model))
  INTO v_equipment_manufacturer, v_equipment_model,
       v_equipment_manufacturer_norm, v_equipment_model_norm
  FROM public.equipment e
  WHERE e.id = p_equipment_id
    AND e.organization_id = p_organization_id;

  -- Return empty if equipment not found
  IF v_equipment_manufacturer IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Get templates with matching rules FOR THIS ORGANIZATION
  SELECT DISTINCT ON (t.id)
    t.id AS template_id,
    t.name AS template_name,
    t.description AS template_description,
    t.is_protected,
    t.organization_id AS template_organization_id,
    CASE 
      WHEN pcr.model_norm IS NOT NULL THEN 'model'::TEXT
      ELSE 'manufacturer'::TEXT
    END AS match_type,
    pcr.manufacturer AS matched_manufacturer,
    pcr.model AS matched_model
  FROM public.pm_checklist_templates t
  JOIN public.pm_template_compatibility_rules pcr ON pcr.pm_template_id = t.id
  WHERE 
    -- Rules must be for this organization
    pcr.organization_id = p_organization_id
    -- Template must be accessible (global or org-owned)
    AND (t.organization_id IS NULL OR t.organization_id = p_organization_id)
    -- Rule must match the equipment
    AND pcr.manufacturer_norm = v_equipment_manufacturer_norm
    AND (pcr.model_norm IS NULL OR pcr.model_norm = v_equipment_model_norm)
  -- Order by match specificity (model match first, then manufacturer-only)
  ORDER BY t.id, 
    CASE WHEN pcr.model_norm IS NOT NULL THEN 0 ELSE 1 END;
END;
$$;


ALTER FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") IS 'Returns PM templates that match the given equipment based on the organizations compatibility rules. Results include match type (model = specific match, manufacturer = any model match) and are ordered by match specificity. Only returns rules set by the calling organization.';



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


CREATE OR REPLACE FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_member_count INTEGER;
  v_equipment_count INTEGER;
  v_work_order_count INTEGER;
  v_team_count INTEGER;
  v_inventory_count INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate caller is the owner
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_current_user_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can view deletion stats');
  END IF;
  
  -- Count members (excluding owner)
  SELECT COUNT(*) INTO v_member_count
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND role != 'owner'
    AND status = 'active';
  
  -- Count equipment
  SELECT COUNT(*) INTO v_equipment_count
  FROM equipment
  WHERE organization_id = p_organization_id;
  
  -- Count work orders
  SELECT COUNT(*) INTO v_work_order_count
  FROM work_orders
  WHERE organization_id = p_organization_id;
  
  -- Count teams
  SELECT COUNT(*) INTO v_team_count
  FROM teams
  WHERE organization_id = p_organization_id;
  
  -- Count inventory items
  SELECT COUNT(*) INTO v_inventory_count
  FROM inventory_items
  WHERE organization_id = p_organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'member_count', v_member_count,
    'equipment_count', v_equipment_count,
    'work_order_count', v_work_order_count,
    'team_count', v_team_count,
    'inventory_count', v_inventory_count,
    'can_delete', v_member_count = 0
  );
END;
$$;


ALTER FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") IS 'Get statistics about what will be deleted when an organization is deleted.';



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


CREATE OR REPLACE FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  total_mb BIGINT := 0;
BEGIN
  -- Sum all equipment note images
  SELECT COALESCE(SUM(file_size), 0) INTO total_mb
  FROM equipment_note_images eni
  JOIN equipment_notes en ON eni.equipment_note_id = en.id
  JOIN equipment e ON en.equipment_id = e.id
  WHERE e.organization_id = org_id;
  
  -- Add work order images
  SELECT total_mb + COALESCE(SUM(file_size), 0) INTO total_mb
  FROM work_order_images
  WHERE work_order_id IN (
    SELECT id FROM work_orders WHERE organization_id = org_id
  );
  
  -- Convert bytes to MB
  RETURN ROUND(total_mb / 1048576.0);
END;
$$;


ALTER FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") IS 'Calculate total storage used by an organization in MB. Returns storage from equipment_note_images and work_order_images tables. Created 2025-01-28.';



CREATE OR REPLACE FUNCTION "public"."get_pending_transfer_requests"() RETURNS TABLE("id" "uuid", "organization_id" "uuid", "organization_name" "text", "from_user_id" "uuid", "from_user_name" "text", "to_user_id" "uuid", "to_user_name" "text", "transfer_reason" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "is_incoming" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    otr.id,
    otr.organization_id,
    o.name AS organization_name,
    otr.from_user_id,
    otr.from_user_name,
    otr.to_user_id,
    otr.to_user_name,
    otr.transfer_reason,
    otr.created_at,
    otr.expires_at,
    (otr.to_user_id = v_current_user_id) AS is_incoming
  FROM ownership_transfer_requests otr
  JOIN organizations o ON o.id = otr.organization_id
  WHERE otr.status = 'pending'
    AND otr.expires_at > NOW()
    AND (otr.from_user_id = v_current_user_id OR otr.to_user_id = v_current_user_id);
END;
$$;


ALTER FUNCTION "public"."get_pending_transfer_requests"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_transfer_requests"() IS 'Get all pending transfer requests for the current user (both incoming and outgoing).';



CREATE OR REPLACE FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") RETURNS TABLE("is_connected" boolean, "realm_id" "text", "connected_at" timestamp with time zone, "access_token_expires_at" timestamp with time zone, "refresh_token_expires_at" timestamp with time zone, "is_access_token_valid" boolean, "is_refresh_token_valid" boolean, "scopes" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  -- Validate user has QuickBooks management permission
  IF NOT public.can_user_manage_quickbooks(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'You do not have permission to view QuickBooks connection status';
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
$$;


ALTER FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") IS 'Returns non-sensitive QuickBooks connection metadata for an organization. Only admin/owner can access. Does NOT expose OAuth tokens.';



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


CREATE OR REPLACE FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.can_user_manage_quickbooks(v_user_id, p_organization_id);
END;
$$;


ALTER FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") IS 'Returns whether the current user can manage QuickBooks for the specified organization.';



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


CREATE OR REPLACE FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "team_id" "uuid", "team_name" "text", "user_role" "text", "has_access" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") IS 'Returns teams and access info for user notifications. Fixed search_path for security.';



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
  org_name text;
  invited_name text;
  existing_membership_count int;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 1: Create profile (idempotent - uses ON CONFLICT)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        updated_at = NOW();

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 2: Check if user already has organization memberships
  -- ═══════════════════════════════════════════════════════════════════════════
  -- If the user already has active memberships (e.g., from seed data),
  -- skip organization creation. This makes the trigger idempotent for seeding.
  SELECT COUNT(*) INTO existing_membership_count
  FROM public.organization_members
  WHERE user_id = NEW.id AND status = 'active';

  IF existing_membership_count > 0 THEN
    -- User already has organization memberships (from seeds or prior run)
    -- Skip organization creation to avoid duplicates
    RETURN NEW;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 3: Create organization (only if no existing memberships)
  -- ═══════════════════════════════════════════════════════════════════════════
  
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger function for new user registration. Creates user profile and organization.
Idempotent: Skips org creation if user already has active memberships (for seeding).
Prevents duplicate org names when user is invited to an existing organization.';



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


CREATE OR REPLACE FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_from_user_id UUID;
  v_from_user_name TEXT;
  v_to_user_name TEXT;
  v_org_name TEXT;
  v_transfer_id UUID;
  v_existing_pending UUID;
BEGIN
  -- Get current user
  v_from_user_id := auth.uid();
  
  IF v_from_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate caller is the current owner
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_from_user_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the current owner can transfer ownership');
  END IF;
  
  -- Validate target is an active admin in the org
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_to_user_id
      AND role = 'admin'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user must be an active admin in the organization');
  END IF;
  
  -- Check for existing pending transfer
  SELECT id INTO v_existing_pending
  FROM ownership_transfer_requests
  WHERE organization_id = p_organization_id
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;
  
  IF v_existing_pending IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'There is already a pending transfer request for this organization');
  END IF;
  
  -- Get user names
  SELECT name INTO v_from_user_name
  FROM profiles WHERE id = v_from_user_id;
  
  SELECT name INTO v_to_user_name
  FROM profiles WHERE id = p_to_user_id;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  -- Create transfer request
  INSERT INTO ownership_transfer_requests (
    organization_id,
    from_user_id,
    to_user_id,
    from_user_name,
    to_user_name,
    transfer_reason,
    status,
    expires_at
  ) VALUES (
    p_organization_id,
    v_from_user_id,
    p_to_user_id,
    COALESCE(v_from_user_name, 'Unknown'),
    COALESCE(v_to_user_name, 'Unknown'),
    p_transfer_reason,
    'pending',
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_transfer_id;
  
  -- Create notification for target user (GLOBAL - visible across all orgs)
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data,
    is_global
  ) VALUES (
    p_organization_id,
    p_to_user_id,
    'ownership_transfer_request',
    'Ownership Transfer Request',
    v_from_user_name || ' wants to transfer ownership of ' || v_org_name || ' to you.',
    jsonb_build_object(
      'transfer_id', v_transfer_id,
      'organization_id', p_organization_id,
      'organization_name', v_org_name,
      'from_user_id', v_from_user_id,
      'from_user_name', v_from_user_name
    ),
    true  -- Mark as global notification
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'message', 'Transfer request sent to ' || v_to_user_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") IS 'Initiates an ownership transfer request. Only the current owner can call this.';



CREATE OR REPLACE FUNCTION "public"."invoke_quickbooks_token_refresh"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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
$_$;


ALTER FUNCTION "public"."invoke_quickbooks_token_refresh"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invoke_quickbooks_token_refresh"() IS 'Calls the quickbooks-refresh-tokens edge function using credentials stored in vault.secrets. This function is secured and can only be called by pg_cron scheduler (postgres superuser) or other authorized superusers. Fixed search_path for security.';



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



CREATE OR REPLACE FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parts_managers
    WHERE organization_id = p_organization_id
    AND user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user is a parts manager for the given organization. Defaults to checking the current authenticated user.';



CREATE OR REPLACE FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team_id UUID;
  v_is_valid BOOLEAN := FALSE;
BEGIN
  -- If no assignee, always valid (unassigned)
  IF p_assignee_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Get the equipment's team_id
  SELECT team_id INTO v_team_id
  FROM equipment
  WHERE id = p_equipment_id AND organization_id = p_organization_id;

  -- If equipment has no team, assignment is blocked
  IF v_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if assignee is an org admin/owner
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_assignee_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if assignee is a team member (manager/technician) of the equipment's team
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_team_id
      AND user_id = p_assignee_id
      AND role IN ('manager', 'technician')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Assignee is not valid
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") IS 'Validates that an assignee is valid for a work order: must be a team member (manager/technician) of the equipment''s team or an org admin/owner. Returns FALSE if equipment has no team.';



CREATE OR REPLACE FUNCTION "public"."leave_organization"("p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_role TEXT;
  v_org_name TEXT;
  v_queue_id UUID;
  v_notes_count INTEGER;
  v_scans_count INTEGER;
  v_status_history_count INTEGER;
  v_costs_count INTEGER;
  v_transactions_count INTEGER;
  v_pm_count INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get user's role in this organization
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_current_user_id
    AND status = 'active';
  
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this organization');
  END IF;
  
  -- Owners cannot leave - they must transfer ownership first
  IF v_user_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Owners cannot leave the organization. Transfer ownership first.');
  END IF;
  
  -- Get user details
  SELECT name, email INTO v_user_name, v_user_email
  FROM profiles WHERE id = v_current_user_id;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  -- Count records that need denormalization
  SELECT COUNT(*) INTO v_notes_count
  FROM notes n
  JOIN equipment e ON e.id = n.equipment_id
  WHERE n.author_id = v_current_user_id
    AND e.organization_id = p_organization_id
    AND n.author_name IS NULL;
  
  SELECT COUNT(*) INTO v_scans_count
  FROM scans s
  JOIN equipment e ON e.id = s.equipment_id
  WHERE s.scanned_by = v_current_user_id
    AND e.organization_id = p_organization_id
    AND s.scanned_by_name IS NULL;
  
  SELECT COUNT(*) INTO v_status_history_count
  FROM work_order_status_history wosh
  JOIN work_orders wo ON wo.id = wosh.work_order_id
  WHERE wosh.changed_by = v_current_user_id
    AND wo.organization_id = p_organization_id
    AND wosh.changed_by_name IS NULL;
  
  SELECT COUNT(*) INTO v_costs_count
  FROM work_order_costs woc
  JOIN work_orders wo ON wo.id = woc.work_order_id
  WHERE woc.created_by = v_current_user_id
    AND wo.organization_id = p_organization_id
    AND woc.created_by_name IS NULL;
  
  SELECT COUNT(*) INTO v_transactions_count
  FROM inventory_transactions it
  JOIN inventory_items ii ON ii.id = it.inventory_item_id
  WHERE it.user_id = v_current_user_id
    AND ii.organization_id = p_organization_id
    AND it.user_name IS NULL;
  
  SELECT COUNT(*) INTO v_pm_count
  FROM preventative_maintenance pm
  WHERE (pm.created_by = v_current_user_id OR pm.completed_by = v_current_user_id)
    AND pm.organization_id = p_organization_id
    AND (pm.created_by_name IS NULL OR pm.completed_by_name IS NULL);
  
  -- Create departure queue entry if there are records to process
  IF (v_notes_count + v_scans_count + v_status_history_count + v_costs_count + v_transactions_count + v_pm_count) > 0 THEN
    INSERT INTO user_departure_queue (
      organization_id,
      user_id,
      user_name,
      user_email,
      status,
      tables_to_process
    ) VALUES (
      p_organization_id,
      v_current_user_id,
      COALESCE(v_user_name, v_user_email, 'Unknown'),
      COALESCE(v_user_email, 'unknown@unknown.com'),
      'pending',
      jsonb_build_object(
        'notes', jsonb_build_object('total', v_notes_count, 'processed', 0),
        'scans', jsonb_build_object('total', v_scans_count, 'processed', 0),
        'work_order_status_history', jsonb_build_object('total', v_status_history_count, 'processed', 0),
        'work_order_costs', jsonb_build_object('total', v_costs_count, 'processed', 0),
        'inventory_transactions', jsonb_build_object('total', v_transactions_count, 'processed', 0),
        'preventative_maintenance', jsonb_build_object('total', v_pm_count, 'processed', 0)
      )
    )
    RETURNING id INTO v_queue_id;
  END IF;
  
  -- Create audit record
  INSERT INTO member_removal_audit (
    organization_id,
    removed_user_id,
    removed_user_name,
    removed_user_role,
    removed_by,
    removal_reason,
    metadata
  ) VALUES (
    p_organization_id,
    v_current_user_id,
    COALESCE(v_user_name, v_user_email, 'Unknown'),
    v_user_role,
    v_current_user_id, -- Self-removal
    'User left organization voluntarily',
    jsonb_build_object(
      'departure_queue_id', v_queue_id,
      'records_to_denormalize', v_notes_count + v_scans_count + v_status_history_count + v_costs_count + v_transactions_count + v_pm_count
    )
  );
  
  -- Remove from team_members first (to avoid FK issues)
  DELETE FROM team_members
  WHERE user_id = v_current_user_id
    AND team_id IN (
      SELECT id FROM teams WHERE organization_id = p_organization_id
    );
  
  -- Remove from parts_managers
  DELETE FROM parts_managers
  WHERE user_id = v_current_user_id
    AND organization_id = p_organization_id;
  
  -- Remove from notification_settings
  DELETE FROM notification_settings
  WHERE user_id = v_current_user_id
    AND organization_id = p_organization_id;
  
  -- Finally remove from organization_members
  DELETE FROM organization_members
  WHERE user_id = v_current_user_id
    AND organization_id = p_organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'You have left ' || v_org_name,
    'departure_queue_id', v_queue_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."leave_organization"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."leave_organization"("p_organization_id" "uuid") IS 'Leave an organization. Queues departure for batch denormalization processing.';



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


CREATE OR REPLACE FUNCTION "public"."list_pm_templates"() RETURNS TABLE("template_name" "text", "item_count" bigint, "is_global" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.name::TEXT,
        (SELECT COUNT(*) FROM jsonb_array_elements(t.template_data))::BIGINT as item_count,
        (t.organization_id IS NULL)::BOOLEAN as is_global
    FROM pm_checklist_templates t
    WHERE t.organization_id IS NULL
    ORDER BY t.name;
END;
$$;


ALTER FUNCTION "public"."list_pm_templates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_pm_templates"("org_id" "uuid") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "name" "text", "description" "text", "template_data" "jsonb", "is_protected" boolean, "created_by" "uuid", "updated_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."list_pm_templates"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_pm_templates"("org_id" "uuid") IS 'Lists PM templates accessible to an organization (global + org-specific). Fixed search_path for security.';



CREATE OR REPLACE FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor RECORD;
  v_audit_id UUID;
BEGIN
  -- Get actor info
  SELECT * INTO v_actor FROM public.get_audit_actor_info();
  
  -- Insert audit record
  INSERT INTO public.audit_log (
    organization_id,
    entity_type,
    entity_id,
    entity_name,
    action,
    actor_id,
    actor_name,
    actor_email,
    changes,
    metadata
  ) VALUES (
    p_organization_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    v_actor.actor_id,
    COALESCE(v_actor.actor_name, 'System'),
    v_actor.actor_email,
    p_changes,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;


ALTER FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") OWNER TO "postgres";


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
    SET "search_path" TO ''
    AS $$
DECLARE
  changed_by_user uuid;
BEGIN
  -- Get the current user ID
  changed_by_user := auth.uid();
  
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert into status history (existing functionality)
    IF NOT EXISTS (
      SELECT 1 FROM public.work_order_status_history 
      WHERE work_order_id = NEW.id 
        AND old_status IS NULL 
        AND new_status = NEW.status
    ) THEN
      INSERT INTO public.work_order_status_history (
        work_order_id, old_status, new_status, changed_by, reason
      ) VALUES (
        NEW.id, OLD.status, NEW.status, changed_by_user, 'Status updated'
      );
    END IF;
    
    -- Create notifications for the status change
    PERFORM public.create_work_order_notifications(NEW.id, NEW.status::text, changed_by_user);
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_work_order_status_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_work_order_status_change"() IS 'Trigger function to log work order status changes and create notifications. Fixed search_path for security.';



CREATE OR REPLACE FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  v_normalized TEXT;
  v_asterisk_count INTEGER;
BEGIN
  -- ANY type doesn't need a pattern
  IF p_match_type = 'any' THEN
    RETURN NULL;
  END IF;
  
  -- EXACT type uses standard normalization
  IF p_match_type = 'exact' THEN
    RETURN lower(trim(COALESCE(p_pattern, '')));
  END IF;
  
  -- For PREFIX and WILDCARD, validate and normalize
  v_normalized := lower(trim(COALESCE(p_pattern, '')));
  
  IF v_normalized = '' THEN
    RAISE EXCEPTION 'Pattern cannot be empty for match type %', p_match_type
      USING ERRCODE = '22023';
  END IF;
  
  -- PREFIX: just return the normalized prefix (no wildcards allowed)
  IF p_match_type = 'prefix' THEN
    IF v_normalized LIKE '%*%' OR v_normalized LIKE '%?%' THEN
      RAISE EXCEPTION 'PREFIX patterns cannot contain wildcards. Use the pattern text directly (e.g., "jl-" instead of "jl-*")'
        USING ERRCODE = '22023';
    END IF;
    RETURN v_normalized;
  END IF;
  
  -- WILDCARD: validate and convert * to % for SQL LIKE
  IF p_match_type = 'wildcard' THEN
    -- Count asterisks
    v_asterisk_count := length(v_normalized) - length(replace(v_normalized, '*', ''));
    
    -- Limit wildcards to prevent expensive patterns
    IF v_asterisk_count > 2 THEN
      RAISE EXCEPTION 'WILDCARD patterns can have at most 2 wildcards (*)'
        USING ERRCODE = '22023';
    END IF;
    
    -- Don't allow patterns that are just wildcards (would match everything)
    IF v_normalized = '*' OR v_normalized = '**' OR v_normalized = '*-*' THEN
      RAISE EXCEPTION 'WILDCARD patterns must include at least 2 non-wildcard characters'
        USING ERRCODE = '22023';
    END IF;
    
    -- Convert * to % and ? to _ for SQL LIKE
    v_normalized := replace(v_normalized, '*', '%');
    v_normalized := replace(v_normalized, '?', '_');
    
    RETURN v_normalized;
  END IF;
  
  -- Shouldn't reach here
  RETURN v_normalized;
END;
$$;


ALTER FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") IS 'Validates and normalizes compatibility rule patterns. For PREFIX, returns lowercase trimmed pattern. For WILDCARD, converts * to % and validates constraints.';



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


CREATE OR REPLACE FUNCTION "public"."process_all_pending_departures"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_queue_record RECORD;
  v_processed_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Process up to 10 queue entries per run
  FOR v_queue_record IN
    SELECT id
    FROM user_departure_queue
    WHERE status IN ('pending', 'processing')
      AND (retry_count < 5 OR retry_count IS NULL)
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    v_result := process_departure_batch(v_queue_record.id, 1000);
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'queues_processed', v_processed_count
  );
END;
$$;


ALTER FUNCTION "public"."process_all_pending_departures"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_all_pending_departures"() IS 'Process all pending user departures. Called by pg_cron every 5 minutes.';



CREATE OR REPLACE FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer DEFAULT 1000) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_queue RECORD;
  v_tables_status JSONB;
  v_rows_updated INTEGER;
  v_all_complete BOOLEAN := true;
  v_table_name TEXT;
  v_processed INTEGER;
  v_total INTEGER;
BEGIN
  -- Lock the queue entry
  SELECT * INTO v_queue
  FROM user_departure_queue
  WHERE id = p_queue_id
  FOR UPDATE SKIP LOCKED;
  
  IF v_queue IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Queue entry not found or locked');
  END IF;
  
  IF v_queue.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already completed');
  END IF;
  
  v_tables_status := v_queue.tables_to_process;
  
  -- Mark as processing
  UPDATE user_departure_queue
  SET status = 'processing', started_at = COALESCE(started_at, NOW())
  WHERE id = p_queue_id;
  
  -- Process each table
  FOR v_table_name IN SELECT jsonb_object_keys(v_tables_status)
  LOOP
    v_processed := (v_tables_status->v_table_name->>'processed')::int;
    v_total := (v_tables_status->v_table_name->>'total')::int;
    
    -- Skip if already complete
    IF v_processed >= v_total THEN
      CONTINUE;
    END IF;
    
    v_all_complete := false;
    v_rows_updated := 0;
    
    -- Process batch for this table
    CASE v_table_name
      WHEN 'notes' THEN
        WITH updated AS (
          UPDATE notes n
          SET author_name = v_queue.user_name
          FROM equipment e
          WHERE n.equipment_id = e.id
            AND n.author_id = v_queue.user_id
            AND e.organization_id = v_queue.organization_id
            AND n.author_name IS NULL
          RETURNING n.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'scans' THEN
        WITH updated AS (
          UPDATE scans s
          SET scanned_by_name = v_queue.user_name
          FROM equipment e
          WHERE s.equipment_id = e.id
            AND s.scanned_by = v_queue.user_id
            AND e.organization_id = v_queue.organization_id
            AND s.scanned_by_name IS NULL
          RETURNING s.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'work_order_status_history' THEN
        WITH updated AS (
          UPDATE work_order_status_history wosh
          SET changed_by_name = v_queue.user_name
          FROM work_orders wo
          WHERE wosh.work_order_id = wo.id
            AND wosh.changed_by = v_queue.user_id
            AND wo.organization_id = v_queue.organization_id
            AND wosh.changed_by_name IS NULL
          RETURNING wosh.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'work_order_costs' THEN
        WITH updated AS (
          UPDATE work_order_costs woc
          SET created_by_name = v_queue.user_name
          FROM work_orders wo
          WHERE woc.work_order_id = wo.id
            AND woc.created_by = v_queue.user_id
            AND wo.organization_id = v_queue.organization_id
            AND woc.created_by_name IS NULL
          RETURNING woc.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'inventory_transactions' THEN
        WITH updated AS (
          UPDATE inventory_transactions it
          SET user_name = v_queue.user_name
          FROM inventory_items ii
          WHERE it.inventory_item_id = ii.id
            AND it.user_id = v_queue.user_id
            AND ii.organization_id = v_queue.organization_id
            AND it.user_name IS NULL
          RETURNING it.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'preventative_maintenance' THEN
        -- Update created_by_name
        WITH updated_created AS (
          UPDATE preventative_maintenance pm
          SET created_by_name = v_queue.user_name
          WHERE pm.created_by = v_queue.user_id
            AND pm.organization_id = v_queue.organization_id
            AND pm.created_by_name IS NULL
          RETURNING pm.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated_created;
        
        -- Also update completed_by_name
        UPDATE preventative_maintenance pm
        SET completed_by_name = v_queue.user_name
        WHERE pm.completed_by = v_queue.user_id
          AND pm.organization_id = v_queue.organization_id
          AND pm.completed_by_name IS NULL;
        
      ELSE
        v_rows_updated := 0;
    END CASE;
    
    -- Update progress
    v_tables_status := jsonb_set(
      v_tables_status,
      ARRAY[v_table_name, 'processed'],
      to_jsonb(v_processed + v_rows_updated)
    );
    
    -- If we processed rows, we're not done yet
    IF v_rows_updated > 0 THEN
      v_all_complete := false;
    END IF;
  END LOOP;
  
  -- Re-check if all complete
  v_all_complete := true;
  FOR v_table_name IN SELECT jsonb_object_keys(v_tables_status)
  LOOP
    v_processed := (v_tables_status->v_table_name->>'processed')::int;
    v_total := (v_tables_status->v_table_name->>'total')::int;
    IF v_processed < v_total THEN
      v_all_complete := false;
      EXIT;
    END IF;
  END LOOP;
  
  -- Update queue entry
  UPDATE user_departure_queue
  SET 
    tables_to_process = v_tables_status,
    last_batch_at = NOW(),
    status = CASE WHEN v_all_complete THEN 'completed' ELSE 'processing' END,
    completed_at = CASE WHEN v_all_complete THEN NOW() ELSE NULL END
  WHERE id = p_queue_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'all_complete', v_all_complete,
    'progress', v_tables_status
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Mark as failed
  UPDATE user_departure_queue
  SET status = 'failed', error_message = SQLERRM, retry_count = retry_count + 1
  WHERE id = p_queue_id;
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer) IS 'Process a batch of records for a user departure. Updates denormalized name columns.';



CREATE OR REPLACE FUNCTION "public"."refresh_quickbooks_tokens_manual"() RETURNS TABLE("credentials_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_quickbooks_tokens_manual"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() IS 'Manually triggers QuickBooks token refresh. Returns count of credentials that may need refresh.';



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


CREATE OR REPLACE FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_current_user_role TEXT;
  v_target_role TEXT;
  v_target_name TEXT;
  v_org_name TEXT;
  v_queue_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get current user's role
  SELECT role INTO v_current_user_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_current_user_id
    AND status = 'active';
  
  IF v_current_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this organization');
  END IF;
  
  -- Only owners and admins can remove members
  IF v_current_user_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only owners and admins can remove members');
  END IF;
  
  -- Get target user's role
  SELECT role INTO v_target_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND status = 'active';
  
  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this organization');
  END IF;
  
  -- Cannot remove owner
  IF v_target_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the organization owner');
  END IF;
  
  -- Admins cannot remove other admins (only owners can)
  IF v_current_user_role = 'admin' AND v_target_role = 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only owners can remove admins');
  END IF;
  
  -- Get user name and org name
  SELECT name INTO v_target_name
  FROM profiles WHERE id = p_user_id;
  
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  -- Queue for batch processing (same as leave_organization but forced)
  INSERT INTO user_departure_queue (
    organization_id,
    user_id,
    user_name,
    user_email,
    status
  )
  SELECT 
    p_organization_id,
    p_user_id,
    COALESCE(p.name, p.email, 'Unknown'),
    COALESCE(p.email, 'unknown@unknown.com'),
    'pending'
  FROM profiles p
  WHERE p.id = p_user_id
  RETURNING id INTO v_queue_id;
  
  -- Create audit record
  INSERT INTO member_removal_audit (
    organization_id,
    removed_user_id,
    removed_user_name,
    removed_user_role,
    removed_by,
    removal_reason
  ) VALUES (
    p_organization_id,
    p_user_id,
    COALESCE(v_target_name, 'Unknown'),
    v_target_role,
    v_current_user_id,
    COALESCE(p_reason, 'Removed by admin')
  );
  
  -- Remove from team_members
  DELETE FROM team_members
  WHERE user_id = p_user_id
    AND team_id IN (SELECT id FROM teams WHERE organization_id = p_organization_id);
  
  -- Remove from parts_managers
  DELETE FROM parts_managers
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Remove from notification_settings
  DELETE FROM notification_settings
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Remove from organization_members
  DELETE FROM organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Notify the removed user
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    p_organization_id,
    p_user_id,
    'member_removed',
    'Removed from Organization',
    'You have been removed from ' || v_org_name || '.',
    jsonb_build_object(
      'organization_id', p_organization_id,
      'organization_name', v_org_name,
      'removed_by', v_current_user_id,
      'reason', p_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', COALESCE(v_target_name, 'User') || ' has been removed from ' || v_org_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text") IS 'Remove a member from an organization. Only owners and admins can call this.';



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


CREATE OR REPLACE FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text" DEFAULT 'admin'::"text", "p_response_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_transfer RECORD;
  v_current_user_id UUID;
  v_org_name TEXT;
  v_new_org_id UUID;
  v_from_user_email TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get transfer request
  SELECT * INTO v_transfer
  FROM ownership_transfer_requests
  WHERE id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer request not found');
  END IF;
  
  -- Validate caller is the target user
  IF v_transfer.to_user_id != v_current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the target user can respond to this transfer request');
  END IF;
  
  -- Validate request is still pending
  IF v_transfer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request has already been processed');
  END IF;
  
  -- Check if expired
  IF v_transfer.expires_at < NOW() THEN
    UPDATE ownership_transfer_requests
    SET status = 'expired'
    WHERE id = p_transfer_id;
    
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request has expired');
  END IF;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = v_transfer.organization_id;
  
  IF p_accept THEN
    -- === ACCEPT TRANSFER ===
    
    -- Check if departing owner needs a new personal org
    -- (if they don't own any other organization)
    IF NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = v_transfer.from_user_id
        AND om.role = 'owner'
        AND om.status = 'active'
        AND om.organization_id != v_transfer.organization_id
    ) THEN
      -- Get departing owner's email for org name
      SELECT email INTO v_from_user_email
      FROM profiles WHERE id = v_transfer.from_user_id;
      
      -- Create new personal organization for departing owner
      INSERT INTO organizations (name, plan, member_count, max_members, features)
      VALUES (
        v_transfer.from_user_name || '''s Organization',
        'free',
        1,
        5,
        ARRAY['Equipment Management', 'Work Orders', 'Team Management']
      )
      RETURNING id INTO v_new_org_id;
      
      -- Add departing owner as owner of new org
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES (v_new_org_id, v_transfer.from_user_id, 'owner', 'active');
    END IF;
    
    -- Update departing owner's role (or remove them)
    IF p_departing_owner_role = 'remove' THEN
      DELETE FROM organization_members
      WHERE organization_id = v_transfer.organization_id
        AND user_id = v_transfer.from_user_id;
    ELSE
      UPDATE organization_members
      SET role = p_departing_owner_role
      WHERE organization_id = v_transfer.organization_id
        AND user_id = v_transfer.from_user_id;
    END IF;
    
    -- Promote new owner
    UPDATE organization_members
    SET role = 'owner'
    WHERE organization_id = v_transfer.organization_id
      AND user_id = v_transfer.to_user_id;
    
    -- Update transfer request
    UPDATE ownership_transfer_requests
    SET 
      status = 'accepted',
      departing_owner_role = p_departing_owner_role,
      response_reason = p_response_reason,
      responded_at = NOW(),
      completed_at = NOW()
    WHERE id = p_transfer_id;
    
    -- Notify original owner (GLOBAL - visible across all orgs)
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_transfer.organization_id,
      v_transfer.from_user_id,
      'ownership_transfer_accepted',
      'Ownership Transfer Accepted',
      v_transfer.to_user_name || ' has accepted ownership of ' || v_org_name || '.',
      jsonb_build_object(
        'transfer_id', p_transfer_id,
        'organization_id', v_transfer.organization_id,
        'organization_name', v_org_name,
        'new_org_id', v_new_org_id
      ),
      true  -- Mark as global notification
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'You are now the owner of ' || v_org_name,
      'new_personal_org_id', v_new_org_id
    );
    
  ELSE
    -- === REJECT TRANSFER ===
    
    UPDATE ownership_transfer_requests
    SET 
      status = 'rejected',
      response_reason = p_response_reason,
      responded_at = NOW()
    WHERE id = p_transfer_id;
    
    -- Notify original owner (GLOBAL - visible across all orgs)
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_transfer.organization_id,
      v_transfer.from_user_id,
      'ownership_transfer_rejected',
      'Ownership Transfer Declined',
      v_transfer.to_user_name || ' has declined the ownership transfer for ' || v_org_name || '.',
      jsonb_build_object(
        'transfer_id', p_transfer_id,
        'organization_id', v_transfer.organization_id,
        'organization_name', v_org_name,
        'reason', p_response_reason
      ),
      true  -- Mark as global notification
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Transfer request declined'
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") IS 'Accept or reject an ownership transfer request. Only the target user can call this.';



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


CREATE OR REPLACE FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") IS 'Determines if user should receive work order notifications. Fixed search_path for security.';



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


CREATE OR REPLACE FUNCTION "public"."sync_work_order_primary_equipment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_work_order_primary_equipment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_work_order_primary_equipment"() IS 'Trigger function to sync primary equipment to work_orders.equipment_id. Fixed search_path for security.';



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


CREATE OR REPLACE FUNCTION "public"."trigger_departure_processing"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only allow service role to call this
  IF auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  RETURN process_all_pending_departures();
END;
$$;


ALTER FUNCTION "public"."trigger_departure_processing"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_departure_processing"() IS 'Manual trigger for departure processing. Called by Edge Function cron.';



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


CREATE OR REPLACE FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM public.organization_members
  WHERE user_id = v_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  -- Only owners can change QuickBooks permissions
  IF v_caller_role IS NULL OR v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only organization owners can change QuickBooks permissions';
  END IF;

  -- Get target's role
  SELECT role INTO v_target_role
  FROM public.organization_members
  WHERE user_id = p_target_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this organization';
  END IF;

  -- Can't change owner's permission (they always have it)
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change QuickBooks permission for organization owner';
  END IF;

  -- Can only grant to admins
  IF v_target_role != 'admin' THEN
    RAISE EXCEPTION 'QuickBooks management can only be granted to admins';
  END IF;

  -- Update the permission
  UPDATE public.organization_members
  SET can_manage_quickbooks = p_can_manage_quickbooks,
      updated_at = NOW()
  WHERE user_id = p_target_user_id
    AND organization_id = p_organization_id;

  IF p_can_manage_quickbooks THEN
    RETURN QUERY SELECT true::BOOLEAN, 'QuickBooks management permission granted'::TEXT;
  ELSE
    RETURN QUERY SELECT true::BOOLEAN, 'QuickBooks management permission revoked'::TEXT;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) IS 'Updates the can_manage_quickbooks flag for an organization member. Only owners can call this, and it only applies to admins.';



CREATE OR REPLACE FUNCTION "public"."update_notification_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notification_settings_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_notification_settings_updated_at"() IS 'Trigger function to update notification settings timestamp. Fixed search_path for security.';



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


CREATE OR REPLACE FUNCTION "public"."update_organization_storage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  org_id UUID;
  new_storage_mb BIGINT;
BEGIN
  -- Determine organization_id based on trigger table
  IF TG_TABLE_NAME = 'equipment_note_images' THEN
    SELECT e.organization_id INTO org_id
    FROM equipment_notes en
    JOIN equipment e ON en.equipment_id = e.id
    WHERE en.id = (
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.equipment_note_id
        ELSE NEW.equipment_note_id
      END
    );
  ELSIF TG_TABLE_NAME = 'work_order_images' THEN
    SELECT organization_id INTO org_id
    FROM work_orders
    WHERE id = (
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.work_order_id
        ELSE NEW.work_order_id
      END
    );
  END IF;
  
  IF org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Recalculate storage
  new_storage_mb := get_organization_storage_mb(org_id);
  
  -- Update organizations table
  UPDATE organizations
  SET storage_used_mb = new_storage_mb
  WHERE id = org_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_organization_storage"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_organization_storage"() IS 'Automatically update organization storage when images are added/deleted. Created 2025-01-28.';



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


CREATE OR REPLACE FUNCTION "public"."update_quickbooks_credentials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quickbooks_credentials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quickbooks_export_logs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quickbooks_export_logs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quickbooks_team_customers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quickbooks_team_customers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Trigger function to automatically update updated_at column. Fixed search_path for security.';



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


CREATE OR REPLACE FUNCTION "public"."user_has_access"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- All users have access when billing is disabled
  RETURN billing_is_disabled();
END;
$$;


ALTER FUNCTION "public"."user_has_access"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_access"("user_uuid" "uuid") IS 'Check if user has access to features. Returns true for all users when billing is disabled. Created 2025-01-15.';



CREATE OR REPLACE FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This function runs with definer rights, bypassing RLS
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
      AND user_id = check_user_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This function runs with definer rights, bypassing RLS
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE organization_id = org_id 
      AND user_id = check_user_id
      AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") RETURNS TABLE("organization_id" "uuid", "user_id" "uuid", "nonce" "text", "redirect_url" "text", "origin_url" "text", "is_valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Look up session
  SELECT 
    s.organization_id,
    s.user_id,
    s.nonce,
    s.redirect_url,
    s.origin_url,
    s.expires_at,
    s.used_at
  INTO v_session
  FROM public.quickbooks_oauth_sessions s
  WHERE s.session_token = p_session_token;

  -- Check if session exists
  IF v_session IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Check if session is expired
  IF v_session.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
    RETURN;
  END IF;

  -- Check if session was already used (prevent replay attacks)
  IF v_session.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false::BOOLEAN;
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
    v_session.origin_url,
    true::BOOLEAN;
END;
$$;


ALTER FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") IS 'Validates and consumes an OAuth session token. Returns session data if valid, marks session as used to prevent replay attacks.';



CREATE OR REPLACE FUNCTION "public"."validate_work_order_assignee"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
      -- Also sync team_id from equipment (filter by organization_id for multi-tenancy)
      SELECT team_id INTO v_equipment_team_id
      FROM equipment
      WHERE id = NEW.equipment_id
        AND organization_id = NEW.organization_id;
      
      NEW.team_id := v_equipment_team_id;
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

    -- Sync team_id from equipment (denormalized for filtering/display)
    -- Filter by organization_id for multi-tenancy security
    SELECT team_id INTO v_equipment_team_id
    FROM equipment
    WHERE id = NEW.equipment_id
      AND organization_id = NEW.organization_id;
    
    NEW.team_id := v_equipment_team_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_work_order_assignee"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_work_order_assignee"() IS 'Trigger function that enforces work order assignee validation rules and syncs team_id from equipment.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_name" "text",
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_name" "text" DEFAULT 'System'::"text" NOT NULL,
    "actor_email" "text",
    "changes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_log_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"]))),
    CONSTRAINT "audit_log_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['equipment'::"text", 'work_order'::"text", 'inventory_item'::"text", 'preventative_maintenance'::"text", 'organization_member'::"text", 'team_member'::"text", 'team'::"text", 'pm_template'::"text"])))
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_log" IS 'Comprehensive audit trail for regulatory compliance. Tracks all changes to equipment, work orders, inventory, PM, and permissions. Records are append-only - no updates or deletes allowed.';



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


COMMENT ON TABLE "public"."billing_events" IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';



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


COMMENT ON TABLE "public"."billing_exemptions" IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';



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


COMMENT ON TABLE "public"."billing_usage" IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';



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


CREATE TABLE IF NOT EXISTS "public"."distributor" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "website" "text",
    "phone" "text",
    "email" "text",
    "regions" "text"[],
    "notes" "text"
);


ALTER TABLE "public"."distributor" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."distributor_listing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "distributor_id" "uuid" NOT NULL,
    "part_id" "uuid" NOT NULL,
    "sku" "text"
);


ALTER TABLE "public"."distributor_listing" OWNER TO "postgres";


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


COMMENT ON TABLE "public"."equipment" IS 'Equipment records with multi-tenancy. INSERT permissions: admins can create any equipment; team members can create equipment for their team (enforced in application layer).';



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


CREATE TABLE IF NOT EXISTS "public"."equipment_part_compatibility" (
    "equipment_id" "uuid" NOT NULL,
    "inventory_item_id" "uuid" NOT NULL
);


ALTER TABLE "public"."equipment_part_compatibility" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."export_request_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "report_type" "text" NOT NULL,
    "row_count" integer DEFAULT 0 NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "export_request_log_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'rate_limited'::"text"])))
);


ALTER TABLE "public"."export_request_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."export_request_log" IS 'Tracks export requests for rate limiting and audit purposes. Stores user, organization, report type, row count, and status.';



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


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sku" "text",
    "external_id" "text",
    "quantity_on_hand" integer DEFAULT 0 NOT NULL,
    "low_stock_threshold" integer DEFAULT 5 NOT NULL,
    "image_url" "text",
    "location" "text",
    "created_by" "uuid" NOT NULL,
    "default_unit_cost" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_items_low_stock_threshold_check" CHECK (("low_stock_threshold" >= 1)),
    CONSTRAINT "inventory_items_quantity_on_hand_check" CHECK (("quantity_on_hand" >= '-10000'::integer))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "previous_quantity" integer NOT NULL,
    "new_quantity" integer NOT NULL,
    "change_amount" integer NOT NULL,
    "transaction_type" "public"."inventory_transaction_type" NOT NULL,
    "work_order_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_name" "text"
);


ALTER TABLE "public"."inventory_transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."inventory_transactions"."user_name" IS 'Denormalized user name. Populated when user leaves organization for audit trail.';



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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_name" "text"
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notes"."author_name" IS 'Denormalized author name. Populated when user leaves organization for audit trail.';



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


CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "statuses" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_settings" OWNER TO "postgres";


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
    "is_global" boolean DEFAULT false NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['work_order_request'::"text", 'work_order_accepted'::"text", 'work_order_assigned'::"text", 'work_order_completed'::"text", 'work_order_submitted'::"text", 'work_order_in_progress'::"text", 'work_order_on_hold'::"text", 'work_order_cancelled'::"text", 'general'::"text", 'ownership_transfer_request'::"text", 'ownership_transfer_accepted'::"text", 'ownership_transfer_rejected'::"text", 'ownership_transfer_cancelled'::"text", 'member_removed'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."is_global" IS 'When true, this notification is visible regardless of which organization the user is currently viewing. Used for cross-org notifications like ownership transfer requests.';



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
    "activated_slot_at" timestamp with time zone,
    "can_manage_quickbooks" boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY "public"."organization_members" REPLICA IDENTITY FULL;


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_members" IS 'RLS simplified to prevent circular dependency. Admin permissions handled at application level.';



COMMENT ON COLUMN "public"."organization_members"."can_manage_quickbooks" IS 'Whether this member can manage QuickBooks integration. Owners always have this permission. Admins must be explicitly granted it by an owner. Members cannot have this permission.';



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


COMMENT ON TABLE "public"."organization_subscriptions" IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';



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


COMMENT ON COLUMN "public"."organizations"."billing_cycle" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."next_billing_date" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."billable_members" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."last_billing_calculation" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."logo" IS 'URL or path to organization logo image';



COMMENT ON COLUMN "public"."organizations"."background_color" IS 'Hex color code for organization branding (e.g., #ff0000)';



CREATE TABLE IF NOT EXISTS "public"."ownership_transfer_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "from_user_name" "text" NOT NULL,
    "to_user_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "departing_owner_role" "text" DEFAULT 'admin'::"text",
    "transfer_reason" "text",
    "response_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "responded_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    CONSTRAINT "ownership_transfer_requests_departing_owner_role_check" CHECK (("departing_owner_role" = ANY (ARRAY['admin'::"text", 'member'::"text", 'remove'::"text"]))),
    CONSTRAINT "ownership_transfer_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."ownership_transfer_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."ownership_transfer_requests" IS 'Tracks pending and completed ownership transfer requests for organizations. Used for audit trail and in-app confirmation workflow.';



CREATE TABLE IF NOT EXISTS "public"."part" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "canonical_mpn" "text" NOT NULL,
    "title" "text" NOT NULL,
    "brand" "text",
    "category" "text",
    "description" "text",
    "attributes" "jsonb",
    "fitment" "jsonb",
    "synonyms" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."part" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."part_alternate_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "part_identifier_id" "uuid",
    "inventory_item_id" "uuid",
    "is_primary" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "part_alternate_group_members_has_link" CHECK ((("part_identifier_id" IS NOT NULL) OR ("inventory_item_id" IS NOT NULL)))
);


ALTER TABLE "public"."part_alternate_group_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."part_alternate_group_members" IS 'Links part identifiers and/or inventory items to alternate groups.';



CREATE TABLE IF NOT EXISTS "public"."part_alternate_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "public"."verification_status" DEFAULT 'unverified'::"public"."verification_status" NOT NULL,
    "notes" "text",
    "evidence_url" "text",
    "created_by" "uuid" NOT NULL,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."part_alternate_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."part_alternate_groups" IS 'Groups of interchangeable part numbers. Parts in the same group can substitute for each other.';



CREATE TABLE IF NOT EXISTS "public"."part_compatibility_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "manufacturer" "text" NOT NULL,
    "model" "text",
    "manufacturer_norm" "text" NOT NULL,
    "model_norm" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "match_type" "public"."model_match_type" DEFAULT 'exact'::"public"."model_match_type" NOT NULL,
    "model_pattern_raw" "text",
    "model_pattern_norm" "text",
    "status" "public"."verification_status" DEFAULT 'unverified'::"public"."verification_status" NOT NULL,
    "notes" "text",
    "evidence_url" "text",
    "created_by" "uuid",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."part_compatibility_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."part_compatibility_rules" IS 'Defines rule-based compatibility between inventory parts and equipment by manufacturer/model patterns. NULL model means "any model from this manufacturer".';



COMMENT ON COLUMN "public"."part_compatibility_rules"."match_type" IS 'Type of model matching: any (all models), exact (exact match), prefix (starts with), wildcard (simple pattern)';



COMMENT ON COLUMN "public"."part_compatibility_rules"."model_pattern_raw" IS 'Original pattern as entered by user (e.g., "JL-*"). Used for display.';



COMMENT ON COLUMN "public"."part_compatibility_rules"."model_pattern_norm" IS 'Normalized pattern for matching. For prefix, just the prefix text. For wildcard, pattern with * converted to %.';



COMMENT ON COLUMN "public"."part_compatibility_rules"."status" IS 'Verification status: unverified (default), verified (confirmed by manager), deprecated (no longer recommended)';



CREATE TABLE IF NOT EXISTS "public"."part_identifier" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_id" "uuid" NOT NULL,
    "id_type" "text",
    "value" "text" NOT NULL,
    "normalized_value" "text" NOT NULL,
    CONSTRAINT "part_identifier_id_type_check" CHECK (("id_type" = ANY (ARRAY['MPN'::"text", 'SKU'::"text", 'OEM'::"text", 'UPC'::"text", 'EAN'::"text"])))
);


ALTER TABLE "public"."part_identifier" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."part_identifiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "identifier_type" "public"."part_identifier_type" NOT NULL,
    "raw_value" "text" NOT NULL,
    "norm_value" "text" NOT NULL,
    "inventory_item_id" "uuid",
    "manufacturer" "text",
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."part_identifiers" OWNER TO "postgres";


COMMENT ON TABLE "public"."part_identifiers" IS 'Part numbers/identifiers that can be looked up. May or may not be linked to inventory items.';



CREATE TABLE IF NOT EXISTS "public"."parts_managers" (
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."parts_managers" OWNER TO "postgres";


COMMENT ON TABLE "public"."parts_managers" IS 'Organization-level parts managers who can edit all inventory items in their organization. This replaces the deprecated inventory_item_managers table (per-item approach) for better scalability. Parts managers can edit all inventory items without needing individual assignments.';



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


CREATE TABLE IF NOT EXISTS "public"."pm_template_compatibility_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pm_template_id" "uuid" NOT NULL,
    "manufacturer" "text" NOT NULL,
    "model" "text",
    "manufacturer_norm" "text" NOT NULL,
    "model_norm" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."pm_template_compatibility_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."pm_template_compatibility_rules" IS 'Defines organization-specific compatibility rules between PM templates and equipment. Each organization can set their own rules for any template (including global templates). NULL model means "any model from this manufacturer".';



CREATE OR REPLACE VIEW "public"."pm_templates_check" WITH ("security_invoker"='true') AS
 SELECT "id",
    "organization_id",
    "name",
    "description",
    "is_protected",
    "template_data",
    "created_by",
    "created_at",
    "updated_at",
        CASE
            WHEN (("template_data" IS NULL) OR ("template_data" = '[]'::"jsonb")) THEN false
            WHEN (("name" IS NULL) OR (TRIM(BOTH FROM "name") = ''::"text")) THEN false
            ELSE true
        END AS "is_valid",
    "jsonb_array_length"(COALESCE("template_data", '[]'::"jsonb")) AS "checklist_item_count"
   FROM "public"."pm_checklist_templates" "t"
  WHERE ((("organization_id" IS NULL) AND (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));


ALTER VIEW "public"."pm_templates_check" OWNER TO "postgres";


COMMENT ON VIEW "public"."pm_templates_check" IS 'PM templates validation and check view. Recreated without SECURITY DEFINER for proper RLS enforcement. Shows only templates accessible to the querying user and includes validation flags.';



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
    "created_by_name" "text",
    "completed_by_name" "text",
    CONSTRAINT "preventative_maintenance_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."preventative_maintenance" OWNER TO "postgres";


COMMENT ON TABLE "public"."preventative_maintenance" IS 'RLS enabled to enforce organization-level access control via policies';



COMMENT ON COLUMN "public"."preventative_maintenance"."created_by_name" IS 'Denormalized creator name. Populated when user leaves organization.';



COMMENT ON COLUMN "public"."preventative_maintenance"."completed_by_name" IS 'Denormalized completer name. Populated when user leaves organization.';



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



CREATE TABLE IF NOT EXISTS "public"."quickbooks_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "realm_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "access_token_expires_at" timestamp with time zone NOT NULL,
    "refresh_token_expires_at" timestamp with time zone NOT NULL,
    "scopes" "text" DEFAULT 'com.intuit.quickbooks.accounting'::"text" NOT NULL,
    "token_type" "text" DEFAULT 'bearer'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quickbooks_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_credentials" IS 'Stores QuickBooks Online OAuth credentials per organization. Each org can connect to one or more QuickBooks companies (realms).';



COMMENT ON COLUMN "public"."quickbooks_credentials"."realm_id" IS 'QuickBooks company ID (realmId) - identifies the QuickBooks company connected to this organization';



COMMENT ON COLUMN "public"."quickbooks_credentials"."access_token" IS 'OAuth access token - valid for 60 minutes. Used for API requests.';



COMMENT ON COLUMN "public"."quickbooks_credentials"."refresh_token" IS 'OAuth refresh token - valid for 100 days. Used to obtain new access tokens.';



CREATE TABLE IF NOT EXISTS "public"."quickbooks_export_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "realm_id" "text" NOT NULL,
    "quickbooks_invoice_id" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    "exported_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "intuit_tid" "text",
    "quickbooks_invoice_number" "text",
    "quickbooks_environment" "text",
    "pdf_attachment_status" "text",
    "pdf_attachment_error" "text",
    "pdf_attachment_intuit_tid" "text",
    CONSTRAINT "quickbooks_export_logs_pdf_attachment_status_check" CHECK (("pdf_attachment_status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'skipped'::"text", 'disabled'::"text"]))),
    CONSTRAINT "quickbooks_export_logs_quickbooks_environment_check" CHECK (("quickbooks_environment" = ANY (ARRAY['sandbox'::"text", 'production'::"text"]))),
    CONSTRAINT "quickbooks_export_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."quickbooks_export_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_export_logs" IS 'Tracks exports of work orders to QuickBooks Online as invoices. Records both successful exports and failures for debugging.';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."realm_id" IS 'The QuickBooks company ID (realmId) the invoice was exported to';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."quickbooks_invoice_id" IS 'The QuickBooks Invoice ID if successfully created/updated. NULL if export failed.';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."status" IS 'Export status: success (invoice created/updated), error (export failed), pending (in progress)';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."error_message" IS 'Error details if export failed. NULL on success.';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."exported_at" IS 'Timestamp when the invoice was successfully exported. NULL if pending or failed.';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."intuit_tid" IS 'The intuit_tid from QuickBooks API response headers. Used by Intuit support for troubleshooting.';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."quickbooks_invoice_number" IS 'The QuickBooks Invoice DocNumber (user-friendly invoice number) for display in the UI.';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."quickbooks_environment" IS 'The QuickBooks environment used for export. Used to construct correct QBO URLs (sandbox vs production).';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."pdf_attachment_status" IS 'Status of PDF attachment: success (attached), failed (error during upload), skipped (no PDF needed), disabled (feature off).';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."pdf_attachment_error" IS 'Error message if PDF attachment failed. NULL if successful or not attempted.';



COMMENT ON COLUMN "public"."quickbooks_export_logs"."pdf_attachment_intuit_tid" IS 'The intuit_tid from the PDF attachment API call for troubleshooting.';



CREATE TABLE IF NOT EXISTS "public"."quickbooks_oauth_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_token" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nonce" "text" NOT NULL,
    "redirect_url" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "origin_url" "text"
);


ALTER TABLE "public"."quickbooks_oauth_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_oauth_sessions" IS 'Stores OAuth sessions server-side to prevent state parameter tampering. Sessions expire after 1 hour and are single-use.';



COMMENT ON COLUMN "public"."quickbooks_oauth_sessions"."session_token" IS 'Random token included in OAuth state parameter. Used to look up session server-side.';



COMMENT ON COLUMN "public"."quickbooks_oauth_sessions"."used_at" IS 'Timestamp when session was consumed. Prevents replay attacks.';



COMMENT ON COLUMN "public"."quickbooks_oauth_sessions"."origin_url" IS 'The origin URL (e.g., http://localhost:5173 or https://equipqr.app) to redirect back to after OAuth completes.';



CREATE TABLE IF NOT EXISTS "public"."quickbooks_team_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "quickbooks_customer_id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quickbooks_team_customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_team_customers" IS 'Maps EquipQR teams to QuickBooks Online customers. Used for invoice export to associate work orders with the correct QuickBooks customer.';



COMMENT ON COLUMN "public"."quickbooks_team_customers"."quickbooks_customer_id" IS 'The QuickBooks Customer ID (Customer.Id) from the QuickBooks API';



COMMENT ON COLUMN "public"."quickbooks_team_customers"."display_name" IS 'The customer display name from QuickBooks for UI display purposes';



CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "scanned_by" "uuid" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location" "text",
    "notes" "text",
    "scanned_by_name" "text"
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scans"."scanned_by_name" IS 'Denormalized scanner name. Populated when user leaves organization for audit trail.';



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


COMMENT ON TABLE "public"."stripe_event_logs" IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';



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


COMMENT ON TABLE "public"."subscribers" IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';



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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_lead_id" "uuid"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."teams"."team_lead_id" IS 'Reference to the team lead user profile. Can be null if no team lead is assigned.';



CREATE TABLE IF NOT EXISTS "public"."user_departure_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" "text" NOT NULL,
    "user_email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "tables_to_process" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_batch_at" timestamp with time zone,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    CONSTRAINT "user_departure_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."user_departure_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_departure_queue" IS 'Queue for batch processing user departures. When a user leaves an organization, their name is denormalized into historical records before RLS restricts access.';



CREATE OR REPLACE VIEW "public"."user_entitlements" WITH ("security_invoker"='true') AS
 SELECT "id" AS "user_id",
    'free'::"text" AS "plan",
    true AS "is_active",
    "now"() AS "granted_at",
    NULL::timestamp with time zone AS "subscription_end"
   FROM "public"."profiles" "p";


ALTER VIEW "public"."user_entitlements" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_entitlements" IS 'Universal entitlements view: all users have full access. Created 2025-01-15 as part of billing removal. Uses profiles table for security. Recreated without SECURITY DEFINER for proper RLS enforcement.';



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


COMMENT ON TABLE "public"."user_license_subscriptions" IS 'DEPRECATED: Billing removed 2025-01-15. Table preserved for historical data. Billing disabled by default via BILLING_DISABLED flag.';



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
    "inventory_item_id" "uuid",
    "original_quantity" numeric(10,2),
    "created_by_name" "text",
    CONSTRAINT "work_order_costs_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "work_order_costs_unit_price_cents_check" CHECK (("unit_price_cents" >= 0))
);


ALTER TABLE "public"."work_order_costs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."work_order_costs"."inventory_item_id" IS 'References the source inventory item. NULL if cost was manually entered. Used to restore inventory when cost is deleted or quantity changes.';



COMMENT ON COLUMN "public"."work_order_costs"."original_quantity" IS 'Original quantity when cost was created from inventory. Used to calculate inventory delta when quantity is modified.';



COMMENT ON COLUMN "public"."work_order_costs"."created_by_name" IS 'Denormalized name of user who created cost entry. Populated when user leaves organization.';



CREATE TABLE IF NOT EXISTS "public"."work_order_equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_order_equipment" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_order_equipment" IS 'Junction table for many-to-many relationship between work orders and equipment. Supports multi-equipment work orders.';



COMMENT ON COLUMN "public"."work_order_equipment"."is_primary" IS 'Indicates the primary equipment for this work order. Used for backward compatibility and UI defaults.';



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
    "is_historical_creation" boolean DEFAULT false,
    "changed_by_name" "text"
);


ALTER TABLE "public"."work_order_status_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."work_order_status_history"."changed_by_name" IS 'Denormalized name of user who changed status. Populated when user leaves organization.';



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
    "team_id" "uuid",
    "equipment_working_hours_at_creation" numeric
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."work_orders"."equipment_id" IS 'DEPRECATED: Use work_order_equipment join table for equipment associations. This column is maintained for backward compatibility and contains the primary equipment ID. Will be kept in sync via trigger.';



COMMENT ON COLUMN "public"."work_orders"."equipment_working_hours_at_creation" IS 'Equipment working hours at the time this work order was created. Used as a historical KPI for maintenance scheduling and equipment usage tracking.';



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."distributor_listing"
    ADD CONSTRAINT "distributor_listing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."distributor"
    ADD CONSTRAINT "distributor_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_note_images"
    ADD CONSTRAINT "equipment_note_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_organization_id_serial_number_key" UNIQUE ("organization_id", "serial_number");



ALTER TABLE ONLY "public"."equipment_part_compatibility"
    ADD CONSTRAINT "equipment_part_compatibility_pkey" PRIMARY KEY ("equipment_id", "inventory_item_id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_working_hours_history"
    ADD CONSTRAINT "equipment_working_hours_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."export_request_log"
    ADD CONSTRAINT "export_request_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geocoded_locations"
    ADD CONSTRAINT "geocoded_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_user_id_organization_id_team_id_key" UNIQUE ("user_id", "organization_id", "team_id");



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



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_alternate_group_members"
    ADD CONSTRAINT "part_alternate_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_alternate_group_members"
    ADD CONSTRAINT "part_alternate_group_members_unique_identifier" UNIQUE ("group_id", "part_identifier_id");



ALTER TABLE ONLY "public"."part_alternate_group_members"
    ADD CONSTRAINT "part_alternate_group_members_unique_item" UNIQUE ("group_id", "inventory_item_id");



ALTER TABLE ONLY "public"."part_alternate_groups"
    ADD CONSTRAINT "part_alternate_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_compatibility_rules"
    ADD CONSTRAINT "part_compatibility_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_identifier"
    ADD CONSTRAINT "part_identifier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_unique" UNIQUE ("organization_id", "identifier_type", "norm_value");



ALTER TABLE ONLY "public"."part"
    ADD CONSTRAINT "part_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_pkey" PRIMARY KEY ("organization_id", "user_id");



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_unique_name_per_org" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."pm_status_history"
    ADD CONSTRAINT "pm_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_template_compatibility_rules"
    ADD CONSTRAINT "pm_template_compat_rules_unique" UNIQUE ("pm_template_id", "organization_id", "manufacturer_norm", "model_norm");



ALTER TABLE ONLY "public"."pm_template_compatibility_rules"
    ADD CONSTRAINT "pm_template_compatibility_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "preventative_maintenance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_credentials"
    ADD CONSTRAINT "quickbooks_credentials_organization_id_realm_id_key" UNIQUE ("organization_id", "realm_id");



ALTER TABLE ONLY "public"."quickbooks_credentials"
    ADD CONSTRAINT "quickbooks_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_export_logs"
    ADD CONSTRAINT "quickbooks_export_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_token_unique" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_organization_id_team_id_key" UNIQUE ("organization_id", "team_id");



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_departure_queue"
    ADD CONSTRAINT "user_departure_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_license_subscriptions"
    ADD CONSTRAINT "user_license_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_license_subscriptions"
    ADD CONSTRAINT "user_license_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_equipment"
    ADD CONSTRAINT "work_order_equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_equipment"
    ADD CONSTRAINT "work_order_equipment_work_order_id_equipment_id_key" UNIQUE ("work_order_id", "equipment_id");



ALTER TABLE ONLY "public"."work_order_images"
    ADD CONSTRAINT "work_order_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_notes"
    ADD CONSTRAINT "work_order_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_status_history"
    ADD CONSTRAINT "work_order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "geocoded_locations_org_norm_unique" ON "public"."geocoded_locations" USING "btree" ("organization_id", "normalized_text");



CREATE INDEX "idx_audit_log_actor" ON "public"."audit_log" USING "btree" ("actor_id", "created_at" DESC) WHERE ("actor_id" IS NOT NULL);



CREATE INDEX "idx_audit_log_entity" ON "public"."audit_log" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "idx_audit_log_equipment" ON "public"."audit_log" USING "btree" ("organization_id", "entity_id", "created_at" DESC) WHERE ("entity_type" = 'equipment'::"text");



CREATE INDEX "idx_audit_log_org_time" ON "public"."audit_log" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_audit_log_org_type_time" ON "public"."audit_log" USING "btree" ("organization_id", "entity_type", "created_at" DESC);



CREATE INDEX "idx_audit_log_work_orders" ON "public"."audit_log" USING "btree" ("organization_id", "entity_id", "created_at" DESC) WHERE ("entity_type" = 'work_order'::"text");



CREATE INDEX "idx_billing_events_organization_id" ON "public"."billing_events" USING "btree" ("organization_id");



CREATE INDEX "idx_billing_events_user_id" ON "public"."billing_events" USING "btree" ("user_id");



CREATE INDEX "idx_billing_exemptions_granted_by" ON "public"."billing_exemptions" USING "btree" ("granted_by");



CREATE INDEX "idx_billing_usage_organization_id" ON "public"."billing_usage" USING "btree" ("organization_id");



CREATE INDEX "idx_customer_contacts_user_id" ON "public"."customer_contacts" USING "btree" ("user_id");



CREATE INDEX "idx_customer_sites_customer_id" ON "public"."customer_sites" USING "btree" ("customer_id");



CREATE INDEX "idx_customers_organization_id" ON "public"."customers" USING "btree" ("organization_id");



CREATE INDEX "idx_departure_queue_org" ON "public"."user_departure_queue" USING "btree" ("organization_id");



CREATE INDEX "idx_departure_queue_pending" ON "public"."user_departure_queue" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "idx_departure_queue_user" ON "public"."user_departure_queue" USING "btree" ("user_id");



CREATE INDEX "idx_equipment_customer_id" ON "public"."equipment" USING "btree" ("customer_id");



CREATE INDEX "idx_equipment_default_pm_template_id" ON "public"."equipment" USING "btree" ("default_pm_template_id");



CREATE INDEX "idx_equipment_note_images_equipment_note_id" ON "public"."equipment_note_images" USING "btree" ("equipment_note_id");



CREATE INDEX "idx_equipment_note_images_uploaded_by" ON "public"."equipment_note_images" USING "btree" ("uploaded_by");



CREATE INDEX "idx_equipment_notes_author_id" ON "public"."equipment_notes" USING "btree" ("author_id");



CREATE INDEX "idx_equipment_notes_equipment_author" ON "public"."equipment_notes" USING "btree" ("equipment_id", "author_id");



CREATE INDEX "idx_equipment_notes_equipment_created" ON "public"."equipment_notes" USING "btree" ("equipment_id", "created_at");



CREATE INDEX "idx_equipment_notes_last_modified_by" ON "public"."equipment_notes" USING "btree" ("last_modified_by");



CREATE INDEX "idx_equipment_org_team" ON "public"."equipment" USING "btree" ("organization_id", "team_id");



CREATE INDEX "idx_equipment_organization_id" ON "public"."equipment" USING "btree" ("organization_id");



CREATE INDEX "idx_equipment_part_compatibility_equipment_id" ON "public"."equipment_part_compatibility" USING "btree" ("equipment_id");



CREATE INDEX "idx_equipment_part_compatibility_inventory_item_id" ON "public"."equipment_part_compatibility" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_equipment_team_id" ON "public"."equipment" USING "btree" ("team_id");



CREATE INDEX "idx_export_log_org_time" ON "public"."export_request_log" USING "btree" ("organization_id", "requested_at" DESC);



CREATE INDEX "idx_export_log_status" ON "public"."export_request_log" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_export_log_user_time" ON "public"."export_request_log" USING "btree" ("user_id", "requested_at" DESC);



CREATE INDEX "idx_inventory_items_external_id" ON "public"."inventory_items" USING "btree" ("external_id") WHERE ("external_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_inventory_items_external_id_org_unique" ON "public"."inventory_items" USING "btree" ("organization_id", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_inventory_items_low_stock" ON "public"."inventory_items" USING "btree" ("organization_id", "quantity_on_hand", "low_stock_threshold") WHERE ("quantity_on_hand" < "low_stock_threshold");



CREATE INDEX "idx_inventory_items_organization_id" ON "public"."inventory_items" USING "btree" ("organization_id");



CREATE INDEX "idx_inventory_items_sku" ON "public"."inventory_items" USING "btree" ("sku") WHERE ("sku" IS NOT NULL);



CREATE UNIQUE INDEX "idx_inventory_items_sku_org_unique" ON "public"."inventory_items" USING "btree" ("organization_id", "sku") WHERE ("sku" IS NOT NULL);



CREATE INDEX "idx_inventory_transactions_created_at" ON "public"."inventory_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_inventory_transactions_item_id" ON "public"."inventory_transactions" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_inventory_transactions_organization_id" ON "public"."inventory_transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_inventory_transactions_user_id" ON "public"."inventory_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_inventory_transactions_work_order_id" ON "public"."inventory_transactions" USING "btree" ("work_order_id") WHERE ("work_order_id" IS NOT NULL);



CREATE INDEX "idx_notes_author_id" ON "public"."notes" USING "btree" ("author_id");



CREATE INDEX "idx_notes_equipment_id" ON "public"."notes" USING "btree" ("equipment_id");



CREATE INDEX "idx_notification_settings_organization_id" ON "public"."notification_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_notification_settings_team_id" ON "public"."notification_settings" USING "btree" ("team_id");



CREATE INDEX "idx_notification_settings_user_id" ON "public"."notification_settings" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_is_global" ON "public"."notifications" USING "btree" ("user_id", "is_global") WHERE ("is_global" = true);



CREATE UNIQUE INDEX "idx_org_invitations_pending_unique" ON "public"."organization_invitations" USING "btree" ("organization_id", "lower"(TRIM(BOTH FROM "email"))) WHERE ("status" = 'pending'::"text");



COMMENT ON INDEX "public"."idx_org_invitations_pending_unique" IS 'Ensures only one pending invitation per email per organization, while allowing multiple expired/declined invitations for re-inviting';



CREATE INDEX "idx_org_members_org_role_status" ON "public"."organization_members" USING "btree" ("organization_id", "role", "status");



CREATE INDEX "idx_organization_invitations_accepted_by" ON "public"."organization_invitations" USING "btree" ("accepted_by");



CREATE INDEX "idx_organization_invitations_invited_by" ON "public"."organization_invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_organization_invitations_slot_purchase_id" ON "public"."organization_invitations" USING "btree" ("slot_purchase_id");



CREATE INDEX "idx_organization_members_admin_quick" ON "public"."organization_members" USING "btree" ("user_id", "organization_id") WHERE (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_organization_members_can_manage_qb" ON "public"."organization_members" USING "btree" ("organization_id", "can_manage_quickbooks") WHERE ("can_manage_quickbooks" = true);



COMMENT ON INDEX "public"."idx_organization_members_can_manage_qb" IS 'Index to optimize QuickBooks permission lookups for admins with granted access.';



CREATE INDEX "idx_organization_members_slot_purchase_id" ON "public"."organization_members" USING "btree" ("slot_purchase_id");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organization_members_user_org_status_active" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_organization_slots_organization_id" ON "public"."organization_slots" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_subscriptions_organization_id" ON "public"."organization_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_ownership_transfer_from_user" ON "public"."ownership_transfer_requests" USING "btree" ("from_user_id");



CREATE INDEX "idx_ownership_transfer_org" ON "public"."ownership_transfer_requests" USING "btree" ("organization_id");



CREATE INDEX "idx_ownership_transfer_pending" ON "public"."ownership_transfer_requests" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_ownership_transfer_to_user" ON "public"."ownership_transfer_requests" USING "btree" ("to_user_id");



CREATE INDEX "idx_part_alternate_group_members_group" ON "public"."part_alternate_group_members" USING "btree" ("group_id");



CREATE INDEX "idx_part_alternate_group_members_identifier" ON "public"."part_alternate_group_members" USING "btree" ("part_identifier_id") WHERE ("part_identifier_id" IS NOT NULL);



CREATE INDEX "idx_part_alternate_group_members_item" ON "public"."part_alternate_group_members" USING "btree" ("inventory_item_id") WHERE ("inventory_item_id" IS NOT NULL);



CREATE INDEX "idx_part_alternate_groups_org" ON "public"."part_alternate_groups" USING "btree" ("organization_id");



CREATE INDEX "idx_part_alternate_groups_status" ON "public"."part_alternate_groups" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_part_compat_rules_item" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_part_compat_rules_match_type" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id", "match_type");



CREATE INDEX "idx_part_compat_rules_mfr_any_model" ON "public"."part_compatibility_rules" USING "btree" ("manufacturer_norm") WHERE ("model_norm" IS NULL);



CREATE INDEX "idx_part_compat_rules_mfr_model_norm" ON "public"."part_compatibility_rules" USING "btree" ("manufacturer_norm", "model_norm");



CREATE INDEX "idx_part_compat_rules_pattern_norm" ON "public"."part_compatibility_rules" USING "btree" ("manufacturer_norm", "model_pattern_norm") WHERE ("match_type" = ANY (ARRAY['prefix'::"public"."model_match_type", 'wildcard'::"public"."model_match_type"]));



CREATE UNIQUE INDEX "idx_part_compat_rules_unique_any_model" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id", "manufacturer_norm") WHERE ("model_norm" IS NULL);



COMMENT ON INDEX "public"."idx_part_compat_rules_unique_any_model" IS 'Ensures only one "any model" rule per manufacturer per inventory item (handles NULL model_norm)';



CREATE UNIQUE INDEX "idx_part_compat_rules_unique_with_model" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id", "manufacturer_norm", "model_norm") WHERE ("model_norm" IS NOT NULL);



COMMENT ON INDEX "public"."idx_part_compat_rules_unique_with_model" IS 'Ensures unique manufacturer/model combinations per inventory item when model is specified';



CREATE INDEX "idx_part_identifiers_inventory_item" ON "public"."part_identifiers" USING "btree" ("inventory_item_id") WHERE ("inventory_item_id" IS NOT NULL);



CREATE INDEX "idx_part_identifiers_norm_value" ON "public"."part_identifiers" USING "btree" ("organization_id", "norm_value");



CREATE INDEX "idx_part_identifiers_org" ON "public"."part_identifiers" USING "btree" ("organization_id");



CREATE INDEX "idx_parts_managers_org_id" ON "public"."parts_managers" USING "btree" ("organization_id");



CREATE INDEX "idx_parts_managers_user_id" ON "public"."parts_managers" USING "btree" ("user_id");



CREATE INDEX "idx_pm_checklist_templates_created_by" ON "public"."pm_checklist_templates" USING "btree" ("created_by");



CREATE INDEX "idx_pm_checklist_templates_updated_by" ON "public"."pm_checklist_templates" USING "btree" ("updated_by");



CREATE INDEX "idx_pm_org_status_composite" ON "public"."preventative_maintenance" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_pm_status_history_changed_by" ON "public"."pm_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_pm_status_history_pm_id" ON "public"."pm_status_history" USING "btree" ("pm_id");



CREATE INDEX "idx_pm_template_compat_rules_mfr_any_model" ON "public"."pm_template_compatibility_rules" USING "btree" ("organization_id", "manufacturer_norm") WHERE ("model_norm" IS NULL);



CREATE INDEX "idx_pm_template_compat_rules_mfr_model_norm" ON "public"."pm_template_compatibility_rules" USING "btree" ("organization_id", "manufacturer_norm", "model_norm");



CREATE INDEX "idx_pm_template_compat_rules_org" ON "public"."pm_template_compatibility_rules" USING "btree" ("organization_id");



CREATE INDEX "idx_pm_template_compat_rules_org_template" ON "public"."pm_template_compatibility_rules" USING "btree" ("organization_id", "pm_template_id");



CREATE INDEX "idx_pm_template_compat_rules_template" ON "public"."pm_template_compatibility_rules" USING "btree" ("pm_template_id");



CREATE INDEX "idx_preventative_maintenance_equipment_id" ON "public"."preventative_maintenance" USING "btree" ("equipment_id");



CREATE INDEX "idx_preventative_maintenance_organization_id" ON "public"."preventative_maintenance" USING "btree" ("organization_id");



CREATE INDEX "idx_preventative_maintenance_template_id" ON "public"."preventative_maintenance" USING "btree" ("template_id");



CREATE INDEX "idx_preventative_maintenance_work_order_id" ON "public"."preventative_maintenance" USING "btree" ("work_order_id");



CREATE INDEX "idx_quickbooks_credentials_org" ON "public"."quickbooks_credentials" USING "btree" ("organization_id");



CREATE INDEX "idx_quickbooks_credentials_refresh_needed" ON "public"."quickbooks_credentials" USING "btree" ("access_token_expires_at", "organization_id");



CREATE INDEX "idx_quickbooks_credentials_token_expiry" ON "public"."quickbooks_credentials" USING "btree" ("access_token_expires_at");



CREATE INDEX "idx_quickbooks_export_logs_intuit_tid" ON "public"."quickbooks_export_logs" USING "btree" ("intuit_tid") WHERE ("intuit_tid" IS NOT NULL);



CREATE INDEX "idx_quickbooks_export_logs_invoice_number" ON "public"."quickbooks_export_logs" USING "btree" ("quickbooks_invoice_number") WHERE ("quickbooks_invoice_number" IS NOT NULL);



CREATE INDEX "idx_quickbooks_export_logs_org" ON "public"."quickbooks_export_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_quickbooks_export_logs_realm" ON "public"."quickbooks_export_logs" USING "btree" ("realm_id");



CREATE INDEX "idx_quickbooks_export_logs_status" ON "public"."quickbooks_export_logs" USING "btree" ("status");



CREATE INDEX "idx_quickbooks_export_logs_work_order" ON "public"."quickbooks_export_logs" USING "btree" ("work_order_id");



CREATE INDEX "idx_quickbooks_export_logs_work_order_created" ON "public"."quickbooks_export_logs" USING "btree" ("work_order_id", "created_at" DESC);



CREATE INDEX "idx_quickbooks_oauth_sessions_expires" ON "public"."quickbooks_oauth_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_quickbooks_oauth_sessions_token" ON "public"."quickbooks_oauth_sessions" USING "btree" ("session_token") WHERE ("used_at" IS NULL);



CREATE INDEX "idx_quickbooks_team_customers_org" ON "public"."quickbooks_team_customers" USING "btree" ("organization_id");



CREATE INDEX "idx_quickbooks_team_customers_qb_customer" ON "public"."quickbooks_team_customers" USING "btree" ("quickbooks_customer_id");



CREATE INDEX "idx_quickbooks_team_customers_team" ON "public"."quickbooks_team_customers" USING "btree" ("team_id");



CREATE INDEX "idx_scans_equipment_id" ON "public"."scans" USING "btree" ("equipment_id");



CREATE INDEX "idx_scans_scanned_by" ON "public"."scans" USING "btree" ("scanned_by");



CREATE INDEX "idx_slot_purchases_organization_id" ON "public"."slot_purchases" USING "btree" ("organization_id");



CREATE INDEX "idx_slot_purchases_purchased_by" ON "public"."slot_purchases" USING "btree" ("purchased_by");



CREATE INDEX "idx_subscribers_user_id" ON "public"."subscribers" USING "btree" ("user_id");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user_team" ON "public"."team_members" USING "btree" ("user_id", "team_id");



CREATE INDEX "idx_teams_organization_id" ON "public"."teams" USING "btree" ("organization_id");



CREATE INDEX "idx_user_license_subscriptions_organization_id" ON "public"."user_license_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_work_order_costs_created_by" ON "public"."work_order_costs" USING "btree" ("created_by");



CREATE INDEX "idx_work_order_costs_inventory_item_id" ON "public"."work_order_costs" USING "btree" ("inventory_item_id") WHERE ("inventory_item_id" IS NOT NULL);



CREATE INDEX "idx_work_order_costs_work_order_id" ON "public"."work_order_costs" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_equipment_eq" ON "public"."work_order_equipment" USING "btree" ("equipment_id");



CREATE INDEX "idx_work_order_equipment_primary" ON "public"."work_order_equipment" USING "btree" ("work_order_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_work_order_equipment_wo" ON "public"."work_order_equipment" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_images_note_id" ON "public"."work_order_images" USING "btree" ("note_id");



CREATE INDEX "idx_work_order_images_work_order_id" ON "public"."work_order_images" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_notes_author_id" ON "public"."work_order_notes" USING "btree" ("author_id");



CREATE INDEX "idx_work_order_notes_work_order_id" ON "public"."work_order_notes" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_status_history_changed_by" ON "public"."work_order_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_work_order_status_history_work_order_id" ON "public"."work_order_status_history" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_orders_assignee_id" ON "public"."work_orders" USING "btree" ("assignee_id");



CREATE INDEX "idx_work_orders_created_by" ON "public"."work_orders" USING "btree" ("created_by");



CREATE INDEX "idx_work_orders_created_by_admin" ON "public"."work_orders" USING "btree" ("created_by_admin");



CREATE INDEX "idx_work_orders_created_date" ON "public"."work_orders" USING "btree" ("created_date");



CREATE INDEX "idx_work_orders_equipment_id" ON "public"."work_orders" USING "btree" ("equipment_id");



CREATE INDEX "idx_work_orders_equipment_status" ON "public"."work_orders" USING "btree" ("equipment_id", "status");



CREATE INDEX "idx_work_orders_historical" ON "public"."work_orders" USING "btree" ("is_historical", "organization_id");



CREATE INDEX "idx_work_orders_org_status" ON "public"."work_orders" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_work_orders_org_status_composite" ON "public"."work_orders" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_work_orders_organization_id" ON "public"."work_orders" USING "btree" ("organization_id");



CREATE INDEX "ix_listing_distributor" ON "public"."distributor_listing" USING "btree" ("distributor_id");



CREATE INDEX "ix_listing_part" ON "public"."distributor_listing" USING "btree" ("part_id");



CREATE INDEX "ix_part_identifier_normalized" ON "public"."part_identifier" USING "btree" ("normalized_value");



CREATE INDEX "ix_part_identifier_part" ON "public"."part_identifier" USING "btree" ("part_id");



CREATE UNIQUE INDEX "organization_subscriptions_org_feature_unique" ON "public"."organization_subscriptions" USING "btree" ("organization_id", "feature_type");



CREATE UNIQUE INDEX "ux_part_canonical_mpn" ON "public"."part" USING "btree" ("canonical_mpn");



CREATE OR REPLACE TRIGGER "audit_equipment_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."audit_equipment_changes"();



CREATE OR REPLACE TRIGGER "audit_inventory_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_inventory_changes"();



CREATE OR REPLACE TRIGGER "audit_org_member_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."audit_org_member_changes"();



CREATE OR REPLACE TRIGGER "audit_pm_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."audit_pm_changes"();



CREATE OR REPLACE TRIGGER "audit_team_member_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."audit_team_member_changes"();



CREATE OR REPLACE TRIGGER "audit_team_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."audit_team_changes"();



CREATE OR REPLACE TRIGGER "audit_work_order_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."audit_work_order_changes"();



CREATE OR REPLACE TRIGGER "before_team_delete" BEFORE DELETE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_team_deletion"();



CREATE OR REPLACE TRIGGER "equipment_note_images_storage_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."equipment_note_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_storage"();



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



CREATE OR REPLACE TRIGGER "pm_status_change_trigger" AFTER UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."log_pm_status_change"();



CREATE OR REPLACE TRIGGER "trg_pm_checklist_templates_touch" BEFORE UPDATE ON "public"."pm_checklist_templates" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_geocoded_locations_updated_at" BEFORE UPDATE ON "public"."geocoded_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_geocoded_locations_updated_at"();



CREATE OR REPLACE TRIGGER "trg_validate_work_order_assignee" BEFORE INSERT OR UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."validate_work_order_assignee"();



COMMENT ON TRIGGER "trg_validate_work_order_assignee" ON "public"."work_orders" IS 'Enforces that work order assignees are valid (team members or org admins) and syncs team_id from equipment.';



CREATE OR REPLACE TRIGGER "trg_work_orders_touch" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_quickbooks_credentials_updated_at" BEFORE UPDATE ON "public"."quickbooks_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_quickbooks_export_logs_updated_at" BEFORE UPDATE ON "public"."quickbooks_export_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_export_logs_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_quickbooks_team_customers_updated_at" BEFORE UPDATE ON "public"."quickbooks_team_customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_team_customers_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_sync_primary_equipment" AFTER INSERT OR UPDATE OF "is_primary" ON "public"."work_order_equipment" FOR EACH ROW WHEN (("new"."is_primary" = true)) EXECUTE FUNCTION "public"."sync_work_order_primary_equipment"();



CREATE OR REPLACE TRIGGER "trigger_update_member_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_member_count"();



CREATE OR REPLACE TRIGGER "trigger_update_pm_updated_at" BEFORE UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."update_pm_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_member_limit" BEFORE INSERT OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."validate_member_limit"();



CREATE OR REPLACE TRIGGER "update_inventory_items_updated_at" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_notification_settings_updated_at" BEFORE UPDATE ON "public"."notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_notification_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_organization_invitations_updated_at" BEFORE UPDATE ON "public"."organization_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_organization_subscriptions_updated_at" BEFORE UPDATE ON "public"."organization_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_part_alternate_groups_updated_at" BEFORE UPDATE ON "public"."part_alternate_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_part_compatibility_rules_updated_at" BEFORE UPDATE ON "public"."part_compatibility_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscribers_updated_at" BEFORE UPDATE ON "public"."subscribers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_work_orders_updated_at" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "work_order_costs_updated_at" BEFORE UPDATE ON "public"."work_order_costs" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_order_costs_updated_at"();



CREATE OR REPLACE TRIGGER "work_order_images_storage_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."work_order_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_storage"();



CREATE OR REPLACE TRIGGER "work_order_status_change_trigger" AFTER UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_work_order_status_change"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."distributor_listing"
    ADD CONSTRAINT "distributor_listing_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributor"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."distributor_listing"
    ADD CONSTRAINT "distributor_listing_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."part"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."equipment_part_compatibility"
    ADD CONSTRAINT "equipment_part_compatibility_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_part_compatibility"
    ADD CONSTRAINT "equipment_part_compatibility_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."export_request_log"
    ADD CONSTRAINT "export_request_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."export_request_log"
    ADD CONSTRAINT "export_request_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_alternate_group_members"
    ADD CONSTRAINT "part_alternate_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."part_alternate_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_alternate_group_members"
    ADD CONSTRAINT "part_alternate_group_members_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_alternate_group_members"
    ADD CONSTRAINT "part_alternate_group_members_part_identifier_id_fkey" FOREIGN KEY ("part_identifier_id") REFERENCES "public"."part_identifiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_alternate_groups"
    ADD CONSTRAINT "part_alternate_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."part_alternate_groups"
    ADD CONSTRAINT "part_alternate_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_alternate_groups"
    ADD CONSTRAINT "part_alternate_groups_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."part_compatibility_rules"
    ADD CONSTRAINT "part_compatibility_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."part_compatibility_rules"
    ADD CONSTRAINT "part_compatibility_rules_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_compatibility_rules"
    ADD CONSTRAINT "part_compatibility_rules_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."part_identifier"
    ADD CONSTRAINT "part_identifier_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."part"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."pm_template_compatibility_rules"
    ADD CONSTRAINT "pm_template_compatibility_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_template_compatibility_rules"
    ADD CONSTRAINT "pm_template_compatibility_rules_pm_template_id_fkey" FOREIGN KEY ("pm_template_id") REFERENCES "public"."pm_checklist_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "preventative_maintenance_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."pm_checklist_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_credentials"
    ADD CONSTRAINT "quickbooks_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_export_logs"
    ADD CONSTRAINT "quickbooks_export_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_export_logs"
    ADD CONSTRAINT "quickbooks_export_logs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_team_lead_id_fkey" FOREIGN KEY ("team_lead_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_departure_queue"
    ADD CONSTRAINT "user_departure_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_departure_queue"
    ADD CONSTRAINT "user_departure_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_license_subscriptions"
    ADD CONSTRAINT "user_license_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_equipment"
    ADD CONSTRAINT "work_order_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_equipment"
    ADD CONSTRAINT "work_order_equipment_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



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



CREATE POLICY "Admins can delete work orders" ON "public"."work_orders" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Admins can delete working hours history" ON "public"."equipment_working_hours_history" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "Admins can insert work order history" ON "public"."work_order_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_status_history"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))) AND ("changed_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Admins can update working hours history" ON "public"."equipment_working_hours_history" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "Admins can view billing events" ON "public"."billing_events" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Admins can view org export history" ON "public"."export_request_log" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "export_request_log"."organization_id") AND ("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Authorized users can insert removal audit" ON "public"."member_removal_audit" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "member_removal_audit"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



COMMENT ON POLICY "Authorized users can insert removal audit" ON "public"."member_removal_audit" IS 'Allows organization owners and admins to insert audit records when removing members.';



CREATE POLICY "Org admins can view removal audit" ON "public"."member_removal_audit" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Prevent unauthorized billing_events deletes" ON "public"."billing_events" FOR DELETE USING (false);



CREATE POLICY "Prevent unauthorized billing_events updates" ON "public"."billing_events" FOR UPDATE USING (false);



CREATE POLICY "Prevent unauthorized billing_usage deletes" ON "public"."billing_usage" FOR DELETE USING (false);



CREATE POLICY "Prevent unauthorized billing_usage inserts" ON "public"."billing_usage" FOR INSERT WITH CHECK (false);



CREATE POLICY "Prevent unauthorized billing_usage updates" ON "public"."billing_usage" FOR UPDATE USING (false);



CREATE POLICY "Prevent unauthorized exemption deletes" ON "public"."billing_exemptions" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role can insert removal audit" ON "public"."member_removal_audit" FOR INSERT TO "service_role" WITH CHECK (true);



COMMENT ON POLICY "Service role can insert removal audit" ON "public"."member_removal_audit" IS 'Allows service_role to insert audit records for member removals.';



CREATE POLICY "Service role can manage export logs" ON "public"."export_request_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can insert audit logs" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "System only billing_events inserts" ON "public"."billing_events" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Users can create working hours history for accessible equipment" ON "public"."equipment_working_hours_history" FOR INSERT WITH CHECK ((("updated_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") OR ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") AND ("e"."team_id" IS NOT NULL) AND ("e"."team_id" IN ( SELECT "tm"."team_id"
           FROM "public"."team_members" "tm"
          WHERE ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))))))));



CREATE POLICY "Users can manage their own notification preferences" ON "public"."notification_preferences" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can upload work order images" ON "public"."work_order_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_images"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "Users can view audit logs for their organizations" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Users can view own export history" ON "public"."export_request_log" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



COMMENT ON POLICY "Users can view own export history" ON "public"."export_request_log" IS 'Users can view their own export history only for organizations they currently belong to. Security fix: added org membership check.';



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view work order history for their organization" ON "public"."work_order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_status_history"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "Users can view work order images" ON "public"."work_order_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_images"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "Users can view working hours history for accessible equipment" ON "public"."equipment_working_hours_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") OR ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") AND ("e"."team_id" IS NOT NULL) AND ("e"."team_id" IN ( SELECT "tm"."team_id"
           FROM "public"."team_members" "tm"
          WHERE ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))))));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_exemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_contacts_admins_insert" ON "public"."customer_contacts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contacts"."customer_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id")))));



CREATE POLICY "customer_contacts_admins_select" ON "public"."customer_contacts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contacts"."customer_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id")))));



CREATE POLICY "customer_contacts_admins_update" ON "public"."customer_contacts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_contacts"."customer_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id")))));



ALTER TABLE "public"."customer_sites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_sites_admins_insert" ON "public"."customer_sites" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_sites"."customer_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id")))));



CREATE POLICY "customer_sites_admins_select" ON "public"."customer_sites" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_sites"."customer_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id")))));



CREATE POLICY "customer_sites_admins_update" ON "public"."customer_sites" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_sites"."customer_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id")))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_admins_insert" ON "public"."customers" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "customers_admins_select" ON "public"."customers" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "customers_admins_update" ON "public"."customers" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."distributor" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."distributor_listing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "distributor_listing_read_auth" ON "public"."distributor_listing" FOR SELECT USING (true);



CREATE POLICY "distributor_read_auth" ON "public"."distributor" FOR SELECT USING (true);



ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_access_consolidated" ON "public"."equipment" USING (("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."equipment_note_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_note_images_delete" ON "public"."equipment_note_images" FOR DELETE USING ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id"))))));



CREATE POLICY "equipment_note_images_insert" ON "public"."equipment_note_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "equipment_note_images_select" ON "public"."equipment_note_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



ALTER TABLE "public"."equipment_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_notes_delete" ON "public"."equipment_notes" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))) OR ("author_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "equipment_notes_delete_own" ON "public"."equipment_notes" FOR DELETE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id"))))));



COMMENT ON POLICY "equipment_notes_delete_own" ON "public"."equipment_notes" IS 'Authors can delete their own notes only while still a member of the equipment''s organization. Security fix: replaces FOR ALL policy with proper org check.';



CREATE POLICY "equipment_notes_insert" ON "public"."equipment_notes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "equipment_notes_select" ON "public"."equipment_notes" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))) OR ("author_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "equipment_notes_update" ON "public"."equipment_notes" FOR UPDATE USING (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "equipment_notes_update_own" ON "public"."equipment_notes" FOR UPDATE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id"))))));



COMMENT ON POLICY "equipment_notes_update_own" ON "public"."equipment_notes" IS 'Authors can update their own notes only while still a member of the equipment''s organization. Security fix: replaces FOR ALL policy with proper org check.';



ALTER TABLE "public"."equipment_part_compatibility" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_part_compatibility_organization_isolation" ON "public"."equipment_part_compatibility" USING (("equipment_id" IN ( SELECT "e"."id"
   FROM ("public"."equipment" "e"
     JOIN "public"."organization_members" "om" ON (("e"."organization_id" = "om"."organization_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."equipment_working_hours_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."export_request_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geocoded_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "geocoded_locations_select_org_members" ON "public"."geocoded_locations" FOR SELECT USING ("public"."check_org_access_secure"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "geocoded_locations_service_insert" ON "public"."geocoded_locations" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "geocoded_locations_service_update" ON "public"."geocoded_locations" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_items_organization_isolation" ON "public"."inventory_items" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



ALTER TABLE "public"."inventory_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_transactions_organization_isolation" ON "public"."inventory_transactions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



ALTER TABLE "public"."invitation_performance_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitation_performance_logs_service_only" ON "public"."invitation_performance_logs" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."member_removal_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notes_delete_own_or_admin" ON "public"."notes" FOR DELETE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "notes"."equipment_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id"))))));



CREATE POLICY "notes_insert_organization_members" ON "public"."notes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "notes_select_organization_members" ON "public"."notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "notes_update_own" ON "public"."notes" FOR UPDATE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id"))))));



COMMENT ON POLICY "notes_update_own" ON "public"."notes" IS 'Authors can update their own notes only while still a member of the equipment''s organization. Security fix: added org membership check.';



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_settings_user_policy" ON "public"."notification_settings" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_admins_view_departure_queue" ON "public"."user_departure_queue" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "user_departure_queue"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "org_admins_view_exemptions" ON "public"."billing_exemptions" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "org_admins_view_transfer_requests" ON "public"."ownership_transfer_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "ownership_transfer_requests"."organization_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_invitations_select" ON "public"."organization_invitations" FOR SELECT USING ((("email" = ( SELECT "auth"."email"() AS "email")) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "organization_invitations_update" ON "public"."organization_invitations" FOR UPDATE USING ((("email" = ( SELECT "auth"."email"() AS "email")) OR ("invited_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"))) WITH CHECK ((("email" = ( SELECT "auth"."email"() AS "email")) OR ("invited_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members_delete_safe" ON "public"."organization_members" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"("organization_id"));



CREATE POLICY "organization_members_insert_safe" ON "public"."organization_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"("organization_id"));



CREATE POLICY "organization_members_select_safe" ON "public"."organization_members" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."user_is_org_member"("organization_id")));



CREATE POLICY "organization_members_select_secure" ON "public"."organization_members" FOR SELECT TO "authenticated" USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



COMMENT ON POLICY "organization_members_select_secure" ON "public"."organization_members" IS 'Secure SELECT policy: Users can view organization_members records for organizations they belong to. 
Uses is_org_member() function to avoid infinite recursion (function bypasses RLS). 
Also allows users to see their own membership record directly.';



CREATE POLICY "organization_members_update_safe" ON "public"."organization_members" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"("organization_id"));



ALTER TABLE "public"."organization_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_slots_admin_delete" ON "public"."organization_slots" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "organization_slots_admin_insert" ON "public"."organization_slots" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "organization_slots_admin_update" ON "public"."organization_slots" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "organization_slots_select_consolidated" ON "public"."organization_slots" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."organization_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_subscriptions_admin_delete" ON "public"."organization_subscriptions" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "organization_subscriptions_admin_insert" ON "public"."organization_subscriptions" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "organization_subscriptions_admin_update" ON "public"."organization_subscriptions" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "organization_subscriptions_select_consolidated" ON "public"."organization_subscriptions" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_select" ON "public"."organizations" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "id") OR (EXISTS ( SELECT 1
   FROM "public"."organization_invitations"
  WHERE (("organization_invitations"."organization_id" = "organizations"."id") AND ("organization_invitations"."email" = ( SELECT "auth"."email"() AS "email")) AND ("organization_invitations"."status" = 'pending'::"text"))))));



CREATE POLICY "orgs_update_admins" ON "public"."organizations" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "id"));



ALTER TABLE "public"."ownership_transfer_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."part" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."part_alternate_group_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_alternate_group_members_org_isolation" ON "public"."part_alternate_group_members" USING (("group_id" IN ( SELECT "part_alternate_groups"."id"
   FROM "public"."part_alternate_groups"
  WHERE ("part_alternate_groups"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))));



ALTER TABLE "public"."part_alternate_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_alternate_groups_org_isolation" ON "public"."part_alternate_groups" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



ALTER TABLE "public"."part_compatibility_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_compatibility_rules_org_isolation" ON "public"."part_compatibility_rules" USING (("inventory_item_id" IN ( SELECT "inventory_items"."id"
   FROM "public"."inventory_items"
  WHERE ("inventory_items"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))));



ALTER TABLE "public"."part_identifier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_identifier_read_auth" ON "public"."part_identifier" FOR SELECT USING (true);



ALTER TABLE "public"."part_identifiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_identifiers_org_isolation" ON "public"."part_identifiers" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "part_read_auth" ON "public"."part" FOR SELECT USING (true);



ALTER TABLE "public"."parts_managers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parts_managers_delete_policy" ON "public"."parts_managers" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text") AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "parts_managers_insert_policy" ON "public"."parts_managers" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text") AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "parts_managers_select_policy" ON "public"."parts_managers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



ALTER TABLE "public"."pm_checklist_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_checklist_templates_admin_insert" ON "public"."pm_checklist_templates" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "pm_checklist_templates_admin_update" ON "public"."pm_checklist_templates" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "pm_checklist_templates_delete_consolidated" ON "public"."pm_checklist_templates" FOR DELETE USING (("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("is_protected" = false)));



CREATE POLICY "pm_checklist_templates_select_consolidated" ON "public"."pm_checklist_templates" FOR SELECT USING (((("organization_id" IS NULL) AND (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."pm_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_status_history_admin_insert" ON "public"."pm_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "pm"."organization_id")))) AND ("changed_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "pm_status_history_select_consolidated" ON "public"."pm_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "pm"."organization_id")))));



CREATE POLICY "pm_template_compat_rules_delete" ON "public"."pm_template_compatibility_rules" FOR DELETE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "pm_template_compat_rules_insert" ON "public"."pm_template_compatibility_rules" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))) AND ("pm_template_id" IN ( SELECT "pm_checklist_templates"."id"
   FROM "public"."pm_checklist_templates"
  WHERE (("pm_checklist_templates"."organization_id" IS NULL) OR ("pm_checklist_templates"."organization_id" IN ( SELECT "om"."organization_id"
           FROM "public"."organization_members" "om"
          WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))))))));



CREATE POLICY "pm_template_compat_rules_select" ON "public"."pm_template_compatibility_rules" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "pm_template_compat_rules_update" ON "public"."pm_template_compatibility_rules" FOR UPDATE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."pm_template_compatibility_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preventative_maintenance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preventative_maintenance_insert" ON "public"."preventative_maintenance" FOR INSERT WITH CHECK (("organization_id" = ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = "preventative_maintenance"."organization_id")
 LIMIT 1)));



CREATE POLICY "preventative_maintenance_insert_consolidated" ON "public"."preventative_maintenance" FOR INSERT WITH CHECK (((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "preventative_maintenance_select" ON "public"."preventative_maintenance" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "preventative_maintenance_select_consolidated" ON "public"."preventative_maintenance" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "preventative_maintenance_update" ON "public"."preventative_maintenance" FOR UPDATE USING (("organization_id" = ( SELECT "organizations"."id"
   FROM "public"."organizations"
  WHERE ("organizations"."id" = "preventative_maintenance"."organization_id")
 LIMIT 1)));



CREATE POLICY "preventative_maintenance_update_consolidated" ON "public"."preventative_maintenance" FOR UPDATE USING (((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_optimized" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."organization_members" "om1"
     JOIN "public"."organization_members" "om2" ON (("om1"."organization_id" = "om2"."organization_id")))
  WHERE (("om1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om2"."user_id" = "profiles"."id") AND ("om1"."status" = 'active'::"text") AND ("om2"."status" = 'active'::"text"))))));



CREATE POLICY "profiles_update_optimized" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."quickbooks_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quickbooks_credentials_delete_policy" ON "public"."quickbooks_credentials" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "quickbooks_credentials"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "quickbooks_credentials_insert_policy" ON "public"."quickbooks_credentials" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "quickbooks_credentials"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "quickbooks_credentials_select_policy" ON "public"."quickbooks_credentials" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "quickbooks_credentials"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "quickbooks_credentials_update_policy" ON "public"."quickbooks_credentials" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "quickbooks_credentials"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "quickbooks_credentials"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."quickbooks_export_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quickbooks_export_logs_insert_policy" ON "public"."quickbooks_export_logs" FOR INSERT WITH CHECK ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "quickbooks_export_logs_select_policy" ON "public"."quickbooks_export_logs" FOR SELECT USING ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "quickbooks_export_logs_update_policy" ON "public"."quickbooks_export_logs" FOR UPDATE USING ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) WITH CHECK ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."quickbooks_oauth_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quickbooks_oauth_sessions_insert_policy" ON "public"."quickbooks_oauth_sessions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text"))))));



CREATE POLICY "quickbooks_oauth_sessions_select_policy" ON "public"."quickbooks_oauth_sessions" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."quickbooks_team_customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quickbooks_team_customers_delete_policy" ON "public"."quickbooks_team_customers" FOR DELETE USING ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "quickbooks_team_customers_insert_policy" ON "public"."quickbooks_team_customers" FOR INSERT WITH CHECK ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "quickbooks_team_customers_select_policy" ON "public"."quickbooks_team_customers" FOR SELECT USING ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "quickbooks_team_customers_update_policy" ON "public"."quickbooks_team_customers" FOR UPDATE USING ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) WITH CHECK ("public"."can_user_manage_quickbooks"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scans_delete_admins" ON "public"."scans" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "scans"."equipment_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "scans_insert_organization_members" ON "public"."scans" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "scans"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "scans_select_organization_members" ON "public"."scans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "scans"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "scans_update_own" ON "public"."scans" FOR UPDATE USING ((("scanned_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "scans"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id"))))));



COMMENT ON POLICY "scans_update_own" ON "public"."scans" IS 'Users can update their own scans only while still a member of the equipment''s organization. Security fix: added org membership check.';



CREATE POLICY "secure_system_insert_exemptions" ON "public"."billing_exemptions" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "secure_system_update_exemptions" ON "public"."billing_exemptions" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_delete_webhook_events" ON "public"."webhook_events" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_insert_webhook_events" ON "public"."webhook_events" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_manage_departure_queue" ON "public"."user_departure_queue" TO "authenticated" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_manage_transfer_requests" ON "public"."ownership_transfer_requests" TO "authenticated" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "service_role_only_create_notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_select_webhook_events" ON "public"."webhook_events" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_update_webhook_events" ON "public"."webhook_events" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."slot_purchases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "slot_purchases_admin_delete" ON "public"."slot_purchases" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "slot_purchases_admin_insert" ON "public"."slot_purchases" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "slot_purchases_admin_update" ON "public"."slot_purchases" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "slot_purchases_select_consolidated" ON "public"."slot_purchases" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."stripe_event_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stripe_event_logs_service_only" ON "public"."stripe_event_logs" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscribers_select_consolidated" ON "public"."subscribers" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



CREATE POLICY "subscribers_service_delete" ON "public"."subscribers" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "subscribers_service_insert" ON "public"."subscribers" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "subscribers_update_consolidated" ON "public"."subscribers" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (( SELECT "auth"."role"() AS "role") = 'service_role'::"text")));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_admin_delete" ON "public"."team_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "t"."organization_id")))));



CREATE POLICY "team_members_admin_insert" ON "public"."team_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "t"."organization_id")))));



CREATE POLICY "team_members_admin_update" ON "public"."team_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "t"."organization_id")))));



CREATE POLICY "team_members_select" ON "public"."team_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "t"."organization_id")))));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_admin_delete" ON "public"."teams" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "teams_admin_insert" ON "public"."teams" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "teams_admin_update" ON "public"."teams" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "teams_select_consolidated" ON "public"."teams" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."user_departure_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_license_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_license_subscriptions_admin_insert" ON "public"."user_license_subscriptions" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "user_license_subscriptions_admin_update" ON "public"."user_license_subscriptions" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "user_license_subscriptions_select_consolidated" ON "public"."user_license_subscriptions" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "user_license_subscriptions_service_delete" ON "public"."user_license_subscriptions" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "users_create_invitations" ON "public"."organization_invitations" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "users_delete_own_invitations" ON "public"."organization_invitations" FOR DELETE USING (("email" = ( SELECT "auth"."email"() AS "email")));



CREATE POLICY "users_view_own_transfer_requests" ON "public"."ownership_transfer_requests" FOR SELECT TO "authenticated" USING (("to_user_id" = "auth"."uid"()));



CREATE POLICY "view_org_usage" ON "public"."billing_usage" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_order_costs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_costs_delete" ON "public"."work_order_costs" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))) OR (("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))))));



COMMENT ON POLICY "work_order_costs_delete" ON "public"."work_order_costs" IS 'Admins can delete all costs. Users can delete own costs only while org member. Security fix: added org membership check.';



CREATE POLICY "work_order_costs_delete_consolidated" ON "public"."work_order_costs" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "work_order_costs_insert" ON "public"."work_order_costs" FOR INSERT WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id"))))));



COMMENT ON POLICY "work_order_costs_insert" ON "public"."work_order_costs" IS 'Users can insert costs only for work orders in organizations they belong to.';



CREATE POLICY "work_order_costs_insert_consolidated" ON "public"."work_order_costs" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "work_order_costs_select" ON "public"."work_order_costs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



COMMENT ON POLICY "work_order_costs_select" ON "public"."work_order_costs" IS 'Organization members can view costs for work orders in their org. Security fix: removed created_by fallback to prevent cross-tenant access.';



CREATE POLICY "work_order_costs_select_consolidated" ON "public"."work_order_costs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id"))))));



CREATE POLICY "work_order_costs_update" ON "public"."work_order_costs" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))) OR (("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))))));



COMMENT ON POLICY "work_order_costs_update" ON "public"."work_order_costs" IS 'Admins can update all costs. Users can update own costs only while org member. Security fix: added org membership check.';



CREATE POLICY "work_order_costs_update_consolidated" ON "public"."work_order_costs" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."work_order_equipment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_equipment_delete_policy" ON "public"."work_order_equipment" FOR DELETE USING (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))));



CREATE POLICY "work_order_equipment_insert_policy" ON "public"."work_order_equipment" FOR INSERT WITH CHECK (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))));



CREATE POLICY "work_order_equipment_select_policy" ON "public"."work_order_equipment" FOR SELECT USING (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))));



CREATE POLICY "work_order_equipment_update_policy" ON "public"."work_order_equipment" FOR UPDATE USING (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))))));



ALTER TABLE "public"."work_order_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_images_delete_own" ON "public"."work_order_images" FOR DELETE USING ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_images"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id"))))));



COMMENT ON POLICY "work_order_images_delete_own" ON "public"."work_order_images" IS 'Users can delete their own images only while still a member of the work order''s organization. Security fix: added org membership check.';



ALTER TABLE "public"."work_order_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_notes_delete_own" ON "public"."work_order_notes" FOR DELETE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id"))))));



COMMENT ON POLICY "work_order_notes_delete_own" ON "public"."work_order_notes" IS 'Authors can delete their own notes only while still a member of the work order''s organization. Security fix: added org membership check.';



CREATE POLICY "work_order_notes_insert_organization_members" ON "public"."work_order_notes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "work_order_notes_select_organization_members" ON "public"."work_order_notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "work_order_notes_update_own" ON "public"."work_order_notes" FOR UPDATE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id"))))));



COMMENT ON POLICY "work_order_notes_update_own" ON "public"."work_order_notes" IS 'Authors can update their own notes only while still a member of the work order''s organization. Security fix: added org membership check.';



ALTER TABLE "public"."work_order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_orders_insert_consolidated" ON "public"."work_orders" FOR INSERT WITH CHECK (((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("created_by_admin" = ( SELECT "auth"."uid"() AS "uid"))) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "work_orders_select_consolidated" ON "public"."work_orders" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "work_orders_update_consolidated" ON "public"."work_orders" FOR UPDATE USING (((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_equipment_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_equipment_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_equipment_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_inventory_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_inventory_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_inventory_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_org_member_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_org_member_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_org_member_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_pm_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_pm_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_pm_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_team_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_team_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_team_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_team_member_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_team_member_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_team_member_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_work_order_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_work_order_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_work_order_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."billing_is_disabled"() TO "anon";
GRANT ALL ON FUNCTION "public"."billing_is_disabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."billing_is_disabled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_export_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_export_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_export_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_rls_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."clear_rls_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_rls_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_audit_actor_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_audit_actor_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audit_actor_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_pm_template_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_pm_template_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_pm_template_names"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_transfer_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_transfer_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_transfer_requests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."invoke_quickbooks_token_refresh"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invoke_quickbooks_token_refresh"() TO "anon";
GRANT ALL ON FUNCTION "public"."invoke_quickbooks_token_refresh"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."invoke_quickbooks_token_refresh"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_organization"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_organization"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_organization"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_pm_templates"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_pm_templates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_pm_templates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_pm_templates"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_pm_templates"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_pm_templates"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_pm_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_pm_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_pm_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_work_order_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_work_order_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_work_order_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_all_pending_departures"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_all_pending_departures"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_all_pending_departures"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() TO "service_role";



GRANT ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_stripe_subscription_slots"("org_id" "uuid", "subscription_id" "text", "quantity" integer, "period_start" timestamp with time zone, "period_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_work_order_primary_equipment"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_work_order_primary_equipment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_work_order_primary_equipment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_departure_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_departure_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_departure_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notification_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notification_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_member_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_member_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_member_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization_storage"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization_storage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization_storage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pm_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pm_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pm_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quickbooks_credentials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quickbooks_credentials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quickbooks_credentials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quickbooks_export_logs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quickbooks_export_logs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quickbooks_export_logs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quickbooks_team_customers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quickbooks_team_customers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quickbooks_team_customers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_member_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_member_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_member_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_work_order_assignee"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_work_order_assignee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_work_order_assignee"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



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



GRANT ALL ON TABLE "public"."distributor" TO "anon";
GRANT ALL ON TABLE "public"."distributor" TO "authenticated";
GRANT ALL ON TABLE "public"."distributor" TO "service_role";



GRANT ALL ON TABLE "public"."distributor_listing" TO "anon";
GRANT ALL ON TABLE "public"."distributor_listing" TO "authenticated";
GRANT ALL ON TABLE "public"."distributor_listing" TO "service_role";



GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_note_images" TO "anon";
GRANT ALL ON TABLE "public"."equipment_note_images" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_note_images" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_notes" TO "anon";
GRANT ALL ON TABLE "public"."equipment_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_notes" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_part_compatibility" TO "anon";
GRANT ALL ON TABLE "public"."equipment_part_compatibility" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_part_compatibility" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "anon";
GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "service_role";



GRANT ALL ON TABLE "public"."export_request_log" TO "anon";
GRANT ALL ON TABLE "public"."export_request_log" TO "authenticated";
GRANT ALL ON TABLE "public"."export_request_log" TO "service_role";



GRANT ALL ON TABLE "public"."geocoded_locations" TO "anon";
GRANT ALL ON TABLE "public"."geocoded_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."geocoded_locations" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transactions" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "service_role";



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



GRANT ALL ON TABLE "public"."notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_settings" TO "service_role";



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



GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "anon";
GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "service_role";



GRANT ALL ON TABLE "public"."part" TO "anon";
GRANT ALL ON TABLE "public"."part" TO "authenticated";
GRANT ALL ON TABLE "public"."part" TO "service_role";



GRANT ALL ON TABLE "public"."part_alternate_group_members" TO "anon";
GRANT ALL ON TABLE "public"."part_alternate_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."part_alternate_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."part_alternate_groups" TO "anon";
GRANT ALL ON TABLE "public"."part_alternate_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."part_alternate_groups" TO "service_role";



GRANT ALL ON TABLE "public"."part_compatibility_rules" TO "anon";
GRANT ALL ON TABLE "public"."part_compatibility_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."part_compatibility_rules" TO "service_role";



GRANT ALL ON TABLE "public"."part_identifier" TO "anon";
GRANT ALL ON TABLE "public"."part_identifier" TO "authenticated";
GRANT ALL ON TABLE "public"."part_identifier" TO "service_role";



GRANT ALL ON TABLE "public"."part_identifiers" TO "anon";
GRANT ALL ON TABLE "public"."part_identifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."part_identifiers" TO "service_role";



GRANT ALL ON TABLE "public"."parts_managers" TO "anon";
GRANT ALL ON TABLE "public"."parts_managers" TO "authenticated";
GRANT ALL ON TABLE "public"."parts_managers" TO "service_role";



GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "anon";
GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "service_role";



GRANT ALL ON TABLE "public"."pm_status_history" TO "anon";
GRANT ALL ON TABLE "public"."pm_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."pm_template_compatibility_rules" TO "anon";
GRANT ALL ON TABLE "public"."pm_template_compatibility_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_template_compatibility_rules" TO "service_role";



GRANT ALL ON TABLE "public"."pm_templates_check" TO "anon";
GRANT ALL ON TABLE "public"."pm_templates_check" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_templates_check" TO "service_role";



GRANT ALL ON TABLE "public"."preventative_maintenance" TO "anon";
GRANT ALL ON TABLE "public"."preventative_maintenance" TO "authenticated";
GRANT ALL ON TABLE "public"."preventative_maintenance" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_credentials" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_export_logs" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_export_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_export_logs" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_oauth_sessions" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_oauth_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_oauth_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_team_customers" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_team_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_team_customers" TO "service_role";



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



GRANT ALL ON TABLE "public"."user_departure_queue" TO "anon";
GRANT ALL ON TABLE "public"."user_departure_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."user_departure_queue" TO "service_role";



GRANT ALL ON TABLE "public"."user_entitlements" TO "anon";
GRANT ALL ON TABLE "public"."user_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."user_license_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_license_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_license_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_costs" TO "anon";
GRANT ALL ON TABLE "public"."work_order_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_costs" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_equipment" TO "anon";
GRANT ALL ON TABLE "public"."work_order_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_equipment" TO "service_role";



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

-- Reset search_path for subsequent seed files
-- The migration clears search_path for security, but seed files need access to public schema types
SET search_path TO public, extensions;



