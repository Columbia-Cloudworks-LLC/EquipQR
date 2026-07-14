


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


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "pgmq_public";


ALTER SCHEMA "pgmq_public" OWNER TO "postgres";


COMMENT ON SCHEMA "pgmq_public" IS 'Public-facing SECURITY DEFINER wrappers around the pgmq.* functions, mirroring the schema that Supabase Dashboard provisions when "Enable Queues" is clicked. Created here in migration so the queue pattern works in any environment (local dev, ephemeral PR branches, preview, production) without requiring a Dashboard click-through. See Change Record on issue #722.';



COMMENT ON SCHEMA "public" IS 'EquipQR application schema. SECURITY DEFINER EXECUTE grants follow docs/ops/security-definer-rpc-policy.md (issue #762).';



CREATE SCHEMA IF NOT EXISTS "stripe";


ALTER SCHEMA "stripe" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgmq";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






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


CREATE OR REPLACE FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result boolean;
BEGIN
  SELECT pgmq.archive(
    queue_name => queue_name,
    msg_id => message_id
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;


ALTER FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result boolean;
BEGIN
  SELECT pgmq.delete(
    queue_name => queue_name,
    msg_id => message_id
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;


ALTER FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "pgmq_public"."pop"("queue_name" "text") RETURNS TABLE("msg_id" bigint, "read_ct" integer, "enqueued_at" timestamp with time zone, "vt" timestamp with time zone, "message" "jsonb", "headers" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.pop(queue_name => queue_name);
END;
$$;


ALTER FUNCTION "pgmq_public"."pop"("queue_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) RETURNS TABLE("msg_id" bigint, "read_ct" integer, "enqueued_at" timestamp with time zone, "vt" timestamp with time zone, "message" "jsonb", "headers" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.read(
    queue_name => queue_name,
    vt => sleep_seconds,
    qty => n
  );
END;
$$;


ALTER FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer DEFAULT 0) RETURNS SETOF bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.send(
    queue_name => queue_name,
    msg => message,
    delay => sleep_seconds
  );
END;
$$;


ALTER FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_invoke_quickbooks_token_refresh_internal"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF service_role_key IS NULL OR supabase_url IS NULL THEN
    RAISE WARNING 'QuickBooks token refresh skipped: vault secrets not configured';
    RETURN;
  END IF;

  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'QuickBooks token refresh skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/quickbooks-refresh-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule QuickBooks token refresh invocation';
  END IF;
END;
$_$;


ALTER FUNCTION "public"."_invoke_quickbooks_token_refresh_internal"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."_invoke_quickbooks_token_refresh_internal"() IS 'Internal vault-backed QuickBooks token refresh HTTP call. Not callable via PostgREST; used by pg_cron wrapper invoke_quickbooks_token_refresh() and refresh_quickbooks_tokens_manual().';



CREATE OR REPLACE FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    SET "row_security" TO 'off'
    AS $$
DECLARE
  invitation_record RECORD;
  org_name TEXT;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT id, organization_id, email, role, status, expires_at, accepted_by
  INTO invitation_record
  FROM organization_invitations
  WHERE invitation_token = p_invitation_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF invitation_record.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has already been processed');
  END IF;

  IF invitation_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
      AND lower(trim(email)) = lower(trim(invitation_record.email))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email does not match invitation email');
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = invitation_record.organization_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  END IF;

  UPDATE organization_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id,
    updated_at = now()
  WHERE id = invitation_record.id;

  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    access_source
  ) VALUES (
    invitation_record.organization_id,
    p_user_id,
    invitation_record.role,
    'active',
    'invitation'
  );

  SELECT name INTO org_name
  FROM organizations
  WHERE id = invitation_record.organization_id;

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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to accept invitation. Please try again or contact support.'
    );
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
  v_work_order_org_id UUID;
  v_transaction_type inventory_transaction_type;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF p_delta IS NULL THEN
    RAISE EXCEPTION 'Inventory adjustment delta cannot be null';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Inventory adjustment delta cannot be zero';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT quantity_on_hand, organization_id
  INTO v_current_quantity, v_organization_id
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_item_id;
  END IF;

  IF p_work_order_id IS NOT NULL THEN
    SELECT organization_id
    INTO v_work_order_org_id
    FROM public.work_orders
    WHERE id = p_work_order_id;

    IF v_work_order_org_id IS NULL OR v_work_order_org_id <> v_organization_id THEN
      RAISE EXCEPTION 'Work order does not belong to the inventory item organization';
    END IF;
  END IF;

  -- Parts Managers (and org owners/admins) may adjust freely. Parts Consumers
  -- may only make work-order-scoped adjustments (consume/restore) on work
  -- orders they hold operational cost access to.
  IF NOT public.can_manage_inventory(v_organization_id, v_user_id) THEN
    IF p_work_order_id IS NULL
       OR NOT public.can_access_inventory(v_organization_id, v_user_id)
       OR NOT public.can_access_work_order_costs(p_work_order_id, v_user_id) THEN
      RAISE EXCEPTION 'User does not have permission to adjust inventory';
    END IF;
  END IF;

  v_new_quantity := v_current_quantity + p_delta;

  IF p_delta < 0 AND v_new_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: requested % units, but only % available',
      ABS(p_delta), v_current_quantity;
  END IF;

  IF v_new_quantity < -1000 THEN
    RAISE WARNING 'Inventory item % for org % adjusted by user % to suspiciously low quantity: %',
      p_item_id, v_organization_id, v_user_id, v_new_quantity;
  END IF;

  IF p_work_order_id IS NOT NULL THEN
    v_transaction_type := 'work_order';
  ELSIF p_delta < 0 THEN
    v_transaction_type := 'usage';
  ELSIF p_delta > 0 THEN
    v_transaction_type := 'restock';
  END IF;

  UPDATE public.inventory_items
  SET
    quantity_on_hand = v_new_quantity,
    updated_at = NOW()
  WHERE id = p_item_id;

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

  RETURN v_new_quantity;
END;
$$;


ALTER FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") IS 'Adjusts inventory quantity with transaction logging. Parts Managers (and org owners/admins) may adjust freely; Parts Consumers may only make work-order-scoped adjustments on work orders where they hold operational cost access. The work order must belong to the same organization as the inventory item.';



CREATE OR REPLACE FUNCTION "public"."anonymize_audit_changes"("p_changes" "jsonb", "p_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
BEGIN
  RETURN regexp_replace(
    p_changes::text,
    regexp_replace(p_email, '([.\+\*\?\[\]\(\)\{\}\|\\^$])', '\\\1', 'g'),
    '[redacted]',
    'gi'
  )::jsonb;
END;
$_$;


ALTER FUNCTION "public"."anonymize_audit_changes"("p_changes" "jsonb", "p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."anonymize_audit_changes"("p_changes" "jsonb", "p_email" "text") IS 'Replaces occurrences of an email address inside a JSONB changes payload with [redacted].';



CREATE OR REPLACE FUNCTION "public"."anonymize_audit_log_for_user"("p_email" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.audit_log
  SET actor_name  = 'Deleted User',
      actor_email = '[redacted]',
      changes     = public.anonymize_audit_changes(changes, p_email)
  WHERE actor_email = p_email;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;


ALTER FUNCTION "public"."anonymize_audit_log_for_user"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."anonymize_audit_log_for_user"("p_email" "text") IS 'Replaces actor_name, actor_email, and scrubs the email from changes JSONB for all audit_log rows matching the given email. Used for CCPA deletion requests.';



CREATE OR REPLACE FUNCTION "public"."apply_account_deletion_storage_metadata"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_delete_paths jsonb := '[]'::jsonb;
  v_reassigned integer := 0;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'path', name)), '[]'::jsonb)
  INTO v_delete_paths
  FROM storage.objects
  WHERE owner_id = p_user_id
    AND bucket_id = 'user-avatars';

  UPDATE storage.objects
  SET owner = NULL,
      owner_id = NULL
  WHERE owner_id = p_user_id
    AND bucket_id IN ('work-order-images', 'equipment-note-images', 'inventory-item-images');

  GET DIAGNOSTICS v_reassigned = ROW_COUNT;

  RETURN jsonb_build_object(
    'delete_paths', v_delete_paths,
    'reassigned_object_count', v_reassigned
  );
END;
$$;


ALTER FUNCTION "public"."apply_account_deletion_storage_metadata"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_pending_admin_grants_for_user"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count int := 0;
  v_caller uuid := (select auth.uid());
BEGIN
  -- Self-only guard (quiet variant)
  --   * In trigger / service-role context (auth.uid() IS NULL): allow execution.
  --     handle_new_user() relies on this branch.
  --   * In user context with mismatched p_user_id: log and return 0 instead of
  --     raising. The function is idempotent and the call is non-essential, so
  --     a benign no-op is preferable to a 400 in the browser console.
  IF v_caller IS NOT NULL AND p_user_id IS DISTINCT FROM v_caller THEN
    RAISE NOTICE 'apply_pending_admin_grants_for_user: caller % attempted to apply grants for % -- ignored',
      v_caller, p_user_id;
    RETURN 0;
  END IF;

  IF NOT public.is_user_google_oauth_verified(p_user_id) THEN
    RETURN 0;
  END IF;

  UPDATE public.organization_members om
  SET role = 'admin'
  FROM auth.users u
  WHERE om.user_id = p_user_id
    AND u.id = p_user_id
    AND public.normalize_email(u.email) IN (
      SELECT public.normalize_email(pg.email)
      FROM public.organization_role_grants_pending pg
      WHERE pg.status = 'pending'
        AND pg.organization_id = om.organization_id
    )
    AND om.role = 'member';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.organization_role_grants_pending pg
  SET status = 'applied',
      applied_user_id = p_user_id,
      applied_at = now()
  FROM auth.users u
  WHERE u.id = p_user_id
    AND pg.status = 'pending'
    AND public.normalize_email(pg.email) = public.normalize_email(u.email);

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."apply_pending_admin_grants_for_user"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_pending_admin_grants_for_user"("p_user_id" "uuid") IS 'Promotes the supplied user to admin in any organization that has a matching pending grant (by normalized email). Self-only when called in user context (quiet no-op on mismatch); permissive in trigger / service-role context. Idempotent and safe to call repeatedly.';



CREATE OR REPLACE FUNCTION "public"."assert_inventory_read_access"("p_organization_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_access_inventory(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: user cannot access inventory for this organization'
      USING ERRCODE = '42501';
  END IF;
END;
$$;


ALTER FUNCTION "public"."assert_inventory_read_access"("p_organization_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."auto_provision_workspace_organization"("p_user_id" "uuid", "p_domain" "text", "p_organization_name" "text") RETURNS TABLE("organization_id" "uuid", "domain" "text", "already_existed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_domain text;
  v_org_id uuid;
  v_existing_org_id uuid;
BEGIN
  v_domain := public.normalize_domain(p_domain);

  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  SELECT d.organization_id INTO v_existing_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = v_domain;

  IF v_existing_org_id IS NOT NULL THEN
    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT o.id INTO v_existing_org_id
  FROM public.organizations o
  JOIN public.organization_members om ON om.organization_id = o.id
  LEFT JOIN public.personal_organizations po ON po.organization_id = o.id
  WHERE om.user_id = p_user_id
    AND om.role = 'owner'
    AND om.status = 'active'
    AND po.organization_id IS NULL
  ORDER BY o.created_at ASC
  LIMIT 1;

  IF v_existing_org_id IS NOT NULL THEN
    INSERT INTO public.workspace_domains (domain, organization_id)
    VALUES (v_domain, v_existing_org_id)
    ON CONFLICT (domain) DO NOTHING;

    IF NOT FOUND THEN
      SELECT d.organization_id INTO v_existing_org_id
      FROM public.workspace_domains d
      WHERE public.normalize_domain(d.domain) = v_domain;
    END IF;

    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    p_organization_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
  VALUES (v_org_id, p_user_id, 'owner', 'active', 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id)
  ON CONFLICT (domain) DO NOTHING;

  SELECT d.organization_id INTO v_existing_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = v_domain;

  IF v_existing_org_id IS NOT NULL AND v_existing_org_id <> v_org_id THEN
    DELETE FROM public.organization_members
    WHERE organization_id = v_org_id;

    DELETE FROM public.organizations
    WHERE id = v_org_id;

    organization_id := v_existing_org_id;
    domain := v_domain;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  organization_id := v_org_id;
  domain := v_domain;
  already_existed := false;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."auto_provision_workspace_organization"("p_user_id" "uuid", "p_domain" "text", "p_organization_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_provision_workspace_organization"("p_user_id" "uuid", "p_domain" "text", "p_organization_name" "text") IS 'Atomically provisions or reuses an owner-managed organization for a Workspace domain without migrating same-domain users by default.';



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



CREATE OR REPLACE FUNCTION "public"."broadcast_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- ===========================================================================
  -- PART A: Realtime broadcast (online/connected users) - UNCHANGED
  -- ===========================================================================
  -- Broadcast a lightweight signal to the user's private channel; clients
  -- refetch the full notification data on receipt to keep payloads small.
  PERFORM realtime.send(
    jsonb_build_object(
      'notification_id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'is_global', NEW.is_global,
      'created_at', NEW.created_at
    ),
    'new_notification',
    'notifications:user:' || NEW.user_id::text,
    true
  );

  -- ===========================================================================
  -- PART B: Push notification enqueue (offline/background users) - REWRITTEN
  -- ===========================================================================
  -- Replaces the prior fire-and-forget net.http_post call to
  -- send-push-notification with a durable enqueue into pgmq. The cron-driven
  -- queue-worker Edge Function (see 20260503140000_schedule_queue_worker.sql)
  -- drains the queue every minute and invokes send-push-notification per
  -- message. Failed deliveries are retried automatically via pgmq's vt.
  --
  -- Payload schema is identical to what the prior pg_net call sent, so
  -- send-push-notification's request handler does not need any changes.
  BEGIN
    PERFORM pgmq_public.send(
      'notifications',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'data', jsonb_build_object(
          'notification_id', NEW.id,
          'type', NEW.type,
          'work_order_id', NEW.data->>'work_order_id',
          'organization_id', NEW.organization_id
        ),
        'url', CASE
          WHEN NEW.data->>'work_order_id' IS NOT NULL
          THEN '/dashboard/work-orders/' || (NEW.data->>'work_order_id')
          ELSE '/dashboard/notifications'
        END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- pgmq enqueue errors should not block the notification insert.
    -- Common causes: pgmq extension not enabled, queue not yet created.
    -- Realtime delivery (PART A) already ran, so connected clients still
    -- see the notification; offline/background users will miss this one
    -- specific event but the next event recovers automatically once pgmq
    -- is healthy. This degraded-mode behavior is intentional per the
    -- Risk & Impact Analysis on the Change Record.
    RAISE WARNING 'pgmq enqueue failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Outer guard: never block the notification insert. The notification row
  -- is what users care about; broadcast/push are best-effort.
  RAISE WARNING 'broadcast_notification failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."broadcast_notification"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."broadcast_notification"() IS 'Trigger function fired on AFTER INSERT ON public.notifications. Broadcasts a real-time signal via realtime.send for online users AND enqueues a durable message into the pgmq notifications queue for offline/background push delivery. The queue-worker Edge Function (cron-driven) drains the queue and invokes send-push-notification. Replaces the prior fire-and-forget net.http_post pattern with durable retry semantics. See migration 20260503150000 and Change Record on issue #722.';



CREATE OR REPLACE FUNCTION "public"."broadcast_ticket_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the ticket owner
  SELECT user_id INTO v_user_id FROM public.tickets WHERE id = NEW.ticket_id;
  IF v_user_id IS NOT NULL THEN
    PERFORM realtime.send(
      jsonb_build_object('ticket_id', NEW.ticket_id, 'comment_id', NEW.id),
      'ticket_update',
      'tickets:user:' || v_user_id::text,
      true
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."broadcast_ticket_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."broadcast_ticket_status_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.updated_at IS DISTINCT FROM NEW.updated_at THEN
    PERFORM realtime.send(
      jsonb_build_object('ticket_id', NEW.id, 'status', NEW.status),
      'ticket_update',
      'tickets:user:' || NEW.user_id::text,
      true
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."broadcast_ticket_status_update"() OWNER TO "postgres";


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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_inventory(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: user cannot manage inventory for this organization'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE id = p_item_id
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Inventory item not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.part_compatibility_rules
  WHERE inventory_item_id = p_item_id;

  IF p_rules IS NOT NULL AND jsonb_array_length(p_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
    LOOP
      v_manufacturer := v_rule->>'manufacturer';
      v_model := v_rule->>'model';

      IF v_manufacturer IS NOT NULL AND trim(v_manufacturer) <> '' THEN
        v_manufacturer_norm := lower(trim(v_manufacturer));

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

        IF v_match_type = 'any'::public.model_match_type THEN
          v_model_norm := NULL;
          v_pattern_raw := NULL;
          v_pattern_norm := NULL;
        ELSIF v_match_type = 'prefix'::public.model_match_type THEN
          v_pattern_raw := trim(v_model);
          v_pattern_norm := lower(v_pattern_raw);
          v_model_norm := v_pattern_norm;
        ELSIF v_match_type = 'wildcard'::public.model_match_type THEN
          v_pattern_raw := trim(v_model);
          v_pattern_norm := lower(replace(v_pattern_raw, '*', '%'));
          v_model_norm := NULL;
        ELSE
          v_model_norm := lower(trim(v_model));
          v_pattern_raw := NULL;
          v_pattern_norm := NULL;
        END IF;

        v_status := COALESCE((v_rule->>'status')::public.verification_status, 'unverified'::public.verification_status);
        v_notes := v_rule->>'notes';

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
          NULLIF(trim(v_model), ''),
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
              (pcr.model_norm IS NULL AND v_model_norm IS NULL)
              OR pcr.model_norm = v_model_norm
            )
        );

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


CREATE OR REPLACE FUNCTION "public"."can_access_inventory"("p_organization_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND status = 'active';

  IF v_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;

  IF public.is_parts_manager(p_organization_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  RETURN public.is_parts_consumer(p_organization_id, p_user_id);
END;
$$;


ALTER FUNCTION "public"."can_access_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_access_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") IS 'Returns TRUE when the user may view inventory, alternate groups, and part lookup for the organization.';



CREATE OR REPLACE FUNCTION "public"."can_access_work_order_costs"("p_work_order_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_orders wo
    WHERE wo.id = p_work_order_id
      AND (
        public.is_org_admin(p_user_id, wo.organization_id)
        OR (
          public.is_org_member(p_user_id, wo.organization_id)
          AND (
            wo.assignee_id = p_user_id
            OR (
              wo.team_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.team_id = wo.team_id
                  AND tm.user_id = p_user_id
                  AND tm.role::text IN ('owner', 'manager', 'technician')
              )
            )
          )
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_access_work_order_costs"("p_work_order_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_access_work_order_costs"("p_work_order_id" "uuid", "p_user_id" "uuid") IS 'True when the user may see or manage cost line items (parts, pricing, labor) for the work order: org owner/admin, the work order assignee, or team owner/manager/technician on the work order''s team. Team requestors/viewers and plain org members are denied — customer-facing roles must stay oblivious to internal costing.';



CREATE OR REPLACE FUNCTION "public"."can_edit_equipment_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_note public.equipment_notes%ROWTYPE;
  v_window_hours integer;
BEGIN
  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = p_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF public.is_org_admin(p_user_id, p_organization_id)
     OR public.is_equipment_team_manager(p_user_id, p_equipment_id) THEN
    RETURN true;
  END IF;

  IF v_note.author_id IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  SELECT COALESCE(o.note_author_edit_window_hours, 24)
  INTO v_window_hours
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  RETURN v_note.created_at + make_interval(hours => v_window_hours) >= now();
END;
$$;


ALTER FUNCTION "public"."can_edit_equipment_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_edit_work_order_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_note public.work_order_notes%ROWTYPE;
  v_window_hours integer;
BEGIN
  SELECT won.* INTO v_note
  FROM public.work_order_notes won
  JOIN public.work_orders wo ON wo.id = won.work_order_id
  WHERE won.id = p_note_id
    AND won.work_order_id = p_work_order_id
    AND wo.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF public.is_org_admin(p_user_id, p_organization_id)
     OR public.is_work_order_team_manager(p_user_id, p_work_order_id) THEN
    RETURN true;
  END IF;

  IF v_note.author_id IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  SELECT COALESCE(o.note_author_edit_window_hours, 24)
  INTO v_window_hours
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  RETURN v_note.created_at + make_interval(hours => v_window_hours) >= now();
END;
$$;


ALTER FUNCTION "public"."can_edit_work_order_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."can_manage_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_organization_id
      AND (
        public.is_org_admin((SELECT auth.uid()), c.organization_id)
        OR EXISTS (
          SELECT 1
          FROM public.teams t
          JOIN public.team_members tm ON tm.team_id = t.id
          WHERE t.customer_id = c.id
            AND t.organization_id = c.organization_id
            AND tm.user_id = (SELECT auth.uid())
            AND tm.role = 'manager'::public.team_member_role
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_manage_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."claim_quickbooks_invoice_status_events"("p_batch_size" integer) RETURNS TABLE("id" "uuid", "organization_id" "uuid", "realm_id" "text", "entity_name" "text", "entity_id" "text", "operation" "text", "attempts" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  WITH picked AS (
    SELECT e.id
    FROM public.quickbooks_invoice_status_events e
    WHERE e.attempts < 5
      AND (
        e.status IN ('pending', 'error')
        OR (
          e.status = 'processing'
          AND e.updated_at < now() - interval '15 minutes'
        )
      )
    ORDER BY e.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_batch_size, 0), 1), 500)
  )
  UPDATE public.quickbooks_invoice_status_events u
  SET
    status = 'processing',
    attempts = u.attempts + 1,
    last_error = NULL
  FROM picked p
  WHERE u.id = p.id
  RETURNING
    u.id,
    u.organization_id,
    u.realm_id,
    u.entity_name,
    u.entity_id,
    u.operation,
    u.attempts;
$$;


ALTER FUNCTION "public"."claim_quickbooks_invoice_status_events"("p_batch_size" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_quickbooks_invoice_status_events"("p_batch_size" integer) IS 'SECURITY DEFINER with SET search_path = empty string for search_path hardening. Claim RPC behavior is defined by the latest applied claim migration. Callable only by service_role.';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_export_results"("p_retention_days" integer DEFAULT 7) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.export_request_log
  SET
    result_url = NULL,
    result_storage_path = NULL
  WHERE job_mode = 'async'
    AND delivery = 'storage'
    AND completed_at IS NOT NULL
    AND completed_at < (now() - make_interval(days => GREATEST(p_retention_days, 1)))
    AND result_storage_path IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_export_results"("p_retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_gws_oauth_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.google_workspace_oauth_sessions
  WHERE expires_at < (now() - interval '1 day');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_gws_oauth_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_gws_oauth_sessions"() IS 'Deletes expired Google Workspace OAuth CSRF sessions older than 1 day.';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_invitations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.organization_invitations
  WHERE status IN ('expired', 'declined')
    AND COALESCE(expired_at, created_at) < (now() - interval '30 days');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_invitations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_invitations"() IS 'Deletes expired or declined invitation records older than 30 days. Minimizes retention of invitee email addresses per data minimization principles.';



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



CREATE OR REPLACE FUNCTION "public"."cleanup_inventory_grants_on_member_removal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.parts_consumers
  WHERE organization_id = OLD.organization_id
    AND user_id = OLD.user_id;

  DELETE FROM public.parts_managers
  WHERE organization_id = OLD.organization_id
    AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."cleanup_inventory_grants_on_member_removal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_departure_queue"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.user_departure_queue
  WHERE status IN ('completed', 'failed')
    AND created_at < (now() - interval '90 days');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_departure_queue"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_departure_queue"() IS 'Removes completed or failed user departure queue entries older than 90 days.';



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
  WHERE created_at < (now() - interval '30 days');
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_notifications"() IS 'Cleans up notifications older than 30 days.';



CREATE OR REPLACE FUNCTION "public"."cleanup_stale_gws_directory_users"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.google_workspace_directory_users
  WHERE last_synced_at < (now() - interval '30 days');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;


ALTER FUNCTION "public"."cleanup_stale_gws_directory_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_stale_gws_directory_users"() IS 'Removes Google Workspace directory user records that have not been refreshed in the last 30 days. Stale entries likely represent departed employees.';



CREATE OR REPLACE FUNCTION "public"."clear_rls_context"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('app.rls_context', '', true);
END;
$$;


ALTER FUNCTION "public"."clear_rls_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_product_onboarding"("p_organization_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.organization_members om
  SET product_onboarding_completed_at = COALESCE(om.product_onboarding_completed_at, NOW())
  WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
    AND om.status = 'active'
    AND om.role IN ('owner', 'admin');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Only active organization owners or admins can complete product onboarding';
  END IF;
END;
$$;


ALTER FUNCTION "public"."complete_product_onboarding"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_product_onboarding"("p_organization_id" "uuid") IS 'Marks product onboarding complete for the current user in the given organization. Idempotent.';



CREATE OR REPLACE FUNCTION "public"."convert_work_order_to_historical"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_work_order public.work_orders%ROWTYPE;
  v_replace_result jsonb;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is required');
  END IF;

  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline events are required');
  END IF;

  SELECT *
  INTO v_work_order
  FROM public.work_orders
  WHERE id = p_work_order_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_work_order.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  IF v_work_order.is_historical THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order is already historical');
  END IF;

  BEGIN
    UPDATE public.work_orders
    SET
      is_historical = true,
      historical_start_date = COALESCE(
        historical_start_date,
        (p_events -> 0 ->> 'changed_at')::timestamptz
      )
    WHERE id = p_work_order_id;

    v_replace_result := public.replace_historical_work_order_timeline(
      p_work_order_id,
      p_organization_id,
      p_events,
      p_skip_audit
    );

    IF COALESCE((v_replace_result ->> 'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = COALESCE(v_replace_result ->> 'error', 'Failed to replace historical timeline');
    END IF;
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      RETURN COALESCE(
        v_replace_result,
        jsonb_build_object('success', false, 'error', 'Failed to replace historical timeline')
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to convert work order to historical'
      );
  END;

  RETURN v_replace_result;
END;
$$;


ALTER FUNCTION "public"."convert_work_order_to_historical"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."convert_work_order_to_historical"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) IS 'Admin-only conversion of an existing operational work order to a historical record with backdated timeline. Issue #1093.';



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



CREATE OR REPLACE FUNCTION "public"."create_google_workspace_oauth_session"("p_organization_id" "uuid" DEFAULT NULL::"uuid", "p_redirect_url" "text" DEFAULT NULL::"text", "p_origin_url" "text" DEFAULT NULL::"text") RETURNS TABLE("session_token" "text", "nonce" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_user_id uuid;
  v_session_token text;
  v_expires_at timestamptz;
  v_nonce text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create OAuth session';
  END IF;

  -- If organization_id provided, verify user is an admin/owner of that org
  -- (for reconnecting existing orgs)
  IF p_organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = p_organization_id
        AND om.user_id = v_user_id
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Only organization administrators can connect Google Workspace';
    END IF;
  END IF;
  -- If no organization_id, allow any authenticated user to start OAuth
  -- The callback will verify they are a Workspace admin and create the org

  v_session_token := encode(gen_random_bytes(32), 'base64');
  v_nonce := encode(gen_random_bytes(16), 'hex');
  v_expires_at := now() + interval '1 hour';

  INSERT INTO public.google_workspace_oauth_sessions (
    session_token,
    organization_id,
    user_id,
    nonce,
    redirect_url,
    origin_url,
    expires_at
  ) VALUES (
    v_session_token,
    p_organization_id,  -- Can be NULL for first-time setup
    v_user_id,
    v_nonce,
    p_redirect_url,
    p_origin_url,
    v_expires_at
  );

  RETURN QUERY SELECT v_session_token, v_nonce, v_expires_at;
END;
$$;


ALTER FUNCTION "public"."create_google_workspace_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_google_workspace_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") IS 'Creates an OAuth session for Google Workspace connection. organization_id is optional for first-time setup.';



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


CREATE OR REPLACE FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text" DEFAULT NULL::"text", "p_assignee_id" "uuid" DEFAULT NULL::"uuid", "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_due_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_completed_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_has_pm" boolean DEFAULT false, "p_pm_status" "text" DEFAULT 'pending'::"text", "p_pm_completion_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_pm_notes" "text" DEFAULT NULL::"text", "p_pm_checklist_data" "jsonb" DEFAULT '[]'::"jsonb", "p_timeline_events" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  work_order_id uuid;
  pm_id uuid;
  result jsonb;
  default_checklist jsonb;
  v_timeline_events jsonb;
  v_replace_result jsonb;
BEGIN
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
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
    team_id,
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
    p_team_id,
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
$$;


ALTER FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb", "p_timeline_events" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb", "p_timeline_events" "jsonb") IS 'Creates a historical work order and initializes its operational timeline from explicit events or a synthesized valid lifecycle chain. Issue #1080.';



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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."external_customer_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "role" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "source_external_id" "text",
    "source_field" "text",
    "last_synced_at" timestamp with time zone,
    "source_payload" "jsonb",
    CONSTRAINT "external_customer_contacts_manual_sync_metadata_null_check" CHECK ((("source" = 'quickbooks'::"text") OR (("source_external_id" IS NULL) AND ("source_field" IS NULL) AND ("last_synced_at" IS NULL) AND ("source_payload" IS NULL)))),
    CONSTRAINT "external_customer_contacts_qbo_source_required_check" CHECK ((("source" = 'manual'::"text") OR (("source_external_id" IS NOT NULL) AND ("source_field" IS NOT NULL)))),
    CONSTRAINT "external_customer_contacts_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'quickbooks'::"text"])))
);


ALTER TABLE "public"."external_customer_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."external_customer_contacts" IS 'External contacts for a customer account — people who do not have EquipQR logins (site managers, billing contacts, dispatchers, etc.).';



COMMENT ON COLUMN "public"."external_customer_contacts"."source" IS 'Origin of this contact row: "manual" (entered in EquipQR) or "quickbooks" (synced from QBO Customer).';



COMMENT ON COLUMN "public"."external_customer_contacts"."source_external_id" IS 'QuickBooks Customer.Id when source = ''quickbooks''; NULL for manual rows.';



COMMENT ON COLUMN "public"."external_customer_contacts"."source_field" IS 'The specific QBO Customer field this row represents (e.g. "primary_email", "primary_phone", "mobile", "fax") when source = ''quickbooks''; NULL for manual rows.';



COMMENT ON COLUMN "public"."external_customer_contacts"."last_synced_at" IS 'Timestamp of the last QBO sync that wrote this row; NULL for manual rows.';



COMMENT ON COLUMN "public"."external_customer_contacts"."source_payload" IS 'Raw QBO Customer JSON snapshot at time of sync for debugging; NULL for manual rows.';



COMMENT ON CONSTRAINT "external_customer_contacts_manual_sync_metadata_null_check" ON "public"."external_customer_contacts" IS 'Manual rows must not carry QuickBooks provenance or sync metadata (source_external_id, source_field, last_synced_at, source_payload).';



CREATE OR REPLACE FUNCTION "public"."create_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_name" "text", "p_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."external_customer_contacts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_row public.external_customer_contacts;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_manage_manual_external_customer_contact(p_organization_id, p_customer_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO public.external_customer_contacts (
    customer_id,
    name,
    email,
    phone,
    role,
    notes,
    source,
    source_external_id,
    source_field,
    last_synced_at,
    source_payload
  )
  VALUES (
    p_customer_id,
    p_name,
    p_email,
    p_phone,
    p_role,
    p_notes,
    'manual',
    NULL,
    NULL,
    NULL,
    NULL
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;


ALTER FUNCTION "public"."create_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_operator_checkin_assignment"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_template_id" "uuid", "p_enabled" boolean DEFAULT true) RETURNS TABLE("settings_id" "uuid", "raw_token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_new_token text;
  v_new_hash text;
  v_settings_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = p_equipment_id
      AND e.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Equipment not found in organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operator_checklist_templates tpl
    WHERE tpl.id = p_template_id
      AND tpl.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Template not found in organization';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  INSERT INTO public.equipment_operator_checkin_settings (
    organization_id,
    equipment_id,
    template_id,
    enabled,
    public_token_hash,
    token_rotated_at,
    token_rotated_by
  )
  VALUES (
    p_organization_id,
    p_equipment_id,
    p_template_id,
    COALESCE(p_enabled, true),
    v_new_hash,
    now(),
    auth.uid()
  )
  RETURNING id INTO v_settings_id;

  INSERT INTO public.operator_checkin_token_secrets (settings_id, organization_id, raw_token)
  VALUES (v_settings_id, p_organization_id, v_new_token);

  settings_id := v_settings_id;
  raw_token := v_new_token;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."create_operator_checkin_assignment"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_template_id" "uuid", "p_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_quick_form"("p_organization_id" "uuid", "p_name" "text", "p_description" "text", "p_form_data" "jsonb") RETURNS TABLE("quick_form_id" "uuid", "raw_token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_new_token text;
  v_new_hash text;
  v_form_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Form name is required';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  INSERT INTO public.quick_forms (
    organization_id,
    name,
    description,
    form_data,
    is_active,
    public_token_hash,
    token_rotated_at,
    token_rotated_by,
    created_by
  )
  VALUES (
    p_organization_id,
    trim(p_name),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    COALESCE(p_form_data, '{"fields":[]}'::jsonb),
    true,
    v_new_hash,
    now(),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_form_id;

  INSERT INTO public.quick_form_token_secrets (quick_form_id, organization_id, raw_token)
  VALUES (v_form_id, p_organization_id, v_new_token);

  quick_form_id := v_form_id;
  raw_token := v_new_token;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."create_quick_form"("p_organization_id" "uuid", "p_name" "text", "p_description" "text", "p_form_data" "jsonb") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."create_workspace_organization_for_domain"("p_domain" "text", "p_organization_name" "text") RETURNS TABLE("organization_id" "uuid", "domain" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_domain text;
  v_org_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  v_domain := public.normalize_domain(p_domain);

  -- Block consumer domains
  IF v_domain IN ('gmail.com', 'googlemail.com') THEN
    RAISE EXCEPTION 'Consumer domains are not supported';
  END IF;

  -- Check if domain already claimed
  IF EXISTS (
    SELECT 1 FROM public.workspace_domains d
    WHERE public.normalize_domain(d.domain) = v_domain
  ) THEN
    RAISE EXCEPTION 'Domain already claimed';
  END IF;

  -- Create the organization
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
  VALUES (v_org_id, v_user_id, 'owner', 'active')
  ON CONFLICT DO NOTHING;

  -- Create workspace_domains entry
  INSERT INTO public.workspace_domains (domain, organization_id)
  VALUES (v_domain, v_org_id);

  organization_id := v_org_id;
  domain := v_domain;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."create_workspace_organization_for_domain"("p_domain" "text", "p_organization_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_workspace_organization_for_domain"("p_domain" "text", "p_organization_name" "text") IS 'Creates a new organization for a Google Workspace domain. Called after Workspace admin verification in OAuth callback.';



CREATE OR REPLACE FUNCTION "public"."delete_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.equipment_notes%ROWTYPE;
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

  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = p_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id
  FOR UPDATE OF en;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_equipment_team_manager(v_user_id, p_equipment_id)
    OR v_note.author_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects o
  USING public.equipment_note_images ei
  WHERE ei.equipment_note_id = p_note_id
    AND o.bucket_id = 'equipment-note-images'
    AND o.name = ei.file_url
    AND public.storage_object_path_segment_uuid(o.name, 1) = ei.uploaded_by
    AND public.storage_object_path_segment_uuid(o.name, 2) = p_equipment_id
    AND public.storage_object_path_segment_uuid(o.name, 3) = p_note_id;

  DELETE FROM public.equipment_note_images WHERE equipment_note_id = p_note_id;
  DELETE FROM public.equipment_notes WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'equipment',
    p_equipment_id,
    (SELECT e.name FROM public.equipment e WHERE e.id = p_equipment_id),
    'DELETE',
    jsonb_build_object('note_content', v_note.content),
    jsonb_build_object('note_id', p_note_id, 'source', 'equipment_note_delete')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete note: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."delete_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") IS 'Delete equipment note with role checks and audit logging. Issue #1185.';



CREATE OR REPLACE FUNCTION "public"."delete_equipment_note_image_audited"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_image_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_image public.equipment_note_images%ROWTYPE;
  v_note public.equipment_notes%ROWTYPE;
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

  SELECT ei.* INTO v_image
  FROM public.equipment_note_images ei
  JOIN public.equipment_notes en ON en.id = ei.equipment_note_id
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE ei.id = p_image_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id
  FOR UPDATE OF ei;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Image not found');
  END IF;

  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = v_image.equipment_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_equipment_team_manager(v_user_id, p_equipment_id)
    OR public.can_edit_equipment_note(v_user_id, p_organization_id, p_equipment_id, v_note.id)
    OR v_image.uploaded_by = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'equipment-note-images'
    AND name = v_image.file_url
    AND public.storage_object_path_segment_uuid(name, 1) = v_image.uploaded_by
    AND public.storage_object_path_segment_uuid(name, 2) = p_equipment_id
    AND public.storage_object_path_segment_uuid(name, 3) = v_image.equipment_note_id;

  DELETE FROM public.equipment_note_images WHERE id = p_image_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'equipment',
    p_equipment_id,
    (SELECT e.name FROM public.equipment e WHERE e.id = p_equipment_id),
    'DELETE',
    jsonb_build_object('image_file_name', v_image.file_name),
    jsonb_build_object('note_id', v_note.id, 'image_id', p_image_id, 'source', 'equipment_note_image_delete')
  );

  RETURN jsonb_build_object('success', true, 'image_id', p_image_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete image: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."delete_equipment_note_image_audited"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_image_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_org_id uuid;
  v_source text;
  v_source_external_id text;
  v_source_field text;
  v_customer_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    ecc.customer_id,
    ecc.source,
    ecc.source_external_id,
    ecc.source_field,
    c.organization_id
  INTO
    v_customer_id,
    v_source,
    v_source_external_id,
    v_source_field,
    v_org_id
  FROM public.external_customer_contacts ecc
  JOIN public.customers c ON c.id = ecc.customer_id
  WHERE ecc.id = p_contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  IF v_org_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF public.is_org_admin((SELECT auth.uid()), v_org_id) THEN
    NULL;
  ELSIF v_source = 'manual'
    AND v_source_external_id IS NULL
    AND v_source_field IS NULL
    AND public.can_manage_manual_external_customer_contact(p_organization_id, v_customer_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM public.external_customer_contacts WHERE id = p_contact_id;
END;
$$;


ALTER FUNCTION "public"."delete_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_operator_checklist_template"("p_template_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_disabled_count integer;
  v_has_submissions boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.operator_checklist_templates
  WHERE id = p_template_id
  FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.operator_checkin_submissions
    WHERE template_id = p_template_id
      AND organization_id = v_org_id
  ) INTO v_has_submissions;

  IF NOT v_has_submissions THEN
    DELETE FROM public.equipment_operator_checkin_settings
    WHERE template_id = p_template_id
      AND organization_id = v_org_id;

    DELETE FROM public.operator_checklist_templates
    WHERE id = p_template_id
      AND organization_id = v_org_id;

    RETURN -1;
  END IF;

  UPDATE public.equipment_operator_checkin_settings
  SET enabled = false,
      updated_at = now()
  WHERE template_id = p_template_id
    AND organization_id = v_org_id
    AND enabled = true;

  GET DIAGNOSTICS v_disabled_count = ROW_COUNT;

  UPDATE public.operator_checklist_templates
  SET is_active = false,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_template_id
    AND organization_id = v_org_id;

  RETURN v_disabled_count;
END;
$$;


ALTER FUNCTION "public"."delete_operator_checklist_template"("p_template_id" "uuid") OWNER TO "postgres";


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
      
      -- Register as personal organization
      INSERT INTO personal_organizations (user_id, organization_id)
      VALUES (v_current_user_id, v_new_org_id)
      ON CONFLICT (user_id) DO UPDATE SET organization_id = v_new_org_id;
      
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES (v_new_org_id, v_current_user_id, 'owner', 'active');
    END;
  END IF;
  
  -- Log the deletion before we delete (this audit entry will have NULL org_id after delete)
  INSERT INTO audit_log (
    organization_id,
    entity_type,
    entity_id,
    entity_name,
    action,
    actor_id,
    changes,
    metadata
  ) VALUES (
    p_organization_id,
    'organization',
    p_organization_id,
    v_org_name,
    'DELETE',
    v_current_user_id,
    jsonb_build_object(
      'equipment_deleted', v_equipment_count,
      'work_orders_deleted', v_work_order_count,
      'members_removed', v_member_count + 1  -- +1 for owner
    ),
    jsonb_build_object(
      'deleted_by', v_current_user_id,
      'force', p_force
    )
  );
  
  -- Delete the organization (CASCADE handles related data)
  -- Audit log entries will have organization_id set to NULL (SET NULL constraint)
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


COMMENT ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) IS 'Deletes an organization and all its data. Audit logs are preserved with NULL organization_id for regulatory compliance.';



CREATE OR REPLACE FUNCTION "public"."delete_work_order_cascade"("p_work_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.work_orders
  WHERE id = p_work_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.work_orders
  SET primary_image_id = NULL
  WHERE id = p_work_order_id;

  BEGIN
    DELETE FROM storage.objects o
    USING public.work_order_images wi
    WHERE wi.work_order_id = p_work_order_id
      AND o.bucket_id = 'work-order-images'
      AND o.name = wi.file_url
      AND (storage.foldername(o.name))[2] = p_work_order_id::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'delete_work_order_cascade storage cleanup failed for %: %',
      p_work_order_id, SQLERRM;
  END;

  DELETE FROM public.work_order_images WHERE work_order_id = p_work_order_id;
  DELETE FROM public.preventative_maintenance WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_notes WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_costs WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_status_history WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_equipment WHERE work_order_id = p_work_order_id;
  DELETE FROM public.quickbooks_export_logs WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_orders WHERE id = p_work_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', p_work_order_id,
    'organization_id', v_org_id
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'delete_work_order_cascade failed for %: %', p_work_order_id, SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', 'Deletion failed');
END;
$$;


ALTER FUNCTION "public"."delete_work_order_cascade"("p_work_order_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_work_order_cascade"("p_work_order_id" "uuid") IS 'Permanently deletes a work order, related rows, and storage objects. Org owners/admins only. Storage cleanup is best-effort and scoped to objects under the work order folder.';



CREATE OR REPLACE FUNCTION "public"."delete_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.work_order_notes%ROWTYPE;
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

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_work_order_team_manager(v_user_id, p_work_order_id)
    OR v_note.author_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects o
  USING public.work_order_images wi
  WHERE wi.note_id = p_note_id
    AND wi.work_order_id = p_work_order_id
    AND o.bucket_id = 'work-order-images'
    AND o.name = wi.file_url
    AND public.storage_object_path_segment_uuid(o.name, 1) = wi.uploaded_by
    AND public.storage_object_path_segment_uuid(o.name, 2) = p_work_order_id
    AND public.storage_object_path_segment_uuid(o.name, 3) = p_note_id;

  DELETE FROM public.work_order_images
  WHERE note_id = p_note_id AND work_order_id = p_work_order_id;

  DELETE FROM public.work_order_notes WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'work_order',
    p_work_order_id,
    (SELECT wo.title FROM public.work_orders wo WHERE wo.id = p_work_order_id),
    'DELETE',
    jsonb_build_object('note_content', v_note.content),
    jsonb_build_object('note_id', p_note_id, 'source', 'work_order_note_delete')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete note: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."delete_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") IS 'Delete work order note with role checks and audit logging. Issue #1185.';



CREATE OR REPLACE FUNCTION "public"."delete_work_order_note_image_audited"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_image_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_image public.work_order_images%ROWTYPE;
  v_note_id uuid;
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

  SELECT wi.* INTO v_image
  FROM public.work_order_images wi
  JOIN public.work_orders wo ON wo.id = wi.work_order_id
  WHERE wi.id = p_image_id
    AND wi.work_order_id = p_work_order_id
    AND wo.organization_id = p_organization_id
  FOR UPDATE OF wi;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Image not found');
  END IF;

  v_note_id := v_image.note_id;

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_work_order_team_manager(v_user_id, p_work_order_id)
    OR (v_note_id IS NOT NULL AND public.can_edit_work_order_note(v_user_id, p_organization_id, p_work_order_id, v_note_id))
    OR v_image.uploaded_by = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'work-order-images'
    AND name = v_image.file_url
    AND public.storage_object_path_segment_uuid(name, 1) = v_image.uploaded_by
    AND public.storage_object_path_segment_uuid(name, 2) = p_work_order_id
    AND (v_note_id IS NULL OR public.storage_object_path_segment_uuid(name, 3) = v_note_id);

  DELETE FROM public.work_order_images WHERE id = p_image_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'work_order',
    p_work_order_id,
    (SELECT wo.title FROM public.work_orders wo WHERE wo.id = p_work_order_id),
    'DELETE',
    jsonb_build_object('image_file_name', v_image.file_name),
    jsonb_build_object('note_id', v_note_id, 'image_id', p_image_id, 'source', 'work_order_note_image_delete')
  );

  RETURN jsonb_build_object('success', true, 'image_id', p_image_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete image: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."delete_work_order_note_image_audited"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_image_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."disconnect_google_workspace"("p_organization_id" "uuid", "p_also_unclaim_domain" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_domain text;
  v_credentials_deleted int := 0;
  v_domain_unclaimed int := 0;
  v_directory_users_deleted int := 0;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_user_id
    AND status = 'active';

  IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Must be organization owner or admin to disconnect Google Workspace';
  END IF;

  SELECT domain INTO v_domain
  FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id
  LIMIT 1;

  DELETE FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_credentials_deleted = ROW_COUNT;

  DELETE FROM public.google_workspace_directory_users
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_directory_users_deleted = ROW_COUNT;

  DELETE FROM public.workspace_domains
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_domain_unclaimed = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'credentials_deleted', v_credentials_deleted,
    'directory_users_deleted', v_directory_users_deleted,
    'domain_unclaimed', v_domain_unclaimed,
    'domain', v_domain
  );
END;
$$;


ALTER FUNCTION "public"."disconnect_google_workspace"("p_organization_id" "uuid", "p_also_unclaim_domain" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."disconnect_google_workspace"("p_organization_id" "uuid", "p_also_unclaim_domain" boolean) IS 'Disconnects Google Workspace OAuth credentials, directory cache, and releases the workspace domain claim. p_also_unclaim_domain is deprecated and ignored (retained for deploy compatibility).';



CREATE OR REPLACE FUNCTION "public"."disconnect_google_workspace_internal"("p_organization_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_domain text;
  v_credentials_deleted int := 0;
  v_directory_users_deleted int := 0;
  v_domain_unclaimed int := 0;
BEGIN
  SELECT domain INTO v_domain
  FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id
  LIMIT 1;

  DELETE FROM public.google_workspace_credentials
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_credentials_deleted = ROW_COUNT;

  DELETE FROM public.google_workspace_directory_users
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_directory_users_deleted = ROW_COUNT;

  DELETE FROM public.workspace_domains
  WHERE organization_id = p_organization_id;
  GET DIAGNOSTICS v_domain_unclaimed = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'credentials_deleted', v_credentials_deleted,
    'directory_users_deleted', v_directory_users_deleted,
    'domain_unclaimed', v_domain_unclaimed,
    'domain', v_domain
  );
END;
$$;


ALTER FUNCTION "public"."disconnect_google_workspace_internal"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."disconnect_google_workspace_internal"("p_organization_id" "uuid") IS 'Service-role Google Workspace disconnect without membership checks. Deletes credentials, directory cache, and releases domain claim atomically.';



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



CREATE OR REPLACE FUNCTION "public"."enforce_manual_external_contact_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.source = 'manual' THEN
    NEW.source_external_id := NULL;
    NEW.source_field := NULL;
    NEW.last_synced_at := NULL;
    NEW.source_payload := NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_manual_external_contact_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_scan_location_privacy"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.equipment e
      JOIN public.organizations o ON o.id = e.organization_id
      WHERE e.id = NEW.equipment_id
        AND o.scan_location_collection_enabled = false
    ) THEN
      NEW.location := NULL;
      RETURN NEW;
    END IF;

    IF NEW.scanned_by IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = NEW.scanned_by
        AND p.limit_sensitive_pi = true
    ) THEN
      NEW.location := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_scan_location_privacy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_work_order_primary_image_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.primary_image_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.work_order_images image
    WHERE image.id = NEW.primary_image_id
      AND image.work_order_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'primary_image_id must reference an image attached to the same work order'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_work_order_primary_image_match"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_work_order_primary_image_match"() IS 'Validates work_orders.primary_image_id so it can only point at a work_order_images row for the same work order.';



CREATE OR REPLACE FUNCTION "public"."enqueue_export_job"("p_organization_id" "uuid", "p_report_type" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_log_id uuid;
  v_msg_id bigint;
  v_allowed boolean;
  v_is_admin boolean;
  v_team_ids uuid[];
  v_client_team_ids uuid[];
  v_sanitized_payload jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_org_member(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: not an active organization member'
      USING ERRCODE = '42501';
  END IF;

  IF p_report_type NOT IN ('equipment', 'work-orders') THEN
    RAISE EXCEPTION 'Unsupported async report type: %', p_report_type
      USING ERRCODE = '22023';
  END IF;

  v_is_admin := public.is_org_admin(v_user_id, p_organization_id);

  IF p_report_type = 'equipment' AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: organization admin required for equipment export'
      USING ERRCODE = '42501';
  END IF;

  v_sanitized_payload := COALESCE(p_payload, '{}'::jsonb);

  IF p_report_type = 'work-orders' THEN
    IF v_is_admin THEN
      -- Admins may omit accessibleTeamIds (org-wide) or pass an explicit list.
      -- Do not invent a team list; strip only non-array junk.
      IF jsonb_typeof(v_sanitized_payload -> 'accessibleTeamIds') = 'array' THEN
        SELECT COALESCE(array_agg(value::uuid), ARRAY[]::uuid[])
        INTO v_client_team_ids
        FROM jsonb_array_elements_text(v_sanitized_payload -> 'accessibleTeamIds') AS value
        WHERE value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        v_sanitized_payload := jsonb_set(
          v_sanitized_payload,
          '{accessibleTeamIds}',
          to_jsonb(v_client_team_ids),
          true
        );
      ELSE
        v_sanitized_payload := v_sanitized_payload - 'accessibleTeamIds';
      END IF;
    ELSE
      -- Non-admins: derive requestor/viewer team scope from memberships; never trust payload.
      SELECT COALESCE(array_agg(tm.team_id), ARRAY[]::uuid[])
      INTO v_team_ids
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = v_user_id
        AND t.organization_id = p_organization_id
        AND tm.role IN (
          'requestor'::public.team_member_role,
          'viewer'::public.team_member_role
        );

      IF jsonb_typeof(v_sanitized_payload -> 'accessibleTeamIds') = 'array' THEN
        SELECT COALESCE(array_agg(value::uuid), ARRAY[]::uuid[])
        INTO v_client_team_ids
        FROM jsonb_array_elements_text(v_sanitized_payload -> 'accessibleTeamIds') AS value
        WHERE value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        v_team_ids := ARRAY(
          SELECT unnest(v_team_ids)
          INTERSECT
          SELECT unnest(v_client_team_ids)
        );
      END IF;

      IF cardinality(v_team_ids) = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'code', 'forbidden',
          'error', 'Access denied: no team-scoped work order export permission'
        );
      END IF;

      v_sanitized_payload := jsonb_set(
        v_sanitized_payload,
        '{accessibleTeamIds}',
        to_jsonb(v_team_ids),
        true
      );
    END IF;
  END IF;

  SELECT public.check_export_rate_limit(v_user_id, p_organization_id) INTO v_allowed;
  IF NOT COALESCE(v_allowed, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'rate_limited',
      'error', 'Rate limit exceeded. Please wait before requesting another export.'
    );
  END IF;

  INSERT INTO public.export_request_log (
    user_id,
    organization_id,
    report_type,
    row_count,
    status,
    job_mode,
    delivery,
    request_payload
  ) VALUES (
    v_user_id,
    p_organization_id,
    p_report_type,
    0,
    'pending',
    'async',
    'storage',
    v_sanitized_payload
  )
  RETURNING id INTO v_log_id;

  SELECT msg_id INTO v_msg_id
  FROM pgmq_public.send(
    'exports',
    jsonb_build_object(
      'export_log_id', v_log_id,
      'organization_id', p_organization_id,
      'user_id', v_user_id,
      'report_type', p_report_type
    ),
    0
  )
  LIMIT 1;

  UPDATE public.export_request_log
  SET pgmq_msg_id = v_msg_id
  WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'jobId', v_log_id,
    'status', 'pending',
    'pgmqMsgId', v_msg_id
  );
END;
$_$;


ALTER FUNCTION "public"."enqueue_export_job"("p_organization_id" "uuid", "p_report_type" "text", "p_payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enqueue_export_job"("p_organization_id" "uuid", "p_report_type" "text", "p_payload" "jsonb") IS 'Creates an async export_request_log row and enqueues a pgmq exports message; sanitizes work-order team scope from DB memberships (#1193/#1205).';



CREATE OR REPLACE FUNCTION "public"."ensure_operator_template_active_for_enabled_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.enabled = true THEN
    UPDATE public.operator_checklist_templates
    SET is_active = true,
        updated_at = now()
    WHERE id = NEW.template_id
      AND organization_id = NEW.organization_id
      AND is_active = false;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_operator_template_active_for_enabled_assignment"() OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."export_equipment_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[] DEFAULT ARRAY['name'::"text", 'manufacturer'::"text", 'model'::"text", 'serial_number'::"text", 'status'::"text", 'location'::"text", 'team_name'::"text"], "p_status" "text" DEFAULT NULL::"text", "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_location" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50000) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50000), 1), 50000);
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

  -- Equipment CSV is admin-console only (matches export-report gate).
  IF NOT public.is_org_admin((SELECT auth.uid()), p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: organization admin required for equipment export'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(shaped)::jsonb ORDER BY shaped.name), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      e.id,
      e.name,
      e.manufacturer,
      e.model,
      e.serial_number,
      e.status,
      e.location,
      t.name AS team_name,
      e.installation_date,
      e.last_maintenance,
      e.working_hours,
      e.warranty_expiration,
      e.notes,
      e.created_at,
      e.custom_attributes
    FROM public.equipment e
    LEFT JOIN public.teams t ON t.id = e.team_id
    WHERE e.organization_id = p_organization_id
      AND (p_status IS NULL OR e.status = p_status)
      AND (p_team_id IS NULL OR e.team_id = p_team_id)
      AND (p_location IS NULL OR e.location ILIKE '%' || p_location || '%')
    ORDER BY e.name
    LIMIT v_limit
  ) shaped;

  -- Return only requested columns (+ id for URL building) to cut egress.
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
$$;


ALTER FUNCTION "public"."export_equipment_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_location" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."export_equipment_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_location" "text", "p_limit" integer) IS 'Returns pre-shaped equipment export rows as JSONB with only requested columns (#1193).';



CREATE OR REPLACE FUNCTION "public"."export_work_orders_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[] DEFAULT ARRAY['title'::"text", 'status'::"text", 'priority'::"text", 'assignee_name'::"text", 'team_name'::"text", 'equipment_name'::"text", 'created_date'::"text"], "p_status" "text" DEFAULT NULL::"text", "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_priority" "text" DEFAULT NULL::"text", "p_date_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_date_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_accessible_team_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_limit" integer DEFAULT 50000) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    LEFT JOIN public.teams t ON t.id = wo.team_id
    LEFT JOIN public.equipment eq ON eq.id = wo.equipment_id
    WHERE wo.organization_id = p_organization_id
      AND wo.equipment_id IS NOT NULL
      AND (v_team_ids IS NULL OR wo.team_id = ANY (v_team_ids))
      AND (p_status IS NULL OR wo.status = p_status)
      AND (p_team_id IS NULL OR wo.team_id = p_team_id)
      AND (p_priority IS NULL OR wo.priority = p_priority)
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
$$;


ALTER FUNCTION "public"."export_work_orders_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_priority" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_accessible_team_ids" "uuid"[], "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."export_work_orders_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_priority" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_accessible_team_ids" "uuid"[], "p_limit" integer) IS 'Returns pre-shaped work-order export rows as JSONB with only requested columns; enforces admin vs team scope (#1193).';



CREATE OR REPLACE FUNCTION "public"."fulfill_dsr_deletion"("p_dsr_request_id" "uuid", "p_admin_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_dsr record;
  v_admin_email text;
  v_step_count integer := 0;
  v_rows integer;
  v_results jsonb := '[]'::jsonb;
  v_prep jsonb;
BEGIN
  SELECT * INTO v_dsr
  FROM public.dsr_requests
  WHERE id = p_dsr_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DSR request not found: %', p_dsr_request_id;
  END IF;

  IF v_dsr.status != 'processing' THEN
    RAISE EXCEPTION 'DSR request must be in processing state, current: %', v_dsr.status;
  END IF;

  IF v_dsr.request_type != 'deletion' THEN
    RAISE EXCEPTION 'Fulfillment engine only handles deletion requests, got: %', v_dsr.request_type;
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_admin_user_id;

  -- Step 1: Anonymize audit log entries (email redaction)
  SELECT public.anonymize_audit_log_for_user(v_dsr.requester_email) INTO v_rows;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'audit_log', 'action', 'anonymized', 'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Audit log entries anonymized',
    jsonb_build_object('domain', 'audit_log', 'rows_anonymized', v_rows)
  );

  -- Step 2: SQL prep via prepare_account_deletion when user_id is known
  IF v_dsr.user_id IS NOT NULL THEN
    v_prep := public.prepare_account_deletion(v_dsr.user_id, p_dsr_request_id, p_admin_user_id);
    v_step_count := v_step_count + 1;
    v_results := v_results || jsonb_build_object(
      'step', v_step_count,
      'domain', 'account_deletion_prep',
      'action', 'prepared',
      'details', v_prep
    );
  ELSE
    -- Email-only DSR without linked auth user
    DELETE FROM public.organization_invitations WHERE email = v_dsr.requester_email;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_step_count := v_step_count + 1;
    v_results := v_results || jsonb_build_object(
      'step', v_step_count, 'domain', 'organization_invitations', 'action', 'deleted', 'rows_affected', v_rows
    );
    INSERT INTO public.dsr_request_events (
      dsr_request_id, event_type, actor_id, actor_email, summary, details
    ) VALUES (
      p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
      'Invitation records deleted',
      jsonb_build_object('domain', 'organization_invitations', 'rows_deleted', v_rows)
    );
  END IF;

  -- Step 3: export_request_log cleanup by user_id or org scope when unlinked
  IF v_dsr.user_id IS NOT NULL THEN
    DELETE FROM public.export_request_log WHERE user_id = v_dsr.user_id;
  ELSIF v_dsr.organization_id IS NOT NULL THEN
    DELETE FROM public.export_request_log
    WHERE organization_id = v_dsr.organization_id
      AND user_id IS NULL;
  END IF;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'export_request_log', 'action', 'deleted', 'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Export request log records deleted',
    jsonb_build_object('domain', 'export_request_log', 'rows_deleted', v_rows)
  );

  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'All automated SQL fulfillment steps completed',
    jsonb_build_object(
      'total_steps', v_step_count,
      'results', v_results,
      'note', 'Storage cleanup and Auth user deletion require delete-account edge function or manual operator steps.'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'steps_executed', v_step_count,
    'results', v_results,
    'requires_storage_and_auth_completion', v_dsr.user_id IS NOT NULL
  );
END;
$$;


ALTER FUNCTION "public"."fulfill_dsr_deletion"("p_dsr_request_id" "uuid", "p_admin_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fulfill_dsr_deletion"("p_dsr_request_id" "uuid", "p_admin_user_id" "uuid") IS 'Executes deletion/anonymization for verified DSR deletion requests. Uses prepare_account_deletion for linked auth users and export_request_log (not export_logs). Storage API cleanup and Auth deletion are completed outside this RPC.';



CREATE OR REPLACE FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") RETURNS TABLE("group_id" "uuid", "group_name" "text", "group_status" "public"."verification_status", "group_verified" boolean, "group_notes" "text", "identifier_id" "uuid", "identifier_type" "public"."part_identifier_type", "identifier_value" "text", "identifier_manufacturer" "text", "inventory_item_id" "uuid", "inventory_name" "text", "inventory_sku" "text", "quantity_on_hand" integer, "low_stock_threshold" integer, "default_unit_cost" numeric, "location" "text", "image_url" "text", "is_in_stock" boolean, "is_low_stock" boolean, "is_primary" boolean, "is_source_item" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  RETURN QUERY
  WITH item_groups AS (
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    WHERE pagm.inventory_item_id = p_inventory_item_id

    UNION

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
  WHERE pag.organization_id = p_organization_id;
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
  PERFORM public.assert_inventory_read_access(p_organization_id);

  v_norm_value := lower(trim(p_part_number));
  v_search_pattern := v_norm_value || '%';

  IF v_norm_value IS NULL OR v_norm_value = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matching_identifiers AS (
    SELECT pi.id AS matched_id
    FROM public.part_identifiers pi
    WHERE pi.organization_id = p_organization_id
      AND (pi.norm_value = v_norm_value OR pi.norm_value ILIKE v_search_pattern)
  ),
  matching_groups AS (
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN matching_identifiers mi ON pagm.part_identifier_id = mi.matched_id

    UNION

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
  direct_inventory_matches AS (
    SELECT
      NULL::UUID AS group_id,
      'Direct Match (No Alternates Defined)'::TEXT AS group_name,
      'unverified'::public.verification_status AS group_status,
      FALSE AS group_verified,
      NULL::TEXT AS group_notes,
      NULL::UUID AS identifier_id,
      NULL::public.part_identifier_type AS identifier_type,
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
      TRUE AS is_primary,
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
      AND NOT EXISTS (
        SELECT 1 FROM public.part_alternate_group_members pagm
        WHERE pagm.inventory_item_id = ii.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.part_identifiers pi
        INNER JOIN public.part_alternate_group_members pagm ON pagm.part_identifier_id = pi.id
        WHERE pi.inventory_item_id = ii.id
      )
  ),
  combined_results AS (
    SELECT * FROM group_results
    UNION ALL
    SELECT * FROM direct_inventory_matches
  )
  SELECT * FROM combined_results cr
  ORDER BY
    cr.group_name NULLS LAST,
    cr.is_primary DESC,
    cr.is_in_stock DESC,
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


CREATE OR REPLACE FUNCTION "public"."get_audit_log_timeline"("p_organization_id" "uuid", "p_bucket" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_entity_type" "text" DEFAULT NULL::"text", "p_action" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("bucket" timestamp with time zone, "action" "text", "count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Whitelist the bucket unit. Prevents arbitrary date_trunc units from
  -- being passed in via the RPC parameter, which would otherwise widen
  -- the attack surface beyond what the histogram needs.
  IF p_bucket NOT IN ('minute', 'hour', 'day') THEN
    RAISE EXCEPTION 'invalid bucket: %, must be one of minute, hour, day', p_bucket
      USING ERRCODE = '22023';
  END IF;

  -- Owner/admin guard (issue #1122). Mirrors the audit_log SELECT policy.
  -- SECURITY DEFINER bypasses RLS, so the access check must be
  -- re-implemented here.
  IF NOT public.is_org_admin((SELECT auth.uid()), p_organization_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc(p_bucket, al.created_at) AS bucket,
    al.action,
    count(*)::BIGINT AS count
  FROM public.audit_log al
  WHERE al.organization_id = p_organization_id
    AND al.created_at >= p_date_from
    AND al.created_at < p_date_to
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
    AND (
      p_search IS NULL
      OR al.entity_name ILIKE '%' || p_search || '%'
      OR al.actor_name ILIKE '%' || p_search || '%'
    )
  GROUP BY 1, 2
  ORDER BY 1;
END;
$$;


ALTER FUNCTION "public"."get_audit_log_timeline"("p_organization_id" "uuid", "p_bucket" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_entity_type" "text", "p_action" "text", "p_actor_id" "uuid", "p_search" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_audit_log_timeline"("p_organization_id" "uuid", "p_bucket" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_entity_type" "text", "p_action" "text", "p_actor_id" "uuid", "p_search" "text") IS 'Aggregates audit_log entries into time buckets (minute / hour / day) for the organization audit log timeline histogram. Access is restricted to active org owners/admins via is_org_admin because audit data is sensitive high-privilege information (issue #1122); the check is inline because SECURITY DEFINER bypasses RLS. The bucket parameter is whitelisted to prevent arbitrary date_trunc unit injection. Issues #641 / #1122.';



CREATE OR REPLACE FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) RETURNS TABLE("inventory_item_id" "uuid", "name" "text", "sku" "text", "external_id" "text", "quantity_on_hand" integer, "low_stock_threshold" integer, "default_unit_cost" numeric, "location" "text", "image_url" "text", "match_type" "text", "has_alternates" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  IF p_equipment_ids IS NULL OR array_length(p_equipment_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH compatible_parts AS (
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
        pcr.match_type = 'any'
        OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
        OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
        OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
        OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
      )
    JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
      AND ii.organization_id = p_organization_id
    WHERE e.id = ANY(p_equipment_ids)
      AND e.organization_id = p_organization_id
  ),
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
  SELECT
    pwa.inv_item_id,
    pwa.item_name,
    pwa.item_sku,
    pwa.item_external_id,
    pwa.item_qty,
    pwa.item_threshold,
    pwa.item_cost,
    pwa.item_location,
    pwa.item_image,
    pwa.item_match_type,
    pwa.item_has_alternates
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
  PERFORM public.assert_inventory_read_access(p_organization_id);

  v_mfr_norm := lower(trim(COALESCE(p_manufacturer, '')));
  v_model_norm := lower(trim(COALESCE(p_model, '')));

  IF v_mfr_norm = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ii.id,
    ii.name,
    ii.sku,
    ii.external_id,
    ii.quantity_on_hand,
    ii.low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    'rule'::TEXT,
    pcr.match_type,
    pcr.status,
    (ii.quantity_on_hand > 0),
    (pcr.status = 'verified')
  FROM public.part_compatibility_rules pcr
  JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE pcr.manufacturer_norm = v_mfr_norm
    AND (
      pcr.match_type = 'any'
      OR (pcr.match_type = 'exact' AND (v_model_norm = '' OR pcr.model_norm = v_model_norm))
      OR (pcr.match_type = 'prefix' AND v_model_norm <> '' AND v_model_norm LIKE (pcr.model_pattern_norm || '%'))
      OR (pcr.match_type = 'wildcard' AND v_model_norm <> '' AND v_model_norm LIKE pcr.model_pattern_norm)
      OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
    )
  ORDER BY
    (pcr.status = 'verified') DESC,
    (ii.quantity_on_hand > 0) DESC,
    ii.default_unit_cost ASC NULLS LAST,
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



CREATE OR REPLACE FUNCTION "public"."get_dashboard_trends"("p_org_id" "uuid", "p_days" integer DEFAULT 7, "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_unassigned" boolean DEFAULT false) RETURNS TABLE("total_equipment_series" integer[], "total_equipment_delta" integer, "total_equipment_direction" "text", "overdue_work_series" integer[], "overdue_work_delta" integer, "overdue_work_direction" "text", "total_work_orders_series" integer[], "total_work_orders_delta" integer, "total_work_orders_direction" "text", "needs_attention_series" integer[], "needs_attention_delta" integer, "needs_attention_direction" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_days integer := GREATEST(LEAST(COALESCE(p_days, 7), 90), 2);
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_window_start date := v_today - (v_days - 1);
  v_prior_end date := v_window_start - 1;
  v_prior_start date := v_prior_end - (v_days - 1);
BEGIN
  IF NOT public.is_org_member(auth.uid(), p_org_id) THEN
    RAISE EXCEPTION 'Not a member of organization %', p_org_id
      USING ERRCODE = '42501';
  END IF;

  IF p_unassigned AND p_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'p_unassigned and p_team_id are mutually exclusive'
      USING ERRCODE = '22023';
  END IF;

  IF p_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = p_team_id AND t.organization_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'Team % is not in organization %', p_team_id, p_org_id
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN QUERY
  WITH
  request_context AS (
    SELECT
      auth.uid() AS user_id,
      public.is_org_admin(auth.uid(), p_org_id) AS is_org_admin
  ),
  accessible_team_ids AS (
    SELECT tm.team_id
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN request_context rc ON true
    WHERE tm.user_id = rc.user_id
      AND t.organization_id = p_org_id
  ),
  accessible_equipment AS (
    SELECT e.id, e.status, e.created_at::date AS created_day
    FROM public.equipment e
    JOIN request_context rc ON true
    WHERE e.organization_id = p_org_id
      AND (
        rc.is_org_admin
        OR (
          e.team_id IS NOT NULL
          AND e.team_id IN (SELECT team_id FROM accessible_team_ids)
        )
      )
      AND (
        (NOT COALESCE(p_unassigned, false) AND p_team_id IS NULL)
        OR (COALESCE(p_unassigned, false) AND e.team_id IS NULL)
        OR (p_team_id IS NOT NULL AND e.team_id = p_team_id)
      )
  ),
  accessible_wo AS (
    SELECT
      w.id,
      w.status,
      w.created_date::date AS created_day,
      w.due_date::date AS due_day,
      w.completed_date::date AS completed_day
    FROM public.work_orders w
    WHERE w.organization_id = p_org_id
      AND w.equipment_id IN (SELECT id FROM accessible_equipment)
  ),
  day_series AS (
    SELECT generate_series(v_prior_start, v_today, interval '1 day')::date AS day
  ),
  baseline_equipment AS (
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE status IN ('maintenance', 'inactive'))::integer AS needs_attention
    FROM accessible_equipment
    WHERE created_day < v_prior_start
  ),
  baseline_wo AS (
    SELECT count(*)::integer AS total
    FROM accessible_wo
    WHERE created_day < v_prior_start
  ),
  equipment_daily_created AS (
    SELECT
      e.created_day AS day,
      count(*)::integer AS total_new,
      count(*) FILTER (WHERE e.status IN ('maintenance', 'inactive'))::integer AS needs_attention_new
    FROM accessible_equipment e
    GROUP BY e.created_day
  ),
  eq_daily AS (
    SELECT
      d.day,
      (b.total + SUM(COALESCE(ed.total_new, 0)) OVER (ORDER BY d.day))::integer AS total_equipment,
      (b.needs_attention + SUM(COALESCE(ed.needs_attention_new, 0)) OVER (ORDER BY d.day))::integer AS needs_attention
    FROM day_series d
    CROSS JOIN baseline_equipment b
    LEFT JOIN equipment_daily_created ed ON ed.day = d.day
  ),
  work_orders_daily_created AS (
    SELECT
      w.created_day AS day,
      count(*)::integer AS total_new
    FROM accessible_wo w
    GROUP BY w.created_day
  ),
  wo_daily_created AS (
    SELECT
      d.day,
      (b.total + SUM(COALESCE(wd.total_new, 0)) OVER (ORDER BY d.day))::integer AS total_work_orders
    FROM day_series d
    CROSS JOIN baseline_wo b
    LEFT JOIN work_orders_daily_created wd ON wd.day = d.day
  ),
  overdue_events AS (
    SELECT
      e.event_day,
      SUM(e.delta)::integer AS net_delta
    FROM (
      SELECT
        GREATEST(w.due_day, v_prior_start) AS event_day,
        1 AS delta
      FROM accessible_wo w
      WHERE w.due_day IS NOT NULL
        AND w.status NOT IN ('completed', 'cancelled')
        AND COALESCE(w.completed_day - 1, v_today) >= GREATEST(w.due_day, v_prior_start)

      UNION ALL

      SELECT
        LEAST(COALESCE(w.completed_day - 1, v_today), v_today) + 1 AS event_day,
        -1 AS delta
      FROM accessible_wo w
      WHERE w.due_day IS NOT NULL
        AND w.status NOT IN ('completed', 'cancelled')
        AND COALESCE(w.completed_day - 1, v_today) >= GREATEST(w.due_day, v_prior_start)
        AND LEAST(COALESCE(w.completed_day - 1, v_today), v_today) + 1 <= v_today
    ) e
    GROUP BY e.event_day
  ),
  overdue_daily AS (
    SELECT
      d.day,
      SUM(COALESCE(oe.net_delta, 0)) OVER (ORDER BY d.day)::integer AS overdue_work
    FROM day_series d
    LEFT JOIN overdue_events oe ON oe.event_day = d.day
  ),
  merged AS (
    SELECT
      d.day,
      eq.total_equipment,
      eq.needs_attention,
      wc.total_work_orders,
      od.overdue_work
    FROM day_series d
    JOIN eq_daily eq ON eq.day = d.day
    JOIN wo_daily_created wc ON wc.day = d.day
    JOIN overdue_daily od ON od.day = d.day
  ),
  current_agg AS (
    SELECT
      array_agg(total_equipment ORDER BY day) FILTER (WHERE day >= v_window_start) AS te_series,
      array_agg(needs_attention ORDER BY day) FILTER (WHERE day >= v_window_start) AS na_series,
      array_agg(total_work_orders ORDER BY day) FILTER (WHERE day >= v_window_start) AS twos_series,
      array_agg(overdue_work ORDER BY day) FILTER (WHERE day >= v_window_start) AS ow_series,
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS te_curr_window,
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS te_prior_window,
      COALESCE(SUM(needs_attention_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS na_curr_window,
      COALESCE(SUM(needs_attention_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS na_prior_window,
      COALESCE(SUM(wo_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS twos_curr_window,
      COALESCE(SUM(wo_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS twos_prior_window,
      avg(overdue_work) FILTER (WHERE day >= v_window_start) AS ow_curr_avg,
      avg(overdue_work) FILTER (WHERE day <  v_window_start) AS ow_prior_avg
    FROM (
      SELECT
        m.*,
        COALESCE(ed.total_new, 0)::integer AS total_new,
        COALESCE(ed.needs_attention_new, 0)::integer AS needs_attention_new,
        COALESCE(wd.total_new, 0)::integer AS wo_new
      FROM merged m
      LEFT JOIN equipment_daily_created ed ON ed.day = m.day
      LEFT JOIN work_orders_daily_created wd ON wd.day = m.day
    ) daily
  )
  SELECT
    te_series::integer[] AS total_equipment_series,
    CASE
      WHEN te_prior_window = 0 THEN NULL
      ELSE round(((te_curr_window - te_prior_window)::numeric / te_prior_window::numeric) * 100)::integer
    END AS total_equipment_delta,
    CASE
      WHEN te_prior_window = 0 THEN 'flat'
      WHEN te_curr_window > te_prior_window THEN 'up'
      WHEN te_curr_window < te_prior_window THEN 'down'
      ELSE 'flat'
    END AS total_equipment_direction,

    ow_series::integer[] AS overdue_work_series,
    CASE
      WHEN ow_prior_avg IS NULL OR ow_prior_avg = 0 THEN NULL
      ELSE round(((COALESCE(ow_curr_avg, 0) - ow_prior_avg) / ow_prior_avg) * 100)::integer
    END AS overdue_work_delta,
    CASE
      WHEN ow_prior_avg IS NULL OR ow_prior_avg = 0 THEN 'flat'
      WHEN COALESCE(ow_curr_avg, 0) > ow_prior_avg THEN 'up'
      WHEN COALESCE(ow_curr_avg, 0) < ow_prior_avg THEN 'down'
      ELSE 'flat'
    END AS overdue_work_direction,

    twos_series::integer[] AS total_work_orders_series,
    CASE
      WHEN twos_prior_window = 0 THEN NULL
      ELSE round(((twos_curr_window - twos_prior_window)::numeric / twos_prior_window::numeric) * 100)::integer
    END AS total_work_orders_delta,
    CASE
      WHEN twos_prior_window = 0 THEN 'flat'
      WHEN twos_curr_window > twos_prior_window THEN 'up'
      WHEN twos_curr_window < twos_prior_window THEN 'down'
      ELSE 'flat'
    END AS total_work_orders_direction,

    na_series::integer[] AS needs_attention_series,
    CASE
      WHEN na_prior_window = 0 THEN NULL
      ELSE round(((na_curr_window - na_prior_window)::numeric / na_prior_window::numeric) * 100)::integer
    END AS needs_attention_delta,
    CASE
      WHEN na_prior_window = 0 THEN 'flat'
      WHEN na_curr_window > na_prior_window THEN 'up'
      WHEN na_curr_window < na_prior_window THEN 'down'
      ELSE 'flat'
    END AS needs_attention_direction
  FROM current_agg;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_trends"("p_org_id" "uuid", "p_days" integer, "p_team_id" "uuid", "p_unassigned" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_trends"("p_org_id" "uuid", "p_days" integer, "p_team_id" "uuid", "p_unassigned" boolean) IS 'Dashboard sparkline + trend data for the four StatsGrid KPIs. Optional p_team_id / p_unassigned narrow equipment scope to match TopBar team filter; RBAC is still derived server-side from auth.uid(). See #1075.';



CREATE OR REPLACE FUNCTION "public"."get_effective_pm_interval_policy_for_equipment"("p_equipment_id" "uuid") RETURNS TABLE("interval_value" integer, "interval_type" "text", "template_name" "text", "source" "text", "schedule_mode" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_equipment_org_id uuid;
  v_team_id uuid;
  v_template_id uuid;
  v_template_name text;
  v_policy record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT e.organization_id, e.team_id, e.default_pm_template_id
  INTO v_equipment_org_id, v_team_id, v_template_id
  FROM public.equipment e
  WHERE e.id = p_equipment_id;

  IF v_equipment_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_equipment_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: not an active member of this organization'
      USING ERRCODE = '42501';
  END IF;

  IF v_template_id IS NOT NULL THEN
    SELECT t.name
    INTO v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_template_id;
  END IF;

  SELECT p.schedule_mode, p.interval_value, p.interval_type
  INTO v_policy
  FROM public.pm_interval_policies p
  WHERE p.organization_id = v_equipment_org_id
    AND p.equipment_id = p_equipment_id
    AND p.policy_slot = 'default'
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      v_policy.interval_value,
      v_policy.interval_type,
      COALESCE(v_template_name, 'Equipment schedule'),
      'equipment_policy'::text,
      v_policy.schedule_mode;
    RETURN;
  END IF;

  IF v_team_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_equipment_org_id
      AND p.team_id = v_team_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Team schedule'),
        'team_policy'::text,
        v_policy.schedule_mode;
      RETURN;
    END IF;
  END IF;

  IF v_template_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_equipment_org_id
      AND p.pm_template_id = v_template_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Template schedule'),
        'template_policy'::text,
        v_policy.schedule_mode;
      RETURN;
    END IF;

    SELECT t.interval_value, t.interval_type, t.name
    INTO v_policy.interval_value, v_policy.interval_type, v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_template_id
      AND t.interval_value IS NOT NULL;

    IF v_policy.interval_value IS NOT NULL THEN
      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        v_template_name,
        'template_default'::text,
        'custom'::text;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    NULL::integer,
    NULL::text,
    NULL::text,
    'unconfigured'::text,
    'unconfigured'::text;
END;
$$;


ALTER FUNCTION "public"."get_effective_pm_interval_policy_for_equipment"("p_equipment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") RETURNS TABLE("equipment_id" "uuid", "name" "text", "manufacturer" "text", "model" "text", "serial_number" "text", "status" "text", "location" "text", "matched_rule_id" "uuid", "matched_rule_manufacturer" "text", "matched_rule_model" "text", "matched_rule_match_type" "public"."model_match_type", "matched_rule_status" "public"."verification_status")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  RETURN QUERY
  SELECT DISTINCT ON (e.id)
    e.id,
    e.name::TEXT,
    e.manufacturer::TEXT,
    e.model::TEXT,
    e.serial_number::TEXT,
    e.status::TEXT,
    e.location::TEXT,
    pcr.id,
    pcr.manufacturer::TEXT,
    pcr.model::TEXT,
    pcr.match_type,
    pcr.status
  FROM public.equipment e
  JOIN public.part_compatibility_rules pcr
    ON pcr.manufacturer_norm = lower(trim(e.manufacturer))
    AND (
      pcr.match_type = 'any'
      OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
      OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
      OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
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



CREATE OR REPLACE FUNCTION "public"."get_equipment_pm_status"("p_equipment_id" "uuid") RETURNS TABLE("equipment_id" "uuid", "last_pm_completed_at" timestamp with time zone, "interval_value" integer, "interval_type" "text", "is_overdue" boolean, "days_overdue" integer, "hours_overdue" numeric, "template_name" "text", "source" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_last_pm              record;
  v_interval_value       integer;
  v_interval_type        text;
  v_template_name        text;
  v_source               text;
  v_is_overdue           boolean := false;
  v_days_overdue         integer;
  v_hours_overdue        numeric;
  v_equipment_hours      numeric;
  v_equipment_org_id     uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT e.organization_id INTO v_equipment_org_id
  FROM public.equipment e
  WHERE e.id = p_equipment_id;

  IF v_equipment_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_equipment_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: not an active member of this organization'
      USING ERRCODE = '42501';
  END IF;

  SELECT pm.completed_at,
         pm.equipment_working_hours_at_completion
  INTO v_last_pm
  FROM public.preventative_maintenance pm
  WHERE pm.equipment_id = p_equipment_id
    AND pm.status = 'completed'
    AND pm.completed_at IS NOT NULL
  ORDER BY pm.completed_at DESC
  LIMIT 1;

  IF v_last_pm IS NULL THEN
    RETURN;
  END IF;

  SELECT r.interval_value, r.interval_type, r.template_name, r.source
  INTO v_interval_value, v_interval_type, v_template_name, v_source
  FROM public.resolve_effective_pm_interval_policy(p_equipment_id) r
  LIMIT 1;

  IF v_interval_value IS NULL THEN
    RETURN;
  END IF;

  IF v_interval_type = 'days' THEN
    v_days_overdue := (now()::date - v_last_pm.completed_at::date) - v_interval_value;
    v_is_overdue := v_days_overdue > 0;

  ELSIF v_interval_type = 'hours' THEN
    SELECT working_hours INTO v_equipment_hours
    FROM public.equipment WHERE id = p_equipment_id;

    IF v_equipment_hours IS NOT NULL AND v_last_pm.equipment_working_hours_at_completion IS NOT NULL THEN
      v_hours_overdue := v_equipment_hours
                         - v_last_pm.equipment_working_hours_at_completion
                         - v_interval_value;
      v_is_overdue := v_hours_overdue > 0;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    p_equipment_id,
    v_last_pm.completed_at,
    v_interval_value,
    v_interval_type,
    v_is_overdue,
    v_days_overdue,
    v_hours_overdue,
    v_template_name,
    v_source;
END;
$$;


ALTER FUNCTION "public"."get_equipment_pm_status"("p_equipment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_export_job_status"("p_job_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_row public.export_request_log%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.export_request_log
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  IF v_row.user_id <> v_user_id
     AND NOT public.is_org_admin(v_user_id, v_row.organization_id) THEN
    RAISE EXCEPTION 'Access denied'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'jobId', v_row.id,
    'status', v_row.status,
    'reportType', v_row.report_type,
    'rowCount', v_row.row_count,
    'resultUrl', v_row.result_url,
    'resultStoragePath', v_row.result_storage_path,
    'errorMessage', v_row.error_message,
    'requestedAt', v_row.requested_at,
    'startedAt', v_row.started_at,
    'completedAt', v_row.completed_at,
    'jobMode', v_row.job_mode,
    'delivery', v_row.delivery
  );
END;
$$;


ALTER FUNCTION "public"."get_export_job_status"("p_job_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_export_job_status"("p_job_id" "uuid") IS 'Returns pollable status for an async export job owned by the caller or org admin (#1193).';



CREATE OR REPLACE FUNCTION "public"."get_fleet_efficiency"("p_org_id" "uuid", "p_team_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("team_id" "uuid", "team_name" "text", "equipment_count" integer, "active_work_orders_count" integer)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  with teams_filtered as (
    select id, name
    from public.teams
    where organization_id = p_org_id
      and (p_team_ids is null or id = any (p_team_ids))
  ),
  equipment_counts as (
    select team_id, count(*)::int as equipment_count
    from public.equipment
    where organization_id = p_org_id
      and team_id is not null
      and (p_team_ids is null or team_id = any (p_team_ids))
    group by team_id
  ),
  active_work_order_counts as (
    select e.team_id, count(*)::int as active_work_orders_count
    from public.work_orders wo
    join public.equipment e on e.id = wo.equipment_id
    where wo.organization_id = p_org_id
      and e.organization_id = p_org_id
      and e.team_id is not null
      and (p_team_ids is null or e.team_id = any (p_team_ids))
      and wo.status not in ('completed', 'cancelled')
    group by e.team_id
  )
  select
    tf.id as team_id,
    tf.name as team_name,
    ec.equipment_count,
    coalesce(awoc.active_work_orders_count, 0) as active_work_orders_count
  from teams_filtered tf
  join equipment_counts ec on ec.team_id = tf.id
  left join active_work_order_counts awoc on awoc.team_id = tf.id
  where ec.equipment_count > 0
  order by tf.name;
$$;


ALTER FUNCTION "public"."get_fleet_efficiency"("p_org_id" "uuid", "p_team_ids" "uuid"[]) OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."get_google_workspace_connection_status"("p_organization_id" "uuid") RETURNS TABLE("is_connected" boolean, "domain" "text", "connected_at" timestamp with time zone, "access_token_expires_at" timestamp with time zone, "scopes" "text", "connected_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_credentials record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can view Google Workspace connection';
  END IF;

  SELECT
    gwc.domain,
    gwc.created_at,
    gwc.access_token_expires_at,
    gwc.scopes,
    gwc.connected_email
  INTO v_credentials
  FROM public.google_workspace_credentials gwc
  WHERE gwc.organization_id = p_organization_id
  ORDER BY gwc.created_at DESC
  LIMIT 1;

  IF v_credentials IS NULL THEN
    RETURN QUERY SELECT
      false::boolean,
      NULL::text,
      NULL::timestamptz,
      NULL::timestamptz,
      NULL::text,
      NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true::boolean,
    v_credentials.domain,
    v_credentials.created_at,
    v_credentials.access_token_expires_at,
    v_credentials.scopes,
    v_credentials.connected_email;
END;
$$;


ALTER FUNCTION "public"."get_google_workspace_connection_status"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_google_workspace_connection_status"("p_organization_id" "uuid") IS 'Returns Google Workspace connection metadata for an organization, including connected admin email.';



CREATE OR REPLACE FUNCTION "public"."get_inventory_list_metadata"("p_organization_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result JSON;
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  SELECT json_build_object(
    'uniqueLocations', COALESCE((
      SELECT json_agg(location ORDER BY location)
      FROM (
        SELECT DISTINCT trim(location) AS location
        FROM public.inventory_items
        WHERE organization_id = p_organization_id
          AND location IS NOT NULL
          AND trim(location) <> ''
      ) locations
    ), '[]'::json),
    'totalCount', COALESCE(COUNT(*)::int, 0),
    'negativeStockCount', COALESCE(COUNT(*) FILTER (WHERE quantity_on_hand < 0)::int, 0),
    'outOfStockCount', COALESCE(COUNT(*) FILTER (WHERE quantity_on_hand = 0)::int, 0),
    'lowStockCount', COALESCE(
      COUNT(*) FILTER (
        WHERE quantity_on_hand > 0
          AND quantity_on_hand <= low_stock_threshold
      )::int,
      0
    ),
    'healthyCount', COALESCE(COUNT(*) FILTER (WHERE quantity_on_hand > low_stock_threshold)::int, 0),
    'missingLocationCount', COALESCE(
      COUNT(*) FILTER (WHERE location IS NULL OR trim(location) = '')::int,
      0
    ),
    'missingUnitCostCount', COALESCE(COUNT(*) FILTER (WHERE default_unit_cost IS NULL)::int, 0),
    'missingSkuCount', COALESCE(COUNT(*) FILTER (WHERE sku IS NULL OR trim(sku) = '')::int, 0),
    'estimatedInventoryValue', COALESCE(SUM(
      CASE
        WHEN default_unit_cost IS NOT NULL AND quantity_on_hand IS NOT NULL
          THEN default_unit_cost * quantity_on_hand
        ELSE 0
      END
    ), 0)
  )
  INTO v_result
  FROM public.inventory_items
  WHERE organization_id = p_organization_id;

  RETURN COALESCE(
    v_result,
    json_build_object(
      'uniqueLocations', '[]'::json,
      'totalCount', 0,
      'negativeStockCount', 0,
      'outOfStockCount', 0,
      'lowStockCount', 0,
      'healthyCount', 0,
      'missingLocationCount', 0,
      'missingUnitCostCount', 0,
      'missingSkuCount', 0,
      'estimatedInventoryValue', 0
    )
  );
END;
$$;


ALTER FUNCTION "public"."get_inventory_list_metadata"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_inventory_list_metadata"("p_organization_id" "uuid") IS 'Returns inventory list health/metadata aggregates for an organization in a single bounded query.';



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


CREATE OR REPLACE FUNCTION "public"."get_org_equipment_pm_statuses"("p_organization_id" "uuid") RETURNS TABLE("equipment_id" "uuid", "last_pm_completed_at" timestamp with time zone, "interval_value" integer, "interval_type" "text", "is_overdue" boolean, "days_overdue" integer, "hours_overdue" numeric, "template_name" "text", "source" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: not an active member of this organization'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.*
  FROM public.equipment e
  CROSS JOIN LATERAL public.get_equipment_pm_status(e.id) s
  WHERE e.organization_id = p_organization_id;
END;
$$;


ALTER FUNCTION "public"."get_org_equipment_pm_statuses"("p_organization_id" "uuid") OWNER TO "postgres";


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
  total_bytes BIGINT := 0;
BEGIN
  -- Sum all equipment note images
  SELECT COALESCE(SUM(eni.file_size), 0) INTO total_bytes
  FROM equipment_note_images eni
  JOIN equipment_notes en ON eni.equipment_note_id = en.id
  JOIN equipment e ON en.equipment_id = e.id
  WHERE e.organization_id = org_id;
  
  -- Add work order images
  SELECT total_bytes + COALESCE(SUM(woi.file_size), 0) INTO total_bytes
  FROM work_order_images woi
  WHERE woi.work_order_id IN (
    SELECT id FROM work_orders WHERE organization_id = org_id
  );

  -- Add inventory item images
  SELECT total_bytes + COALESCE(SUM(iii.file_size), 0) INTO total_bytes
  FROM inventory_item_images iii
  WHERE iii.organization_id = org_id;
  
  -- Convert bytes to MB
  RETURN ROUND(total_bytes / 1048576.0);
END;
$$;


ALTER FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") IS 'Calculate total storage used by an organization in MB. Returns storage from equipment_note_images, work_order_images, and inventory_item_images tables.';



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



CREATE OR REPLACE FUNCTION "public"."get_pending_workspace_personal_org_merge_requests"() RETURNS TABLE("id" "uuid", "workspace_org_id" "uuid", "workspace_org_name" "text", "requested_by_user_id" "uuid", "requested_by_name" "text", "requested_for_user_id" "uuid", "requested_for_name" "text", "request_reason" "text", "created_at" timestamp with time zone, "expires_at" timestamp with time zone, "is_incoming" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();

  RETURN QUERY
  SELECT 
    r.id,
    r.workspace_org_id,
    o.name AS workspace_org_name,
    r.requested_by_user_id,
    r.requested_by_name,
    r.requested_for_user_id,
    r.requested_for_name,
    r.request_reason,
    r.created_at,
    r.expires_at,
    (r.requested_for_user_id = v_current_user_id) AS is_incoming
  FROM public.workspace_personal_org_merge_requests r
  JOIN public.organizations o ON o.id = r.workspace_org_id
  WHERE r.status = 'pending'
    AND r.expires_at > now()
    AND (r.requested_for_user_id = v_current_user_id OR r.requested_by_user_id = v_current_user_id);
END;
$$;


ALTER FUNCTION "public"."get_pending_workspace_personal_org_merge_requests"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_workspace_personal_org_merge_requests"() IS 'Get all pending personal org merge requests for the current user (incoming/outgoing).';



CREATE OR REPLACE FUNCTION "public"."get_personal_org_merge_preview"("p_workspace_org_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_personal_org_merge_preview"("p_workspace_org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_personal_org_merge_preview"("p_workspace_org_id" "uuid") IS 'Returns counts of personal org data for the authenticated user for consent UI.';



CREATE OR REPLACE FUNCTION "public"."get_product_onboarding_status"("p_organization_id" "uuid") RETURNS TABLE("needs_onboarding" boolean, "teams_count" bigint, "equipment_count" bigint, "completed_at" timestamp with time zone, "is_org_admin" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_completed_at timestamptz;
  v_teams_count bigint := 0;
  v_equipment_count bigint := 0;
  v_skip_invite_onboarding boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT om.role, om.status, om.product_onboarding_completed_at
  INTO v_role, v_status, v_completed_at
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
  LIMIT 1;

  IF v_role IS NULL OR v_status IS DISTINCT FROM 'active' THEN
    needs_onboarding := false;
    teams_count := 0;
    equipment_count := 0;
    completed_at := NULL;
    is_org_admin := false;
    RETURN NEXT;
    RETURN;
  END IF;

  is_org_admin := v_role IN ('owner', 'admin');
  completed_at := v_completed_at;

  SELECT COUNT(*)::bigint INTO v_teams_count
  FROM public.teams t
  WHERE t.organization_id = p_organization_id;

  SELECT COUNT(*)::bigint INTO v_equipment_count
  FROM public.equipment e
  WHERE e.organization_id = p_organization_id;

  teams_count := v_teams_count;
  equipment_count := v_equipment_count;

  IF is_org_admin
    AND v_completed_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.personal_organizations po
      WHERE po.user_id = v_user_id
        AND po.organization_id = p_organization_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM auth.users u
        JOIN public.organization_invitations oi
          ON public.normalize_email(oi.email) = public.normalize_email(u.email)
        WHERE u.id = v_user_id
          AND oi.status = 'pending'
          AND oi.expires_at > now()
          AND oi.invited_by IS DISTINCT FROM v_user_id
          AND oi.organization_id <> p_organization_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.organization_members om_other
        WHERE om_other.user_id = v_user_id
          AND om_other.organization_id <> p_organization_id
          AND om_other.status = 'active'
          AND om_other.access_source = 'invitation'
      )
    ) THEN
    v_skip_invite_onboarding := true;
  END IF;

  needs_onboarding := is_org_admin
    AND v_completed_at IS NULL
    AND NOT (v_teams_count > 0 AND v_equipment_count > 0)
    AND NOT v_skip_invite_onboarding;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."get_product_onboarding_status"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_product_onboarding_status"("p_organization_id" "uuid") IS 'Returns whether the current user must complete product onboarding for the given organization. Established orgs with teams and equipment bypass the wizard; invited signup users skip the checklist on their personal org.';



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



CREATE OR REPLACE FUNCTION "public"."get_system_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_system_user_id"() OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."get_workspace_onboarding_state"("p_user_id" "uuid") RETURNS TABLE("email" "text", "domain" "text", "domain_status" "text", "workspace_org_id" "uuid", "is_workspace_connected" boolean, "has_workspace_membership" boolean, "has_pending_invitation" boolean, "has_pending_claim" boolean, "has_other_organization_membership" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_email text;
  v_domain text;
  v_workspace_org_id uuid;
  v_connected boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  v_domain := split_part(public.normalize_email(v_email), '@', 2);

  SELECT d.organization_id
  INTO v_workspace_org_id
  FROM public.workspace_domains d
  WHERE public.normalize_domain(d.domain) = public.normalize_domain(v_domain)
  ORDER BY d.created_at DESC
  LIMIT 1;

  IF v_workspace_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.google_workspace_credentials gwc
      WHERE gwc.organization_id = v_workspace_org_id
        AND public.normalize_domain(gwc.domain) = public.normalize_domain(v_domain)
    ) INTO v_connected;
  END IF;

  email := v_email;
  domain := v_domain;
  workspace_org_id := v_workspace_org_id;
  is_workspace_connected := v_connected;
  domain_status := CASE
    WHEN v_workspace_org_id IS NOT NULL THEN 'claimed'
    ELSE 'unclaimed'
  END;

  has_workspace_membership := false;
  has_pending_invitation := false;
  has_pending_claim := false;
  has_other_organization_membership := false;

  IF v_workspace_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = v_workspace_org_id
        AND om.user_id = p_user_id
        AND om.status = 'active'
    ) INTO has_workspace_membership;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_invitations oi
      WHERE oi.organization_id = v_workspace_org_id
        AND public.normalize_email(oi.email) = public.normalize_email(v_email)
        AND oi.status = 'pending'
        AND oi.expires_at > now()
    ) INTO has_pending_invitation;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_member_claims c
      WHERE c.organization_id = v_workspace_org_id
        AND public.normalize_email(c.email) = public.normalize_email(v_email)
        AND c.status = 'selected'
    ) INTO has_pending_claim;

    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = p_user_id
        AND om.status = 'active'
        AND om.organization_id IS DISTINCT FROM v_workspace_org_id
    ) INTO has_other_organization_membership;
  END IF;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."get_workspace_onboarding_state"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_workspace_onboarding_state"("p_user_id" "uuid") IS 'Returns workspace onboarding and claimed-domain access posture for a user. Self-only when auth.uid() is present.';



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
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  new_org_id uuid;
  personal_org_id uuid;
  org_name text;
  invited_name text;
  workspace_org_id uuid;
  user_domain text;
  is_google_user boolean := false;
  is_consumer_domain boolean := false;
  has_workspace_claim boolean := false;
  has_workspace_invite boolean := false;
  skip_personal_org boolean := false;
  skip_personal_onboarding boolean := false;
BEGIN
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

  user_domain := split_part(public.normalize_email(NEW.email), '@', 2);
  is_google_user := public.is_user_google_oauth_verified(NEW.id)
    OR (COALESCE(NEW.raw_app_meta_data->>'provider', '') = 'google');
  is_consumer_domain := COALESCE(user_domain IN ('gmail.com', 'googlemail.com'), false);

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_member_claims c
    WHERE public.normalize_email(c.email) = public.normalize_email(NEW.email)
      AND c.status IN ('selected', 'claimed')
  ) INTO has_workspace_claim;

  IF is_google_user AND NOT is_consumer_domain AND user_domain IS NOT NULL THEN
    SELECT d.organization_id INTO workspace_org_id
    FROM public.workspace_domains d
    WHERE public.normalize_domain(d.domain) = public.normalize_domain(user_domain)
    LIMIT 1;

    IF workspace_org_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.organization_invitations oi
        WHERE oi.organization_id = workspace_org_id
          AND public.normalize_email(oi.email) = public.normalize_email(NEW.email)
          AND oi.status = 'pending'
          AND oi.expires_at > now()
      ) INTO has_workspace_invite;

      IF NOT has_workspace_claim AND NOT has_workspace_invite THEN
        skip_personal_org := true;
      END IF;
    END IF;
  END IF;

  skip_personal_onboarding := EXISTS (
    SELECT 1
    FROM public.organization_invitations oi
    WHERE public.normalize_email(oi.email) = public.normalize_email(NEW.email)
      AND oi.status = 'pending'
      AND oi.expires_at > now()
      AND oi.invited_by IS DISTINCT FROM NEW.id
  );

  SELECT organization_id INTO personal_org_id
  FROM public.personal_organizations
  WHERE user_id = NEW.id;

  IF personal_org_id IS NULL AND NOT skip_personal_org THEN
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');

    IF NEW.raw_user_meta_data ? 'invited_organization_id' THEN
      SELECT name INTO invited_name
      FROM public.organizations
      WHERE id = (NEW.raw_user_meta_data->>'invited_organization_id')::uuid;
    ELSIF NEW.raw_user_meta_data ? 'invited_organization_name' THEN
      invited_name := NEW.raw_user_meta_data->>'invited_organization_name';
    END IF;

    IF invited_name IS NOT NULL AND lower(trim(org_name)) = lower(trim(invited_name)) THEN
      RAISE EXCEPTION 'ORGANIZATION_NAME_CONFLICT_WITH_INVITED'
        USING DETAIL = 'Choose a different organization name than the one inviting you.';
    END IF;

    INSERT INTO public.organizations (name, plan, member_count, max_members, features)
    VALUES (
      org_name,
      'free',
      1,
      5,
      ARRAY['Equipment Management', 'Work Orders', 'Team Management']
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.personal_organizations (user_id, organization_id)
    VALUES (NEW.id, new_org_id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role,
      status,
      access_source,
      product_onboarding_completed_at
    )
    VALUES (
      new_org_id,
      NEW.id,
      'owner',
      'active',
      'owner',
      CASE WHEN skip_personal_onboarding THEN NOW() ELSE NULL END
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
  SELECT c.organization_id, NEW.id, 'member', 'active', 'google_workspace'
  FROM public.organization_member_claims c
  WHERE public.normalize_email(c.email) = public.normalize_email(NEW.email)
    AND c.status IN ('selected', 'claimed')
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = CASE
          WHEN public.organization_members.access_source IS NULL
            OR public.organization_members.access_source = 'google_workspace'
            THEN 'active'
          ELSE public.organization_members.status
        END,
        access_source = COALESCE(public.organization_members.access_source, 'google_workspace')
    WHERE public.organization_members.access_source IS NULL
       OR public.organization_members.access_source = 'google_workspace';

  UPDATE public.organization_member_claims
  SET status = 'claimed',
      claimed_user_id = NEW.id,
      claimed_at = now()
  WHERE public.normalize_email(email) = public.normalize_email(NEW.email)
    AND status = 'selected';

  PERFORM public.apply_pending_admin_grants_for_user(NEW.id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger for new user registration. Creates profile and personal org when allowed; invited signup users skip personal onboarding checklist.';



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


CREATE OR REPLACE FUNCTION "public"."historical_timeline_allowed_next_statuses"("p_current_status" "public"."work_order_status") RETURNS "public"."work_order_status"[]
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT CASE p_current_status
    WHEN 'submitted' THEN ARRAY['accepted', 'cancelled']::public.work_order_status[]
    WHEN 'accepted' THEN ARRAY['assigned', 'cancelled']::public.work_order_status[]
    WHEN 'assigned' THEN ARRAY['in_progress', 'on_hold']::public.work_order_status[]
    WHEN 'in_progress' THEN ARRAY['on_hold', 'completed']::public.work_order_status[]
    WHEN 'on_hold' THEN ARRAY['in_progress', 'cancelled']::public.work_order_status[]
    ELSE ARRAY[]::public.work_order_status[]
  END;
$$;


ALTER FUNCTION "public"."historical_timeline_allowed_next_statuses"("p_current_status" "public"."work_order_status") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."invoke_queue_worker"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  -- SECURITY DEFINER resets current_user to the function owner; session_user
  -- preserves the real session identity (caller), which pg_cron uses as postgres.
  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: invoke_queue_worker can only be called by the pg_cron scheduler as postgres';
  END IF;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF service_role_key IS NULL OR supabase_url IS NULL THEN
    RAISE WARNING 'Queue worker invocation skipped: vault secrets not configured';
    RETURN;
  END IF;

  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'Queue worker invocation skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/queue-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule queue worker invocation';
  END IF;
END;
$_$;


ALTER FUNCTION "public"."invoke_queue_worker"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invoke_queue_worker"() IS 'Invokes the queue-worker Edge Function to drain the notifications pgmq queue. Called by the drain-notifications-queue pg_cron job. Secured to postgres superuser running under pg_cron only; uses vault-stored service_role_key and supabase_url with URL-validation regex defense.';



CREATE OR REPLACE FUNCTION "public"."invoke_quickbooks_invoice_status_sync"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  -- SECURITY DEFINER resets current_user to the function owner; session_user preserves
  -- the real session identity (caller), which pg_cron uses as postgres.
  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: invoke_quickbooks_invoice_status_sync can only be called by the pg_cron scheduler as postgres';
  END IF;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF service_role_key IS NULL OR supabase_url IS NULL THEN
    RAISE WARNING 'QuickBooks invoice status sync skipped: vault secrets not configured';
    RETURN;
  END IF;

  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'QuickBooks invoice status sync skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := supabase_url || '/functions/v1/quickbooks-sync-invoice-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule QuickBooks invoice status sync invocation';
  END IF;
END;
$_$;


ALTER FUNCTION "public"."invoke_quickbooks_invoice_status_sync"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invoke_quickbooks_invoice_status_sync"() IS 'SECURITY DEFINER with SET search_path to empty string. Invokes quickbooks-sync-invoice-status from pg_cron only (session_user=postgres and cron.job_id set). Uses vault.decrypted_secrets and net.http_post. Not executable by JWT roles or service_role API.';



CREATE OR REPLACE FUNCTION "public"."invoke_quickbooks_token_refresh"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by the pg_cron scheduler as postgres';
  END IF;

  PERFORM public._invoke_quickbooks_token_refresh_internal();
END;
$$;


ALTER FUNCTION "public"."invoke_quickbooks_token_refresh"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."invoke_quickbooks_token_refresh"() IS 'Calls the quickbooks-refresh-tokens edge function using credentials stored in vault.secrets. This function is secured and can only be called by the pg_cron scheduler running as the postgres superuser. Updated to use net.http_post() after moving pg_net to extensions schema.';



CREATE OR REPLACE FUNCTION "public"."is_equipment_team_manager"("p_user_id" "uuid", "p_equipment_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.equipment e
    JOIN public.team_members tm ON tm.team_id = e.team_id
    WHERE e.id = p_equipment_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('owner'::public.team_member_role, 'manager'::public.team_member_role)
  );
$$;


ALTER FUNCTION "public"."is_equipment_team_manager"("p_user_id" "uuid", "p_equipment_id" "uuid") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."is_parts_consumer"("p_organization_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parts_consumers
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_parts_consumer"("p_organization_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_parts_consumer"("p_organization_id" "uuid", "p_user_id" "uuid") IS 'Checks if a user is a parts consumer for the given organization.';



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



CREATE OR REPLACE FUNCTION "public"."is_team_viewer_or_requestor"("p_user_id" "uuid", "p_team_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('viewer'::public.team_member_role, 'requestor'::public.team_member_role)
  );
$$;


ALTER FUNCTION "public"."is_team_viewer_or_requestor"("p_user_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_google_oauth_verified"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  has_google_identity boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = p_user_id
      AND i.provider = 'google'
  )
  INTO has_google_identity;

  RETURN has_google_identity;
END;
$$;


ALTER FUNCTION "public"."is_user_google_oauth_verified"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_user_google_oauth_verified"("p_user_id" "uuid") IS 'Returns true if the user has a Google OAuth identity. Used to gate admin grants.';



CREATE OR REPLACE FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team_id UUID;
  v_equipment_exists BOOLEAN;
BEGIN
  -- If no assignee, always valid (unassigned)
  IF p_assignee_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Guard: verify equipment belongs to the specified organization.
  -- This prevents cross-tenant assignment if work_orders has mismatched
  -- equipment_id / organization_id (no compound FK enforces consistency).
  SELECT EXISTS (
    SELECT 1 FROM equipment
    WHERE id = p_equipment_id
      AND organization_id = p_organization_id
  ) INTO v_equipment_exists;

  IF NOT v_equipment_exists THEN
    RETURN FALSE;
  END IF;

  -- Check if assignee is an org admin/owner (they can be assigned regardless of equipment team)
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_assignee_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Get the equipment's team_id (equipment existence already verified above)
  SELECT team_id INTO v_team_id
  FROM equipment
  WHERE id = p_equipment_id AND organization_id = p_organization_id;

  -- If equipment has no team: only org admins/owners (already allowed above) are valid.
  -- Regular team members (manager/technician) cannot be assigned when equipment has no team.
  IF v_team_id IS NULL THEN
    RETURN FALSE;
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


COMMENT ON FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") IS 'Validates that an assignee is valid for a work order: first verifies equipment belongs to the specified organization (cross-tenant guard), then allows org admin/owner (any equipment) or team member (manager/technician) when equipment has a team. Returns FALSE when equipment does not belong to the org, when equipment has no team and assignee is not an org admin/owner, or when assignee is not a valid team member.';



CREATE OR REPLACE FUNCTION "public"."is_work_order_team_manager"("p_user_id" "uuid", "p_work_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_orders wo
    JOIN public.team_members tm ON tm.team_id = wo.team_id
    WHERE wo.id = p_work_order_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('owner'::public.team_member_role, 'manager'::public.team_member_role)
  );
$$;


ALTER FUNCTION "public"."is_work_order_team_manager"("p_user_id" "uuid", "p_work_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."latest_scans_for_equipment_ids"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) RETURNS TABLE("equipment_id" "uuid", "location" "text", "scanned_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT DISTINCT ON (s.equipment_id)
    s.equipment_id,
    s.location,
    s.scanned_at
  FROM public.scans s
  JOIN public.equipment e ON e.id = s.equipment_id
  WHERE e.organization_id = p_organization_id
    AND s.equipment_id = ANY(COALESCE(p_equipment_ids, ARRAY[]::uuid[]))
    AND s.location IS NOT NULL
  ORDER BY s.equipment_id, s.scanned_at DESC;
$$;


ALTER FUNCTION "public"."latest_scans_for_equipment_ids"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."latest_scans_for_equipment_ids"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) IS 'Returns the latest location-bearing scan for each supplied equipment id within the requested organization, bounded to one row per equipment.';



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


CREATE OR REPLACE FUNCTION "public"."list_active_stripe_subscriptions"() RETURNS TABLE("subscription_id" "text", "stripe_customer_id" "text", "status" "text", "current_period_end" timestamp without time zone, "stripe_customer_email" "text", "stripe_customer_metadata" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'org_active_stripe_subscriptions'
  ) THEN
    -- No tenant scoping: the function is service_role only (see GRANT below),
    -- so the only legitimate caller is a server-side Edge Function with the
    -- service role key. That caller is responsible for any tenant filtering
    -- it needs.
    RETURN QUERY EXECUTE
      'SELECT subscription_id, stripe_customer_id, status, current_period_end, '
      'stripe_customer_email, stripe_customer_metadata '
      'FROM public.org_active_stripe_subscriptions';
  END IF;
  -- MV missing: return empty. Future Edge Function callers get a clean empty
  -- state instead of an error during the pre-Section-B window.
  RETURN;
END;
$$;


ALTER FUNCTION "public"."list_active_stripe_subscriptions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_active_stripe_subscriptions"() IS 'Returns active/trialing/past-due Stripe subscriptions joined to their customers. Reads from the materialized view public.org_active_stripe_subscriptions (refreshed every 15 minutes by the refresh-stripe-mvs cron job). The stripe.* foreign tables are private; this SECURITY DEFINER function is GRANTed only to service_role until EquipQR reintroduces an org → Stripe customer mapping. Server-side Edge Functions invoke it with the service role key and apply any tenant filtering themselves. Returns empty when the FDW pilot has not yet been provisioned (Section B of the Change Record on issue #722).';



CREATE OR REPLACE FUNCTION "public"."list_pm_templates"() RETURNS TABLE("template_name" "text", "item_count" bigint, "is_global" boolean)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.name::TEXT,
        (SELECT COUNT(*) FROM jsonb_array_elements(t.template_data))::BIGINT as item_count,
        (t.organization_id IS NULL)::BOOLEAN as is_global
    FROM public.pm_checklist_templates t
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
  v_org_exists BOOLEAN;
  v_effective_org_id UUID;
BEGIN
  -- Get actor info
  SELECT * INTO v_actor FROM public.get_audit_actor_info();
  
  -- Check if the organization still exists (might be in middle of deletion)
  v_effective_org_id := p_organization_id;
  IF p_organization_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_organization_id) INTO v_org_exists;
    
    -- If org doesn't exist, set org_id to NULL to preserve the audit record
    -- This handles cascade deletes where the org is being deleted
    IF NOT v_org_exists THEN
      v_effective_org_id := NULL;
    END IF;
  END IF;
  
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
    v_effective_org_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    v_actor.actor_id,
    COALESCE(v_actor.actor_name, 'System'),
    v_actor.actor_email,
    p_changes,
    CASE 
      WHEN v_effective_org_id IS NULL AND p_organization_id IS NOT NULL 
      THEN jsonb_build_object('original_org_id', p_organization_id) || p_metadata
      ELSE p_metadata
    END
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
  
EXCEPTION WHEN foreign_key_violation THEN
  -- If we still get FK violation (race condition), insert with NULL org_id
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
    NULL,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    v_actor.actor_id,
    COALESCE(v_actor.actor_name, 'System'),
    v_actor.actor_email,
    p_changes,
    jsonb_build_object('original_org_id', p_organization_id) || p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;


ALTER FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") IS 'Logs an audit entry. Handles organization deletion gracefully by setting org_id to NULL if org is being deleted. Preserves original_org_id in metadata for deleted orgs.';



CREATE OR REPLACE FUNCTION "public"."log_audit_export_notification"("p_organization_id" "uuid", "p_exported_count" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_name text;
  caller_role text;
BEGIN
  SELECT om.role INTO caller_role
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active';

  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: caller must be an active owner or admin of the organization';
  END IF;

  SELECT COALESCE(p.name, 'A user')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_name IS NULL THEN
    actor_name := 'A user';
  END IF;

  PERFORM public.notify_org_admins(
    p_organization_id,
    'audit_export',
    'Audit log exported',
    actor_name || ' exported ' || p_exported_count::text || ' audit records.',
    jsonb_build_object(
      'exported_count', p_exported_count
    ),
    auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."log_audit_export_notification"("p_organization_id" "uuid", "p_exported_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_dsr_intake_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    NEW.id,
    'intake_received',
    NEW.user_id,
    NEW.requester_email,
    'Privacy request received via web form',
    jsonb_build_object(
      'request_type', NEW.request_type,
      'requester_email', NEW.requester_email,
      'has_user_id', NEW.user_id IS NOT NULL,
      'due_at', NEW.due_at
    )
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_dsr_intake_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_dsr_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_event_type text;
  v_summary text;
  v_details jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_details := jsonb_build_object(
    'old_status', OLD.status,
    'new_status', NEW.status
  );

  CASE NEW.status
    WHEN 'verifying' THEN
      v_event_type := 'verification_challenge_sent';
      v_summary := 'Request moved to verification';
    WHEN 'processing' THEN
      v_event_type := 'processing_started';
      v_summary := 'Request verified and processing started';
      v_details := v_details || jsonb_build_object(
        'verification_method', NEW.verification_method
      );
    WHEN 'completed' THEN
      v_event_type := 'request_completed';
      v_summary := 'Request fulfillment completed';
      v_details := v_details || jsonb_build_object(
        'completed_by', NEW.completed_by
      );
    WHEN 'denied' THEN
      v_event_type := 'denial_issued';
      v_summary := 'Request denied with lawful basis';
      v_details := v_details || jsonb_build_object(
        'denial_reason', NEW.denial_reason
      );
    ELSE
      v_event_type := 'note_added';
      v_summary := 'Status changed to ' || NEW.status;
  END CASE;

  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, summary, details
  ) VALUES (
    NEW.id,
    v_event_type,
    COALESCE(NEW.completed_by, NEW.verified_by),
    v_summary,
    v_details
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_dsr_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_equipment_location_change"("p_equipment_id" "uuid", "p_source" "text", "p_latitude" double precision DEFAULT NULL::double precision, "p_longitude" double precision DEFAULT NULL::double precision, "p_address_street" "text" DEFAULT NULL::"text", "p_address_city" "text" DEFAULT NULL::"text", "p_address_state" "text" DEFAULT NULL::"text", "p_address_country" "text" DEFAULT NULL::"text", "p_formatted_address" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_history_id uuid;
BEGIN
  -- Validate source
  IF p_source NOT IN ('scan', 'manual', 'team_sync', 'quickbooks') THEN
    RAISE EXCEPTION 'Invalid source: %', p_source;
  END IF;

  -- Verify caller has access to this equipment's org
  IF NOT EXISTS (
    SELECT 1 FROM public.equipment e
    JOIN public.organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = p_equipment_id
      AND om.user_id = (select auth.uid())
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the equipment organization';
  END IF;

  INSERT INTO public.equipment_location_history (
    equipment_id, source, latitude, longitude,
    address_street, address_city, address_state, address_country,
    formatted_address, changed_by, metadata
  ) VALUES (
    p_equipment_id, p_source, p_latitude, p_longitude,
    p_address_street, p_address_city, p_address_state, p_address_country,
    p_formatted_address, (select auth.uid()), p_metadata
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;


ALTER FUNCTION "public"."log_equipment_location_change"("p_equipment_id" "uuid", "p_source" "text", "p_latitude" double precision, "p_longitude" double precision, "p_address_street" "text", "p_address_city" "text", "p_address_state" "text", "p_address_country" "text", "p_formatted_address" "text", "p_metadata" "jsonb") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."log_invoice_export_audit"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_action" "text", "p_quickbooks_invoice_id" "text", "p_quickbooks_invoice_number" "text", "p_realm_id" "text", "p_ip_address" "text" DEFAULT NULL::"text", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor RECORD;
  v_audit_id UUID;
  v_work_order_title TEXT;
  v_entity_name TEXT;
  v_changes JSONB;
  v_metadata JSONB;
  v_user_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_is_service_role BOOLEAN;
  v_actor_belongs_to_org BOOLEAN;
BEGIN
  -- Security: Only service_role can call this function directly
  -- This prevents authenticated clients from bypassing permission checks
  v_is_service_role := (auth.role() = 'service_role');
  
  IF NOT v_is_service_role THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by service_role';
  END IF;
  
  -- Security: In service_role context, p_actor_id must be provided to ensure proper attribution
  -- This prevents anonymous audit log entries and ensures we can track who performed the action
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: p_actor_id is required when called from service_role context';
  END IF;
  
  -- Authorization: Verify the actor belongs to the organization
  -- This ensures that service_role callers cannot forge audit entries for arbitrary organizations
  IF p_actor_id IS NOT NULL THEN
    -- Verify that the actor is a member of the organization
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = p_organization_id
        AND om.user_id = p_actor_id
        AND om.status = 'active'
    ) INTO v_actor_belongs_to_org;
    
    IF NOT v_actor_belongs_to_org THEN
      RAISE EXCEPTION 'Access denied: Actor % is not a member of organization %', 
        p_actor_id, p_organization_id;
    END IF;
    
    -- Use explicitly provided actor ID (for service-role context)
    v_user_id := p_actor_id;
    -- Fetch user details
    SELECT p.name, u.email 
    INTO v_name, v_email
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = v_user_id;
    
    IF v_name IS NULL THEN
      v_name := COALESCE(v_email, 'Unknown User');
    END IF;
  ELSE
    -- Fall back to get_audit_actor_info() which uses auth.uid()
    -- Note: In service-role context, auth.uid() will be NULL, so this will create a System entry
    SELECT * INTO v_actor FROM public.get_audit_actor_info();
    -- Extract values from v_actor for consistent handling
    v_user_id := v_actor.actor_id;
    v_name := v_actor.actor_name;
    v_email := v_actor.actor_email;
  END IF;
  
  -- Get work order title for entity name, scoped to organization
  SELECT title INTO v_work_order_title
  FROM public.work_orders
  WHERE id = p_work_order_id
    AND organization_id = p_organization_id;
  
  -- Validate that work order exists and belongs to the organization
  IF v_work_order_title IS NULL THEN
    RAISE EXCEPTION 'Work order % does not exist or does not belong to organization %', 
      p_work_order_id, p_organization_id;
  END IF;
  
  v_entity_name := COALESCE(v_work_order_title, 'Work Order ' || p_work_order_id::TEXT);
  
  -- Build changes object
  v_changes := jsonb_build_object(
    'action', p_action,
    'quickbooks_invoice_id', p_quickbooks_invoice_id,
    'quickbooks_invoice_number', p_quickbooks_invoice_number,
    'realm_id', p_realm_id
  );
  
  -- Build metadata with IP address if provided
  v_metadata := jsonb_build_object(
    'work_order_id', p_work_order_id,
    'ip_address', p_ip_address
  );
  
  -- Insert audit record using variables directly (avoids RECORD type issues)
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
    'work_order', -- Using work_order as entity type since invoice is linked to work order
    p_work_order_id,
    v_entity_name,
    'UPDATE', -- Always use UPDATE since we're modifying work order by exporting invoice
    v_user_id,
    COALESCE(v_name, 'System'),
    v_email,
    v_changes,
    v_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;


ALTER FUNCTION "public"."log_invoice_export_audit"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_action" "text", "p_quickbooks_invoice_id" "text", "p_quickbooks_invoice_number" "text", "p_realm_id" "text", "p_ip_address" "text", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_invoice_export_audit"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_action" "text", "p_quickbooks_invoice_id" "text", "p_quickbooks_invoice_number" "text", "p_realm_id" "text", "p_ip_address" "text", "p_actor_id" "uuid") IS 'Logs audit entry when a work order is exported to QuickBooks as an invoice. Tracks user_id, action (CREATE/UPDATE), timestamp, and IP address for compliance. This function is restricted to service_role only to prevent unauthorized audit log forging.';



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


CREATE OR REPLACE FUNCTION "public"."log_scan_location_history"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
BEGIN
  IF NEW.location IS NOT NULL THEN
    -- Parse "lat, lng" text format
    BEGIN
      v_lat := NULLIF(trim(split_part(NEW.location, ',', 1)), '')::double precision;
      v_lng := NULLIF(trim(split_part(NEW.location, ',', 2)), '')::double precision;
    EXCEPTION WHEN OTHERS THEN
      v_lat := NULL;
      v_lng := NULL;
    END;

    INSERT INTO public.equipment_location_history (
      equipment_id, source, formatted_address, changed_by, latitude, longitude
    ) VALUES (
      NEW.equipment_id, 'scan', NEW.location, NEW.scanned_by, v_lat, v_lng
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_scan_location_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_work_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  changed_by_user uuid;
BEGIN
  IF current_setting('equipqr.skip_work_order_status_log', true) = 'true' THEN
    RETURN NEW;
  END IF;

  changed_by_user := auth.uid();

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.work_order_status_history
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

    PERFORM public.create_work_order_notifications(NEW.id, NEW.status::text, changed_by_user);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_work_order_status_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_work_order_status_change"() IS 'Trigger function to log work order status changes and create notifications. Fixed search_path for security.';



CREATE OR REPLACE FUNCTION "public"."migrate_personal_org_to_workspace_for_user"("p_workspace_org_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."migrate_personal_org_to_workspace_for_user"("p_workspace_org_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_personal_org_to_workspace_for_user"("p_workspace_org_id" "uuid", "p_user_id" "uuid") IS 'Migrates a single user''s personal organization into the workspace organization. Transfers all data, resolves conflicts, and sends a notification.';



CREATE OR REPLACE FUNCTION "public"."migrate_personal_orgs_to_workspace"("p_workspace_org_id" "uuid", "p_domain" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."migrate_personal_orgs_to_workspace"("p_workspace_org_id" "uuid", "p_domain" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_personal_orgs_to_workspace"("p_workspace_org_id" "uuid", "p_domain" "text") IS 'Migrates all personal organizations for users with matching domain to the workspace organization. Transfers all data, handles conflicts, and sends notifications.';



CREATE OR REPLACE FUNCTION "public"."monitoring_healthcheck"() RETURNS TABLE("ok" boolean, "checked_at" timestamp with time zone)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  select true as ok, now() as checked_at;
$$;


ALTER FUNCTION "public"."monitoring_healthcheck"() OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."normalize_domain"("p_domain" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Return NULL for NULL input to prevent errors in queries
  IF p_domain IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(trim(p_domain));
END;
$$;


ALTER FUNCTION "public"."normalize_domain"("p_domain" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_email"("p_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Return NULL for NULL input to prevent errors in queries
  IF p_email IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(trim(p_email));
END;
$$;


ALTER FUNCTION "public"."normalize_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_org_admins"("p_organization_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_actor_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.notifications (organization_id, user_id, type, title, message, data, is_global)
  SELECT
    p_organization_id,
    om.user_id,
    p_type,
    p_title,
    p_message,
    p_data,
    false
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.status = 'active'
    AND om.role IN ('owner', 'admin')
    AND (p_actor_id IS NULL OR om.user_id <> p_actor_id);
END;
$$;


ALTER FUNCTION "public"."notify_org_admins"("p_organization_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_organization_member_security_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_name text;
  member_name text;
BEGIN
  SELECT COALESCE(p.name, 'A team member')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_name IS NULL THEN
    actor_name := 'A team member';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    SELECT COALESCE(p.name, 'New member')
    INTO member_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    PERFORM public.notify_org_admins(
      NEW.organization_id,
      'member_added',
      'Organization member added',
      actor_name || ' added ' || COALESCE(member_name, 'New member') || ' to the organization.',
      jsonb_build_object(
        'member_user_id', NEW.user_id,
        'member_role', NEW.role
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    SELECT COALESCE(p.name, 'Member')
    INTO member_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    PERFORM public.notify_org_admins(
      NEW.organization_id,
      'member_role_changed',
      'Organization role updated',
      actor_name || ' changed ' || COALESCE(member_name, 'Member') || '''s role from ' || OLD.role || ' to ' || NEW.role || '.',
      jsonb_build_object(
        'member_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_organization_member_security_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_team_member_security_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  actor_name text;
  member_name text;
  v_team_name text;
  v_organization_id uuid;
BEGIN
  SELECT COALESCE(p.name, 'A team member')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_name IS NULL THEN
    actor_name := 'A team member';
  END IF;

  SELECT t.organization_id, t.name
  INTO v_organization_id, v_team_name
  FROM public.teams t
  WHERE t.id = NEW.team_id;

  IF v_organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.name, 'Member')
  INTO member_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_org_admins(
      v_organization_id,
      'team_member_added',
      'Team member added',
      actor_name || ' added ' || COALESCE(member_name, 'Member') || ' to team "' || COALESCE(v_team_name, 'Unknown') || '".',
      jsonb_build_object(
        'team_id', NEW.team_id,
        'team_name', v_team_name,
        'member_user_id', NEW.user_id,
        'member_role', NEW.role
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM public.notify_org_admins(
      v_organization_id,
      'team_member_role_changed',
      'Team role updated',
      actor_name || ' changed ' || COALESCE(member_name, 'Member') || '''s team role from ' || OLD.role || ' to ' || NEW.role || ' in "' || COALESCE(v_team_name, 'Unknown') || '".',
      jsonb_build_object(
        'team_id', NEW.team_id,
        'team_name', v_team_name,
        'member_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_team_member_security_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."peek_google_workspace_oauth_session"("p_session_token" "text", "p_nonce" "text") RETURNS TABLE("redirect_url" "text", "origin_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_session_token IS NULL OR btrim(p_session_token) = ''
     OR p_nonce IS NULL OR btrim(p_nonce) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.redirect_url, s.origin_url
  FROM public.google_workspace_oauth_sessions s
  WHERE s.session_token = p_session_token
    AND s.nonce = p_nonce
    AND s.expires_at > now()
    AND s.used_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."peek_google_workspace_oauth_session"("p_session_token" "text", "p_nonce" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."peek_google_workspace_oauth_session"("p_session_token" "text", "p_nonce" "text") IS 'Returns OAuth session redirect context when token, nonce, expiry, and unused checks pass. Does not mark used_at. service_role only (Edge OAuth callback error path).';



CREATE OR REPLACE FUNCTION "public"."prepare_account_deletion"("p_user_id" "uuid", "p_dsr_request_id" "uuid" DEFAULT NULL::"uuid", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."prepare_account_deletion"("p_user_id" "uuid", "p_dsr_request_id" "uuid", "p_actor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prepare_account_deletion"("p_user_id" "uuid", "p_dsr_request_id" "uuid", "p_actor_id" "uuid") IS 'Idempotent SQL preparation for account deletion: snapshot org-context names, redact personal profile/auth-adjacent data, delete personal rows, and emit storage work items.';



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


CREATE OR REPLACE FUNCTION "public"."prevent_dsr_event_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'DSR event records are immutable and cannot be updated or deleted';
END;
$$;


ALTER FUNCTION "public"."prevent_dsr_event_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_inactive_operator_template_with_enabled_assignments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.is_active = false AND COALESCE(OLD.is_active, true) = true THEN
    IF EXISTS (
      SELECT 1
      FROM public.equipment_operator_checkin_settings AS s
      WHERE s.template_id = NEW.id
        AND s.organization_id = NEW.organization_id
        AND s.enabled = true
    ) THEN
      RAISE EXCEPTION
        'Cannot deactivate operator checklist template while enabled equipment assignments exist';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_inactive_operator_template_with_enabled_assignments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_account_deletion"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."preview_account_deletion"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preview_account_deletion"("p_user_id" "uuid") IS 'Read-only dry run for hybrid self-service account deletion. Returns eligibility, blockers, personal/org data counts, storage actions, and Auth FK blockers.';



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



CREATE OR REPLACE FUNCTION "public"."reconcile_google_workspace_directory"("p_organization_id" "uuid", "p_sync_started_at" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_directory_marked_suspended int := 0;
  v_members_deactivated int := 0;
  v_claims_revoked int := 0;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF p_sync_started_at IS NULL THEN
    RAISE EXCEPTION 'sync_started_at is required';
  END IF;

  UPDATE public.google_workspace_directory_users gdu
  SET suspended = true,
      updated_at = now()
  WHERE gdu.organization_id = p_organization_id
    AND gdu.suspended = false
    AND (
      gdu.last_synced_at IS NULL
      OR gdu.last_synced_at < p_sync_started_at
    );
  GET DIAGNOSTICS v_directory_marked_suspended = ROW_COUNT;

  UPDATE public.organization_member_claims c
  SET status = 'revoked'
  WHERE c.organization_id = p_organization_id
    AND c.source = 'google_workspace'
    AND c.status IN ('selected', 'claimed')
    AND NOT EXISTS (
      SELECT 1
      FROM public.google_workspace_directory_users gdu
      WHERE gdu.organization_id = p_organization_id
        AND public.normalize_email(gdu.primary_email) = public.normalize_email(c.email)
        AND gdu.suspended = false
    );
  GET DIAGNOSTICS v_claims_revoked = ROW_COUNT;

  UPDATE public.organization_members om
  SET status = 'inactive'
  FROM auth.users u
  WHERE om.organization_id = p_organization_id
    AND om.user_id = u.id
    AND om.status = 'active'
    AND om.access_source = 'google_workspace'
    AND NOT EXISTS (
      SELECT 1
      FROM public.google_workspace_directory_users gdu
      WHERE gdu.organization_id = p_organization_id
        AND public.normalize_email(gdu.primary_email) = public.normalize_email(u.email)
        AND gdu.suspended = false
    );
  GET DIAGNOSTICS v_members_deactivated = ROW_COUNT;

  RETURN jsonb_build_object(
    'directory_marked_suspended', v_directory_marked_suspended,
    'members_deactivated', v_members_deactivated,
    'claims_revoked', v_claims_revoked
  );
END;
$$;


ALTER FUNCTION "public"."reconcile_google_workspace_directory"("p_organization_id" "uuid", "p_sync_started_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reconcile_google_workspace_directory"("p_organization_id" "uuid", "p_sync_started_at" timestamp with time zone) IS 'Marks active directory users not refreshed during the sync run as suspended and revokes workspace-derived memberships/claims for inactive directory users.';



CREATE OR REPLACE FUNCTION "public"."record_equipment_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.equipment_status_history
      (equipment_id, old_status, new_status, changed_at, changed_by)
    VALUES
      (NEW.id, OLD.status, NEW.status, now(), auth.uid());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."record_equipment_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_quickbooks_tokens_manual"() RETURNS TABLE("credentials_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  cred_count INTEGER;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    INNER JOIN public.quickbooks_credentials qc
      ON qc.organization_id = om.organization_id
    WHERE om.user_id = v_user_id
      AND om.status = 'active'
      AND public.can_user_manage_quickbooks(v_user_id, om.organization_id)
  ) THEN
    RAISE EXCEPTION 'QuickBooks management permission required'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO cred_count
  FROM public.quickbooks_credentials qc
  WHERE qc.access_token_expires_at < (NOW() + INTERVAL '15 minutes')
    AND qc.refresh_token_expires_at > NOW()
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = qc.organization_id
        AND om.user_id = v_user_id
        AND om.status = 'active'
        AND public.can_user_manage_quickbooks(v_user_id, om.organization_id)
    );

  PERFORM public._invoke_quickbooks_token_refresh_internal();

  RETURN QUERY
  SELECT
    cred_count,
    (
      'QuickBooks token refresh job triggered (processes all organizations). '
      || cred_count
      || ' credential(s) expiring soon in your organization(s). Check edge function logs for results.'
    )::TEXT;
END;
$$;


ALTER FUNCTION "public"."refresh_quickbooks_tokens_manual"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() IS 'Manually triggers QuickBooks token refresh for callers with QuickBooks management permission in an org that has credentials.';



CREATE OR REPLACE FUNCTION "public"."refresh_stripe_materialized_views"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  cron_job_id text;
BEGIN
  cron_job_id := current_setting('cron.job_id', true);

  IF session_user::text <> 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: refresh_stripe_materialized_views can only be called by the pg_cron scheduler as postgres';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'org_active_stripe_subscriptions'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.org_active_stripe_subscriptions;
  ELSE
    RAISE NOTICE 'Stripe materialized view refresh skipped: org_active_stripe_subscriptions does not exist yet. '
                 'Complete External Setup Procedures Section B (Change Record on issue #722) and re-apply '
                 'migration 20260503160000 to provision the MV.';
  END IF;
END;
$$;


ALTER FUNCTION "public"."refresh_stripe_materialized_views"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_stripe_materialized_views"() IS 'Refreshes Stripe-backed materialized views in the public schema using REFRESH MATERIALIZED VIEW CONCURRENTLY. Currently refreshes org_active_stripe_subscriptions only. Called by the refresh-stripe-mvs pg_cron job every 15 minutes. Secured to postgres superuser running under pg_cron only. Skips gracefully when the MV does not exist (pre-Section-B state). See migration 20260503170000 and Change Record on issue #722.';



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


CREATE OR REPLACE FUNCTION "public"."replace_historical_work_order_timeline"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_work_order public.work_orders%ROWTYPE;
  v_event jsonb;
  v_event_count integer;
  v_index integer;
  v_previous_status public.work_order_status;
  v_old_status public.work_order_status;
  v_new_status public.work_order_status;
  v_changed_at timestamptz;
  v_reason text;
  v_assignee_id uuid;
  v_allowed public.work_order_status[];
  v_last_changed_at timestamptz;
  v_acceptance_date timestamptz;
  v_completed_date timestamptz;
  v_assignee public.work_orders.assignee_id%TYPE;
  v_metadata jsonb;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is required');
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT *
  INTO v_work_order
  FROM public.work_orders
  WHERE id = p_work_order_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  IF NOT v_work_order.is_historical THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline editing is only allowed for historical work orders');
  END IF;

  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline events are required');
  END IF;

  v_event_count := jsonb_array_length(p_events);
  v_previous_status := NULL;
  v_last_changed_at := NULL;
  v_acceptance_date := NULL;
  v_completed_date := NULL;
  v_assignee := NULL;

  FOR v_index IN 0..(v_event_count - 1) LOOP
    v_event := p_events -> v_index;
    v_old_status := NULLIF(v_event ->> 'old_status', '')::public.work_order_status;
    v_new_status := NULLIF(v_event ->> 'new_status', '')::public.work_order_status;
    v_changed_at := NULLIF(v_event ->> 'changed_at', '')::timestamptz;
    v_reason := NULLIF(v_event ->> 'reason', '');
    v_assignee_id := NULLIF(v_event ->> 'assignee_id', '')::uuid;

    IF v_new_status IS NULL OR v_changed_at IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Each timeline event requires new_status and changed_at');
    END IF;

    IF v_index = 0 AND v_new_status <> 'submitted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline must begin with submitted');
    END IF;

    IF v_old_status IS DISTINCT FROM v_previous_status THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline event chain is inconsistent');
    END IF;

    IF v_previous_status IS NULL THEN
      IF v_old_status IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'First timeline event must start from created state');
      END IF;
    ELSE
      v_allowed := public.historical_timeline_allowed_next_statuses(v_previous_status);
      IF NOT (v_new_status = ANY (v_allowed)) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Invalid transition from %s to %s', v_previous_status, v_new_status)
        );
      END IF;
    END IF;

    IF v_new_status = 'assigned' AND v_assignee_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assigned events require an assignee');
    END IF;

    IF v_assignee_id IS NOT NULL
       AND NOT public.is_valid_work_order_assignee(
         v_work_order.equipment_id,
         v_work_order.organization_id,
         v_assignee_id
       ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assignee is not valid for this work order');
    END IF;

    IF v_last_changed_at IS NOT NULL AND v_changed_at < v_last_changed_at THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline events must be in chronological order');
    END IF;

    IF v_new_status = 'accepted'
       OR (v_new_status IN ('assigned', 'in_progress') AND v_assignee_id IS NOT NULL) THEN
      v_acceptance_date := COALESCE(v_acceptance_date, v_changed_at);
    END IF;

    IF v_new_status = 'assigned' AND v_assignee_id IS NOT NULL THEN
      v_assignee := v_assignee_id;
    END IF;

    IF v_new_status = 'completed' THEN
      v_completed_date := v_changed_at;
    ELSIF v_new_status IN ('submitted', 'accepted', 'assigned', 'in_progress', 'on_hold') THEN
      v_completed_date := NULL;
    END IF;

    v_previous_status := v_new_status;
    v_last_changed_at := v_changed_at;
  END LOOP;

  DELETE FROM public.work_order_status_history
  WHERE work_order_id = p_work_order_id;

  v_previous_status := NULL;

  FOR v_index IN 0..(v_event_count - 1) LOOP
    v_event := p_events -> v_index;
    v_old_status := NULLIF(v_event ->> 'old_status', '')::public.work_order_status;
    v_new_status := NULLIF(v_event ->> 'new_status', '')::public.work_order_status;
    v_changed_at := NULLIF(v_event ->> 'changed_at', '')::timestamptz;
    v_reason := COALESCE(NULLIF(v_event ->> 'reason', ''), 'Historical status recorded');
    v_assignee_id := NULLIF(v_event ->> 'assignee_id', '')::uuid;

    v_metadata := '{}'::jsonb;
    IF v_new_status = 'assigned' AND v_assignee_id IS NOT NULL THEN
      v_metadata := jsonb_build_object('assignee_id', v_assignee_id);
    END IF;

    INSERT INTO public.work_order_status_history (
      work_order_id,
      old_status,
      new_status,
      changed_by,
      changed_at,
      reason,
      metadata,
      is_historical_creation
    ) VALUES (
      p_work_order_id,
      v_old_status,
      v_new_status,
      auth.uid(),
      v_changed_at,
      v_reason,
      v_metadata,
      true
    );

    v_previous_status := v_new_status;
  END LOOP;

  PERFORM set_config('equipqr.skip_work_order_status_log', 'true', true);

  UPDATE public.work_orders
  SET
    status = v_previous_status,
    assignee_id = v_assignee,
    created_date = (p_events -> 0 ->> 'changed_at')::timestamptz,
    historical_start_date = (p_events -> 0 ->> 'changed_at')::timestamptz,
    acceptance_date = v_acceptance_date,
    completed_date = v_completed_date,
    updated_at = NOW()
  WHERE id = p_work_order_id;

  PERFORM set_config('equipqr.skip_work_order_status_log', 'false', true);

  IF NOT p_skip_audit THEN
    PERFORM public.log_audit_entry(
      v_work_order.organization_id,
      'work_order',
      p_work_order_id,
      v_work_order.title,
      'UPDATE',
      jsonb_build_object(
        'timeline', jsonb_build_object(
          'old', NULL,
          'new', jsonb_build_object('event_count', v_event_count)
        )
      ),
      jsonb_build_object(
        'timeline_replaced', true,
        'event_count', v_event_count,
        'source', 'historical_timeline_editor'
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', p_work_order_id,
    'event_count', v_event_count,
    'status', v_previous_status
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('equipqr.skip_work_order_status_log', 'false', true);
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to replace historical timeline: ' || SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."replace_historical_work_order_timeline"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_historical_work_order_timeline"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) IS 'Owner/admin-only replacement of backdated historical work order timeline events with explicit organization scoping. Issue #1080, #1098.';



CREATE OR REPLACE FUNCTION "public"."request_workspace_personal_org_merge"("p_workspace_org_id" "uuid", "p_target_user_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_requester_id uuid;
  v_requester_name text;
  v_target_name text;
  v_org_name text;
  v_existing_pending uuid;
  v_request_id uuid;
  v_personal_org_id uuid;
BEGIN
  v_requester_id := auth.uid();

  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate requester is an active owner/admin of the workspace org
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_workspace_org_id
      AND om.user_id = v_requester_id
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only organization administrators can request a merge');
  END IF;

  -- Validate target is an active member of the workspace org
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_workspace_org_id
      AND om.user_id = p_target_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user must be an active member of the organization');
  END IF;

  -- Ensure target has a personal organization to merge
  SELECT organization_id INTO v_personal_org_id
  FROM public.personal_organizations
  WHERE user_id = p_target_user_id;

  IF v_personal_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user does not have a personal organization to merge');
  END IF;

  -- Expire any pending requests that are past their expiration
  UPDATE public.workspace_personal_org_merge_requests
  SET status = 'expired',
      responded_at = now(),
      completed_at = now()
  WHERE workspace_org_id = p_workspace_org_id
    AND requested_for_user_id = p_target_user_id
    AND status = 'pending'
    AND expires_at < now();

  -- Prevent duplicate active requests
  SELECT id INTO v_existing_pending
  FROM public.workspace_personal_org_merge_requests
  WHERE workspace_org_id = p_workspace_org_id
    AND requested_for_user_id = p_target_user_id
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF v_existing_pending IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A pending merge request already exists for this user');
  END IF;

  SELECT COALESCE(name, 'Unknown') INTO v_requester_name
  FROM public.profiles WHERE id = v_requester_id;

  SELECT COALESCE(name, 'Unknown') INTO v_target_name
  FROM public.profiles WHERE id = p_target_user_id;

  SELECT COALESCE(name, 'Organization') INTO v_org_name
  FROM public.organizations WHERE id = p_workspace_org_id;

  INSERT INTO public.workspace_personal_org_merge_requests (
    workspace_org_id,
    requested_by_user_id,
    requested_for_user_id,
    requested_by_name,
    requested_for_name,
    request_reason
  ) VALUES (
    p_workspace_org_id,
    v_requester_id,
    p_target_user_id,
    v_requester_name,
    v_target_name,
    p_reason
  ) RETURNING id INTO v_request_id;

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
    p_target_user_id,
    'workspace_merge_request',
    'Data merge requested',
    v_requester_name || ' requested to merge your personal organization into ' || v_org_name || '.',
    jsonb_build_object(
      'organization_id', p_workspace_org_id,
      'merge_request_id', v_request_id,
      'workspace_org_id', p_workspace_org_id,
      'workspace_org_name', v_org_name,
      'requested_by_user_id', v_requester_id,
      'requested_by_name', v_requester_name
    ),
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Merge request sent to ' || v_target_name
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."request_workspace_personal_org_merge"("p_workspace_org_id" "uuid", "p_target_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."request_workspace_personal_org_merge"("p_workspace_org_id" "uuid", "p_target_user_id" "uuid", "p_reason" "text") IS 'Request that a user merge their personal organization into a Workspace organization. Only owners/admins may request.';



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


CREATE OR REPLACE FUNCTION "public"."resolve_effective_pm_interval_policy"("p_equipment_id" "uuid") RETURNS TABLE("interval_value" integer, "interval_type" "text", "template_name" "text", "source" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id           uuid;
  v_team_id          uuid;
  v_template_id      uuid;
  v_template_name    text;
  v_policy           record;
BEGIN
  SELECT e.organization_id, e.team_id, e.default_pm_template_id
  INTO v_org_id, v_team_id, v_template_id
  FROM public.equipment e
  WHERE e.id = p_equipment_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF v_template_id IS NOT NULL THEN
    SELECT t.name
    INTO v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_template_id;
  END IF;

  -- Equipment policy
  SELECT p.schedule_mode, p.interval_value, p.interval_type
  INTO v_policy
  FROM public.pm_interval_policies p
  WHERE p.organization_id = v_org_id
    AND p.equipment_id = p_equipment_id
    AND p.policy_slot = 'default'
  LIMIT 1;

  IF FOUND THEN
    IF v_policy.schedule_mode = 'none' THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      v_policy.interval_value,
      v_policy.interval_type,
      COALESCE(v_template_name, 'Equipment schedule'),
      'equipment_policy'::text;
    RETURN;
  END IF;

  -- Team policy
  IF v_team_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_org_id
      AND p.team_id = v_team_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      IF v_policy.schedule_mode = 'none' THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Team schedule'),
        'team_policy'::text;
      RETURN;
    END IF;
  END IF;

  -- Template policy (org-scoped row for default template)
  IF v_template_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_org_id
      AND p.pm_template_id = v_template_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      IF v_policy.schedule_mode = 'none' THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Template schedule'),
        'template_policy'::text;
      RETURN;
    END IF;

    -- Legacy template column fallback
    SELECT t.interval_value, t.interval_type, t.name
    INTO v_policy.interval_value, v_policy.interval_type, v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_template_id
      AND t.interval_value IS NOT NULL;

    IF v_policy.interval_value IS NOT NULL THEN
      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        v_template_name,
        'template_default'::text;
      RETURN;
    END IF;
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."resolve_effective_pm_interval_policy"("p_equipment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_operator_checkin_by_token"("p_token_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row record;
BEGIN
  IF p_token_hash IS NULL OR length(trim(p_token_hash)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT
    s.id,
    s.organization_id,
    s.equipment_id,
    s.template_id,
    s.enabled,
    jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'serial_number', e.serial_number,
      'manufacturer', e.manufacturer,
      'model', e.model,
      'status', e.status,
      'location', e.location,
      'working_hours', e.working_hours,
      'custom_attributes', e.custom_attributes,
      'organization_id', e.organization_id,
      'team', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('id', t.id, 'name', t.name) END,
      'organizations', jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'scan_location_collection_enabled', o.scan_location_collection_enabled
      )
    ) AS equipment,
    jsonb_build_object(
      'id', tpl.id,
      'name', tpl.name,
      'description', tpl.description,
      'template_data', tpl.template_data,
      'is_active', tpl.is_active
    ) AS template
  INTO v_row
  FROM public.equipment_operator_checkin_settings s
  JOIN public.equipment e
    ON e.id = s.equipment_id
   AND e.organization_id = s.organization_id
  JOIN public.organizations o ON o.id = s.organization_id
  LEFT JOIN public.teams t ON t.id = e.team_id
  JOIN public.operator_checklist_templates tpl
    ON tpl.id = s.template_id
   AND tpl.organization_id = s.organization_id
  WHERE s.public_token_hash = p_token_hash
    AND s.enabled = true
    AND tpl.is_active = true
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'equipment_id', v_row.equipment_id,
    'template_id', v_row.template_id,
    'enabled', v_row.enabled,
    'equipment', v_row.equipment,
    'template', v_row.template
  );
END;
$$;


ALTER FUNCTION "public"."resolve_operator_checkin_by_token"("p_token_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_quick_form_by_token"("p_token_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row record;
BEGIN
  IF p_token_hash IS NULL OR length(trim(p_token_hash)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT
    f.id,
    f.organization_id,
    f.name,
    f.description,
    f.form_data,
    f.is_active,
    o.name AS organization_name
  INTO v_row
  FROM public.quick_forms f
  JOIN public.organizations o ON o.id = f.organization_id
  WHERE f.public_token_hash = p_token_hash
    AND f.is_active = true
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'name', v_row.name,
    'description', v_row.description,
    'form_data', v_row.form_data,
    'is_active', v_row.is_active,
    'organization_name', v_row.organization_name
  );
END;
$$;


ALTER FUNCTION "public"."resolve_quick_form_by_token"("p_token_hash" "text") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."respond_to_workspace_personal_org_merge"("p_request_id" "uuid", "p_accept" boolean, "p_response_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_request RECORD;
  v_current_user_id uuid;
  v_org_name text;
  v_migration_stats jsonb;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_request
  FROM public.workspace_personal_org_merge_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Merge request not found');
  END IF;

  IF v_request.requested_for_user_id != v_current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the target user can respond to this merge request');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This merge request has already been processed');
  END IF;

  IF v_request.expires_at < now() THEN
    UPDATE public.workspace_personal_org_merge_requests
    SET status = 'expired',
        responded_at = now(),
        completed_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', false, 'error', 'This merge request has expired');
  END IF;

  SELECT COALESCE(name, 'Organization') INTO v_org_name
  FROM public.organizations WHERE id = v_request.workspace_org_id;

  IF p_accept THEN
    -- Accept and execute per-user migration
    EXECUTE
      'SELECT public.migrate_personal_org_to_workspace_for_user($1, $2)'
    INTO v_migration_stats
    USING v_request.workspace_org_id, v_request.requested_for_user_id;

    UPDATE public.workspace_personal_org_merge_requests
    SET status = 'accepted',
        response_reason = p_response_reason,
        responded_at = now(),
        completed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_request.workspace_org_id,
      v_request.requested_by_user_id,
      'workspace_merge_accepted',
      'Data merge accepted',
      v_request.requested_for_name || ' accepted the personal org merge into ' || v_org_name || '.',
      jsonb_build_object(
        'organization_id', v_request.workspace_org_id,
        'merge_request_id', v_request.id,
        'workspace_org_id', v_request.workspace_org_id,
        'workspace_org_name', v_org_name
      ),
      true
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Personal organization merged into ' || v_org_name,
      'migration_stats', v_migration_stats
    );
  ELSE
    UPDATE public.workspace_personal_org_merge_requests
    SET status = 'rejected',
        response_reason = p_response_reason,
        responded_at = now(),
        completed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_request.workspace_org_id,
      v_request.requested_by_user_id,
      'workspace_merge_rejected',
      'Data merge rejected',
      v_request.requested_for_name || ' declined the personal org merge into ' || v_org_name || '.',
      jsonb_build_object(
        'organization_id', v_request.workspace_org_id,
        'merge_request_id', v_request.id,
        'workspace_org_id', v_request.workspace_org_id,
        'workspace_org_name', v_org_name
      ),
      true
    );

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Merge request rejected'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$_$;


ALTER FUNCTION "public"."respond_to_workspace_personal_org_merge"("p_request_id" "uuid", "p_accept" boolean, "p_response_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."respond_to_workspace_personal_org_merge"("p_request_id" "uuid", "p_accept" boolean, "p_response_reason" "text") IS 'Accept or reject a personal org merge request. Only the target user can respond.';



CREATE OR REPLACE FUNCTION "public"."restore_operator_checklist_template"("p_template_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_has_submissions boolean;
  v_reenabled_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.operator_checklist_templates
  WHERE id = p_template_id
  FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF (SELECT is_active FROM public.operator_checklist_templates WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Template is already active';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.operator_checkin_submissions
    WHERE template_id = p_template_id
      AND organization_id = v_org_id
  ) INTO v_has_submissions;

  IF NOT v_has_submissions THEN
    RAISE EXCEPTION 'Cannot restore template without ledger submissions';
  END IF;

  UPDATE public.operator_checklist_templates
  SET is_active = true,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_template_id
    AND organization_id = v_org_id;

  UPDATE public.equipment_operator_checkin_settings
  SET enabled = true,
      updated_at = now()
  WHERE template_id = p_template_id
    AND organization_id = v_org_id
    AND enabled = false;

  GET DIAGNOSTICS v_reenabled_count = ROW_COUNT;

  RETURN v_reenabled_count;
END;
$$;


ALTER FUNCTION "public"."restore_operator_checklist_template"("p_template_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."rotate_operator_checkin_token"("p_settings_id" "uuid") RETURNS TABLE("raw_token" "text", "token_hash" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_org_id uuid;
  v_new_token text;
  v_new_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.equipment_operator_checkin_settings
  WHERE id = p_settings_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Settings not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  UPDATE public.equipment_operator_checkin_settings
  SET public_token_hash = v_new_hash,
      token_rotated_at = now(),
      token_rotated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_settings_id;

  INSERT INTO public.operator_checkin_token_secrets (settings_id, organization_id, raw_token)
  VALUES (p_settings_id, v_org_id, v_new_token)
  ON CONFLICT (settings_id) DO UPDATE
    SET raw_token = EXCLUDED.raw_token,
        organization_id = EXCLUDED.organization_id,
        updated_at = now();

  raw_token := v_new_token;
  token_hash := v_new_hash;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."rotate_operator_checkin_token"("p_settings_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rotate_quick_form_token"("p_quick_form_id" "uuid") RETURNS TABLE("raw_token" "text", "token_hash" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_org_id uuid;
  v_new_token text;
  v_new_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.quick_forms
  WHERE id = p_quick_form_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Quick form not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_new_hash := encode(digest(v_new_token, 'sha256'), 'hex');

  UPDATE public.quick_forms
  SET public_token_hash = v_new_hash,
      token_rotated_at = now(),
      token_rotated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_quick_form_id;

  INSERT INTO public.quick_form_token_secrets (quick_form_id, organization_id, raw_token)
  VALUES (p_quick_form_id, v_org_id, v_new_token)
  ON CONFLICT (quick_form_id) DO UPDATE
    SET raw_token = EXCLUDED.raw_token,
        organization_id = EXCLUDED.organization_id,
        updated_at = now();

  raw_token := v_new_token;
  token_hash := v_new_hash;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."rotate_quick_form_token"("p_quick_form_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."select_google_workspace_members"("p_organization_id" "uuid", "p_emails" "text"[], "p_admin_emails" "text"[] DEFAULT '{}'::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id uuid;
  v_member_count int := 0;
  v_admin_applied int := 0;
  v_admin_pending int := 0;
  v_invalid_emails text[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only organization administrators can add members';
  END IF;

  SELECT array_agg(normalized_email ORDER BY normalized_email)
  INTO v_invalid_emails
  FROM (
    SELECT public.normalize_email(e) AS normalized_email
    FROM unnest(p_emails) AS e
  ) requested
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.google_workspace_directory_users gdu
    WHERE gdu.organization_id = p_organization_id
      AND public.normalize_email(gdu.primary_email) = requested.normalized_email
      AND gdu.suspended = false
  );

  IF v_invalid_emails IS NOT NULL AND array_length(v_invalid_emails, 1) > 0 THEN
    RAISE EXCEPTION
      'One or more emails are not active Google Workspace directory users for this organization: %',
      array_to_string(v_invalid_emails, ', ');
  END IF;

  INSERT INTO public.organization_member_claims (
    organization_id, email, source, status, created_by
  )
  SELECT
    p_organization_id,
    public.normalize_email(e),
    'google_workspace',
    'selected',
    v_user_id
  FROM unnest(p_emails) AS e
  ON CONFLICT (organization_id, public.normalize_email(email))
    WHERE status IN ('selected', 'claimed')
    DO UPDATE
      SET status = 'selected',
          created_by = EXCLUDED.created_by,
          created_at = now();

  INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
  SELECT p_organization_id, u.id, 'member', 'active', 'google_workspace'
  FROM auth.users u
  WHERE public.normalize_email(u.email) = ANY (
    SELECT public.normalize_email(e) FROM unnest(p_emails) AS e
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = 'active',
        access_source = 'google_workspace'
    WHERE public.organization_members.access_source IS NULL
       OR public.organization_members.access_source = 'google_workspace';

  GET DIAGNOSTICS v_member_count = ROW_COUNT;

  INSERT INTO public.organization_role_grants_pending (
    organization_id, email, desired_role, status, created_by
  )
  SELECT
    p_organization_id,
    public.normalize_email(e),
    'admin',
    'pending',
    v_user_id
  FROM unnest(p_admin_emails) AS e
  ON CONFLICT (organization_id, public.normalize_email(email))
    WHERE status = 'pending'
    DO NOTHING;

  UPDATE public.organization_members om
  SET role = 'admin'
  FROM auth.users u
  WHERE om.organization_id = p_organization_id
    AND om.user_id = u.id
    AND public.normalize_email(u.email) = ANY (
      SELECT public.normalize_email(e) FROM unnest(p_admin_emails) AS e
    )
    AND om.role = 'member'
    AND public.is_user_google_oauth_verified(u.id);

  GET DIAGNOSTICS v_admin_applied = ROW_COUNT;

  UPDATE public.organization_role_grants_pending pg
  SET status = 'applied',
      applied_user_id = u.id,
      applied_at = now()
  FROM auth.users u
  WHERE pg.organization_id = p_organization_id
    AND pg.status = 'pending'
    AND public.normalize_email(pg.email) = public.normalize_email(u.email)
    AND public.is_user_google_oauth_verified(u.id);

  SELECT COUNT(*) INTO v_admin_pending
  FROM public.organization_role_grants_pending pg
  WHERE pg.organization_id = p_organization_id
    AND pg.status = 'pending';

  RETURN jsonb_build_object(
    'members_added', v_member_count,
    'admin_applied', v_admin_applied,
    'admin_pending', v_admin_pending
  );
END;
$$;


ALTER FUNCTION "public"."select_google_workspace_members"("p_organization_id" "uuid", "p_emails" "text"[], "p_admin_emails" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."select_google_workspace_members"("p_organization_id" "uuid", "p_emails" "text"[], "p_admin_emails" "text"[]) IS 'Selects Google Workspace directory users as organization members. Every email must exist in google_workspace_directory_users for the org and not be suspended.';



CREATE OR REPLACE FUNCTION "public"."set_bypass_triggers"("bypass" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config('app.bypass_triggers', bypass::text, true);
END;
$$;


ALTER FUNCTION "public"."set_bypass_triggers"("bypass" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_equipment_note_organization_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  SELECT e.organization_id
  INTO NEW.organization_id
  FROM public.equipment e
  WHERE e.id = NEW.equipment_id;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'equipment_notes requires equipment with organization_id'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_equipment_note_organization_id"() OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."snapshot_account_deletion_attribution"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."snapshot_account_deletion_attribution"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."snapshot_pm_working_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_hours numeric;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.equipment_working_hours_at_completion IS NULL
  THEN
    SELECT working_hours INTO v_hours
    FROM public.equipment
    WHERE id = NEW.equipment_id;

    IF v_hours IS NOT NULL THEN
      NEW.equipment_working_hours_at_completion := v_hours;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."snapshot_pm_working_hours"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."storage_object_path_segment_uuid"("p_object_name" "text", "p_segment_index" integer) RETURNS "uuid"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
  SELECT CASE
    WHEN (storage.foldername(p_object_name))[p_segment_index] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (storage.foldername(p_object_name))[p_segment_index]::uuid
    ELSE NULL
  END;
$_$;


ALTER FUNCTION "public"."storage_object_path_segment_uuid"("p_object_name" "text", "p_segment_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_operator_checkin_public"("p_token_hash" "text", "p_operator_field_values" "jsonb", "p_client_field_values" "jsonb", "p_equipment_field_values" "jsonb", "p_checklist_answers" "jsonb", "p_template_snapshot" "jsonb", "p_is_complete" boolean, "p_required_item_count" integer, "p_answered_required_count" integer, "p_request_fingerprint" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_settings record;
  v_submission_id uuid;
  v_submitted_at timestamptz := now();
  v_recent_count integer;
BEGIN
  SELECT s.id, s.organization_id, s.equipment_id, s.template_id, s.enabled, tpl.is_active
  INTO v_settings
  FROM public.equipment_operator_checkin_settings s
  JOIN public.operator_checklist_templates tpl
    ON tpl.id = s.template_id
   AND tpl.organization_id = s.organization_id
  WHERE s.public_token_hash = p_token_hash
  LIMIT 1;

  IF v_settings IS NULL OR NOT v_settings.enabled OR NOT v_settings.is_active THEN
    RAISE EXCEPTION 'Check-in is not available';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.operator_checkin_submissions sub
  WHERE sub.settings_id = v_settings.id
    AND sub.organization_id = v_settings.organization_id
    AND sub.submitted_at >= (now() - interval '1 hour');

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Too many check-ins. Please try again later.';
  END IF;

  INSERT INTO public.operator_checkin_submissions (
    organization_id,
    equipment_id,
    template_id,
    settings_id,
    submitted_at,
    template_snapshot,
    operator_field_values,
    client_field_values,
    equipment_field_values,
    checklist_answers,
    is_complete,
    required_item_count,
    answered_required_count,
    request_fingerprint
  ) VALUES (
    v_settings.organization_id,
    v_settings.equipment_id,
    v_settings.template_id,
    v_settings.id,
    v_submitted_at,
    COALESCE(p_template_snapshot, '{}'::jsonb),
    COALESCE(p_operator_field_values, '[]'::jsonb),
    COALESCE(p_client_field_values, '[]'::jsonb),
    COALESCE(p_equipment_field_values, '[]'::jsonb),
    COALESCE(p_checklist_answers, '[]'::jsonb),
    COALESCE(p_is_complete, false),
    COALESCE(p_required_item_count, 0),
    COALESCE(p_answered_required_count, 0),
    left(COALESCE(p_request_fingerprint, ''), 128)
  )
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'id', v_submission_id,
    'submitted_at', v_submitted_at
  );
END;
$$;


ALTER FUNCTION "public"."submit_operator_checkin_public"("p_token_hash" "text", "p_operator_field_values" "jsonb", "p_client_field_values" "jsonb", "p_equipment_field_values" "jsonb", "p_checklist_answers" "jsonb", "p_template_snapshot" "jsonb", "p_is_complete" boolean, "p_required_item_count" integer, "p_answered_required_count" integer, "p_request_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_quick_form_public"("p_token_hash" "text", "p_field_values" "jsonb", "p_client_context" "jsonb", "p_form_snapshot" "jsonb", "p_request_fingerprint" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_form record;
  v_submission_id uuid;
  v_submitted_at timestamptz := now();
  v_recent_count integer;
BEGIN
  SELECT f.id, f.organization_id, f.is_active
  INTO v_form
  FROM public.quick_forms f
  WHERE f.public_token_hash = p_token_hash
  LIMIT 1;

  IF v_form IS NULL OR NOT v_form.is_active THEN
    RAISE EXCEPTION 'Form is not available';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.quick_form_submissions sub
  WHERE sub.quick_form_id = v_form.id
    AND sub.submitted_at >= (now() - interval '1 hour');

  IF v_recent_count >= 60 THEN
    RAISE EXCEPTION 'Too many submissions. Please try again later.';
  END IF;

  INSERT INTO public.quick_form_submissions (
    organization_id,
    quick_form_id,
    submitted_at,
    form_snapshot,
    field_values,
    client_context,
    request_fingerprint
  ) VALUES (
    v_form.organization_id,
    v_form.id,
    v_submitted_at,
    COALESCE(p_form_snapshot, '{}'::jsonb),
    COALESCE(p_field_values, '[]'::jsonb),
    COALESCE(p_client_context, '{}'::jsonb),
    left(COALESCE(p_request_fingerprint, ''), 128)
  )
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'id', v_submission_id,
    'submitted_at', v_submitted_at
  );
END;
$$;


ALTER FUNCTION "public"."submit_quick_form_public"("p_token_hash" "text", "p_field_values" "jsonb", "p_client_context" "jsonb", "p_form_snapshot" "jsonb", "p_request_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_equipment_customer_from_team"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    UPDATE public.equipment
    SET customer_id = NEW.customer_id
    WHERE team_id = NEW.id
      AND (customer_id IS NULL OR customer_id = OLD.customer_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_equipment_customer_from_team"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_equipment_last_known_location_from_scan"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
BEGIN
  IF NEW.location IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_lat := NULLIF(trim(split_part(NEW.location, ',', 1)), '')::double precision;
    v_lng := NULLIF(trim(split_part(NEW.location, ',', 2)), '')::double precision;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180 THEN
    RETURN NEW;
  END IF;

  UPDATE public.equipment
  SET last_known_location = jsonb_build_object(
    'latitude', v_lat,
    'longitude', v_lng,
    'updated_at', NEW.scanned_at
  )
  WHERE id = NEW.equipment_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_equipment_last_known_location_from_scan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_equipment_last_maintenance_from_work_order"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_completed_date date;
  v_existing date;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.equipment_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.has_pm IS TRUE OR NEW.pm_required IS TRUE THEN
      IF NEW.completed_date IS NULL THEN
        RETURN NEW;
      END IF;

      v_completed_date := NEW.completed_date::date;

      SELECT last_maintenance
      INTO v_existing
      FROM public.equipment
      WHERE id = NEW.equipment_id
        AND organization_id = NEW.organization_id;

      IF v_existing IS NULL OR v_completed_date > v_existing THEN
        UPDATE public.equipment
        SET last_maintenance = v_completed_date,
            last_maintenance_work_order_id = NEW.id,
            updated_at = now()
        WHERE id = NEW.equipment_id
          AND organization_id = NEW.organization_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_equipment_last_maintenance_from_work_order"() OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."synthesize_historical_timeline_events"("p_historical_start_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_status" "public"."work_order_status", "p_assignee_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  v_end timestamptz;
  v_statuses public.work_order_status[];
  v_count integer;
  v_step interval;
  v_events jsonb := '[]'::jsonb;
  v_previous_status public.work_order_status;
  v_new_status public.work_order_status;
  v_changed_at timestamptz;
  v_index integer;
BEGIN
  v_end := COALESCE(p_completed_date, p_historical_start_date);

  v_statuses := CASE p_status
    WHEN 'submitted' THEN ARRAY['submitted']::public.work_order_status[]
    WHEN 'accepted' THEN ARRAY['submitted', 'accepted']::public.work_order_status[]
    WHEN 'assigned' THEN ARRAY['submitted', 'accepted', 'assigned']::public.work_order_status[]
    WHEN 'in_progress' THEN ARRAY['submitted', 'accepted', 'assigned', 'in_progress']::public.work_order_status[]
    WHEN 'on_hold' THEN ARRAY['submitted', 'accepted', 'assigned', 'on_hold']::public.work_order_status[]
    WHEN 'completed' THEN ARRAY['submitted', 'accepted', 'assigned', 'in_progress', 'completed']::public.work_order_status[]
    WHEN 'cancelled' THEN ARRAY['submitted', 'cancelled']::public.work_order_status[]
    ELSE ARRAY['submitted']::public.work_order_status[]
  END;

  v_count := COALESCE(array_length(v_statuses, 1), 0);
  IF v_count = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF v_count = 1 THEN
    v_step := interval '0';
  ELSE
    v_step := (v_end - p_historical_start_date) / (v_count - 1);
  END IF;

  v_previous_status := NULL;

  FOR v_index IN 1..v_count LOOP
    v_new_status := v_statuses[v_index];
    v_changed_at := p_historical_start_date + (v_step * (v_index - 1));

    v_events := v_events || jsonb_build_array(
      jsonb_build_object(
        'old_status', v_previous_status,
        'new_status', v_new_status,
        'changed_at', v_changed_at,
        'reason', CASE
          WHEN v_index = 1 THEN 'Historical work order created'
          ELSE 'Historical status recorded'
        END,
        'assignee_id', CASE
          WHEN v_new_status = 'assigned' THEN p_assignee_id
          ELSE NULL
        END
      )
    );

    v_previous_status := v_new_status;
  END LOOP;

  RETURN v_events;
END;
$$;


ALTER FUNCTION "public"."synthesize_historical_timeline_events"("p_historical_start_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_status" "public"."work_order_status", "p_assignee_id" "uuid") OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."update_customers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_customers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid", "p_content" "text" DEFAULT NULL::"text", "p_is_private" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.equipment_notes%ROWTYPE;
  v_changes jsonb := '{}'::jsonb;
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

  IF NOT public.can_edit_equipment_note(v_user_id, p_organization_id, p_equipment_id, p_note_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = p_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id
  FOR UPDATE OF en;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF p_content IS NOT NULL AND p_content IS DISTINCT FROM v_note.content THEN
    v_changes := v_changes || jsonb_build_object(
      'content', jsonb_build_object('old', v_note.content, 'new', p_content)
    );
  END IF;

  IF p_is_private IS NOT NULL AND p_is_private IS DISTINCT FROM v_note.is_private THEN
    IF NOT (
      public.is_org_admin(v_user_id, p_organization_id)
      OR public.is_equipment_team_manager(v_user_id, p_equipment_id)
      OR (
        v_note.author_id = v_user_id
        AND NOT public.is_team_viewer_or_requestor(
          v_user_id,
          (SELECT e.team_id FROM public.equipment e WHERE e.id = p_equipment_id)
        )
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

  UPDATE public.equipment_notes
  SET
    content = COALESCE(p_content, content),
    is_private = COALESCE(p_is_private, is_private),
    last_modified_by = v_user_id,
    last_modified_at = now(),
    updated_at = now()
  WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'equipment',
    p_equipment_id,
    (SELECT e.name FROM public.equipment e WHERE e.id = p_equipment_id),
    'UPDATE',
    v_changes,
    jsonb_build_object('note_id', p_note_id, 'source', 'equipment_note_editor')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to update note: ' || SQLERRM);
END;
$$;


ALTER FUNCTION "public"."update_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) IS 'Update equipment note content/visibility with role checks and audit logging. Issue #1185.';



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


CREATE OR REPLACE FUNCTION "public"."update_external_customer_contacts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_external_customer_contacts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_historical_work_order_note_timestamp"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_created_at" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_work_order public.work_orders%ROWTYPE;
  v_note public.work_order_notes%ROWTYPE;
  v_old_created_at timestamptz;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is required');
  END IF;

  IF p_created_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note timestamp is required');
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT *
  INTO v_work_order
  FROM public.work_orders
  WHERE id = p_work_order_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  IF NOT v_work_order.is_historical THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      'Note timestamp editing is only allowed for historical work orders'
    );
  END IF;

  SELECT *
  INTO v_note
  FROM public.work_order_notes
  WHERE id = p_note_id
    AND work_order_id = p_work_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  v_old_created_at := v_note.created_at;

  UPDATE public.work_order_notes
  SET
    created_at = p_created_at,
    updated_at = NOW()
  WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    v_work_order.organization_id,
    'work_order',
    p_work_order_id,
    v_work_order.title,
    'UPDATE',
    jsonb_build_object(
      'note_timestamp', jsonb_build_object(
        'old', v_old_created_at,
        'new', p_created_at
      )
    ),
    jsonb_build_object(
      'note_id', p_note_id,
      'source', 'historical_note_timestamp_editor'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', p_work_order_id,
    'note_id', p_note_id,
    'created_at', p_created_at
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to update note timestamp: ' || SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."update_historical_work_order_note_timestamp"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_created_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_historical_work_order_note_timestamp"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_created_at" timestamp with time zone) IS 'Owner/admin-only backdated note timestamp edits for historical work orders with audit logging. Issue #1121.';



CREATE OR REPLACE FUNCTION "public"."update_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") RETURNS "public"."external_customer_contacts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_row public.external_customer_contacts;
  v_org_id uuid;
  v_source text;
  v_source_external_id text;
  v_source_field text;
  v_customer_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    ecc.customer_id,
    ecc.source,
    ecc.source_external_id,
    ecc.source_field,
    c.organization_id
  INTO
    v_customer_id,
    v_source,
    v_source_external_id,
    v_source_field,
    v_org_id
  FROM public.external_customer_contacts ecc
  JOIN public.customers c ON c.id = ecc.customer_id
  WHERE ecc.id = p_contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  IF v_org_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF public.is_org_admin((SELECT auth.uid()), v_org_id) THEN
    NULL;
  ELSIF v_source = 'manual'
    AND v_source_external_id IS NULL
    AND v_source_field IS NULL
    AND public.can_manage_manual_external_customer_contact(p_organization_id, v_customer_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.external_customer_contacts
  SET
    name = p_name,
    email = p_email,
    phone = p_phone,
    role = p_role,
    notes = p_notes
  WHERE id = p_contact_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;


ALTER FUNCTION "public"."update_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") OWNER TO "postgres";


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
  ELSIF TG_TABLE_NAME = 'inventory_item_images' THEN
    -- inventory_item_images has organization_id directly on the row
    IF TG_OP = 'DELETE' THEN
      org_id := OLD.organization_id;
    ELSE
      org_id := NEW.organization_id;
    END IF;
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


COMMENT ON FUNCTION "public"."update_organization_storage"() IS 'Automatically update organization storage when images are added/deleted. Handles equipment_note_images, work_order_images, and inventory_item_images.';



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


CREATE OR REPLACE FUNCTION "public"."update_quickbooks_invoice_status_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION "public"."update_quickbooks_invoice_status_events_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_quickbooks_invoice_status_events_updated_at"() IS 'Trigger function: sets updated_at = now() on quickbooks_invoice_status_events rows. SECURITY DEFINER with SET search_path = empty string. Invoked only by trigger mechanism, not directly by application roles.';



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


CREATE OR REPLACE FUNCTION "public"."update_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_content" "text" DEFAULT NULL::"text", "p_is_private" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    SELECT wo.team_id INTO v_team_id
    FROM public.work_orders wo
    WHERE wo.id = p_work_order_id;

    IF NOT (
      public.is_org_admin(v_user_id, p_organization_id)
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
$$;


ALTER FUNCTION "public"."update_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) IS 'Update work order note content/visibility with role checks and audit logging. Issue #1185.';



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


CREATE OR REPLACE FUNCTION "public"."validate_google_workspace_oauth_session"("p_session_token" "text") RETURNS TABLE("organization_id" "uuid", "user_id" "uuid", "nonce" "text", "redirect_url" "text", "origin_url" "text", "is_valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_session record;
BEGIN
  SELECT
    s.organization_id,
    s.user_id,
    s.nonce,
    s.redirect_url,
    s.origin_url,
    s.expires_at,
    s.used_at
  INTO v_session
  FROM public.google_workspace_oauth_sessions s
  WHERE s.session_token = p_session_token;

  IF v_session IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, false::boolean;
    RETURN;
  END IF;

  IF v_session.used_at IS NOT NULL OR v_session.expires_at < now() THEN
    RETURN QUERY SELECT v_session.organization_id, v_session.user_id, v_session.nonce, v_session.redirect_url, v_session.origin_url, false::boolean;
    RETURN;
  END IF;

  UPDATE public.google_workspace_oauth_sessions
  SET used_at = now()
  WHERE session_token = p_session_token;

  RETURN QUERY SELECT v_session.organization_id, v_session.user_id, v_session.nonce, v_session.redirect_url, v_session.origin_url, true::boolean;
END;
$$;


ALTER FUNCTION "public"."validate_google_workspace_oauth_session"("p_session_token" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."validate_operator_checkin_settings_org_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.equipment e
    WHERE e.id = NEW.equipment_id
      AND e.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'equipment assignment organization mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.operator_checklist_templates tpl
    WHERE tpl.id = NEW.template_id
      AND tpl.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'template assignment organization mismatch';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_operator_checkin_settings_org_refs"() OWNER TO "postgres";


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



CREATE FOREIGN DATA WRAPPER "stripe_wrapper" HANDLER "extensions"."stripe_fdw_handler" VALIDATOR "extensions"."stripe_fdw_validator";




CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
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
    CONSTRAINT "audit_log_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['equipment'::"text", 'work_order'::"text", 'inventory_item'::"text", 'preventative_maintenance'::"text", 'organization_member'::"text", 'team_member'::"text", 'team'::"text", 'pm_template'::"text", 'organization'::"text"])))
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_log" IS 'Comprehensive audit trail for regulatory compliance. Tracks all changes to equipment, work orders, inventory, PM, and permissions. Records are append-only - no updates or deletes allowed.';



COMMENT ON CONSTRAINT "audit_log_entity_type_check" ON "public"."audit_log" IS 'Allowed entity types for audit logging. Includes organization for deletion events.';



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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "phone" "text",
    "billing_address" "jsonb",
    "shipping_address" "jsonb",
    "account_owner_id" "uuid",
    "quickbooks_customer_id" "text",
    "quickbooks_display_name" "text",
    "quickbooks_synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "is_tax_exempt" boolean,
    "quickbooks_tax_status_synced_at" timestamp with time zone
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Customer / account records, RLS-scoped to organization members. Read access is granted via customers_members_select (admins are a subset of members and inherit access through that policy). Mutation access is restricted to admins via customers_admins_insert and customers_admins_update.';



COMMENT ON COLUMN "public"."customers"."is_tax_exempt" IS 'Derived from QuickBooks Customer.Taxable (false => tax exempt). QBO is source of truth.';



COMMENT ON COLUMN "public"."customers"."quickbooks_tax_status_synced_at" IS 'Timestamp when EquipQR last confirmed QuickBooks Customer.Taxable for is_tax_exempt cache freshness.';



CREATE TABLE IF NOT EXISTS "public"."dsr_request_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dsr_request_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "actor_email" "text",
    "summary" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dsr_request_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['intake_received'::"text", 'verification_challenge_sent'::"text", 'verification_passed'::"text", 'verification_failed'::"text", 'processing_started'::"text", 'fulfillment_step_completed'::"text", 'checklist_step_completed'::"text", 'extension_invoked'::"text", 'denial_issued'::"text", 'request_completed'::"text", 'artifact_attached'::"text", 'export_requested'::"text", 'export_ready'::"text", 'export_failed'::"text", 'notice_sent'::"text", 'notice_failed'::"text", 'note_added'::"text"])))
);


ALTER TABLE "public"."dsr_request_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."dsr_request_events" IS 'Immutable audit ledger for DSR lifecycle events. No updates or deletes allowed. Each row records a discrete action taken on a privacy request for compliance proof.';



CREATE TABLE IF NOT EXISTS "public"."dsr_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_email" "text" NOT NULL,
    "requester_name" "text" NOT NULL,
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "details" "text",
    "user_id" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verified_at" timestamp with time zone,
    "due_at" timestamp with time zone DEFAULT ("now"() + '45 days'::interval) NOT NULL,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verification_method" "text",
    "verified_by" "uuid",
    "completed_by" "uuid",
    "denial_reason" "text",
    "extension_reason" "text",
    "extended_due_at" timestamp with time zone,
    "organization_id" "uuid",
    "checklist_progress" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "required_checklist_steps" "text"[] DEFAULT ARRAY['verify_identity'::"text", 'search_systems'::"text", 'fulfill_request'::"text"] NOT NULL,
    "export_artifacts" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "dsr_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['access'::"text", 'deletion'::"text", 'correction'::"text", 'opt_out'::"text", 'limit_use'::"text"]))),
    CONSTRAINT "dsr_requests_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'verifying'::"text", 'processing'::"text", 'completed'::"text", 'denied'::"text"]))),
    CONSTRAINT "dsr_requests_verification_method_check" CHECK (("verification_method" = ANY (ARRAY['authenticated_match'::"text", 'email_challenge'::"text", 'manual_review'::"text", 'authorized_agent'::"text"])))
);


ALTER TABLE "public"."dsr_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."dsr_requests" IS 'Tracks CCPA/CPRA Data Subject Requests from intake through fulfillment. Supports access, deletion, correction, opt-out, and limit-use request types.';



COMMENT ON COLUMN "public"."dsr_requests"."verification_method" IS 'How the requester identity was verified: authenticated match, email challenge, manual review, or authorized agent.';



COMMENT ON COLUMN "public"."dsr_requests"."verified_by" IS 'Admin user who verified the requester identity (NULL for auto-verified authenticated requests).';



COMMENT ON COLUMN "public"."dsr_requests"."completed_by" IS 'Admin user who completed or denied the request.';



COMMENT ON COLUMN "public"."dsr_requests"."denial_reason" IS 'Lawful basis for denial (e.g., identity not verified, legal exception applies).';



COMMENT ON COLUMN "public"."dsr_requests"."extension_reason" IS 'Reason for extending the 45-day deadline per CPRA allowance.';



COMMENT ON COLUMN "public"."dsr_requests"."extended_due_at" IS 'New deadline when an extension is invoked (max 90 days from receipt per CPRA).';



COMMENT ON COLUMN "public"."dsr_requests"."organization_id" IS 'Organization scope for cockpit operations. Null indicates legacy requests not scoped to a tenant.';



COMMENT ON COLUMN "public"."dsr_requests"."checklist_progress" IS 'JSON object keyed by step id containing completion metadata.';



COMMENT ON COLUMN "public"."dsr_requests"."required_checklist_steps" IS 'Required steps that must be completed before a request can be marked completed.';



COMMENT ON COLUMN "public"."dsr_requests"."export_artifacts" IS 'Immutable export metadata contract for evidence packet generation.';



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
    "customer_id" "uuid",
    "last_maintenance_work_order_id" "uuid",
    "assigned_location_street" "text",
    "assigned_location_city" "text",
    "assigned_location_state" "text",
    "assigned_location_country" "text",
    "assigned_location_lat" double precision,
    "assigned_location_lng" double precision,
    "use_team_location" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";


COMMENT ON TABLE "public"."equipment" IS 'Equipment records with multi-tenancy. INSERT permissions: admins can create any equipment; team members can create equipment for their team (enforced in application layer).';



COMMENT ON COLUMN "public"."equipment"."assigned_location_street" IS 'Manually assigned street address';



COMMENT ON COLUMN "public"."equipment"."assigned_location_city" IS 'Manually assigned city';



COMMENT ON COLUMN "public"."equipment"."assigned_location_state" IS 'Manually assigned state/province';



COMMENT ON COLUMN "public"."equipment"."assigned_location_country" IS 'Manually assigned country';



COMMENT ON COLUMN "public"."equipment"."assigned_location_lat" IS 'Latitude from geocoded manual address';



COMMENT ON COLUMN "public"."equipment"."assigned_location_lng" IS 'Longitude from geocoded manual address';



COMMENT ON COLUMN "public"."equipment"."use_team_location" IS 'When true, this equipment defers to its team location if the team has override_equipment_location enabled';



CREATE TABLE IF NOT EXISTS "public"."equipment_location_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "address_street" "text",
    "address_city" "text",
    "address_state" "text",
    "address_country" "text",
    "formatted_address" "text",
    "changed_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by_name" "text",
    CONSTRAINT "equipment_location_history_source_check" CHECK (("source" = ANY (ARRAY['scan'::"text", 'manual'::"text", 'team_sync'::"text", 'quickbooks'::"text"])))
);


ALTER TABLE "public"."equipment_location_history" OWNER TO "postgres";


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
    "author_id" "uuid",
    "is_private" boolean DEFAULT false NOT NULL,
    "hours_worked" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone DEFAULT "now"(),
    "author_name" "text",
    "machine_hours" numeric(10,2),
    "organization_id" "uuid" NOT NULL
);


ALTER TABLE "public"."equipment_notes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."equipment_notes"."machine_hours" IS 'Equipment meter / machine hours recorded with this note (optional).';



CREATE TABLE IF NOT EXISTS "public"."equipment_operator_checkin_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "public_token_hash" "text" NOT NULL,
    "token_rotated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token_rotated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipment_operator_checkin_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."equipment_operator_checkin_settings" IS 'Per-equipment daily check-in assignments. Each row binds one checklist template to equipment with its own public QR token hash.';



COMMENT ON COLUMN "public"."equipment_operator_checkin_settings"."public_token_hash" IS 'SHA-256 hex digest of the public QR token. Lookup key for edge function load/submit.';



CREATE TABLE IF NOT EXISTS "public"."equipment_part_compatibility" (
    "equipment_id" "uuid" NOT NULL,
    "inventory_item_id" "uuid" NOT NULL
);


ALTER TABLE "public"."equipment_part_compatibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "changed_by_name" "text"
);


ALTER TABLE "public"."equipment_status_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."equipment_status_history" IS 'Per-row log of every status transition on public.equipment. Populated by trg_equipment_status_history (AFTER UPDATE trigger) and by the one-time backfill in this migration. Used by get_dashboard_trends to compute point-in-time needs_attention counts instead of back-projecting current status.';



COMMENT ON COLUMN "public"."equipment_status_history"."old_status" IS 'Status before the transition. NULL for the synthetic "created" backfill row.';



COMMENT ON COLUMN "public"."equipment_status_history"."changed_by" IS 'auth.uid() at the time of the change. NULL for backfilled rows.';



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
    "job_mode" "text" DEFAULT 'sync'::"text" NOT NULL,
    "delivery" "text" DEFAULT 'download'::"text" NOT NULL,
    "result_url" "text",
    "result_storage_path" "text",
    "error_message" "text",
    "started_at" timestamp with time zone,
    "request_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "pgmq_msg_id" bigint,
    CONSTRAINT "export_request_log_delivery_check" CHECK (("delivery" = ANY (ARRAY['download'::"text", 'storage'::"text", 'google_drive'::"text"]))),
    CONSTRAINT "export_request_log_job_mode_check" CHECK (("job_mode" = ANY (ARRAY['sync'::"text", 'async'::"text"]))),
    CONSTRAINT "export_request_log_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'rate_limited'::"text"])))
);


ALTER TABLE "public"."export_request_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."export_request_log" IS 'Tracks export requests for rate limiting and audit purposes. Stores user, organization, report type, row count, and status.';



COMMENT ON COLUMN "public"."export_request_log"."job_mode" IS 'sync = completed in the HTTP request; async = processed by queue-worker (#1193).';



COMMENT ON COLUMN "public"."export_request_log"."delivery" IS 'Where the finished artifact lives: browser download, Storage signed URL, or Google Drive.';



COMMENT ON COLUMN "public"."export_request_log"."result_storage_path" IS 'Object path in the export-results bucket when delivery = storage.';



COMMENT ON COLUMN "public"."export_request_log"."request_payload" IS 'Filters/columns/options needed to re-run the export in the worker without re-reading the HTTP body.';



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


CREATE TABLE IF NOT EXISTS "public"."google_workspace_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "customer_id" "text",
    "refresh_token" "text" NOT NULL,
    "access_token_expires_at" timestamp with time zone NOT NULL,
    "scopes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "connected_email" "text"
);


ALTER TABLE "public"."google_workspace_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."google_workspace_credentials" IS 'Google OAuth credentials (encrypted refresh tokens). Clients cannot access this table directly; only Edge Functions using service_role can read/write credentials.';



COMMENT ON COLUMN "public"."google_workspace_credentials"."refresh_token" IS 'Application-layer encrypted Google OAuth refresh token. Raw (unencrypted) tokens must never be stored in this column.';



COMMENT ON COLUMN "public"."google_workspace_credentials"."connected_email" IS 'Primary email of the Google Workspace admin who authorized the connection.';



CREATE TABLE IF NOT EXISTS "public"."google_workspace_directory_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "google_user_id" "text" NOT NULL,
    "primary_email" "text" NOT NULL,
    "full_name" "text",
    "given_name" "text",
    "family_name" "text",
    "suspended" boolean DEFAULT false NOT NULL,
    "org_unit_path" "text",
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."google_workspace_directory_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_workspace_oauth_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_token" "text" NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "nonce" "text" NOT NULL,
    "redirect_url" "text",
    "origin_url" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."google_workspace_oauth_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."google_workspace_oauth_sessions" IS 'OAuth CSRF protection sessions. Sessions expire after 1 hour and should be cleaned up by a scheduled job. Clients cannot read/update/delete directly; only SECURITY DEFINER RPCs and service_role can manage these rows. TODO: Implement pg_cron job or external scheduler to delete expired sessions.';



COMMENT ON COLUMN "public"."google_workspace_oauth_sessions"."organization_id" IS 'Organization ID. NULL for first-time workspace setup when organization does not yet exist. Set after OAuth callback creates the organization.';



CREATE TABLE IF NOT EXISTS "public"."inventory_item_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "uploaded_by" "uuid",
    "uploaded_by_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_item_images" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_item_images" IS 'Stores metadata for images uploaded to inventory items. Up to 5 images per item.';



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
    "created_by" "uuid",
    "default_unit_cost" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_name" "text",
    "location_address" "text",
    "location_city" "text",
    "location_state" "text",
    "location_country" "text",
    "location_lat" double precision,
    "location_lng" double precision,
    CONSTRAINT "inventory_items_low_stock_threshold_check" CHECK (("low_stock_threshold" >= 1)),
    CONSTRAINT "inventory_items_quantity_on_hand_check" CHECK (("quantity_on_hand" >= '-10000'::integer))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."inventory_items"."location" IS 'User-facing Location Name nickname (e.g. Shelf A, Truck 3). Not used for geo resolution.';



COMMENT ON COLUMN "public"."inventory_items"."location_address" IS 'Part-specific storage street address; overrides organization inventory default when set.';



COMMENT ON COLUMN "public"."inventory_items"."location_city" IS 'Part-specific storage city; overrides organization inventory default when set.';



COMMENT ON COLUMN "public"."inventory_items"."location_state" IS 'Part-specific storage state/province; overrides organization inventory default when set.';



COMMENT ON COLUMN "public"."inventory_items"."location_country" IS 'Part-specific storage country; overrides organization inventory default when set.';



COMMENT ON COLUMN "public"."inventory_items"."location_lat" IS 'Part-specific storage latitude; overrides organization inventory default when set.';



COMMENT ON COLUMN "public"."inventory_items"."location_lng" IS 'Part-specific storage longitude; overrides organization inventory default when set.';



CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
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
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['work_order_request'::"text", 'work_order_accepted'::"text", 'work_order_assigned'::"text", 'work_order_completed'::"text", 'work_order_submitted'::"text", 'work_order_in_progress'::"text", 'work_order_on_hold'::"text", 'work_order_cancelled'::"text", 'general'::"text", 'ownership_transfer_request'::"text", 'ownership_transfer_accepted'::"text", 'ownership_transfer_rejected'::"text", 'ownership_transfer_cancelled'::"text", 'member_removed'::"text", 'workspace_migration'::"text", 'workspace_merge_request'::"text", 'workspace_merge_accepted'::"text", 'workspace_merge_rejected'::"text", 'member_added'::"text", 'member_role_changed'::"text", 'team_member_added'::"text", 'team_member_role_changed'::"text", 'audit_export'::"text", 'export_ready'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."is_global" IS 'When true, this notification is visible regardless of which organization the user is currently viewing. Used for cross-org notifications like ownership transfer requests.';



CREATE TABLE IF NOT EXISTS "public"."operator_checkin_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "settings_id" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "template_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "operator_field_values" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "client_field_values" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "equipment_field_values" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "checklist_answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_complete" boolean DEFAULT false NOT NULL,
    "required_item_count" integer DEFAULT 0 NOT NULL,
    "answered_required_count" integer DEFAULT 0 NOT NULL,
    "request_fingerprint" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operator_checkin_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."operator_checkin_submissions" IS 'Append-only ledger of public operator daily check-ins. Inserts via service role edge function only.';



COMMENT ON COLUMN "public"."operator_checkin_submissions"."template_snapshot" IS 'Frozen copy of template metadata, checklist items, and data field definitions at submission time.';



COMMENT ON COLUMN "public"."operator_checkin_submissions"."operator_field_values" IS 'Array of { field_id, label, source, value } for operator-entered fields.';



COMMENT ON COLUMN "public"."operator_checkin_submissions"."client_field_values" IS 'Array of { field_id, label, source, value } for client context fields (timestamp, timezone, GPS).';



COMMENT ON COLUMN "public"."operator_checkin_submissions"."equipment_field_values" IS 'Array of { field_id, label, source, value } for equipment snapshot fields at submission time.';



COMMENT ON COLUMN "public"."operator_checkin_submissions"."checklist_answers" IS 'Array of { item_id, passed, notes? } answers validated server-side.';



CREATE TABLE IF NOT EXISTS "public"."operator_checkin_token_secrets" (
    "settings_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "raw_token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operator_checkin_token_secrets" OWNER TO "postgres";


COMMENT ON TABLE "public"."operator_checkin_token_secrets" IS 'Raw operator check-in QR tokens keyed by assignment. Admin-only read via RLS; written exclusively by SECURITY DEFINER create/rotate RPCs so QR links stay printable from any device (#1154).';



COMMENT ON COLUMN "public"."operator_checkin_token_secrets"."raw_token" IS 'Raw public QR token for /qr/operator-check-in/{token}. SHA-256 of this value matches equipment_operator_checkin_settings.public_token_hash.';



CREATE TABLE IF NOT EXISTS "public"."operator_checklist_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "template_data" "jsonb" DEFAULT '{"dataFields": [], "checklistItems": []}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operator_checklist_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."operator_checklist_templates" IS 'Org-owned daily operator safety checklist definitions for public QR check-ins (#1091).';



COMMENT ON COLUMN "public"."operator_checklist_templates"."template_data" IS 'JSON object: checklistItems (pass/fail items) and dataFields (operator/client/equipment capture fields).';



CREATE TABLE IF NOT EXISTS "public"."organization_google_export_destinations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "selection_kind" "text" NOT NULL,
    "drive_id" "text",
    "parent_id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "web_view_link" "text",
    "configured_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "folder_by_team" boolean DEFAULT true NOT NULL,
    "folder_by_equipment" boolean DEFAULT true NOT NULL,
    CONSTRAINT "organization_google_export_destinations_document_type_check" CHECK (("document_type" = 'work-orders-internal-packet'::"text")),
    CONSTRAINT "organization_google_export_destinations_selection_kind_check" CHECK (("selection_kind" = ANY (ARRAY['folder'::"text", 'shared_drive'::"text"])))
);


ALTER TABLE "public"."organization_google_export_destinations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_google_export_destinations" IS 'Organization-managed destinations for Google document exports (including shared drives).';



COMMENT ON COLUMN "public"."organization_google_export_destinations"."folder_by_team" IS 'When true, exports are organized into a subfolder named after the work order team.';



COMMENT ON COLUMN "public"."organization_google_export_destinations"."folder_by_equipment" IS 'When true, exports are organized into a subfolder named after the work order equipment.';



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



CREATE TABLE IF NOT EXISTS "public"."organization_member_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "source" "text" DEFAULT 'google_workspace'::"text" NOT NULL,
    "status" "text" DEFAULT 'selected'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "claimed_user_id" "uuid",
    "claimed_at" timestamp with time zone,
    CONSTRAINT "organization_member_claims_status_check" CHECK (("status" = ANY (ARRAY['selected'::"text", 'claimed'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."organization_member_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slot_purchase_id" "uuid",
    "activated_slot_at" timestamp with time zone,
    "can_manage_quickbooks" boolean DEFAULT false NOT NULL,
    "access_source" "text",
    "product_onboarding_completed_at" timestamp with time zone,
    CONSTRAINT "organization_members_access_source_check" CHECK ((("access_source" IS NULL) OR ("access_source" = ANY (ARRAY['google_workspace'::"text", 'invitation'::"text", 'owner'::"text", 'manual'::"text"]))))
);

ALTER TABLE ONLY "public"."organization_members" REPLICA IDENTITY FULL;


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_members" IS 'RLS simplified to prevent circular dependency. Admin permissions handled at application level.';



COMMENT ON COLUMN "public"."organization_members"."can_manage_quickbooks" IS 'Whether this member can manage QuickBooks integration. Owners always have this permission. Admins must be explicitly granted it by an owner. Members cannot have this permission.';



COMMENT ON COLUMN "public"."organization_members"."access_source" IS 'How this membership was created: google_workspace import/claim, invitation, owner bootstrap, or manual admin add.';



COMMENT ON COLUMN "public"."organization_members"."product_onboarding_completed_at" IS 'When the org owner/admin completed the in-app getting-started wizard (team, equipment, QR).';



CREATE TABLE IF NOT EXISTS "public"."organization_role_grants_pending" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "desired_role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_user_id" "uuid",
    "applied_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "organization_role_grants_pending_role_check" CHECK (("desired_role" = 'admin'::"text")),
    CONSTRAINT "organization_role_grants_pending_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'applied'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."organization_role_grants_pending" OWNER TO "postgres";


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
    "customers_feature_enabled" boolean DEFAULT false,
    "scan_location_collection_enabled" boolean DEFAULT false NOT NULL,
    "inventory_default_location_name" "text",
    "inventory_default_location_address" "text",
    "inventory_default_location_city" "text",
    "inventory_default_location_state" "text",
    "inventory_default_location_country" "text",
    "inventory_default_location_lat" double precision,
    "inventory_default_location_lng" double precision,
    "note_author_edit_window_hours" integer DEFAULT 24 NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."billing_cycle" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."next_billing_date" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."billable_members" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."last_billing_calculation" IS 'DEPRECATED: Billing removed 2025-01-15. Column preserved for historical data.';



COMMENT ON COLUMN "public"."organizations"."logo" IS 'URL or path to organization logo image';



COMMENT ON COLUMN "public"."organizations"."background_color" IS 'Hex color code for organization branding (e.g., #ff0000)';



COMMENT ON COLUMN "public"."organizations"."scan_location_collection_enabled" IS 'Controls whether QR scans capture GPS coordinates for this organization. Defaults to false for privacy-by-default.';



COMMENT ON COLUMN "public"."organizations"."inventory_default_location_name" IS 'Optional nickname for the organization-wide inventory storage default (e.g. Main Shop).';



COMMENT ON COLUMN "public"."organizations"."inventory_default_location_address" IS 'Street address for the organization inventory default storage location.';



COMMENT ON COLUMN "public"."organizations"."inventory_default_location_city" IS 'City for the organization inventory default storage location.';



COMMENT ON COLUMN "public"."organizations"."inventory_default_location_state" IS 'State/province for the organization inventory default storage location.';



COMMENT ON COLUMN "public"."organizations"."inventory_default_location_country" IS 'Country for the organization inventory default storage location.';



COMMENT ON COLUMN "public"."organizations"."inventory_default_location_lat" IS 'Latitude for the organization inventory default storage location.';



COMMENT ON COLUMN "public"."organizations"."inventory_default_location_lng" IS 'Longitude for the organization inventory default storage location.';



COMMENT ON COLUMN "public"."organizations"."note_author_edit_window_hours" IS 'Hours after creation that note authors may edit their own notes. Org admins and team managers are not time-limited.';



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
    "created_by" "uuid",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_name" "text",
    "verified_by_name" "text"
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



CREATE TABLE IF NOT EXISTS "public"."part_identifiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "identifier_type" "public"."part_identifier_type" NOT NULL,
    "raw_value" "text" NOT NULL,
    "norm_value" "text" NOT NULL,
    "inventory_item_id" "uuid",
    "manufacturer" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_name" "text"
);


ALTER TABLE "public"."part_identifiers" OWNER TO "postgres";


COMMENT ON TABLE "public"."part_identifiers" IS 'Part numbers/identifiers that can be looked up. May or may not be linked to inventory items.';



CREATE TABLE IF NOT EXISTS "public"."parts_consumers" (
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."parts_consumers" OWNER TO "postgres";


COMMENT ON TABLE "public"."parts_consumers" IS 'Organization-level parts consumers who can view inventory, alternate groups, and use part lookup without edit rights.';



CREATE TABLE IF NOT EXISTS "public"."parts_managers" (
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."parts_managers" OWNER TO "postgres";


COMMENT ON TABLE "public"."parts_managers" IS 'Organization-level parts managers who can edit all inventory items in their organization. This replaces the deprecated inventory_item_managers table (per-item approach) for better scalability. Parts managers can edit all inventory items without needing individual assignments.';



CREATE TABLE IF NOT EXISTS "public"."personal_organizations" (
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."personal_organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."personal_organizations" IS 'Maps users to their personal (default) organization. The user_id primary key ensures one personal org per user, while the unique constraint on organization_id ensures each organization can only be designated as personal for one user. This creates a strict 1:1 mapping.';



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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "interval_value" integer,
    "interval_type" "text",
    CONSTRAINT "pm_template_interval_pair_check" CHECK (((("interval_value" IS NULL) AND ("interval_type" IS NULL)) OR (("interval_value" IS NOT NULL) AND ("interval_type" IS NOT NULL) AND ("interval_value" > 0)))),
    CONSTRAINT "pm_template_interval_type_check" CHECK ((("interval_type" IS NULL) OR ("interval_type" = ANY (ARRAY['days'::"text", 'hours'::"text"]))))
);


ALTER TABLE "public"."pm_checklist_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_interval_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "scope_type" "text" NOT NULL,
    "equipment_id" "uuid",
    "team_id" "uuid",
    "pm_template_id" "uuid",
    "policy_slot" "text" DEFAULT 'default'::"text" NOT NULL,
    "schedule_mode" "text" NOT NULL,
    "interval_value" integer,
    "interval_type" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pm_interval_policy_interval_pair_check" CHECK (((("schedule_mode" = 'none'::"text") AND ("interval_value" IS NULL) AND ("interval_type" IS NULL)) OR (("schedule_mode" = 'custom'::"text") AND ("interval_value" IS NOT NULL) AND ("interval_type" IS NOT NULL) AND ("interval_value" > 0)))),
    CONSTRAINT "pm_interval_policy_interval_type_check" CHECK ((("interval_type" IS NULL) OR ("interval_type" = ANY (ARRAY['days'::"text", 'hours'::"text"])))),
    CONSTRAINT "pm_interval_policy_schedule_mode_check" CHECK (("schedule_mode" = ANY (ARRAY['custom'::"text", 'none'::"text"]))),
    CONSTRAINT "pm_interval_policy_scope_target_check" CHECK (((("scope_type" = 'equipment'::"text") AND ("equipment_id" IS NOT NULL) AND ("team_id" IS NULL) AND ("pm_template_id" IS NULL)) OR (("scope_type" = 'team'::"text") AND ("team_id" IS NOT NULL) AND ("equipment_id" IS NULL) AND ("pm_template_id" IS NULL)) OR (("scope_type" = 'template'::"text") AND ("pm_template_id" IS NOT NULL) AND ("equipment_id" IS NULL) AND ("team_id" IS NULL)))),
    CONSTRAINT "pm_interval_policy_scope_type_check" CHECK (("scope_type" = ANY (ARRAY['equipment'::"text", 'team'::"text", 'template'::"text"])))
);


ALTER TABLE "public"."pm_interval_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pm_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pm_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by_name" "text"
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
    "equipment_working_hours_at_completion" numeric,
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
    "email_private" boolean DEFAULT false,
    "avatar_url" "text",
    "limit_sensitive_pi" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_reason" "text"
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles table - Access restricted to users own profile and organization members only for security';



COMMENT ON COLUMN "public"."profiles"."email_private" IS 'When true, email is hidden from organization members (except admins). Default: false (email visible to org members)';



COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'Supabase Storage public URL for user avatar image';



COMMENT ON COLUMN "public"."profiles"."limit_sensitive_pi" IS 'When true, GPS coordinates are suppressed for this user''s scans even if the organization has scan_location_collection_enabled = true. Implements CPRA Right to Limit Use of Sensitive Personal Information.';



COMMENT ON COLUMN "public"."profiles"."deleted_at" IS 'Set when account deletion prep runs; profile row may remain until Auth user deletion.';



COMMENT ON COLUMN "public"."profiles"."deleted_reason" IS 'Operational reason for account deletion (self_service, dsr_admin, etc.).';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Stores Web Push subscription endpoints for PWA push notifications. Each user can have multiple subscriptions across different browsers/devices.';



COMMENT ON COLUMN "public"."push_subscriptions"."endpoint" IS 'The push service URL (e.g., FCM endpoint). Provided by the browser when user subscribes to push.';



COMMENT ON COLUMN "public"."push_subscriptions"."p256dh" IS 'ECDH public key for encrypting push messages. Base64-encoded.';



COMMENT ON COLUMN "public"."push_subscriptions"."auth" IS 'Shared authentication secret for push messages. Base64-encoded.';



CREATE TABLE IF NOT EXISTS "public"."quick_form_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "quick_form_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "form_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "field_values" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "client_context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "request_fingerprint" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quick_form_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."quick_form_submissions" IS 'Append-only ledger of public quick form submissions. Inserts via service role edge function only; reads restricted to org owners/admins.';



COMMENT ON COLUMN "public"."quick_form_submissions"."form_snapshot" IS 'Frozen copy of the form name/description/field definitions at submission time.';



COMMENT ON COLUMN "public"."quick_form_submissions"."field_values" IS 'Array of { field_id, label, input_type, value } for user-entered fields.';



COMMENT ON COLUMN "public"."quick_form_submissions"."client_context" IS 'Object with submitted_timestamp, browser_timezone, and optional gps fields.';



CREATE TABLE IF NOT EXISTS "public"."quick_form_token_secrets" (
    "quick_form_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "raw_token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quick_form_token_secrets" OWNER TO "postgres";


COMMENT ON TABLE "public"."quick_form_token_secrets" IS 'Raw quick form QR tokens keyed by form. Admin-only read via RLS; written exclusively by SECURITY DEFINER create/rotate RPCs so QR links stay printable from any device.';



COMMENT ON COLUMN "public"."quick_form_token_secrets"."raw_token" IS 'Raw public QR token for /qr/quick-form/{token}. SHA-256 of this value matches quick_forms.public_token_hash.';



CREATE TABLE IF NOT EXISTS "public"."quick_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "form_data" "jsonb" DEFAULT '{"fields": []}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "public_token_hash" "text" NOT NULL,
    "token_rotated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "token_rotated_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quick_forms" OWNER TO "postgres";


COMMENT ON TABLE "public"."quick_forms" IS 'Org-owned standalone public data-collection forms (#1184). Not tied to equipment or teams; accessed by unauthenticated users via rotating QR token.';



COMMENT ON COLUMN "public"."quick_forms"."form_data" IS 'JSON object: fields (array of { id, label, inputType, required, helpText }) and optional collectLocation flag.';



COMMENT ON COLUMN "public"."quick_forms"."public_token_hash" IS 'SHA-256 hex digest of the public QR token. Lookup key for edge function load/submit.';



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



COMMENT ON COLUMN "public"."quickbooks_credentials"."access_token_expires_at" IS 'Timestamp when the access token expires. Refresh before this time.';



COMMENT ON COLUMN "public"."quickbooks_credentials"."refresh_token_expires_at" IS 'Timestamp when the refresh token expires. User must re-authorize after this.';



COMMENT ON COLUMN "public"."quickbooks_credentials"."scopes" IS 'Space-separated OAuth scopes granted by the user.';



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



CREATE TABLE IF NOT EXISTS "public"."quickbooks_invoice_status_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "realm_id" "text" NOT NULL,
    "entity_name" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "event_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "raw_event" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    CONSTRAINT "quickbooks_invoice_status_events_entity_check" CHECK (("entity_name" = ANY (ARRAY['Invoice'::"text", 'Payment'::"text"]))),
    CONSTRAINT "quickbooks_invoice_status_events_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'processed'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."quickbooks_invoice_status_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."quickbooks_invoice_status_events" IS 'Verified Intuit webhook events queued for QuickBooks invoice/payment status synchronization.';



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



CREATE TABLE IF NOT EXISTS "public"."record_export_artifacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "record_type" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "export_channel" "text" NOT NULL,
    "artifact_kind" "text" NOT NULL,
    "provider" "text" DEFAULT 'google_drive'::"text" NOT NULL,
    "provider_file_id" "text" NOT NULL,
    "web_view_link" "text" NOT NULL,
    "provider_parent_id" "text",
    "last_exported_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_exported_by" "uuid",
    "status" "text" DEFAULT 'current'::"text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "record_export_artifacts_status_check" CHECK (("status" = ANY (ARRAY['current'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."record_export_artifacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."record_export_artifacts" IS 'Tracks the most recent exported document per record, enabling replace-on-re-export and quick "Open last doc" access. Schema supports any record type; v1 covers work orders.';



CREATE TABLE IF NOT EXISTS "public"."scan_follow_up_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_id" "uuid" NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "performed_by" "uuid" NOT NULL,
    "performed_by_name" "text",
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scan_follow_up_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['dashboard_opened'::"text", 'pm_work_order_created'::"text", 'generic_work_order_created'::"text", 'working_hours_updated'::"text", 'note_image_added'::"text"])))
);


ALTER TABLE "public"."scan_follow_up_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."scan_follow_up_events" IS 'Immutable follow-up actions performed from a single QR scan session (work order, hours, note, dashboard open). Anchors the equipment Scan History timeline; not a replacement for audit_log.';



COMMENT ON COLUMN "public"."scan_follow_up_events"."scan_id" IS 'The scan that this follow-up action originated from.';



COMMENT ON COLUMN "public"."scan_follow_up_events"."event_type" IS 'Action category: dashboard_opened, pm_work_order_created, generic_work_order_created, working_hours_updated, note_image_added.';



COMMENT ON COLUMN "public"."scan_follow_up_events"."entity_type" IS 'Optional downstream entity type (e.g. work_order, note) the action produced.';



COMMENT ON COLUMN "public"."scan_follow_up_events"."entity_id" IS 'Optional downstream entity id the action produced.';



COMMENT ON COLUMN "public"."scan_follow_up_events"."metadata" IS 'Minimal non-sensitive context (work order title/id, hours value, image count, is_private). Never stores note content.';



COMMENT ON COLUMN "public"."scan_follow_up_events"."performed_by_name" IS 'Denormalized performer name preserved on account deletion (mirrors scans.scanned_by_name).';



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
    "team_lead_id" "uuid",
    "location_address" "text",
    "location_city" "text",
    "location_state" "text",
    "location_country" "text",
    "location_lat" double precision,
    "location_lng" double precision,
    "override_equipment_location" boolean DEFAULT false NOT NULL,
    "image_url" "text",
    "customer_id" "uuid",
    "preferred_view" "text" DEFAULT 'internal'::"text" NOT NULL,
    CONSTRAINT "teams_preferred_view_check" CHECK (("preferred_view" = ANY (ARRAY['internal'::"text", 'department'::"text", 'customer'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."teams"."team_lead_id" IS 'Reference to the team lead user profile. Can be null if no team lead is assigned.';



COMMENT ON COLUMN "public"."teams"."location_address" IS 'Street address for the team location';



COMMENT ON COLUMN "public"."teams"."location_city" IS 'City for the team location';



COMMENT ON COLUMN "public"."teams"."location_state" IS 'State/province for the team location';



COMMENT ON COLUMN "public"."teams"."location_country" IS 'Country for the team location';



COMMENT ON COLUMN "public"."teams"."location_lat" IS 'Latitude coordinate for the team location (from geocoding or manual entry)';



COMMENT ON COLUMN "public"."teams"."location_lng" IS 'Longitude coordinate for the team location (from geocoding or manual entry)';



COMMENT ON COLUMN "public"."teams"."override_equipment_location" IS 'When true, all equipment assigned to this team uses the team location as its effective location';



COMMENT ON COLUMN "public"."teams"."image_url" IS 'Supabase Storage public URL for team image';



COMMENT ON COLUMN "public"."teams"."preferred_view" IS 'Team-level default view for the team details page: internal (expert group), department, or customer (external serviced account). Issue #1132.';



CREATE TABLE IF NOT EXISTS "public"."terms_acceptances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "accepted_at" timestamp with time zone NOT NULL,
    "ip_address" "text" NOT NULL,
    "user_agent" "text" NOT NULL,
    "terms_version_hash" "text" NOT NULL,
    "privacy_version_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_by_email" "text"
);


ALTER TABLE "public"."terms_acceptances" OWNER TO "postgres";


COMMENT ON TABLE "public"."terms_acceptances" IS 'Signup/legal evidence: IP, User-Agent, policy version hashes. Inserts only via record-terms-acceptance Edge Function (service role).';



CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "github_comment_id" bigint NOT NULL,
    "author" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_from_team" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "github_issue_number" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "closed_at" timestamp with time zone,
    "github_issue_url" "text",
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text", 'in_progress'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_dashboard_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "layouts" "jsonb",
    "active_widgets" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_dashboard_preferences" OWNER TO "postgres";


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
    "author_id" "uuid",
    "content" "text" NOT NULL,
    "hours_worked" numeric(5,2) DEFAULT 0,
    "is_private" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_name" "text",
    "machine_hours" numeric(10,2),
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."work_order_notes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."work_order_notes"."machine_hours" IS 'Equipment meter / machine hours recorded with this note (optional).';



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
    "equipment_working_hours_at_creation" numeric,
    "primary_image_id" "uuid",
    "quickbooks_invoice_id" "text",
    "quickbooks_invoice_number" "text",
    "quickbooks_invoice_environment" "text",
    "quickbooks_realm_id" "text",
    "invoice_status" "text",
    "invoice_sent_at" timestamp with time zone,
    "invoice_paid_at" timestamp with time zone,
    "invoice_balance_cents" integer,
    "invoice_due_date" "date",
    "invoice_last_synced_at" timestamp with time zone,
    "invoice_sync_error" "text",
    CONSTRAINT "work_orders_invoice_status_check" CHECK ((("invoice_status" IS NULL) OR ("invoice_status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'viewed'::"text", 'paid'::"text", 'partially_paid'::"text", 'overdue'::"text", 'voided'::"text"])))),
    CONSTRAINT "work_orders_quickbooks_invoice_environment_check" CHECK ((("quickbooks_invoice_environment" IS NULL) OR ("quickbooks_invoice_environment" = ANY (ARRAY['sandbox'::"text", 'production'::"text"]))))
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."work_orders"."equipment_id" IS 'DEPRECATED: Use work_order_equipment join table for equipment associations. This column is maintained for backward compatibility and contains the primary equipment ID. Will be kept in sync via trigger.';



COMMENT ON COLUMN "public"."work_orders"."equipment_working_hours_at_creation" IS 'Equipment working hours at the time this work order was created. Used as a historical KPI for maintenance scheduling and equipment usage tracking.';



COMMENT ON COLUMN "public"."work_orders"."primary_image_id" IS 'Optional pointer to work_order_images; the first photo uploaded during work order creation is set automatically as the primary visual evidence.';



COMMENT ON COLUMN "public"."work_orders"."quickbooks_invoice_id" IS 'QuickBooks Invoice.Id mirrored from the latest successful export.';



COMMENT ON COLUMN "public"."work_orders"."quickbooks_invoice_number" IS 'QuickBooks Invoice.DocNumber mirrored from the latest successful export.';



COMMENT ON COLUMN "public"."work_orders"."quickbooks_invoice_environment" IS 'QuickBooks environment used for the mirrored invoice: sandbox or production.';



COMMENT ON COLUMN "public"."work_orders"."quickbooks_realm_id" IS 'QuickBooks company realm id for the mirrored invoice.';



COMMENT ON COLUMN "public"."work_orders"."invoice_status" IS 'Mirrored QBO invoice lifecycle status for Work Order payment visibility.';



COMMENT ON COLUMN "public"."work_orders"."invoice_balance_cents" IS 'Mirrored QBO invoice Balance in cents.';



COMMENT ON COLUMN "public"."work_orders"."invoice_last_synced_at" IS 'Timestamp when QBO invoice mirror fields were last refreshed.';



COMMENT ON COLUMN "public"."work_orders"."invoice_sync_error" IS 'Last non-secret invoice status sync error, cleared on successful sync.';



CREATE TABLE IF NOT EXISTS "public"."workspace_domains" (
    "domain" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_personal_org_merge_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_org_id" "uuid" NOT NULL,
    "requested_by_user_id" "uuid" NOT NULL,
    "requested_for_user_id" "uuid" NOT NULL,
    "requested_by_name" "text" NOT NULL,
    "requested_for_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "request_reason" "text",
    "response_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "responded_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    CONSTRAINT "workspace_personal_org_merge_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."workspace_personal_org_merge_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."workspace_personal_org_merge_requests" IS 'Tracks pending and completed requests to merge a user''s personal organization into a Workspace organization. Consent-based, per-user only.';



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("customer_id", "user_id");



ALTER TABLE ONLY "public"."customer_sites"
    ADD CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dsr_request_events"
    ADD CONSTRAINT "dsr_request_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dsr_requests"
    ADD CONSTRAINT "dsr_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_location_history"
    ADD CONSTRAINT "equipment_location_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_note_images"
    ADD CONSTRAINT "equipment_note_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_operator_checkin_settings"
    ADD CONSTRAINT "equipment_operator_checkin_settings_equipment_template_unique" UNIQUE ("equipment_id", "template_id");



ALTER TABLE ONLY "public"."equipment_operator_checkin_settings"
    ADD CONSTRAINT "equipment_operator_checkin_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_part_compatibility"
    ADD CONSTRAINT "equipment_part_compatibility_pkey" PRIMARY KEY ("equipment_id", "inventory_item_id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_status_history"
    ADD CONSTRAINT "equipment_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_working_hours_history"
    ADD CONSTRAINT "equipment_working_hours_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."export_request_log"
    ADD CONSTRAINT "export_request_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_customer_contacts"
    ADD CONSTRAINT "external_customer_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geocoded_locations"
    ADD CONSTRAINT "geocoded_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_workspace_credentials"
    ADD CONSTRAINT "google_workspace_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_workspace_directory_users"
    ADD CONSTRAINT "google_workspace_directory_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_workspace_oauth_sessions"
    ADD CONSTRAINT "google_workspace_oauth_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_item_images"
    ADD CONSTRAINT "inventory_item_images_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."operator_checkin_submissions"
    ADD CONSTRAINT "operator_checkin_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operator_checkin_token_secrets"
    ADD CONSTRAINT "operator_checkin_token_secrets_pkey" PRIMARY KEY ("settings_id");



ALTER TABLE ONLY "public"."operator_checklist_templates"
    ADD CONSTRAINT "operator_checklist_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_google_export_destinations"
    ADD CONSTRAINT "organization_google_export_destinations_org_doc_unique" UNIQUE ("organization_id", "document_type");



ALTER TABLE ONLY "public"."organization_google_export_destinations"
    ADD CONSTRAINT "organization_google_export_destinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_member_claims"
    ADD CONSTRAINT "organization_member_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_role_grants_pending"
    ADD CONSTRAINT "organization_role_grants_pending_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_unique" UNIQUE ("organization_id", "identifier_type", "norm_value");



ALTER TABLE ONLY "public"."parts_consumers"
    ADD CONSTRAINT "parts_consumers_pkey" PRIMARY KEY ("organization_id", "user_id");



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_pkey" PRIMARY KEY ("organization_id", "user_id");



ALTER TABLE ONLY "public"."personal_organizations"
    ADD CONSTRAINT "personal_organizations_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_unique_name_per_org" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."pm_interval_policies"
    ADD CONSTRAINT "pm_interval_policies_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_endpoint_unique" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."quick_form_submissions"
    ADD CONSTRAINT "quick_form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quick_form_token_secrets"
    ADD CONSTRAINT "quick_form_token_secrets_pkey" PRIMARY KEY ("quick_form_id");



ALTER TABLE ONLY "public"."quick_forms"
    ADD CONSTRAINT "quick_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_credentials"
    ADD CONSTRAINT "quickbooks_credentials_organization_id_realm_id_key" UNIQUE ("organization_id", "realm_id");



ALTER TABLE ONLY "public"."quickbooks_credentials"
    ADD CONSTRAINT "quickbooks_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_export_logs"
    ADD CONSTRAINT "quickbooks_export_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_invoice_status_events"
    ADD CONSTRAINT "quickbooks_invoice_status_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_token_unique" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_organization_id_team_id_key" UNIQUE ("organization_id", "team_id");



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."record_export_artifacts"
    ADD CONSTRAINT "record_export_artifacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."record_export_artifacts"
    ADD CONSTRAINT "record_export_artifacts_unique" UNIQUE ("organization_id", "record_type", "record_id", "export_channel", "artifact_kind");



ALTER TABLE ONLY "public"."scan_follow_up_events"
    ADD CONSTRAINT "scan_follow_up_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terms_acceptances"
    ADD CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_github_comment_id_key" UNIQUE ("github_comment_id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_dashboard_preferences"
    ADD CONSTRAINT "user_dashboard_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_dashboard_preferences"
    ADD CONSTRAINT "user_dashboard_preferences_user_org_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."user_departure_queue"
    ADD CONSTRAINT "user_departure_queue_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."workspace_domains"
    ADD CONSTRAINT "workspace_domains_pkey" PRIMARY KEY ("domain");



ALTER TABLE ONLY "public"."workspace_personal_org_merge_requests"
    ADD CONSTRAINT "workspace_personal_org_merge_requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "equipment_org_serial_idx" ON "public"."equipment" USING "btree" ("organization_id", "serial_number");



CREATE UNIQUE INDEX "geocoded_locations_org_norm_unique" ON "public"."geocoded_locations" USING "btree" ("organization_id", "normalized_text");



CREATE UNIQUE INDEX "google_workspace_credentials_org_domain" ON "public"."google_workspace_credentials" USING "btree" ("organization_id", "public"."normalize_domain"("domain"));



CREATE INDEX "google_workspace_directory_users_email" ON "public"."google_workspace_directory_users" USING "btree" ("organization_id", "public"."normalize_email"("primary_email"));



CREATE UNIQUE INDEX "google_workspace_directory_users_unique" ON "public"."google_workspace_directory_users" USING "btree" ("organization_id", "google_user_id");



CREATE UNIQUE INDEX "google_workspace_oauth_sessions_token" ON "public"."google_workspace_oauth_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_audit_log_actor" ON "public"."audit_log" USING "btree" ("actor_id", "created_at" DESC) WHERE ("actor_id" IS NOT NULL);



CREATE INDEX "idx_audit_log_equipment" ON "public"."audit_log" USING "btree" ("organization_id", "entity_id", "created_at" DESC) WHERE ("entity_type" = 'equipment'::"text");



CREATE INDEX "idx_audit_log_org_time" ON "public"."audit_log" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_audit_log_org_type_time" ON "public"."audit_log" USING "btree" ("organization_id", "entity_type", "created_at" DESC);



CREATE INDEX "idx_audit_log_organization_id" ON "public"."audit_log" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);



CREATE INDEX "idx_audit_log_work_orders" ON "public"."audit_log" USING "btree" ("organization_id", "entity_id", "created_at" DESC) WHERE ("entity_type" = 'work_order'::"text");



CREATE INDEX "idx_customer_contacts_customer_id" ON "public"."customer_contacts" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_contacts_user_id" ON "public"."customer_contacts" USING "btree" ("user_id");



CREATE INDEX "idx_customer_sites_customer_id" ON "public"."customer_sites" USING "btree" ("customer_id");



CREATE INDEX "idx_customers_account_owner" ON "public"."customers" USING "btree" ("account_owner_id") WHERE ("account_owner_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_customers_org_qb_customer_id" ON "public"."customers" USING "btree" ("organization_id", "quickbooks_customer_id") WHERE ("quickbooks_customer_id" IS NOT NULL);



CREATE INDEX "idx_customers_organization_id" ON "public"."customers" USING "btree" ("organization_id");



CREATE INDEX "idx_departure_queue_org" ON "public"."user_departure_queue" USING "btree" ("organization_id");



CREATE INDEX "idx_departure_queue_user" ON "public"."user_departure_queue" USING "btree" ("user_id");



CREATE INDEX "idx_dsr_request_events_actor_id" ON "public"."dsr_request_events" USING "btree" ("actor_id");



CREATE INDEX "idx_dsr_request_events_dsr_request_id" ON "public"."dsr_request_events" USING "btree" ("dsr_request_id");



CREATE INDEX "idx_dsr_requests_completed_by" ON "public"."dsr_requests" USING "btree" ("completed_by");



CREATE INDEX "idx_dsr_requests_organization_id" ON "public"."dsr_requests" USING "btree" ("organization_id");



CREATE INDEX "idx_dsr_requests_user_id" ON "public"."dsr_requests" USING "btree" ("user_id");



CREATE INDEX "idx_dsr_requests_verified_by" ON "public"."dsr_requests" USING "btree" ("verified_by");



CREATE INDEX "idx_equip_loc_history_changed_by" ON "public"."equipment_location_history" USING "btree" ("changed_by");



CREATE INDEX "idx_equip_loc_history_equipment" ON "public"."equipment_location_history" USING "btree" ("equipment_id", "created_at" DESC);



CREATE INDEX "idx_equipment_customer_id" ON "public"."equipment" USING "btree" ("customer_id");



CREATE INDEX "idx_equipment_default_pm_template_id" ON "public"."equipment" USING "btree" ("default_pm_template_id");



CREATE UNIQUE INDEX "idx_equipment_id_org" ON "public"."equipment" USING "btree" ("id", "organization_id");



CREATE INDEX "idx_equipment_import_id" ON "public"."equipment" USING "btree" ("import_id") WHERE ("import_id" IS NOT NULL);



CREATE INDEX "idx_equipment_last_maintenance_work_order_id" ON "public"."equipment" USING "btree" ("last_maintenance_work_order_id");



CREATE INDEX "idx_equipment_note_images_equipment_note_id" ON "public"."equipment_note_images" USING "btree" ("equipment_note_id");



CREATE INDEX "idx_equipment_note_images_uploaded_by" ON "public"."equipment_note_images" USING "btree" ("uploaded_by");



CREATE INDEX "idx_equipment_notes_author_id" ON "public"."equipment_notes" USING "btree" ("author_id");



CREATE INDEX "idx_equipment_notes_equipment_author" ON "public"."equipment_notes" USING "btree" ("equipment_id", "author_id");



CREATE INDEX "idx_equipment_notes_equipment_created" ON "public"."equipment_notes" USING "btree" ("equipment_id", "created_at");



CREATE INDEX "idx_equipment_notes_equipment_id" ON "public"."equipment_notes" USING "btree" ("equipment_id");



CREATE INDEX "idx_equipment_notes_last_modified_by" ON "public"."equipment_notes" USING "btree" ("last_modified_by");



CREATE INDEX "idx_equipment_notes_organization_id" ON "public"."equipment_notes" USING "btree" ("organization_id");



CREATE INDEX "idx_equipment_operator_checkin_org" ON "public"."equipment_operator_checkin_settings" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_equipment_operator_checkin_token_hash" ON "public"."equipment_operator_checkin_settings" USING "btree" ("public_token_hash");



CREATE INDEX "idx_equipment_org_team" ON "public"."equipment" USING "btree" ("organization_id", "team_id");



CREATE INDEX "idx_equipment_organization_id" ON "public"."equipment" USING "btree" ("organization_id");



CREATE INDEX "idx_equipment_part_compatibility_inventory_item_id" ON "public"."equipment_part_compatibility" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_equipment_status_history_changed_by" ON "public"."equipment_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_equipment_status_history_equipment_changed_at" ON "public"."equipment_status_history" USING "btree" ("equipment_id", "changed_at");



CREATE INDEX "idx_equipment_team_id" ON "public"."equipment" USING "btree" ("team_id");



CREATE INDEX "idx_export_log_async_pending" ON "public"."export_request_log" USING "btree" ("status", "requested_at") WHERE (("job_mode" = 'async'::"text") AND ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"])));



CREATE INDEX "idx_export_log_org_time" ON "public"."export_request_log" USING "btree" ("organization_id", "requested_at" DESC);



CREATE INDEX "idx_export_log_user_time" ON "public"."export_request_log" USING "btree" ("user_id", "requested_at" DESC);



CREATE UNIQUE INDEX "idx_ext_contacts_customer_source_source_field" ON "public"."external_customer_contacts" USING "btree" ("customer_id", "source", "source_field");



CREATE INDEX "idx_ext_contacts_source" ON "public"."external_customer_contacts" USING "btree" ("source") WHERE ("source" = 'quickbooks'::"text");



CREATE INDEX "idx_external_customer_contacts_customer" ON "public"."external_customer_contacts" USING "btree" ("customer_id");



CREATE INDEX "idx_google_export_destinations_document_type" ON "public"."organization_google_export_destinations" USING "btree" ("document_type");



CREATE INDEX "idx_google_workspace_oauth_sessions_organization_id" ON "public"."google_workspace_oauth_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_google_workspace_oauth_sessions_user_id" ON "public"."google_workspace_oauth_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_inventory_item_images_inventory_item_id" ON "public"."inventory_item_images" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_inventory_item_images_org_id" ON "public"."inventory_item_images" USING "btree" ("organization_id");



CREATE INDEX "idx_inventory_item_images_uploaded_by" ON "public"."inventory_item_images" USING "btree" ("uploaded_by");



CREATE INDEX "idx_inventory_items_created_by" ON "public"."inventory_items" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_inventory_items_external_id_org_unique" ON "public"."inventory_items" USING "btree" ("organization_id", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_inventory_items_sku_org_unique" ON "public"."inventory_items" USING "btree" ("organization_id", "sku") WHERE ("sku" IS NOT NULL);



CREATE INDEX "idx_inventory_transactions_inventory_item_id" ON "public"."inventory_transactions" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_inventory_transactions_organization_id" ON "public"."inventory_transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_inventory_transactions_user_id" ON "public"."inventory_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_inventory_transactions_work_order_id" ON "public"."inventory_transactions" USING "btree" ("work_order_id");



CREATE INDEX "idx_invitations_offers_account_creation" ON "public"."organization_invitations" USING "btree" ("offers_account_creation") WHERE ("offers_account_creation" = true);



CREATE INDEX "idx_notes_author_id" ON "public"."notes" USING "btree" ("author_id");



CREATE INDEX "idx_notes_equipment_id" ON "public"."notes" USING "btree" ("equipment_id");



CREATE INDEX "idx_notification_settings_organization_id" ON "public"."notification_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_notification_settings_team_id" ON "public"."notification_settings" USING "btree" ("team_id");



CREATE INDEX "idx_notification_settings_user_id" ON "public"."notification_settings" USING "btree" ("user_id");



CREATE INDEX "idx_operator_checkin_submissions_equipment_submitted" ON "public"."operator_checkin_submissions" USING "btree" ("equipment_id", "submitted_at" DESC);



CREATE INDEX "idx_operator_checkin_submissions_org_submitted" ON "public"."operator_checkin_submissions" USING "btree" ("organization_id", "submitted_at" DESC);



CREATE INDEX "idx_operator_checkin_submissions_template_org" ON "public"."operator_checkin_submissions" USING "btree" ("template_id", "organization_id") WHERE ("template_id" IS NOT NULL);



CREATE INDEX "idx_operator_checkin_token_secrets_org" ON "public"."operator_checkin_token_secrets" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_operator_checklist_templates_id_org" ON "public"."operator_checklist_templates" USING "btree" ("id", "organization_id");



CREATE INDEX "idx_operator_checklist_templates_org" ON "public"."operator_checklist_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_org_invitations_org_status_optimized" ON "public"."organization_invitations" USING "btree" ("organization_id", "status") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "idx_org_invitations_pending_unique" ON "public"."organization_invitations" USING "btree" ("organization_id", "lower"(TRIM(BOTH FROM "email"))) WHERE ("status" = 'pending'::"text");



COMMENT ON INDEX "public"."idx_org_invitations_pending_unique" IS 'Ensures only one pending invitation per email per organization, while allowing multiple expired/declined invitations for re-inviting';



CREATE INDEX "idx_org_members_nonrecursive_admin_check" ON "public"."organization_members" USING "btree" ("organization_id", "user_id", "role", "status") WHERE (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_org_members_nonrecursive_member_check" ON "public"."organization_members" USING "btree" ("organization_id", "user_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_org_members_org_admin_status_optimized" ON "public"."organization_members" USING "btree" ("organization_id", "role", "status") WHERE (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_org_members_org_role_status" ON "public"."organization_members" USING "btree" ("organization_id", "role", "status");



CREATE INDEX "idx_org_members_user_org_role_status_optimized" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "role", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_org_members_user_org_status" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "status");



CREATE INDEX "idx_organization_google_export_destinations_configured_by" ON "public"."organization_google_export_destinations" USING "btree" ("configured_by");



CREATE INDEX "idx_organization_invitations_accepted_by" ON "public"."organization_invitations" USING "btree" ("accepted_by");



CREATE INDEX "idx_organization_invitations_email_org" ON "public"."organization_invitations" USING "btree" ("email", "organization_id");



CREATE INDEX "idx_organization_invitations_invited_by" ON "public"."organization_invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_organization_invitations_organization_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");



CREATE INDEX "idx_organization_member_claims_claimed_user_id" ON "public"."organization_member_claims" USING "btree" ("claimed_user_id");



CREATE INDEX "idx_organization_member_claims_created_by" ON "public"."organization_member_claims" USING "btree" ("created_by");



CREATE INDEX "idx_organization_members_admin_quick" ON "public"."organization_members" USING "btree" ("user_id", "organization_id") WHERE (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_organization_members_org_role_status" ON "public"."organization_members" USING "btree" ("organization_id", "role", "status") WHERE (("status" = 'active'::"text") AND ("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])));



CREATE INDEX "idx_organization_members_org_status" ON "public"."organization_members" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_organization_members_organization_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organization_members_user_org_status_active" ON "public"."organization_members" USING "btree" ("user_id", "organization_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_organization_members_user_status" ON "public"."organization_members" USING "btree" ("user_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_organization_role_grants_pending_applied_user_id" ON "public"."organization_role_grants_pending" USING "btree" ("applied_user_id");



CREATE INDEX "idx_organization_role_grants_pending_created_by" ON "public"."organization_role_grants_pending" USING "btree" ("created_by");



CREATE INDEX "idx_ownership_transfer_from_user" ON "public"."ownership_transfer_requests" USING "btree" ("from_user_id");



CREATE INDEX "idx_ownership_transfer_org" ON "public"."ownership_transfer_requests" USING "btree" ("organization_id");



CREATE INDEX "idx_ownership_transfer_pending" ON "public"."ownership_transfer_requests" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_ownership_transfer_to_user" ON "public"."ownership_transfer_requests" USING "btree" ("to_user_id");



CREATE INDEX "idx_part_alternate_group_members_group" ON "public"."part_alternate_group_members" USING "btree" ("group_id");



CREATE INDEX "idx_part_alternate_group_members_item" ON "public"."part_alternate_group_members" USING "btree" ("inventory_item_id") WHERE ("inventory_item_id" IS NOT NULL);



CREATE INDEX "idx_part_alternate_group_members_part_identifier_id" ON "public"."part_alternate_group_members" USING "btree" ("part_identifier_id");



CREATE INDEX "idx_part_alternate_groups_created_by" ON "public"."part_alternate_groups" USING "btree" ("created_by");



CREATE INDEX "idx_part_alternate_groups_status" ON "public"."part_alternate_groups" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_part_alternate_groups_verified_by" ON "public"."part_alternate_groups" USING "btree" ("verified_by");



CREATE INDEX "idx_part_compat_rules_item" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_part_compat_rules_match_type" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id", "match_type");



CREATE INDEX "idx_part_compat_rules_mfr_model_norm" ON "public"."part_compatibility_rules" USING "btree" ("manufacturer_norm", "model_norm");



CREATE UNIQUE INDEX "idx_part_compat_rules_unique_any_model" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id", "manufacturer_norm") WHERE ("model_norm" IS NULL);



COMMENT ON INDEX "public"."idx_part_compat_rules_unique_any_model" IS 'Ensures only one "any model" rule per manufacturer per inventory item (handles NULL model_norm)';



CREATE UNIQUE INDEX "idx_part_compat_rules_unique_with_model" ON "public"."part_compatibility_rules" USING "btree" ("inventory_item_id", "manufacturer_norm", "model_norm") WHERE ("model_norm" IS NOT NULL);



COMMENT ON INDEX "public"."idx_part_compat_rules_unique_with_model" IS 'Ensures unique manufacturer/model combinations per inventory item when model is specified';



CREATE INDEX "idx_part_compatibility_rules_created_by" ON "public"."part_compatibility_rules" USING "btree" ("created_by");



CREATE INDEX "idx_part_compatibility_rules_verified_by" ON "public"."part_compatibility_rules" USING "btree" ("verified_by");



CREATE INDEX "idx_part_identifiers_created_by" ON "public"."part_identifiers" USING "btree" ("created_by");



CREATE INDEX "idx_part_identifiers_inventory_item" ON "public"."part_identifiers" USING "btree" ("inventory_item_id") WHERE ("inventory_item_id" IS NOT NULL);



CREATE INDEX "idx_part_identifiers_norm_value" ON "public"."part_identifiers" USING "btree" ("organization_id", "norm_value");



CREATE INDEX "idx_parts_consumers_org_id" ON "public"."parts_consumers" USING "btree" ("organization_id");



CREATE INDEX "idx_parts_consumers_user_id" ON "public"."parts_consumers" USING "btree" ("user_id");



CREATE INDEX "idx_parts_managers_assigned_by" ON "public"."parts_managers" USING "btree" ("assigned_by");



CREATE INDEX "idx_parts_managers_org_id" ON "public"."parts_managers" USING "btree" ("organization_id");



CREATE INDEX "idx_parts_managers_user_id" ON "public"."parts_managers" USING "btree" ("user_id");



CREATE INDEX "idx_pm_checklist_templates_created_by" ON "public"."pm_checklist_templates" USING "btree" ("created_by");



CREATE INDEX "idx_pm_checklist_templates_updated_by" ON "public"."pm_checklist_templates" USING "btree" ("updated_by");



CREATE INDEX "idx_pm_historical" ON "public"."preventative_maintenance" USING "btree" ("is_historical", "organization_id");



CREATE INDEX "idx_pm_interval_policies_equipment" ON "public"."pm_interval_policies" USING "btree" ("equipment_id") WHERE ("equipment_id" IS NOT NULL);



CREATE INDEX "idx_pm_interval_policies_org" ON "public"."pm_interval_policies" USING "btree" ("organization_id");



CREATE INDEX "idx_pm_interval_policies_team" ON "public"."pm_interval_policies" USING "btree" ("team_id") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "idx_pm_interval_policies_template" ON "public"."pm_interval_policies" USING "btree" ("organization_id", "pm_template_id") WHERE ("pm_template_id" IS NOT NULL);



CREATE INDEX "idx_pm_org_status_composite" ON "public"."preventative_maintenance" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_pm_status_history_changed_by" ON "public"."pm_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_pm_status_history_pm_id" ON "public"."pm_status_history" USING "btree" ("pm_id");



CREATE INDEX "idx_pm_template_compat_rules_mfr_model_norm" ON "public"."pm_template_compatibility_rules" USING "btree" ("organization_id", "manufacturer_norm", "model_norm");



CREATE INDEX "idx_pm_template_compat_rules_org_template" ON "public"."pm_template_compatibility_rules" USING "btree" ("organization_id", "pm_template_id");



CREATE INDEX "idx_preventative_maintenance_completed_by" ON "public"."preventative_maintenance" USING "btree" ("completed_by");



CREATE INDEX "idx_preventative_maintenance_created_by" ON "public"."preventative_maintenance" USING "btree" ("created_by");



CREATE INDEX "idx_preventative_maintenance_equipment_id" ON "public"."preventative_maintenance" USING "btree" ("equipment_id");



CREATE INDEX "idx_preventative_maintenance_organization_id" ON "public"."preventative_maintenance" USING "btree" ("organization_id");



CREATE INDEX "idx_preventative_maintenance_template_id" ON "public"."preventative_maintenance" USING "btree" ("template_id");



CREATE INDEX "idx_preventative_maintenance_work_order_id" ON "public"."preventative_maintenance" USING "btree" ("work_order_id");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_qbo_invoice_status_events_org_realm_entity" ON "public"."quickbooks_invoice_status_events" USING "btree" ("organization_id", "realm_id", "entity_name", "entity_id");



CREATE INDEX "idx_qbo_invoice_status_events_pending" ON "public"."quickbooks_invoice_status_events" USING "btree" ("status", "created_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'error'::"text"]));



CREATE INDEX "idx_qbo_invoice_status_events_stale_processing" ON "public"."quickbooks_invoice_status_events" USING "btree" ("updated_at") WHERE (("status" = 'processing'::"text") AND ("attempts" < 5));



CREATE INDEX "idx_quick_form_submissions_form_submitted" ON "public"."quick_form_submissions" USING "btree" ("quick_form_id", "submitted_at" DESC);



CREATE INDEX "idx_quick_form_submissions_org_submitted" ON "public"."quick_form_submissions" USING "btree" ("organization_id", "submitted_at" DESC);



CREATE INDEX "idx_quick_form_token_secrets_org" ON "public"."quick_form_token_secrets" USING "btree" ("organization_id");



CREATE INDEX "idx_quick_forms_org" ON "public"."quick_forms" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_quick_forms_token_hash" ON "public"."quick_forms" USING "btree" ("public_token_hash");



CREATE INDEX "idx_quickbooks_credentials_org" ON "public"."quickbooks_credentials" USING "btree" ("organization_id");



CREATE INDEX "idx_quickbooks_export_logs_organization_id" ON "public"."quickbooks_export_logs" USING "btree" ("organization_id");



CREATE INDEX "idx_quickbooks_export_logs_work_order_created" ON "public"."quickbooks_export_logs" USING "btree" ("work_order_id", "created_at" DESC);



CREATE INDEX "idx_quickbooks_oauth_sessions_organization_id" ON "public"."quickbooks_oauth_sessions" USING "btree" ("organization_id");



CREATE INDEX "idx_quickbooks_oauth_sessions_user_id" ON "public"."quickbooks_oauth_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_quickbooks_team_customers_org" ON "public"."quickbooks_team_customers" USING "btree" ("organization_id");



CREATE INDEX "idx_quickbooks_team_customers_team" ON "public"."quickbooks_team_customers" USING "btree" ("team_id");



CREATE INDEX "idx_record_export_artifacts_last_exported_by" ON "public"."record_export_artifacts" USING "btree" ("last_exported_by");



CREATE INDEX "idx_record_export_artifacts_org" ON "public"."record_export_artifacts" USING "btree" ("organization_id");



CREATE INDEX "idx_record_export_artifacts_record" ON "public"."record_export_artifacts" USING "btree" ("record_type", "record_id");



CREATE INDEX "idx_scan_follow_up_events_equipment_performed_at" ON "public"."scan_follow_up_events" USING "btree" ("equipment_id", "performed_at" DESC);



CREATE INDEX "idx_scan_follow_up_events_performed_by" ON "public"."scan_follow_up_events" USING "btree" ("performed_by");



CREATE INDEX "idx_scan_follow_up_events_scan_id" ON "public"."scan_follow_up_events" USING "btree" ("scan_id");



CREATE INDEX "idx_scans_equipment_id" ON "public"."scans" USING "btree" ("equipment_id");



CREATE INDEX "idx_scans_equipment_latest_location" ON "public"."scans" USING "btree" ("equipment_id", "scanned_at" DESC) WHERE ("location" IS NOT NULL);



CREATE INDEX "idx_scans_scanned_by" ON "public"."scans" USING "btree" ("scanned_by");



CREATE INDEX "idx_team_members_team_id" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_team_members_user_team" ON "public"."team_members" USING "btree" ("user_id", "team_id");



CREATE INDEX "idx_teams_customer_id" ON "public"."teams" USING "btree" ("customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_teams_organization_id" ON "public"."teams" USING "btree" ("organization_id");



CREATE INDEX "idx_teams_team_lead_id" ON "public"."teams" USING "btree" ("team_lead_id");



CREATE INDEX "idx_ticket_comments_ticket_id" ON "public"."ticket_comments" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_user_id" ON "public"."tickets" USING "btree" ("user_id");



CREATE INDEX "idx_user_dashboard_preferences_organization_id" ON "public"."user_dashboard_preferences" USING "btree" ("organization_id");



CREATE INDEX "idx_work_order_costs_created_by" ON "public"."work_order_costs" USING "btree" ("created_by");



CREATE INDEX "idx_work_order_costs_inventory_item_id" ON "public"."work_order_costs" USING "btree" ("inventory_item_id");



CREATE INDEX "idx_work_order_costs_work_order_id" ON "public"."work_order_costs" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_equipment_equipment_id" ON "public"."work_order_equipment" USING "btree" ("equipment_id");



CREATE INDEX "idx_work_order_images_note_id" ON "public"."work_order_images" USING "btree" ("note_id");



CREATE INDEX "idx_work_order_images_uploaded_by" ON "public"."work_order_images" USING "btree" ("uploaded_by");



CREATE INDEX "idx_work_order_images_work_order_id" ON "public"."work_order_images" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_notes_author_id" ON "public"."work_order_notes" USING "btree" ("author_id");



CREATE INDEX "idx_work_order_notes_work_order_id" ON "public"."work_order_notes" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_order_status_history_changed_by" ON "public"."work_order_status_history" USING "btree" ("changed_by");



CREATE INDEX "idx_work_order_status_history_work_order_id" ON "public"."work_order_status_history" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_orders_assignee_id" ON "public"."work_orders" USING "btree" ("assignee_id");



CREATE INDEX "idx_work_orders_assignee_status" ON "public"."work_orders" USING "btree" ("assignee_id", "status") WHERE ("assignee_id" IS NOT NULL);



CREATE INDEX "idx_work_orders_created_by" ON "public"."work_orders" USING "btree" ("created_by");



CREATE INDEX "idx_work_orders_created_by_admin" ON "public"."work_orders" USING "btree" ("created_by_admin");



CREATE INDEX "idx_work_orders_due_date" ON "public"."work_orders" USING "btree" ("due_date");



CREATE INDEX "idx_work_orders_equipment_id" ON "public"."work_orders" USING "btree" ("equipment_id");



CREATE INDEX "idx_work_orders_equipment_status" ON "public"."work_orders" USING "btree" ("equipment_id", "status");



CREATE INDEX "idx_work_orders_historical" ON "public"."work_orders" USING "btree" ("is_historical", "organization_id");



CREATE INDEX "idx_work_orders_org_due_date" ON "public"."work_orders" USING "btree" ("organization_id", "due_date") WHERE ("due_date" IS NOT NULL);



CREATE INDEX "idx_work_orders_org_invoice_status" ON "public"."work_orders" USING "btree" ("organization_id", "invoice_status") WHERE ("invoice_status" IS NOT NULL);



CREATE INDEX "idx_work_orders_org_status_composite" ON "public"."work_orders" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_work_orders_organization_id" ON "public"."work_orders" USING "btree" ("organization_id");



CREATE INDEX "idx_work_orders_primary_image_id" ON "public"."work_orders" USING "btree" ("primary_image_id");



CREATE INDEX "idx_work_orders_priority" ON "public"."work_orders" USING "btree" ("priority");



CREATE INDEX "idx_work_orders_qbo_invoice_lookup" ON "public"."work_orders" USING "btree" ("quickbooks_realm_id", "quickbooks_invoice_id") WHERE (("quickbooks_realm_id" IS NOT NULL) AND ("quickbooks_invoice_id" IS NOT NULL));



CREATE INDEX "idx_work_orders_status" ON "public"."work_orders" USING "btree" ("status");



CREATE INDEX "idx_work_orders_team_id" ON "public"."work_orders" USING "btree" ("team_id");



CREATE INDEX "idx_workspace_domains_organization_id" ON "public"."workspace_domains" USING "btree" ("organization_id");



CREATE INDEX "idx_workspace_merge_org" ON "public"."workspace_personal_org_merge_requests" USING "btree" ("workspace_org_id");



CREATE INDEX "idx_workspace_merge_requested_by" ON "public"."workspace_personal_org_merge_requests" USING "btree" ("requested_by_user_id");



CREATE INDEX "idx_workspace_merge_requested_for" ON "public"."workspace_personal_org_merge_requests" USING "btree" ("requested_for_user_id");



CREATE UNIQUE INDEX "organization_member_claims_unique_active" ON "public"."organization_member_claims" USING "btree" ("organization_id", "public"."normalize_email"("email")) WHERE ("status" = ANY (ARRAY['selected'::"text", 'claimed'::"text"]));



CREATE UNIQUE INDEX "organization_role_grants_pending_unique" ON "public"."organization_role_grants_pending" USING "btree" ("organization_id", "public"."normalize_email"("email")) WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "personal_organizations_org_unique" ON "public"."personal_organizations" USING "btree" ("organization_id");



COMMENT ON INDEX "public"."personal_organizations_org_unique" IS 'Ensures each organization can only be the personal organization for one user.';



CREATE UNIQUE INDEX "pm_interval_policies_equipment_slot_uidx" ON "public"."pm_interval_policies" USING "btree" ("organization_id", "equipment_id", "policy_slot") WHERE ("equipment_id" IS NOT NULL);



CREATE UNIQUE INDEX "pm_interval_policies_team_slot_uidx" ON "public"."pm_interval_policies" USING "btree" ("organization_id", "team_id", "policy_slot") WHERE ("team_id" IS NOT NULL);



CREATE UNIQUE INDEX "pm_interval_policies_template_slot_uidx" ON "public"."pm_interval_policies" USING "btree" ("organization_id", "pm_template_id", "policy_slot") WHERE ("pm_template_id" IS NOT NULL);



CREATE INDEX "terms_acceptances_user_accepted_idx" ON "public"."terms_acceptances" USING "btree" ("user_id", "accepted_at" DESC);



CREATE INDEX "terms_acceptances_versions_idx" ON "public"."terms_acceptances" USING "btree" ("terms_version_hash", "privacy_version_hash");



CREATE UNIQUE INDEX "uq_tickets_github_issue_number" ON "public"."tickets" USING "btree" ("github_issue_number") WHERE ("github_issue_number" IS NOT NULL);



CREATE UNIQUE INDEX "workspace_domains_normalized_domain_unique" ON "public"."workspace_domains" USING "btree" ("public"."normalize_domain"("domain"));



COMMENT ON INDEX "public"."workspace_domains_normalized_domain_unique" IS 'Ensures workspace domain claims are unique after normalization (case/whitespace insensitive).';



CREATE UNIQUE INDEX "workspace_merge_unique_pending" ON "public"."workspace_personal_org_merge_requests" USING "btree" ("workspace_org_id", "requested_for_user_id") WHERE ("status" = 'pending'::"text");



CREATE OR REPLACE TRIGGER "audit_equipment_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."audit_equipment_changes"();



CREATE OR REPLACE TRIGGER "audit_inventory_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_inventory_changes"();



CREATE OR REPLACE TRIGGER "audit_org_member_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."audit_org_member_changes"();



CREATE OR REPLACE TRIGGER "audit_pm_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."audit_pm_changes"();



CREATE OR REPLACE TRIGGER "audit_team_member_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."audit_team_member_changes"();



CREATE OR REPLACE TRIGGER "audit_team_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."audit_team_changes"();



CREATE OR REPLACE TRIGGER "audit_work_order_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."audit_work_order_changes"();



CREATE OR REPLACE TRIGGER "before_team_delete" BEFORE DELETE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_team_deletion"();



CREATE OR REPLACE TRIGGER "broadcast_notification_trigger" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_notification"();



COMMENT ON TRIGGER "broadcast_notification_trigger" ON "public"."notifications" IS 'Broadcasts a real-time signal to the target user when a notification is created.';



CREATE OR REPLACE TRIGGER "enforce_manual_external_contact_metadata" BEFORE INSERT OR UPDATE ON "public"."external_customer_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_manual_external_contact_metadata"();



CREATE OR REPLACE TRIGGER "enforce_work_order_primary_image_match_trigger" BEFORE INSERT OR UPDATE OF "primary_image_id" ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_work_order_primary_image_match"();



CREATE OR REPLACE TRIGGER "equipment_note_images_storage_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."equipment_note_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_storage"();



CREATE OR REPLACE TRIGGER "expire_invitations_trigger" AFTER INSERT OR UPDATE ON "public"."organization_invitations" FOR EACH STATEMENT EXECUTE FUNCTION "public"."expire_old_invitations"();



CREATE OR REPLACE TRIGGER "expire_old_invitations_trigger" AFTER INSERT ON "public"."organization_invitations" FOR EACH STATEMENT EXECUTE FUNCTION "public"."expire_old_invitations"();



CREATE OR REPLACE TRIGGER "handle_dsr_requests_updated_at" BEFORE UPDATE ON "public"."dsr_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."notes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_equipment_notes" BEFORE UPDATE ON "public"."equipment_notes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_notifications" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_work_order_notes" BEFORE UPDATE ON "public"."work_order_notes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "inventory_item_images_storage_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."inventory_item_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_storage"();



CREATE OR REPLACE TRIGGER "org_member_security_notifications_trigger" AFTER INSERT OR UPDATE OF "role" ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."notify_organization_member_security_events"();



CREATE OR REPLACE TRIGGER "organization_members_cleanup_parts_consumers" BEFORE DELETE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_inventory_grants_on_member_removal"();



CREATE OR REPLACE TRIGGER "pm_status_change_trigger" AFTER UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."log_pm_status_change"();



CREATE OR REPLACE TRIGGER "team_member_security_notifications_trigger" AFTER INSERT OR UPDATE OF "role" ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."notify_team_member_security_events"();



CREATE OR REPLACE TRIGGER "tr_snapshot_pm_working_hours" BEFORE UPDATE OF "status" ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."snapshot_pm_working_hours"();



CREATE OR REPLACE TRIGGER "tr_sync_equipment_last_maintenance" AFTER UPDATE OF "status", "completed_date" ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_equipment_last_maintenance_from_work_order"();



CREATE OR REPLACE TRIGGER "trg_enforce_scan_location_privacy" BEFORE INSERT ON "public"."scans" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_scan_location_privacy"();



CREATE OR REPLACE TRIGGER "trg_ensure_operator_template_active_for_enabled_assignment" BEFORE INSERT OR UPDATE OF "enabled", "template_id", "organization_id" ON "public"."equipment_operator_checkin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_operator_template_active_for_enabled_assignment"();



CREATE OR REPLACE TRIGGER "trg_equipment_notes_set_organization_id" BEFORE INSERT OR UPDATE OF "equipment_id" ON "public"."equipment_notes" FOR EACH ROW EXECUTE FUNCTION "public"."set_equipment_note_organization_id"();



CREATE OR REPLACE TRIGGER "trg_equipment_status_history" AFTER UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."record_equipment_status_change"();



CREATE OR REPLACE TRIGGER "trg_google_export_destinations_updated_at" BEFORE UPDATE ON "public"."organization_google_export_destinations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_log_dsr_intake" AFTER INSERT ON "public"."dsr_requests" FOR EACH ROW EXECUTE FUNCTION "public"."log_dsr_intake_event"();



CREATE OR REPLACE TRIGGER "trg_log_dsr_status_change" AFTER UPDATE ON "public"."dsr_requests" FOR EACH ROW EXECUTE FUNCTION "public"."log_dsr_status_change"();



CREATE OR REPLACE TRIGGER "trg_log_scan_location_history" AFTER INSERT ON "public"."scans" FOR EACH ROW EXECUTE FUNCTION "public"."log_scan_location_history"();



CREATE OR REPLACE TRIGGER "trg_pm_checklist_templates_touch" BEFORE UPDATE ON "public"."pm_checklist_templates" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_dsr_event_delete" BEFORE DELETE ON "public"."dsr_request_events" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_dsr_event_mutation"();



CREATE OR REPLACE TRIGGER "trg_prevent_dsr_event_update" BEFORE UPDATE ON "public"."dsr_request_events" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_dsr_event_mutation"();



CREATE OR REPLACE TRIGGER "trg_prevent_inactive_operator_template_with_enabled_assignments" BEFORE UPDATE OF "is_active" ON "public"."operator_checklist_templates" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_inactive_operator_template_with_enabled_assignments"();



CREATE OR REPLACE TRIGGER "trg_record_export_artifacts_updated_at" BEFORE UPDATE ON "public"."record_export_artifacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_set_geocoded_locations_updated_at" BEFORE UPDATE ON "public"."geocoded_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_geocoded_locations_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_equipment_last_known_location_from_scan" AFTER INSERT ON "public"."scans" FOR EACH ROW EXECUTE FUNCTION "public"."sync_equipment_last_known_location_from_scan"();



CREATE OR REPLACE TRIGGER "trg_validate_operator_checkin_settings_org_refs" BEFORE INSERT OR UPDATE OF "equipment_id", "template_id", "organization_id" ON "public"."equipment_operator_checkin_settings" FOR EACH ROW EXECUTE FUNCTION "public"."validate_operator_checkin_settings_org_refs"();



CREATE OR REPLACE TRIGGER "trg_validate_work_order_assignee" BEFORE INSERT OR UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."validate_work_order_assignee"();



COMMENT ON TRIGGER "trg_validate_work_order_assignee" ON "public"."work_orders" IS 'Enforces that work order assignees are valid (team members or org admins) and syncs team_id from equipment.';



CREATE OR REPLACE TRIGGER "trg_work_orders_touch" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_broadcast_ticket_comment" AFTER INSERT ON "public"."ticket_comments" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_ticket_comment"();



CREATE OR REPLACE TRIGGER "trigger_broadcast_ticket_status_update" AFTER UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_ticket_status_update"();



CREATE OR REPLACE TRIGGER "trigger_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_customers_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_external_customer_contacts_updated_at" BEFORE UPDATE ON "public"."external_customer_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_external_customer_contacts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_quickbooks_credentials_updated_at" BEFORE UPDATE ON "public"."quickbooks_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_quickbooks_export_logs_updated_at" BEFORE UPDATE ON "public"."quickbooks_export_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_export_logs_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_quickbooks_invoice_status_events_updated_at" BEFORE UPDATE ON "public"."quickbooks_invoice_status_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_invoice_status_events_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_quickbooks_team_customers_updated_at" BEFORE UPDATE ON "public"."quickbooks_team_customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_quickbooks_team_customers_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_sync_equipment_customer" AFTER UPDATE OF "customer_id" ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."sync_equipment_customer_from_team"();



CREATE OR REPLACE TRIGGER "trigger_sync_primary_equipment" AFTER INSERT OR UPDATE OF "is_primary" ON "public"."work_order_equipment" FOR EACH ROW WHEN (("new"."is_primary" = true)) EXECUTE FUNCTION "public"."sync_work_order_primary_equipment"();



CREATE OR REPLACE TRIGGER "trigger_update_member_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_member_count"();



CREATE OR REPLACE TRIGGER "trigger_update_pm_updated_at" BEFORE UPDATE ON "public"."preventative_maintenance" FOR EACH ROW EXECUTE FUNCTION "public"."update_pm_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_member_limit" BEFORE INSERT OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."validate_member_limit"();



CREATE OR REPLACE TRIGGER "update_inventory_items_updated_at" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_notification_settings_updated_at" BEFORE UPDATE ON "public"."notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_notification_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_organization_invitations_updated_at" BEFORE UPDATE ON "public"."organization_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_part_alternate_groups_updated_at" BEFORE UPDATE ON "public"."part_alternate_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_part_compatibility_rules_updated_at" BEFORE UPDATE ON "public"."part_compatibility_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_dashboard_preferences_updated_at" BEFORE UPDATE ON "public"."user_dashboard_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_work_orders_updated_at" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "work_order_costs_updated_at" BEFORE UPDATE ON "public"."work_order_costs" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_order_costs_updated_at"();



CREATE OR REPLACE TRIGGER "work_order_images_storage_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."work_order_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_organization_storage"();



CREATE OR REPLACE TRIGGER "work_order_status_change_trigger" AFTER UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_work_order_status_change"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "audit_log_organization_id_fkey" ON "public"."audit_log" IS 'SET NULL on delete - preserves audit history when organization is deleted. NULL org_id indicates the organization was deleted.';



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_sites"
    ADD CONSTRAINT "customer_sites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_account_owner_id_fkey" FOREIGN KEY ("account_owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."dsr_request_events"
    ADD CONSTRAINT "dsr_request_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dsr_request_events"
    ADD CONSTRAINT "dsr_request_events_dsr_request_id_fkey" FOREIGN KEY ("dsr_request_id") REFERENCES "public"."dsr_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dsr_requests"
    ADD CONSTRAINT "dsr_requests_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dsr_requests"
    ADD CONSTRAINT "dsr_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dsr_requests"
    ADD CONSTRAINT "dsr_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dsr_requests"
    ADD CONSTRAINT "dsr_requests_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_default_pm_template_id_fkey" FOREIGN KEY ("default_pm_template_id") REFERENCES "public"."pm_checklist_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_last_maintenance_work_order_id_fkey" FOREIGN KEY ("last_maintenance_work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_location_history"
    ADD CONSTRAINT "equipment_location_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_location_history"
    ADD CONSTRAINT "equipment_location_history_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_note_images"
    ADD CONSTRAINT "equipment_note_images_equipment_note_id_fkey" FOREIGN KEY ("equipment_note_id") REFERENCES "public"."equipment_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_note_images"
    ADD CONSTRAINT "equipment_note_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_notes"
    ADD CONSTRAINT "equipment_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_operator_checkin_settings"
    ADD CONSTRAINT "equipment_operator_checkin_settings_equipment_org_fkey" FOREIGN KEY ("equipment_id", "organization_id") REFERENCES "public"."equipment"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_operator_checkin_settings"
    ADD CONSTRAINT "equipment_operator_checkin_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_operator_checkin_settings"
    ADD CONSTRAINT "equipment_operator_checkin_settings_template_org_fkey" FOREIGN KEY ("template_id", "organization_id") REFERENCES "public"."operator_checklist_templates"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."equipment_operator_checkin_settings"
    ADD CONSTRAINT "equipment_operator_checkin_settings_token_rotated_by_fkey" FOREIGN KEY ("token_rotated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_part_compatibility"
    ADD CONSTRAINT "equipment_part_compatibility_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_part_compatibility"
    ADD CONSTRAINT "equipment_part_compatibility_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_status_history"
    ADD CONSTRAINT "equipment_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_status_history"
    ADD CONSTRAINT "equipment_status_history_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."export_request_log"
    ADD CONSTRAINT "export_request_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."export_request_log"
    ADD CONSTRAINT "export_request_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_customer_contacts"
    ADD CONSTRAINT "external_customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "fk_pm_equipment" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "fk_pm_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preventative_maintenance"
    ADD CONSTRAINT "fk_pm_work_order" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_notes"
    ADD CONSTRAINT "fk_work_order_notes_author" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."geocoded_locations"
    ADD CONSTRAINT "geocoded_locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_workspace_credentials"
    ADD CONSTRAINT "google_workspace_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_workspace_directory_users"
    ADD CONSTRAINT "google_workspace_directory_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_workspace_oauth_sessions"
    ADD CONSTRAINT "google_workspace_oauth_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_workspace_oauth_sessions"
    ADD CONSTRAINT "google_workspace_oauth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_item_images"
    ADD CONSTRAINT "inventory_item_images_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_item_images"
    ADD CONSTRAINT "inventory_item_images_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."inventory_item_images"
    ADD CONSTRAINT "inventory_item_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."operator_checkin_submissions"
    ADD CONSTRAINT "operator_checkin_submissions_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_checkin_submissions"
    ADD CONSTRAINT "operator_checkin_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_checkin_submissions"
    ADD CONSTRAINT "operator_checkin_submissions_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "public"."equipment_operator_checkin_settings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operator_checkin_submissions"
    ADD CONSTRAINT "operator_checkin_submissions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."operator_checklist_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operator_checkin_token_secrets"
    ADD CONSTRAINT "operator_checkin_token_secrets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_checkin_token_secrets"
    ADD CONSTRAINT "operator_checkin_token_secrets_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "public"."equipment_operator_checkin_settings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_checklist_templates"
    ADD CONSTRAINT "operator_checklist_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operator_checklist_templates"
    ADD CONSTRAINT "operator_checklist_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operator_checklist_templates"
    ADD CONSTRAINT "operator_checklist_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organization_google_export_destinations"
    ADD CONSTRAINT "organization_google_export_destinations_configured_by_fkey" FOREIGN KEY ("configured_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_google_export_destinations"
    ADD CONSTRAINT "organization_google_export_destinations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_member_claims"
    ADD CONSTRAINT "organization_member_claims_claimed_user_id_fkey" FOREIGN KEY ("claimed_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_member_claims"
    ADD CONSTRAINT "organization_member_claims_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_member_claims"
    ADD CONSTRAINT "organization_member_claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_role_grants_pending"
    ADD CONSTRAINT "organization_role_grants_pending_applied_user_id_fkey" FOREIGN KEY ("applied_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_role_grants_pending"
    ADD CONSTRAINT "organization_role_grants_pending_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_role_grants_pending"
    ADD CONSTRAINT "organization_role_grants_pending_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "part_alternate_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."part_identifiers"
    ADD CONSTRAINT "part_identifiers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts_consumers"
    ADD CONSTRAINT "parts_consumers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parts_consumers"
    ADD CONSTRAINT "parts_consumers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts_consumers"
    ADD CONSTRAINT "parts_consumers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts_managers"
    ADD CONSTRAINT "parts_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_organizations"
    ADD CONSTRAINT "personal_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_organizations"
    ADD CONSTRAINT "personal_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_checklist_templates"
    ADD CONSTRAINT "pm_checklist_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."pm_interval_policies"
    ADD CONSTRAINT "pm_interval_policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pm_interval_policies"
    ADD CONSTRAINT "pm_interval_policies_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_interval_policies"
    ADD CONSTRAINT "pm_interval_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_interval_policies"
    ADD CONSTRAINT "pm_interval_policies_pm_template_id_fkey" FOREIGN KEY ("pm_template_id") REFERENCES "public"."pm_checklist_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_interval_policies"
    ADD CONSTRAINT "pm_interval_policies_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pm_interval_policies"
    ADD CONSTRAINT "pm_interval_policies_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pm_status_history"
    ADD CONSTRAINT "pm_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_form_submissions"
    ADD CONSTRAINT "quick_form_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_form_submissions"
    ADD CONSTRAINT "quick_form_submissions_quick_form_id_fkey" FOREIGN KEY ("quick_form_id") REFERENCES "public"."quick_forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_form_token_secrets"
    ADD CONSTRAINT "quick_form_token_secrets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_form_token_secrets"
    ADD CONSTRAINT "quick_form_token_secrets_quick_form_id_fkey" FOREIGN KEY ("quick_form_id") REFERENCES "public"."quick_forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_forms"
    ADD CONSTRAINT "quick_forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quick_forms"
    ADD CONSTRAINT "quick_forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quick_forms"
    ADD CONSTRAINT "quick_forms_token_rotated_by_fkey" FOREIGN KEY ("token_rotated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quick_forms"
    ADD CONSTRAINT "quick_forms_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."quickbooks_credentials"
    ADD CONSTRAINT "quickbooks_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_export_logs"
    ADD CONSTRAINT "quickbooks_export_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_export_logs"
    ADD CONSTRAINT "quickbooks_export_logs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_invoice_status_events"
    ADD CONSTRAINT "quickbooks_invoice_status_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_oauth_sessions"
    ADD CONSTRAINT "quickbooks_oauth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quickbooks_team_customers"
    ADD CONSTRAINT "quickbooks_team_customers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."record_export_artifacts"
    ADD CONSTRAINT "record_export_artifacts_last_exported_by_fkey" FOREIGN KEY ("last_exported_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."record_export_artifacts"
    ADD CONSTRAINT "record_export_artifacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scan_follow_up_events"
    ADD CONSTRAINT "scan_follow_up_events_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scan_follow_up_events"
    ADD CONSTRAINT "scan_follow_up_events_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."scan_follow_up_events"
    ADD CONSTRAINT "scan_follow_up_events_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_scanned_by_fkey" FOREIGN KEY ("scanned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_team_lead_id_fkey" FOREIGN KEY ("team_lead_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."terms_acceptances"
    ADD CONSTRAINT "terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_dashboard_preferences"
    ADD CONSTRAINT "user_dashboard_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_dashboard_preferences"
    ADD CONSTRAINT "user_dashboard_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_departure_queue"
    ADD CONSTRAINT "user_departure_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_departure_queue"
    ADD CONSTRAINT "user_departure_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_costs"
    ADD CONSTRAINT "work_order_costs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."work_order_notes"
    ADD CONSTRAINT "work_order_notes_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_order_status_history"
    ADD CONSTRAINT "work_order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_order_status_history"
    ADD CONSTRAINT "work_order_status_history_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_primary_image_id_fkey" FOREIGN KEY ("primary_image_id") REFERENCES "public"."work_order_images"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_domains"
    ADD CONSTRAINT "workspace_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_personal_org_merge_requests"
    ADD CONSTRAINT "workspace_personal_org_merge_request_requested_for_user_id_fkey" FOREIGN KEY ("requested_for_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_personal_org_merge_requests"
    ADD CONSTRAINT "workspace_personal_org_merge_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_personal_org_merge_requests"
    ADD CONSTRAINT "workspace_personal_org_merge_requests_workspace_org_id_fkey" FOREIGN KEY ("workspace_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create historical work orders" ON "public"."work_orders" FOR INSERT WITH CHECK ((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("created_by_admin" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Admins can delete work orders" ON "public"."work_orders" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "Admins can delete working hours history" ON "public"."equipment_working_hours_history" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "Admins can insert work order history" ON "public"."work_order_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_status_history"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))) AND ("changed_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Admins can update historical work orders" ON "public"."work_orders" FOR UPDATE USING ((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "Admins can update working hours history" ON "public"."equipment_working_hours_history" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "Authorized users can insert removal audit" ON "public"."member_removal_audit" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "member_removal_audit"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "Org admins can view removal audit" ON "public"."member_removal_audit" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Org owners and admins can view audit logs" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Service role can insert removal audit" ON "public"."member_removal_audit" FOR INSERT TO "service_role" WITH CHECK (true);



COMMENT ON POLICY "Service role can insert removal audit" ON "public"."member_removal_audit" IS 'Allows service_role to insert audit records for member removals.';



CREATE POLICY "Service role can manage export logs" ON "public"."export_request_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can insert audit logs" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "Users can create work orders in their organization" ON "public"."work_orders" FOR INSERT WITH CHECK ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can create working hours history for accessible equipment" ON "public"."equipment_working_hours_history" FOR INSERT WITH CHECK ((("updated_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") OR ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") AND ("e"."team_id" IS NOT NULL) AND ("e"."team_id" IN ( SELECT "tm"."team_id"
           FROM "public"."team_members" "tm"
          WHERE ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))))))));



CREATE POLICY "Users can insert own export logs" ON "public"."export_request_log" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can manage their own notification preferences" ON "public"."notification_preferences" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update work orders in their organization" ON "public"."work_orders" FOR UPDATE USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can upload images to their notes" ON "public"."equipment_note_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "Users can upload work order images" ON "public"."work_order_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_images"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "Users can view comments on their own tickets" ON "public"."ticket_comments" FOR SELECT TO "authenticated" USING (("ticket_id" IN ( SELECT "tickets"."id"
   FROM "public"."tickets"
  WHERE ("tickets"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view images for accessible notes" ON "public"."equipment_note_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."equipment_notes" "en"
     JOIN "public"."equipment" "e" ON (("e"."id" = "en"."equipment_id")))
  WHERE (("en"."id" = "equipment_note_images"."equipment_note_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view their own tickets" ON "public"."tickets" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view work order history for their organization" ON "public"."work_order_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_status_history"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "Users can view work order images" ON "public"."work_order_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_images"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))));



CREATE POLICY "Users can view work orders in their organization" ON "public"."work_orders" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "Users can view working hours history for accessible equipment" ON "public"."equipment_working_hours_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_working_hours_history"."equipment_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") OR ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id") AND ("e"."team_id" IS NOT NULL) AND ("e"."team_id" IN ( SELECT "tm"."team_id"
           FROM "public"."team_members" "tm"
          WHERE ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))))));



CREATE POLICY "admins_delete_teams" ON "public"."teams" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "admins_delete_work_orders" ON "public"."work_orders" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "admins_manage_teams" ON "public"."teams" USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "admins_update_teams" ON "public"."teams" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


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



CREATE POLICY "customers_admins_update" ON "public"."customers" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "customers_members_select" ON "public"."customers" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "dashboard_preferences_delete_own_org" ON "public"."user_dashboard_preferences" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "dashboard_preferences_insert_own_org" ON "public"."user_dashboard_preferences" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "dashboard_preferences_select_own_org" ON "public"."user_dashboard_preferences" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "dashboard_preferences_update_own_org" ON "public"."user_dashboard_preferences" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."dsr_request_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dsr_request_events_select" ON "public"."dsr_request_events" FOR SELECT TO "authenticated" USING ((("dsr_request_id" IN ( SELECT "dsr_requests"."id"
   FROM "public"."dsr_requests"
  WHERE ("dsr_requests"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM ("public"."dsr_requests" "dr"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "dr"."organization_id")))
  WHERE (("dr"."id" = "dsr_request_events"."dsr_request_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



ALTER TABLE "public"."dsr_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dsr_requests_select" ON "public"."dsr_requests" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "dsr_requests"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))));



ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_access_consolidated" ON "public"."equipment" USING (("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "equipment_admin_access" ON "public"."equipment" USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



COMMENT ON POLICY "equipment_admin_access" ON "public"."equipment" IS 'Consolidated admin policy for all equipment operations. Uses cached auth.uid() for performance.';



ALTER TABLE "public"."equipment_location_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_location_history_select" ON "public"."equipment_location_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."equipment" "e"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "e"."organization_id")))
  WHERE (("e"."id" = "equipment_location_history"."equipment_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "equipment_location_history_service_insert" ON "public"."equipment_location_history" FOR INSERT WITH CHECK (false);



CREATE POLICY "equipment_member_select" ON "public"."equipment" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "equipment_member_update" ON "public"."equipment" FOR UPDATE USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



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



CREATE POLICY "equipment_notes_insert" ON "public"."equipment_notes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



CREATE POLICY "equipment_notes_select" ON "public"."equipment_notes" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_notes"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))) OR ("author_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "equipment_notes_update" ON "public"."equipment_notes" FOR UPDATE USING (("author_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."equipment_operator_checkin_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_operator_checkin_settings_delete_admin" ON "public"."equipment_operator_checkin_settings" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "equipment_operator_checkin_settings_insert_admin" ON "public"."equipment_operator_checkin_settings" FOR INSERT WITH CHECK (("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_operator_checkin_settings"."equipment_id") AND ("e"."organization_id" = "equipment_operator_checkin_settings"."organization_id")))) AND (EXISTS ( SELECT 1
   FROM "public"."operator_checklist_templates" "tpl"
  WHERE (("tpl"."id" = "equipment_operator_checkin_settings"."template_id") AND ("tpl"."organization_id" = "equipment_operator_checkin_settings"."organization_id"))))));



CREATE POLICY "equipment_operator_checkin_settings_select_members" ON "public"."equipment_operator_checkin_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "equipment_operator_checkin_settings"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "equipment_operator_checkin_settings_update_admin" ON "public"."equipment_operator_checkin_settings" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) WITH CHECK (("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_operator_checkin_settings"."equipment_id") AND ("e"."organization_id" = "equipment_operator_checkin_settings"."organization_id")))) AND (EXISTS ( SELECT 1
   FROM "public"."operator_checklist_templates" "tpl"
  WHERE (("tpl"."id" = "equipment_operator_checkin_settings"."template_id") AND ("tpl"."organization_id" = "equipment_operator_checkin_settings"."organization_id"))))));



ALTER TABLE "public"."equipment_part_compatibility" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_part_compatibility_delete" ON "public"."equipment_part_compatibility" FOR DELETE USING (("equipment_id" IN ( SELECT "e"."id"
   FROM "public"."equipment" "e"
  WHERE "public"."can_manage_inventory"("e"."organization_id"))));



CREATE POLICY "equipment_part_compatibility_insert" ON "public"."equipment_part_compatibility" FOR INSERT WITH CHECK (("equipment_id" IN ( SELECT "e"."id"
   FROM "public"."equipment" "e"
  WHERE "public"."can_manage_inventory"("e"."organization_id"))));



CREATE POLICY "equipment_part_compatibility_select" ON "public"."equipment_part_compatibility" FOR SELECT USING (("equipment_id" IN ( SELECT "e"."id"
   FROM "public"."equipment" "e"
  WHERE "public"."can_access_inventory"("e"."organization_id"))));



CREATE POLICY "equipment_part_compatibility_update" ON "public"."equipment_part_compatibility" FOR UPDATE USING (("equipment_id" IN ( SELECT "e"."id"
   FROM "public"."equipment" "e"
  WHERE "public"."can_manage_inventory"("e"."organization_id"))));



ALTER TABLE "public"."equipment_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_team_manager_delete" ON "public"."equipment" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."team_id" = "equipment"."team_id") AND ("tm"."role" = 'manager'::"public"."team_member_role")))));



ALTER TABLE "public"."equipment_working_hours_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "esh_select_org_member" ON "public"."equipment_status_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_status_history"."equipment_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "e"."organization_id")))));



ALTER TABLE "public"."export_request_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "export_request_log_select" ON "public"."export_request_log" FOR SELECT TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members"
  WHERE (("organization_members"."organization_id" = "export_request_log"."organization_id") AND ("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("organization_members"."status" = 'active'::"text"))))));



ALTER TABLE "public"."external_customer_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "external_customer_contacts_delete" ON "public"."external_customer_contacts" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "external_customer_contacts"."customer_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id") OR (("external_customer_contacts"."source" = 'manual'::"text") AND ("external_customer_contacts"."source_external_id" IS NULL) AND ("external_customer_contacts"."source_field" IS NULL) AND ("external_customer_contacts"."last_synced_at" IS NULL) AND ("external_customer_contacts"."source_payload" IS NULL) AND (EXISTS ( SELECT 1
           FROM ("public"."teams" "t"
             JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."id")))
          WHERE (("t"."customer_id" = "c"."id") AND ("t"."organization_id" = "c"."organization_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."role" = 'manager'::"public"."team_member_role"))))))))));



COMMENT ON POLICY "external_customer_contacts_delete" ON "public"."external_customer_contacts" IS 'Org admins or team managers may delete pure manual contacts for linked customer teams. Hardens 20260707125008 manager RLS with full manual sync metadata null checks.';



CREATE POLICY "external_customer_contacts_insert" ON "public"."external_customer_contacts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "external_customer_contacts"."customer_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id") OR (("external_customer_contacts"."source" = 'manual'::"text") AND ("external_customer_contacts"."source_external_id" IS NULL) AND ("external_customer_contacts"."source_field" IS NULL) AND ("external_customer_contacts"."last_synced_at" IS NULL) AND ("external_customer_contacts"."source_payload" IS NULL) AND (EXISTS ( SELECT 1
           FROM ("public"."teams" "t"
             JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."id")))
          WHERE (("t"."customer_id" = "c"."id") AND ("t"."organization_id" = "c"."organization_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."role" = 'manager'::"public"."team_member_role"))))))))));



COMMENT ON POLICY "external_customer_contacts_insert" ON "public"."external_customer_contacts" IS 'Org admins or team managers may insert pure manual contacts for linked customer teams. Hardens 20260707125008 manager RLS with full manual sync metadata null checks.';



CREATE POLICY "external_customer_contacts_select" ON "public"."external_customer_contacts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "external_customer_contacts"."customer_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id")))));



CREATE POLICY "external_customer_contacts_update" ON "public"."external_customer_contacts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "external_customer_contacts"."customer_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id") OR (("external_customer_contacts"."source" = 'manual'::"text") AND ("external_customer_contacts"."source_external_id" IS NULL) AND ("external_customer_contacts"."source_field" IS NULL) AND ("external_customer_contacts"."last_synced_at" IS NULL) AND ("external_customer_contacts"."source_payload" IS NULL) AND (EXISTS ( SELECT 1
           FROM ("public"."teams" "t"
             JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."id")))
          WHERE (("t"."customer_id" = "c"."id") AND ("t"."organization_id" = "c"."organization_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."role" = 'manager'::"public"."team_member_role")))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "external_customer_contacts"."customer_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "c"."organization_id") OR (("external_customer_contacts"."source" = 'manual'::"text") AND ("external_customer_contacts"."source_external_id" IS NULL) AND ("external_customer_contacts"."source_field" IS NULL) AND ("external_customer_contacts"."last_synced_at" IS NULL) AND ("external_customer_contacts"."source_payload" IS NULL) AND (EXISTS ( SELECT 1
           FROM ("public"."teams" "t"
             JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."id")))
          WHERE (("t"."customer_id" = "c"."id") AND ("t"."organization_id" = "c"."organization_id") AND ("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."role" = 'manager'::"public"."team_member_role"))))))))));



COMMENT ON POLICY "external_customer_contacts_update" ON "public"."external_customer_contacts" IS 'Org admins or team managers may update pure manual contacts for linked customer teams. Hardens 20260707125008 manager RLS with full manual sync metadata null checks.';



ALTER TABLE "public"."geocoded_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "geocoded_locations_select_org_members" ON "public"."geocoded_locations" FOR SELECT USING ("public"."check_org_access_secure"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "geocoded_locations_service_insert" ON "public"."geocoded_locations" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "geocoded_locations_service_update" ON "public"."geocoded_locations" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "google_export_destinations_delete" ON "public"."organization_google_export_destinations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_google_export_destinations"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "google_export_destinations_insert" ON "public"."organization_google_export_destinations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_google_export_destinations"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "google_export_destinations_select" ON "public"."organization_google_export_destinations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_google_export_destinations"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "google_export_destinations_update" ON "public"."organization_google_export_destinations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_google_export_destinations"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "organization_google_export_destinations"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."google_workspace_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "google_workspace_credentials_delete_deny" ON "public"."google_workspace_credentials" FOR DELETE USING (false);



CREATE POLICY "google_workspace_credentials_insert_deny" ON "public"."google_workspace_credentials" FOR INSERT WITH CHECK (false);



CREATE POLICY "google_workspace_credentials_select_deny" ON "public"."google_workspace_credentials" FOR SELECT USING (false);



CREATE POLICY "google_workspace_credentials_update_deny" ON "public"."google_workspace_credentials" FOR UPDATE USING (false) WITH CHECK (false);



ALTER TABLE "public"."google_workspace_directory_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "google_workspace_directory_users_select_admin" ON "public"."google_workspace_directory_users" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."google_workspace_oauth_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "google_workspace_oauth_sessions_delete_deny" ON "public"."google_workspace_oauth_sessions" FOR DELETE USING (false);



CREATE POLICY "google_workspace_oauth_sessions_insert" ON "public"."google_workspace_oauth_sessions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("organization_id" IS NULL) OR ("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))))));



CREATE POLICY "google_workspace_oauth_sessions_select_deny" ON "public"."google_workspace_oauth_sessions" FOR SELECT USING (false);



CREATE POLICY "google_workspace_oauth_sessions_update_deny" ON "public"."google_workspace_oauth_sessions" FOR UPDATE USING (false) WITH CHECK (false);



ALTER TABLE "public"."inventory_item_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_item_images_delete" ON "public"."inventory_item_images" FOR DELETE USING (((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."can_manage_inventory"("organization_id")) OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "inventory_item_images_insert" ON "public"."inventory_item_images" FOR INSERT WITH CHECK ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."can_manage_inventory"("organization_id") AND (EXISTS ( SELECT 1
   FROM "public"."inventory_items"
  WHERE (("inventory_items"."id" = "inventory_item_images"."inventory_item_id") AND ("inventory_items"."organization_id" = "inventory_item_images"."organization_id"))))));



CREATE POLICY "inventory_item_images_select" ON "public"."inventory_item_images" FOR SELECT USING ("public"."can_access_inventory"("organization_id"));



ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_items_delete" ON "public"."inventory_items" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "inventory_items_insert" ON "public"."inventory_items" FOR INSERT WITH CHECK ("public"."can_manage_inventory"("organization_id"));



CREATE POLICY "inventory_items_select" ON "public"."inventory_items" FOR SELECT USING ("public"."can_access_inventory"("organization_id"));



CREATE POLICY "inventory_items_update" ON "public"."inventory_items" FOR UPDATE USING ("public"."can_manage_inventory"("organization_id")) WITH CHECK ("public"."can_manage_inventory"("organization_id"));



ALTER TABLE "public"."inventory_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_transactions_select" ON "public"."inventory_transactions" FOR SELECT USING ("public"."can_access_inventory"("organization_id"));



ALTER TABLE "public"."invitation_performance_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_removal_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members_access_work_orders" ON "public"."work_orders" USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "members_view_teams" ON "public"."teams" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



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


ALTER TABLE "public"."operator_checkin_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_checkin_submissions_select_members" ON "public"."operator_checkin_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "operator_checkin_submissions"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."operator_checkin_token_secrets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_checkin_token_secrets_select_admin" ON "public"."operator_checkin_token_secrets" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."operator_checklist_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "operator_checklist_templates_delete_admin" ON "public"."operator_checklist_templates" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "operator_checklist_templates_insert_admin" ON "public"."operator_checklist_templates" FOR INSERT WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "operator_checklist_templates_select_members" ON "public"."operator_checklist_templates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "operator_checklist_templates"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "operator_checklist_templates_update_admin" ON "public"."operator_checklist_templates" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."organization_google_export_destinations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_invitations_select" ON "public"."organization_invitations" FOR SELECT USING ((("email" = ( SELECT "auth"."email"() AS "email")) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "organization_invitations_update" ON "public"."organization_invitations" FOR UPDATE USING ((("email" = ( SELECT "auth"."email"() AS "email")) OR ("invited_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"))) WITH CHECK ((("email" = ( SELECT "auth"."email"() AS "email")) OR ("invited_by" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."organization_member_claims" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_member_claims_insert_admin" ON "public"."organization_member_claims" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "organization_member_claims_select_admin" ON "public"."organization_member_claims" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "organization_member_claims_update_admin" ON "public"."organization_member_claims" FOR UPDATE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members_delete" ON "public"."organization_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "organization_members"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "organization_members_delete_safe" ON "public"."organization_members" FOR DELETE TO "authenticated" USING ("public"."user_is_org_admin"("organization_id"));



CREATE POLICY "organization_members_insert" ON "public"."organization_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "organization_members"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "organization_members_insert_safe" ON "public"."organization_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_org_admin"("organization_id"));



CREATE POLICY "organization_members_select_safe" ON "public"."organization_members" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."user_is_org_member"("organization_id")));



CREATE POLICY "organization_members_update" ON "public"."organization_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "organization_members"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "organization_members_update_safe" ON "public"."organization_members" FOR UPDATE TO "authenticated" USING ("public"."user_is_org_admin"("organization_id"));



ALTER TABLE "public"."organization_role_grants_pending" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_role_grants_pending_insert_admin" ON "public"."organization_role_grants_pending" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "organization_role_grants_pending_select_admin" ON "public"."organization_role_grants_pending" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "organization_role_grants_pending_update_admin" ON "public"."organization_role_grants_pending" FOR UPDATE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_select" ON "public"."organizations" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "id") OR (EXISTS ( SELECT 1
   FROM "public"."organization_invitations"
  WHERE (("organization_invitations"."organization_id" = "organizations"."id") AND ("organization_invitations"."email" = ( SELECT "auth"."email"() AS "email")) AND ("organization_invitations"."status" = 'pending'::"text"))))));



CREATE POLICY "orgs_update_admins" ON "public"."organizations" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "id"));



ALTER TABLE "public"."ownership_transfer_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ownership_transfer_requests_select" ON "public"."ownership_transfer_requests" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR ("to_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "ownership_transfer_requests"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text"))))));



CREATE POLICY "ownership_transfer_requests_service_delete" ON "public"."ownership_transfer_requests" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "ownership_transfer_requests_service_insert" ON "public"."ownership_transfer_requests" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "ownership_transfer_requests_service_update" ON "public"."ownership_transfer_requests" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."part_alternate_group_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_alternate_group_members_delete" ON "public"."part_alternate_group_members" FOR DELETE USING (("group_id" IN ( SELECT "pag"."id"
   FROM "public"."part_alternate_groups" "pag"
  WHERE "public"."can_manage_inventory"("pag"."organization_id"))));



CREATE POLICY "part_alternate_group_members_insert" ON "public"."part_alternate_group_members" FOR INSERT WITH CHECK (("group_id" IN ( SELECT "pag"."id"
   FROM "public"."part_alternate_groups" "pag"
  WHERE "public"."can_manage_inventory"("pag"."organization_id"))));



CREATE POLICY "part_alternate_group_members_select" ON "public"."part_alternate_group_members" FOR SELECT USING (("group_id" IN ( SELECT "pag"."id"
   FROM "public"."part_alternate_groups" "pag"
  WHERE "public"."can_access_inventory"("pag"."organization_id"))));



CREATE POLICY "part_alternate_group_members_update" ON "public"."part_alternate_group_members" FOR UPDATE USING (("group_id" IN ( SELECT "pag"."id"
   FROM "public"."part_alternate_groups" "pag"
  WHERE "public"."can_manage_inventory"("pag"."organization_id"))));



ALTER TABLE "public"."part_alternate_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_alternate_groups_delete" ON "public"."part_alternate_groups" FOR DELETE USING ("public"."can_manage_inventory"("organization_id"));



CREATE POLICY "part_alternate_groups_insert" ON "public"."part_alternate_groups" FOR INSERT WITH CHECK ("public"."can_manage_inventory"("organization_id"));



CREATE POLICY "part_alternate_groups_select" ON "public"."part_alternate_groups" FOR SELECT USING ("public"."can_access_inventory"("organization_id"));



CREATE POLICY "part_alternate_groups_update" ON "public"."part_alternate_groups" FOR UPDATE USING ("public"."can_manage_inventory"("organization_id")) WITH CHECK ("public"."can_manage_inventory"("organization_id"));



ALTER TABLE "public"."part_compatibility_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_compatibility_rules_delete" ON "public"."part_compatibility_rules" FOR DELETE USING (("inventory_item_id" IN ( SELECT "ii"."id"
   FROM "public"."inventory_items" "ii"
  WHERE "public"."can_manage_inventory"("ii"."organization_id"))));



CREATE POLICY "part_compatibility_rules_insert" ON "public"."part_compatibility_rules" FOR INSERT WITH CHECK (("inventory_item_id" IN ( SELECT "ii"."id"
   FROM "public"."inventory_items" "ii"
  WHERE "public"."can_manage_inventory"("ii"."organization_id"))));



CREATE POLICY "part_compatibility_rules_select" ON "public"."part_compatibility_rules" FOR SELECT USING (("inventory_item_id" IN ( SELECT "ii"."id"
   FROM "public"."inventory_items" "ii"
  WHERE "public"."can_access_inventory"("ii"."organization_id"))));



CREATE POLICY "part_compatibility_rules_update" ON "public"."part_compatibility_rules" FOR UPDATE USING (("inventory_item_id" IN ( SELECT "ii"."id"
   FROM "public"."inventory_items" "ii"
  WHERE "public"."can_manage_inventory"("ii"."organization_id"))));



ALTER TABLE "public"."part_identifiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_identifiers_delete" ON "public"."part_identifiers" FOR DELETE USING ("public"."can_manage_inventory"("organization_id"));



CREATE POLICY "part_identifiers_insert" ON "public"."part_identifiers" FOR INSERT WITH CHECK ("public"."can_manage_inventory"("organization_id"));



CREATE POLICY "part_identifiers_select" ON "public"."part_identifiers" FOR SELECT USING ("public"."can_access_inventory"("organization_id"));



CREATE POLICY "part_identifiers_update" ON "public"."part_identifiers" FOR UPDATE USING ("public"."can_manage_inventory"("organization_id")) WITH CHECK ("public"."can_manage_inventory"("organization_id"));



ALTER TABLE "public"."parts_consumers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parts_consumers_delete_policy" ON "public"."parts_consumers" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."status" = 'active'::"text") AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "parts_consumers_insert_policy" ON "public"."parts_consumers" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."status" = 'active'::"text") AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "parts_consumers_select_policy" ON "public"."parts_consumers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."status" = 'active'::"text")))));



ALTER TABLE "public"."parts_managers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parts_managers_delete_policy" ON "public"."parts_managers" FOR DELETE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "parts_managers_insert_policy" ON "public"."parts_managers" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "parts_managers_select_policy" ON "public"."parts_managers" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."personal_organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personal_organizations_delete_deny" ON "public"."personal_organizations" FOR DELETE USING (false);



CREATE POLICY "personal_organizations_insert_deny" ON "public"."personal_organizations" FOR INSERT WITH CHECK (false);



CREATE POLICY "personal_organizations_select_own" ON "public"."personal_organizations" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "personal_organizations_update_deny" ON "public"."personal_organizations" FOR UPDATE USING (false) WITH CHECK (false);



ALTER TABLE "public"."pm_checklist_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_checklist_templates_admin_insert" ON "public"."pm_checklist_templates" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "pm_checklist_templates_admin_update" ON "public"."pm_checklist_templates" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "pm_checklist_templates_delete_consolidated" ON "public"."pm_checklist_templates" FOR DELETE USING (("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("is_protected" = false)));



CREATE POLICY "pm_checklist_templates_select_consolidated" ON "public"."pm_checklist_templates" FOR SELECT USING (((("organization_id" IS NULL) AND (( SELECT "auth"."uid"() AS "uid") IS NOT NULL)) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."pm_interval_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_interval_policies_delete" ON "public"."pm_interval_policies" FOR DELETE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id"));



CREATE POLICY "pm_interval_policies_insert" ON "public"."pm_interval_policies" FOR INSERT WITH CHECK (("public"."is_org_admin"("auth"."uid"(), "organization_id") AND (("equipment_id" IS NULL) OR ("equipment_id" IN ( SELECT "e"."id"
   FROM "public"."equipment" "e"
  WHERE ("e"."organization_id" = "pm_interval_policies"."organization_id")))) AND (("team_id" IS NULL) OR ("team_id" IN ( SELECT "t"."id"
   FROM "public"."teams" "t"
  WHERE ("t"."organization_id" = "pm_interval_policies"."organization_id")))) AND (("pm_template_id" IS NULL) OR ("pm_template_id" IN ( SELECT "t"."id"
   FROM "public"."pm_checklist_templates" "t"
  WHERE (("t"."organization_id" IS NULL) OR ("t"."organization_id" = "pm_interval_policies"."organization_id")))))));



CREATE POLICY "pm_interval_policies_select" ON "public"."pm_interval_policies" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "pm_interval_policies_update" ON "public"."pm_interval_policies" FOR UPDATE USING ("public"."is_org_admin"("auth"."uid"(), "organization_id")) WITH CHECK (("public"."is_org_admin"("auth"."uid"(), "organization_id") AND (("equipment_id" IS NULL) OR ("equipment_id" IN ( SELECT "e"."id"
   FROM "public"."equipment" "e"
  WHERE ("e"."organization_id" = "pm_interval_policies"."organization_id")))) AND (("team_id" IS NULL) OR ("team_id" IN ( SELECT "t"."id"
   FROM "public"."teams" "t"
  WHERE ("t"."organization_id" = "pm_interval_policies"."organization_id")))) AND (("pm_template_id" IS NULL) OR ("pm_template_id" IN ( SELECT "t"."id"
   FROM "public"."pm_checklist_templates" "t"
  WHERE (("t"."organization_id" IS NULL) OR ("t"."organization_id" = "pm_interval_policies"."organization_id")))))));



ALTER TABLE "public"."pm_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pm_status_history_admin_insert" ON "public"."pm_status_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "pm"."organization_id")))) AND ("changed_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "pm_status_history_select_consolidated" ON "public"."pm_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."preventative_maintenance" "pm"
  WHERE (("pm"."id" = "pm_status_history"."pm_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "pm"."organization_id")))));



CREATE POLICY "pm_template_compat_rules_delete" ON "public"."pm_template_compatibility_rules" FOR DELETE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "pm_template_compat_rules_insert" ON "public"."pm_template_compatibility_rules" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))) AND ("pm_template_id" IN ( SELECT "pm_checklist_templates"."id"
   FROM "public"."pm_checklist_templates"
  WHERE (("pm_checklist_templates"."organization_id" IS NULL) OR ("pm_checklist_templates"."organization_id" IN ( SELECT "om"."organization_id"
           FROM "public"."organization_members" "om"
          WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))))))));



CREATE POLICY "pm_template_compat_rules_select" ON "public"."pm_template_compatibility_rules" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "pm_template_compat_rules_update" ON "public"."pm_template_compatibility_rules" FOR UPDATE USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



ALTER TABLE "public"."pm_template_compatibility_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preventative_maintenance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preventative_maintenance_delete_consolidated" ON "public"."preventative_maintenance" FOR DELETE USING ((((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR (("is_historical" = false) AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"))) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "preventative_maintenance"."work_order_id") AND ("wo"."status" <> ALL (ARRAY['completed'::"public"."work_order_status", 'cancelled'::"public"."work_order_status"])))))));



COMMENT ON POLICY "preventative_maintenance_delete_consolidated" ON "public"."preventative_maintenance" IS 'Org members may remove PM checklists from active work orders. Historical PM rows require org admin.';



CREATE POLICY "preventative_maintenance_insert_consolidated" ON "public"."preventative_maintenance" FOR INSERT WITH CHECK (((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



CREATE POLICY "preventative_maintenance_select_consolidated" ON "public"."preventative_maintenance" FOR SELECT USING ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "preventative_maintenance_update_consolidated" ON "public"."preventative_maintenance" FOR UPDATE USING (((("is_historical" = true) AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) OR "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_optimized" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."organization_members" "om1"
     JOIN "public"."organization_members" "om2" ON (("om1"."organization_id" = "om2"."organization_id")))
  WHERE (("om1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om2"."user_id" = "profiles"."id") AND ("om1"."status" = 'active'::"text") AND ("om2"."status" = 'active'::"text"))))));



CREATE POLICY "profiles_update_optimized" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quick_form_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quick_form_submissions_select_admin" ON "public"."quick_form_submissions" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."quick_form_token_secrets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quick_form_token_secrets_select_admin" ON "public"."quick_form_token_secrets" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



ALTER TABLE "public"."quick_forms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quick_forms_delete_admin" ON "public"."quick_forms" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "quick_forms_select_admin" ON "public"."quick_forms" FOR SELECT USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "quick_forms_update_admin" ON "public"."quick_forms" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")) WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



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



ALTER TABLE "public"."quickbooks_invoice_status_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quickbooks_invoice_status_events_no_user_insert" ON "public"."quickbooks_invoice_status_events" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "quickbooks_invoice_status_events_no_user_update" ON "public"."quickbooks_invoice_status_events" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "quickbooks_invoice_status_events_select_admins" ON "public"."quickbooks_invoice_status_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."organization_id" = "quickbooks_invoice_status_events"."organization_id") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "quickbooks_invoice_status_events_service_role_all" ON "public"."quickbooks_invoice_status_events" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "quickbooks_invoice_status_events_service_role_all" ON "public"."quickbooks_invoice_status_events" IS 'Allows service_role full row-level access (INSERT/UPDATE/SELECT/DELETE) for Edge Function workers that enqueue and process QuickBooks invoice status events. Authenticated-role policies in 20260517100000 restrict end-user access separately.';



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



ALTER TABLE "public"."record_export_artifacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "record_export_artifacts_delete" ON "public"."record_export_artifacts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "record_export_artifacts"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "record_export_artifacts_insert" ON "public"."record_export_artifacts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "record_export_artifacts"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "record_export_artifacts_select" ON "public"."record_export_artifacts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "record_export_artifacts"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "record_export_artifacts_service" ON "public"."record_export_artifacts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "record_export_artifacts_update" ON "public"."record_export_artifacts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "record_export_artifacts"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "record_export_artifacts"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."scan_follow_up_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scan_follow_up_events_insert_organization_members" ON "public"."scan_follow_up_events" FOR INSERT WITH CHECK ((("performed_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."equipment" "e"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "e"."organization_id")))
  WHERE (("e"."id" = "scan_follow_up_events"."equipment_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."scans" "s"
  WHERE (("s"."id" = "scan_follow_up_events"."scan_id") AND ("s"."equipment_id" = "scan_follow_up_events"."equipment_id"))))));



CREATE POLICY "scan_follow_up_events_select_organization_members" ON "public"."scan_follow_up_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."equipment" "e"
     JOIN "public"."organization_members" "om" ON (("om"."organization_id" = "e"."organization_id")))
  WHERE (("e"."id" = "scan_follow_up_events"."equipment_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



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



CREATE POLICY "service_role_can_insert_ticket_comments" ON "public"."ticket_comments" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_can_insert_tickets" ON "public"."tickets" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_can_update_ticket_comments" ON "public"."ticket_comments" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "service_role_can_update_tickets" ON "public"."tickets" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "service_role_delete_webhook_events" ON "public"."webhook_events" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_full_access_push_subscriptions" ON "public"."push_subscriptions" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "service_role_full_access_push_subscriptions" ON "public"."push_subscriptions" IS 'Service role access for send-push-notification Edge Function. Required to query subscriptions when broadcasting push notifications from database triggers.';



CREATE POLICY "service_role_insert_webhook_events" ON "public"."webhook_events" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_manage_dsr_events" ON "public"."dsr_request_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_manage_dsr_requests" ON "public"."dsr_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_only_create_notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_only_performance_logs" ON "public"."invitation_performance_logs" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_select_webhook_events" ON "public"."webhook_events" FOR SELECT USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "service_role_update_webhook_events" ON "public"."webhook_events" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



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



CREATE POLICY "team_members_create_equipment" ON "public"."equipment" FOR INSERT WITH CHECK (("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR ("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") AND ("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."team_id" = "equipment"."team_id") AND ("tm"."role" = ANY (ARRAY['manager'::"public"."team_member_role", 'technician'::"public"."team_member_role"]))))))));



CREATE POLICY "team_members_select" ON "public"."team_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "t"."organization_id")))));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_admin_delete" ON "public"."teams" FOR DELETE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "teams_admin_insert" ON "public"."teams" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "teams_admin_update" ON "public"."teams" FOR UPDATE USING ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "teams_select_consolidated" ON "public"."teams" FOR SELECT USING (("public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "organization_id") OR "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id")));



ALTER TABLE "public"."terms_acceptances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "terms_acceptances_select_own" ON "public"."terms_acceptances" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."ticket_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_dashboard_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_departure_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_departure_queue_select" ON "public"."user_departure_queue" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "user_departure_queue"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text"))))));



CREATE POLICY "user_departure_queue_service_delete" ON "public"."user_departure_queue" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "user_departure_queue_service_insert" ON "public"."user_departure_queue" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "user_departure_queue_service_update" ON "public"."user_departure_queue" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "users_create_invitations" ON "public"."organization_invitations" FOR INSERT WITH CHECK ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "organization_id"));



CREATE POLICY "users_delete_own_invitations" ON "public"."organization_invitations" FOR DELETE USING (("email" = ( SELECT "auth"."email"() AS "email")));



CREATE POLICY "users_manage_own_push_subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_order_costs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_costs_delete_consolidated" ON "public"."work_order_costs" FOR DELETE USING (("public"."can_access_work_order_costs"("work_order_id", ( SELECT "auth"."uid"() AS "uid")) AND (("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))))));



CREATE POLICY "work_order_costs_insert_consolidated" ON "public"."work_order_costs" FOR INSERT WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."can_access_work_order_costs"("work_order_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "work_order_costs_select_consolidated" ON "public"."work_order_costs" FOR SELECT USING ("public"."can_access_work_order_costs"("work_order_id", ( SELECT "auth"."uid"() AS "uid")));



COMMENT ON POLICY "work_order_costs_select_consolidated" ON "public"."work_order_costs" IS 'Only org owners/admins, the work order assignee, or team owner/manager/technician on the work order''s team can read cost rows. Requestors, viewers, and plain members see nothing.';



CREATE POLICY "work_order_costs_update_consolidated" ON "public"."work_order_costs" FOR UPDATE USING (("public"."can_access_work_order_costs"("work_order_id", ( SELECT "auth"."uid"() AS "uid")) AND (("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id"))))))) WITH CHECK (("public"."can_access_work_order_costs"("work_order_id", ( SELECT "auth"."uid"() AS "uid")) AND (("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_costs"."work_order_id") AND "public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id")))))));



ALTER TABLE "public"."work_order_equipment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_equipment_delete_policy" ON "public"."work_order_equipment" FOR DELETE USING (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."status" = 'active'::"text")))))));



CREATE POLICY "work_order_equipment_insert_policy" ON "public"."work_order_equipment" FOR INSERT WITH CHECK (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."status" = 'active'::"text")))))));



CREATE POLICY "work_order_equipment_select_policy" ON "public"."work_order_equipment" FOR SELECT USING (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."status" = 'active'::"text")))))));



CREATE POLICY "work_order_equipment_update_policy" ON "public"."work_order_equipment" FOR UPDATE USING (("work_order_id" IN ( SELECT "work_orders"."id"
   FROM "public"."work_orders"
  WHERE ("work_orders"."organization_id" IN ( SELECT "organization_members"."organization_id"
           FROM "public"."organization_members"
          WHERE (("organization_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("organization_members"."status" = 'active'::"text")))))));



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



CREATE POLICY "work_order_notes_insert_organization_members" ON "public"."work_order_notes" FOR INSERT WITH CHECK ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id") AND ("wo"."status" <> 'cancelled'::"public"."work_order_status") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id") OR ("wo"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (("wo"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."team_id" = "wo"."team_id") AND ("tm"."role" = ANY (ARRAY['owner'::"public"."team_member_role", 'manager'::"public"."team_member_role", 'technician'::"public"."team_member_role", 'requestor'::"public"."team_member_role"])))))))))) AND ((NOT "is_private") OR (EXISTS ( SELECT 1
   FROM "public"."work_orders" "wo"
  WHERE (("wo"."id" = "work_order_notes"."work_order_id") AND "public"."is_org_member"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id") AND ("public"."is_org_admin"(( SELECT "auth"."uid"() AS "uid"), "wo"."organization_id") OR (("wo"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tm"."team_id" = "wo"."team_id") AND ("tm"."role" = ANY (ARRAY['owner'::"public"."team_member_role", 'manager'::"public"."team_member_role", 'technician'::"public"."team_member_role"])))))))))))));



COMMENT ON POLICY "work_order_notes_insert_organization_members" ON "public"."work_order_notes" IS 'Org-scoped note inserts require note-author eligibility, exclude cancelled work orders, and restrict private notes to field roles.';



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



ALTER TABLE "public"."workspace_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_domains_select_member" ON "public"."workspace_domains" FOR SELECT USING (("organization_id" IN ( SELECT "om"."organization_id"
   FROM "public"."organization_members" "om"
  WHERE (("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."status" = 'active'::"text")))));



CREATE POLICY "workspace_merge_requests_select" ON "public"."workspace_personal_org_merge_requests" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."role"() AS "role") = 'service_role'::"text") OR ("requested_for_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "workspace_personal_org_merge_requests"."workspace_org_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND ("om"."status" = 'active'::"text"))))));



CREATE POLICY "workspace_merge_requests_service_delete" ON "public"."workspace_personal_org_merge_requests" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "workspace_merge_requests_service_insert" ON "public"."workspace_personal_org_merge_requests" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "workspace_merge_requests_service_update" ON "public"."workspace_personal_org_merge_requests" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



ALTER TABLE "public"."workspace_personal_org_merge_requests" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organization_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";









GRANT USAGE ON SCHEMA "pgmq_public" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































































































































































































































REVOKE ALL ON FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "pgmq_public"."pop"("queue_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "pgmq_public"."pop"("queue_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) TO "service_role";



REVOKE ALL ON FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."_invoke_quickbooks_token_refresh_internal"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."accept_invitation_atomic"("p_invitation_token" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."adjust_inventory_quantity"("p_item_id" "uuid", "p_delta" integer, "p_reason" "text", "p_work_order_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."anonymize_audit_changes"("p_changes" "jsonb", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."anonymize_audit_changes"("p_changes" "jsonb", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."anonymize_audit_changes"("p_changes" "jsonb", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."anonymize_audit_log_for_user"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."anonymize_audit_log_for_user"("p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_account_deletion_storage_metadata"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_account_deletion_storage_metadata"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_pending_admin_grants_for_user"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_pending_admin_grants_for_user"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_pending_admin_grants_for_user"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."assert_inventory_read_access"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_inventory_read_access"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_inventory_read_access"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_equipment_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_equipment_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_inventory_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_inventory_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_org_member_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_org_member_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_pm_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_pm_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_team_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_team_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_team_member_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_team_member_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_work_order_changes"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_work_order_changes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_provision_workspace_organization"("p_user_id" "uuid", "p_domain" "text", "p_organization_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_provision_workspace_organization"("p_user_id" "uuid", "p_domain" "text", "p_organization_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."backfill_user_profile_and_org"("user_id_val" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."broadcast_notification"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."broadcast_notification"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."broadcast_ticket_comment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."broadcast_ticket_comment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."broadcast_ticket_status_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."broadcast_ticket_status_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_set_compatibility_rules"("p_organization_id" "uuid", "p_item_id" "uuid", "p_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_set_pm_template_rules"("p_organization_id" "uuid", "p_template_id" "uuid", "p_rules" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_billable_members"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_organization_billing"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_access_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_access_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_access_work_order_costs"("p_work_order_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_access_work_order_costs"("p_work_order_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_work_order_costs"("p_work_order_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_edit_equipment_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_edit_equipment_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_edit_work_order_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_edit_work_order_note"("p_user_id" "uuid", "p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_inventory"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_manage_invitation_atomic"("user_uuid" "uuid", "invitation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_invitation_optimized"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_invitation_safe"("user_uuid" "uuid", "invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."can_user_manage_quickbooks"("p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."cancel_ownership_transfer"("p_transfer_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."check_admin_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_admin_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_admin_permission_safe"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."check_admin_with_context"("user_uuid" "uuid", "org_id" "uuid", "bypass_context" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_admin_with_context"("user_uuid" "uuid", "org_id" "uuid", "bypass_context" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_email_exists_in_auth"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_email_exists_in_auth"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_export_rate_limit"("p_user_id" "uuid", "p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_member_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_member_bypass_fixed"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_org_access_direct"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_org_access_direct"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_org_access_secure"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."check_org_admin_secure"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_org_admin_secure"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) TO "service_role";
GRANT ALL ON FUNCTION "public"."check_storage_limit"("org_id" "uuid", "file_size_bytes" bigint, "max_storage_gb" numeric) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_team_access_secure"("user_uuid" "uuid", "team_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_team_role_secure"("user_uuid" "uuid", "team_uuid" "uuid", "required_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_quickbooks_invoice_status_events"("p_batch_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_quickbooks_invoice_status_events"("p_batch_size" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_export_results"("p_retention_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_export_results"("p_retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_export_results"("p_retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_export_results"("p_retention_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_gws_oauth_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_gws_oauth_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_invitations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_invitations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_quickbooks_oauth_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_inventory_grants_on_member_removal"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_inventory_grants_on_member_removal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_inventory_grants_on_member_removal"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_departure_queue"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_departure_queue"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_export_logs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_export_logs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_notifications"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_stale_gws_directory_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_stale_gws_directory_users"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."clear_rls_context"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clear_rls_context"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_product_onboarding"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_product_onboarding"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_product_onboarding"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_work_order_to_historical"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."convert_work_order_to_historical"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_work_order_to_historical"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_pm_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_equipment_matching_rules"("p_organization_id" "uuid", "p_rules" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_google_workspace_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_google_workspace_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_google_workspace_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb", "p_timeline_events" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb", "p_timeline_events" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_historical_work_order_with_pm"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_title" "text", "p_description" "text", "p_priority" "public"."work_order_priority", "p_status" "public"."work_order_status", "p_historical_start_date" timestamp with time zone, "p_historical_notes" "text", "p_assignee_id" "uuid", "p_team_id" "uuid", "p_due_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_has_pm" boolean, "p_pm_status" "text", "p_pm_completion_date" timestamp with time zone, "p_pm_notes" "text", "p_pm_checklist_data" "jsonb", "p_timeline_events" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_invitation_atomic"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_invitation_bypass"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_invitation_bypass"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_invitation_bypass_optimized"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_invitation_bypass_optimized"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_invitation_with_context"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_invitation_with_context"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_message" "text", "p_invited_by" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."external_customer_contacts" TO "anon";
GRANT ALL ON TABLE "public"."external_customer_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."external_customer_contacts" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_manual_external_customer_contact"("p_organization_id" "uuid", "p_customer_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_operator_checkin_assignment"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_template_id" "uuid", "p_enabled" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_operator_checkin_assignment"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_template_id" "uuid", "p_enabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_operator_checkin_assignment"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_template_id" "uuid", "p_enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_operator_checkin_assignment"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_template_id" "uuid", "p_enabled" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_quick_form"("p_organization_id" "uuid", "p_name" "text", "p_description" "text", "p_form_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_quick_form"("p_organization_id" "uuid", "p_name" "text", "p_description" "text", "p_form_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_quick_form"("p_organization_id" "uuid", "p_name" "text", "p_description" "text", "p_form_data" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_quickbooks_oauth_session"("p_organization_id" "uuid", "p_redirect_url" "text", "p_origin_url" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_work_order_notifications"("work_order_uuid" "uuid", "new_status" "text", "changed_by_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_workspace_organization_for_domain"("p_domain" "text", "p_organization_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_workspace_organization_for_domain"("p_domain" "text", "p_organization_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_workspace_organization_for_domain"("p_domain" "text", "p_organization_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_equipment_note_image_audited"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_image_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_equipment_note_image_audited"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_image_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_equipment_note_image_audited"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_image_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."delete_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_operator_checklist_template"("p_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_operator_checklist_template"("p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_operator_checklist_template"("p_template_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_organization"("p_organization_id" "uuid", "p_confirmation_name" "text", "p_force" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."delete_work_order_cascade"("p_work_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_work_order_cascade"("p_work_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_work_order_cascade"("p_work_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_work_order_note_image_audited"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_image_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_work_order_note_image_audited"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_image_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_work_order_note_image_audited"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_image_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."disconnect_google_workspace"("p_organization_id" "uuid", "p_also_unclaim_domain" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."disconnect_google_workspace"("p_organization_id" "uuid", "p_also_unclaim_domain" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."disconnect_google_workspace"("p_organization_id" "uuid", "p_also_unclaim_domain" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."disconnect_google_workspace_internal"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."disconnect_google_workspace_internal"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."disconnect_quickbooks"("p_organization_id" "uuid", "p_realm_id" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."enforce_manual_external_contact_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_manual_external_contact_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_manual_external_contact_metadata"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_scan_location_privacy"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_scan_location_privacy"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_work_order_primary_image_match"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_work_order_primary_image_match"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_export_job"("p_organization_id" "uuid", "p_report_type" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_export_job"("p_organization_id" "uuid", "p_report_type" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_export_job"("p_organization_id" "uuid", "p_report_type" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_export_job"("p_organization_id" "uuid", "p_report_type" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_operator_template_active_for_enabled_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_operator_template_active_for_enabled_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_operator_template_active_for_enabled_assignment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_old_invitations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."export_equipment_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_location" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."export_equipment_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_location" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."export_equipment_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_location" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_equipment_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_location" "text", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."export_work_orders_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_priority" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_accessible_team_ids" "uuid"[], "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."export_work_orders_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_priority" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_accessible_team_ids" "uuid"[], "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."export_work_orders_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_priority" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_accessible_team_ids" "uuid"[], "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_work_orders_csv_rows"("p_organization_id" "uuid", "p_columns" "text"[], "p_status" "text", "p_team_id" "uuid", "p_priority" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_accessible_team_ids" "uuid"[], "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."fulfill_dsr_deletion"("p_dsr_request_id" "uuid", "p_admin_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fulfill_dsr_deletion"("p_dsr_request_id" "uuid", "p_admin_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_alternates_for_inventory_item"("p_organization_id" "uuid", "p_inventory_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_alternates_for_part_number"("p_organization_id" "uuid", "p_part_number" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_audit_actor_info"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_audit_actor_info"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_audit_log_timeline"("p_organization_id" "uuid", "p_bucket" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_entity_type" "text", "p_action" "text", "p_actor_id" "uuid", "p_search" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_audit_log_timeline"("p_organization_id" "uuid", "p_bucket" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_entity_type" "text", "p_action" "text", "p_actor_id" "uuid", "p_search" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_audit_log_timeline"("p_organization_id" "uuid", "p_bucket" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_entity_type" "text", "p_action" "text", "p_actor_id" "uuid", "p_search" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_equipment"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_compatible_parts_for_make_model"("p_organization_id" "uuid", "p_manufacturer" "text", "p_model" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_billing_period"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_current_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_dashboard_trends"("p_org_id" "uuid", "p_days" integer, "p_team_id" "uuid", "p_unassigned" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_dashboard_trends"("p_org_id" "uuid", "p_days" integer, "p_team_id" "uuid", "p_unassigned" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_trends"("p_org_id" "uuid", "p_days" integer, "p_team_id" "uuid", "p_unassigned" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_trends"("p_org_id" "uuid", "p_days" integer, "p_team_id" "uuid", "p_unassigned" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_effective_pm_interval_policy_for_equipment"("p_equipment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_effective_pm_interval_policy_for_equipment"("p_equipment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_effective_pm_interval_policy_for_equipment"("p_equipment_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_equipment_for_inventory_item_rules"("p_organization_id" "uuid", "p_item_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_equipment_pm_status"("p_equipment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_equipment_pm_status"("p_equipment_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_equipment_pm_status"("p_equipment_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_export_job_status"("p_job_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_export_job_status"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_export_job_status"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_export_job_status"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fleet_efficiency"("p_org_id" "uuid", "p_team_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_fleet_efficiency"("p_org_id" "uuid", "p_team_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fleet_efficiency"("p_org_id" "uuid", "p_team_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_pm_template_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_pm_template_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_pm_template_names"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_google_workspace_connection_status"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_google_workspace_connection_status"("p_organization_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_google_workspace_connection_status"("p_organization_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_inventory_list_metadata"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_inventory_list_metadata"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_list_metadata"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token_secure"("p_token" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_invitations_atomic"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_invitations_bypass_optimized"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_invitations_bypass_optimized"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_latest_completed_pm"("equipment_uuid" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_matching_pm_templates"("p_organization_id" "uuid", "p_equipment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_member_profiles_secure"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_org_equipment_pm_statuses"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_org_equipment_pm_statuses"("p_organization_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_org_equipment_pm_statuses"("p_organization_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_organization_deletion_stats"("p_organization_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_organization_exemptions"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_exemptions"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_member_profile"("member_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organization_premium_features"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_premium_features"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organization_slot_availability"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_slot_availability"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organization_slot_availability_with_exemptions"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_slot_availability_with_exemptions"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_organization_storage_mb"("org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_pending_transfer_requests"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pending_transfer_requests"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_pending_transfer_requests"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_pending_workspace_personal_org_merge_requests"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pending_workspace_personal_org_merge_requests"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_pending_workspace_personal_org_merge_requests"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_personal_org_merge_preview"("p_workspace_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_personal_org_merge_preview"("p_workspace_org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_personal_org_merge_preview"("p_workspace_org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_product_onboarding_status"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_product_onboarding_status"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_onboarding_status"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_quickbooks_connection_status"("p_organization_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_system_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_system_user_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_invitations_safe"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_user_managed_teams"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_managed_teams"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_org_role_direct"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_user_org_role_secure"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_org_role_secure"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_organization_membership"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_organization_membership"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_quickbooks_permission"("p_organization_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_team_memberships"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_teams_for_notifications"("user_uuid" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_workspace_onboarding_state"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_workspace_onboarding_state"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_workspace_onboarding_state"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."handle_invitation_account_creation"("p_invitation_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_invitation_account_creation"("p_invitation_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_membership_billing_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_membership_billing_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_team_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_team_deletion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_team_manager_removal"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_team_manager_removal"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."historical_timeline_allowed_next_statuses"("p_current_status" "public"."work_order_status") TO "anon";
GRANT ALL ON FUNCTION "public"."historical_timeline_allowed_next_statuses"("p_current_status" "public"."work_order_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."historical_timeline_allowed_next_statuses"("p_current_status" "public"."work_order_status") TO "service_role";



REVOKE ALL ON FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."initiate_ownership_transfer"("p_organization_id" "uuid", "p_to_user_id" "uuid", "p_transfer_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."invoke_queue_worker"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."invoke_quickbooks_invoice_status_sync"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."invoke_quickbooks_token_refresh"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."is_equipment_team_manager"("p_user_id" "uuid", "p_equipment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_equipment_team_manager"("p_user_id" "uuid", "p_equipment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_org_admin"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_org_member"("user_uuid" "uuid", "org_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_organization_admin"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_organization_member"("user_uuid" "uuid", "org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_parts_consumer"("p_organization_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_parts_consumer"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_parts_consumer"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_parts_manager"("p_organization_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_team_viewer_or_requestor"("p_user_id" "uuid", "p_team_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_team_viewer_or_requestor"("p_user_id" "uuid", "p_team_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_user_google_oauth_verified"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_user_google_oauth_verified"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_valid_work_order_assignee"("p_equipment_id" "uuid", "p_organization_id" "uuid", "p_assignee_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_work_order_team_manager"("p_user_id" "uuid", "p_work_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_work_order_team_manager"("p_user_id" "uuid", "p_work_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."latest_scans_for_equipment_ids"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."latest_scans_for_equipment_ids"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."latest_scans_for_equipment_ids"("p_organization_id" "uuid", "p_equipment_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."leave_organization"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."leave_organization"("p_organization_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."leave_organization"("p_organization_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."leave_organization_safely"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_active_stripe_subscriptions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_active_stripe_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_pm_templates"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_pm_templates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_pm_templates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_pm_templates"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_pm_templates"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_pm_templates"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_audit_entry"("p_organization_id" "uuid", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_action" "text", "p_changes" "jsonb", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_audit_export_notification"("p_organization_id" "uuid", "p_exported_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_audit_export_notification"("p_organization_id" "uuid", "p_exported_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."log_audit_export_notification"("p_organization_id" "uuid", "p_exported_count" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."log_dsr_intake_event"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_dsr_intake_event"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_dsr_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_dsr_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_equipment_location_change"("p_equipment_id" "uuid", "p_source" "text", "p_latitude" double precision, "p_longitude" double precision, "p_address_street" "text", "p_address_city" "text", "p_address_state" "text", "p_address_country" "text", "p_formatted_address" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_equipment_location_change"("p_equipment_id" "uuid", "p_source" "text", "p_latitude" double precision, "p_longitude" double precision, "p_address_street" "text", "p_address_city" "text", "p_address_state" "text", "p_address_country" "text", "p_formatted_address" "text", "p_metadata" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_equipment_location_change"("p_equipment_id" "uuid", "p_source" "text", "p_latitude" double precision, "p_longitude" double precision, "p_address_street" "text", "p_address_city" "text", "p_address_state" "text", "p_address_country" "text", "p_formatted_address" "text", "p_metadata" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."log_invitation_performance"("function_name" "text", "execution_time_ms" numeric, "success" boolean, "error_message" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."log_invoice_export_audit"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_action" "text", "p_quickbooks_invoice_id" "text", "p_quickbooks_invoice_number" "text", "p_realm_id" "text", "p_ip_address" "text", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_invoice_export_audit"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_action" "text", "p_quickbooks_invoice_id" "text", "p_quickbooks_invoice_number" "text", "p_realm_id" "text", "p_ip_address" "text", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_pm_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_pm_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_scan_location_history"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_scan_location_history"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_work_order_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_work_order_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."migrate_personal_org_to_workspace_for_user"("p_workspace_org_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."migrate_personal_org_to_workspace_for_user"("p_workspace_org_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."migrate_personal_orgs_to_workspace"("p_workspace_org_id" "uuid", "p_domain" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."migrate_personal_orgs_to_workspace"("p_workspace_org_id" "uuid", "p_domain" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."monitoring_healthcheck"() TO "anon";
GRANT ALL ON FUNCTION "public"."monitoring_healthcheck"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."monitoring_healthcheck"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_compatibility_pattern"("p_match_type" "public"."model_match_type", "p_pattern" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_domain"("p_domain" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_domain"("p_domain" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_domain"("p_domain" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_org_admins"("p_organization_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_org_admins"("p_organization_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_organization_member_security_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_organization_member_security_events"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."notify_team_member_security_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notify_team_member_security_events"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."peek_google_workspace_oauth_session"("p_session_token" "text", "p_nonce" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."peek_google_workspace_oauth_session"("p_session_token" "text", "p_nonce" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prepare_account_deletion"("p_user_id" "uuid", "p_dsr_request_id" "uuid", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prepare_account_deletion"("p_user_id" "uuid", "p_dsr_request_id" "uuid", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preserve_user_attribution"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_dsr_event_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_dsr_event_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_dsr_event_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_inactive_operator_template_with_enabled_assignments"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_inactive_operator_template_with_enabled_assignments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_inactive_operator_template_with_enabled_assignments"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."preview_account_deletion"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preview_account_deletion"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_all_pending_departures"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_all_pending_departures"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_departure_batch"("p_queue_id" "uuid", "p_batch_size" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_google_workspace_directory"("p_organization_id" "uuid", "p_sync_started_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_google_workspace_directory"("p_organization_id" "uuid", "p_sync_started_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_equipment_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_equipment_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() TO "service_role";
GRANT ALL ON FUNCTION "public"."refresh_quickbooks_tokens_manual"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."refresh_stripe_materialized_views"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_reserved_slot"("org_id" "uuid", "invitation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_organization_member"("p_organization_id" "uuid", "p_user_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_organization_member_safely"("user_uuid" "uuid", "org_id" "uuid", "removed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_historical_work_order_timeline"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."replace_historical_work_order_timeline"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_historical_work_order_timeline"("p_work_order_id" "uuid", "p_organization_id" "uuid", "p_events" "jsonb", "p_skip_audit" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_workspace_personal_org_merge"("p_workspace_org_id" "uuid", "p_target_user_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_workspace_personal_org_merge"("p_workspace_org_id" "uuid", "p_target_user_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."request_workspace_personal_org_merge"("p_workspace_org_id" "uuid", "p_target_user_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."reserve_slot_for_invitation"("org_id" "uuid", "invitation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."resolve_effective_pm_interval_policy"("p_equipment_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_effective_pm_interval_policy"("p_equipment_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_operator_checkin_by_token"("p_token_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_operator_checkin_by_token"("p_token_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_operator_checkin_by_token"("p_token_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_operator_checkin_by_token"("p_token_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_quick_form_by_token"("p_token_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_quick_form_by_token"("p_token_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_quick_form_by_token"("p_token_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_quick_form_by_token"("p_token_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."respond_to_ownership_transfer"("p_transfer_id" "uuid", "p_accept" boolean, "p_departing_owner_role" "text", "p_response_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."respond_to_workspace_personal_org_merge"("p_request_id" "uuid", "p_accept" boolean, "p_response_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."respond_to_workspace_personal_org_merge"("p_request_id" "uuid", "p_accept" boolean, "p_response_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."respond_to_workspace_personal_org_merge"("p_request_id" "uuid", "p_accept" boolean, "p_response_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."restore_operator_checklist_template"("p_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_operator_checklist_template"("p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_operator_checklist_template"("p_template_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."revert_pm_completion"("p_pm_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."revert_work_order_status"("p_work_order_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rotate_operator_checkin_token"("p_settings_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rotate_operator_checkin_token"("p_settings_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rotate_operator_checkin_token"("p_settings_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_operator_checkin_token"("p_settings_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rotate_quick_form_token"("p_quick_form_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rotate_quick_form_token"("p_quick_form_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rotate_quick_form_token"("p_quick_form_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."select_google_workspace_members"("p_organization_id" "uuid", "p_emails" "text"[], "p_admin_emails" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."select_google_workspace_members"("p_organization_id" "uuid", "p_emails" "text"[], "p_admin_emails" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."select_google_workspace_members"("p_organization_id" "uuid", "p_emails" "text"[], "p_admin_emails" "text"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_bypass_triggers"("bypass" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_bypass_triggers"("bypass" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_equipment_note_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_equipment_note_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_equipment_note_organization_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_geocoded_locations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_geocoded_locations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_geocoded_locations_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_rls_context"("context_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_rls_context"("context_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."should_notify_user_for_work_order"("user_uuid" "uuid", "work_order_team_id" "uuid", "work_order_status" "text", "organization_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."snapshot_account_deletion_attribution"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."snapshot_account_deletion_attribution"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."snapshot_pm_working_hours"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."snapshot_pm_working_hours"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."storage_object_path_segment_uuid"("p_object_name" "text", "p_segment_index" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."storage_object_path_segment_uuid"("p_object_name" "text", "p_segment_index" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_operator_checkin_public"("p_token_hash" "text", "p_operator_field_values" "jsonb", "p_client_field_values" "jsonb", "p_equipment_field_values" "jsonb", "p_checklist_answers" "jsonb", "p_template_snapshot" "jsonb", "p_is_complete" boolean, "p_required_item_count" integer, "p_answered_required_count" integer, "p_request_fingerprint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_operator_checkin_public"("p_token_hash" "text", "p_operator_field_values" "jsonb", "p_client_field_values" "jsonb", "p_equipment_field_values" "jsonb", "p_checklist_answers" "jsonb", "p_template_snapshot" "jsonb", "p_is_complete" boolean, "p_required_item_count" integer, "p_answered_required_count" integer, "p_request_fingerprint" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_operator_checkin_public"("p_token_hash" "text", "p_operator_field_values" "jsonb", "p_client_field_values" "jsonb", "p_equipment_field_values" "jsonb", "p_checklist_answers" "jsonb", "p_template_snapshot" "jsonb", "p_is_complete" boolean, "p_required_item_count" integer, "p_answered_required_count" integer, "p_request_fingerprint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_operator_checkin_public"("p_token_hash" "text", "p_operator_field_values" "jsonb", "p_client_field_values" "jsonb", "p_equipment_field_values" "jsonb", "p_checklist_answers" "jsonb", "p_template_snapshot" "jsonb", "p_is_complete" boolean, "p_required_item_count" integer, "p_answered_required_count" integer, "p_request_fingerprint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_quick_form_public"("p_token_hash" "text", "p_field_values" "jsonb", "p_client_context" "jsonb", "p_form_snapshot" "jsonb", "p_request_fingerprint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_quick_form_public"("p_token_hash" "text", "p_field_values" "jsonb", "p_client_context" "jsonb", "p_form_snapshot" "jsonb", "p_request_fingerprint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_equipment_customer_from_team"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_equipment_customer_from_team"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_equipment_last_known_location_from_scan"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_equipment_last_known_location_from_scan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_equipment_last_known_location_from_scan"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_equipment_last_maintenance_from_work_order"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_equipment_last_maintenance_from_work_order"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_work_order_primary_equipment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_work_order_primary_equipment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."synthesize_historical_timeline_events"("p_historical_start_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_status" "public"."work_order_status", "p_assignee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."synthesize_historical_timeline_events"("p_historical_start_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_status" "public"."work_order_status", "p_assignee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."synthesize_historical_timeline_events"("p_historical_start_date" timestamp with time zone, "p_completed_date" timestamp with time zone, "p_status" "public"."work_order_status", "p_assignee_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."touch_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_departure_processing"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_departure_processing"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_customers_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_customers_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_equipment_note"("p_organization_id" "uuid", "p_equipment_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_equipment_working_hours"("p_equipment_id" "uuid", "p_new_hours" numeric, "p_update_source" "text", "p_work_order_id" "uuid", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_external_customer_contacts_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_external_customer_contacts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_historical_work_order_note_timestamp"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."update_historical_work_order_note_timestamp"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_historical_work_order_note_timestamp"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_manual_external_customer_contact"("p_organization_id" "uuid", "p_contact_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_member_quickbooks_permission"("p_organization_id" "uuid", "p_target_user_id" "uuid", "p_can_manage_quickbooks" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_notification_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notification_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_settings_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_organization_billing_metrics"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_organization_member_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_organization_member_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_organization_storage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_organization_storage"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_pm_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_pm_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_quickbooks_credentials_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_quickbooks_credentials_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_quickbooks_export_logs_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_quickbooks_export_logs_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_quickbooks_invoice_status_events_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_quickbooks_invoice_status_events_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_quickbooks_team_customers_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_quickbooks_team_customers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_work_order_costs_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_work_order_note"("p_organization_id" "uuid", "p_work_order_id" "uuid", "p_note_id" "uuid", "p_content" "text", "p_is_private" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_access"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."user_is_org_admin"("org_id" "uuid", "check_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."user_is_org_member"("org_id" "uuid", "check_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."validate_google_workspace_oauth_session"("p_session_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_google_workspace_oauth_session"("p_session_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_invitation_for_account_creation"("p_invitation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_member_limit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_member_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_operator_checkin_settings_org_refs"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_operator_checkin_settings_org_refs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_operator_checkin_settings_org_refs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."validate_quickbooks_oauth_session"("p_session_token" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."validate_work_order_assignee"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_work_order_assignee"() TO "service_role";






























GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contacts" TO "anon";
GRANT ALL ON TABLE "public"."customer_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."customer_sites" TO "anon";
GRANT ALL ON TABLE "public"."customer_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_sites" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."dsr_request_events" TO "anon";
GRANT ALL ON TABLE "public"."dsr_request_events" TO "authenticated";
GRANT ALL ON TABLE "public"."dsr_request_events" TO "service_role";



GRANT ALL ON TABLE "public"."dsr_requests" TO "anon";
GRANT ALL ON TABLE "public"."dsr_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."dsr_requests" TO "service_role";



GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_location_history" TO "anon";
GRANT ALL ON TABLE "public"."equipment_location_history" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_location_history" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_note_images" TO "anon";
GRANT ALL ON TABLE "public"."equipment_note_images" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_note_images" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_notes" TO "anon";
GRANT ALL ON TABLE "public"."equipment_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_notes" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_operator_checkin_settings" TO "anon";
GRANT ALL ON TABLE "public"."equipment_operator_checkin_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_operator_checkin_settings" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_part_compatibility" TO "anon";
GRANT ALL ON TABLE "public"."equipment_part_compatibility" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_part_compatibility" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_status_history" TO "anon";
GRANT ALL ON TABLE "public"."equipment_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "anon";
GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_working_hours_history" TO "service_role";



GRANT ALL ON TABLE "public"."export_request_log" TO "anon";
GRANT ALL ON TABLE "public"."export_request_log" TO "authenticated";
GRANT ALL ON TABLE "public"."export_request_log" TO "service_role";



GRANT ALL ON TABLE "public"."geocoded_locations" TO "anon";
GRANT ALL ON TABLE "public"."geocoded_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."geocoded_locations" TO "service_role";



GRANT ALL ON TABLE "public"."google_workspace_credentials" TO "anon";
GRANT ALL ON TABLE "public"."google_workspace_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."google_workspace_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."google_workspace_directory_users" TO "anon";
GRANT ALL ON TABLE "public"."google_workspace_directory_users" TO "authenticated";
GRANT ALL ON TABLE "public"."google_workspace_directory_users" TO "service_role";



GRANT ALL ON TABLE "public"."google_workspace_oauth_sessions" TO "anon";
GRANT ALL ON TABLE "public"."google_workspace_oauth_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."google_workspace_oauth_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_item_images" TO "anon";
GRANT ALL ON TABLE "public"."inventory_item_images" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_item_images" TO "service_role";



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



GRANT ALL ON TABLE "public"."operator_checkin_submissions" TO "anon";
GRANT ALL ON TABLE "public"."operator_checkin_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_checkin_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."operator_checkin_token_secrets" TO "anon";
GRANT ALL ON TABLE "public"."operator_checkin_token_secrets" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_checkin_token_secrets" TO "service_role";



GRANT ALL ON TABLE "public"."operator_checklist_templates" TO "anon";
GRANT ALL ON TABLE "public"."operator_checklist_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."operator_checklist_templates" TO "service_role";



GRANT ALL ON TABLE "public"."organization_google_export_destinations" TO "anon";
GRANT ALL ON TABLE "public"."organization_google_export_destinations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_google_export_destinations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_member_claims" TO "anon";
GRANT ALL ON TABLE "public"."organization_member_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_member_claims" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organization_role_grants_pending" TO "anon";
GRANT ALL ON TABLE "public"."organization_role_grants_pending" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_role_grants_pending" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "anon";
GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "service_role";



GRANT ALL ON TABLE "public"."part_alternate_group_members" TO "anon";
GRANT ALL ON TABLE "public"."part_alternate_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."part_alternate_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."part_alternate_groups" TO "anon";
GRANT ALL ON TABLE "public"."part_alternate_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."part_alternate_groups" TO "service_role";



GRANT ALL ON TABLE "public"."part_compatibility_rules" TO "anon";
GRANT ALL ON TABLE "public"."part_compatibility_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."part_compatibility_rules" TO "service_role";



GRANT ALL ON TABLE "public"."part_identifiers" TO "anon";
GRANT ALL ON TABLE "public"."part_identifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."part_identifiers" TO "service_role";



GRANT ALL ON TABLE "public"."parts_consumers" TO "anon";
GRANT ALL ON TABLE "public"."parts_consumers" TO "authenticated";
GRANT ALL ON TABLE "public"."parts_consumers" TO "service_role";



GRANT ALL ON TABLE "public"."parts_managers" TO "anon";
GRANT ALL ON TABLE "public"."parts_managers" TO "authenticated";
GRANT ALL ON TABLE "public"."parts_managers" TO "service_role";



GRANT ALL ON TABLE "public"."personal_organizations" TO "anon";
GRANT ALL ON TABLE "public"."personal_organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_organizations" TO "service_role";



GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "anon";
GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_checklist_templates" TO "service_role";



GRANT ALL ON TABLE "public"."pm_interval_policies" TO "anon";
GRANT ALL ON TABLE "public"."pm_interval_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."pm_interval_policies" TO "service_role";



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



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."quick_form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_form_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."quick_form_token_secrets" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_form_token_secrets" TO "service_role";



GRANT ALL ON TABLE "public"."quick_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."quick_forms" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_credentials" TO "service_role";
GRANT ALL ON TABLE "public"."quickbooks_credentials" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_credentials" TO "authenticated";



GRANT ALL ON TABLE "public"."quickbooks_export_logs" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_export_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_export_logs" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_invoice_status_events" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_invoice_status_events" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_invoice_status_events" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_oauth_sessions" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_oauth_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_oauth_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."quickbooks_team_customers" TO "anon";
GRANT ALL ON TABLE "public"."quickbooks_team_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."quickbooks_team_customers" TO "service_role";



GRANT ALL ON TABLE "public"."record_export_artifacts" TO "anon";
GRANT ALL ON TABLE "public"."record_export_artifacts" TO "authenticated";
GRANT ALL ON TABLE "public"."record_export_artifacts" TO "service_role";



GRANT ALL ON TABLE "public"."scan_follow_up_events" TO "anon";
GRANT ALL ON TABLE "public"."scan_follow_up_events" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_follow_up_events" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."terms_acceptances" TO "anon";
GRANT ALL ON TABLE "public"."terms_acceptances" TO "authenticated";
GRANT ALL ON TABLE "public"."terms_acceptances" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."user_dashboard_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_dashboard_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_dashboard_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_departure_queue" TO "anon";
GRANT ALL ON TABLE "public"."user_departure_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."user_departure_queue" TO "service_role";



GRANT ALL ON TABLE "public"."user_entitlements" TO "anon";
GRANT ALL ON TABLE "public"."user_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_entitlements" TO "service_role";



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



GRANT ALL ON TABLE "public"."workspace_domains" TO "anon";
GRANT ALL ON TABLE "public"."workspace_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_domains" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_personal_org_merge_requests" TO "anon";
GRANT ALL ON TABLE "public"."workspace_personal_org_merge_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_personal_org_merge_requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "pgmq_public" GRANT ALL ON FUNCTIONS TO "service_role";



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































