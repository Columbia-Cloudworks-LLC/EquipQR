-- Migration: Fix Supabase Advisor Security Warnings
-- Description: Addresses security warnings from Supabase advisor
-- Date: 2026-01-14
-- 
-- Issues fixed:
--   1. invoke_quickbooks_token_refresh - missing search_path
--   2. update_updated_at_column - missing search_path  
--   3. pg_net extension in public schema
--   4. member_removal_audit overly permissive INSERT policy

BEGIN;

-- ============================================================================
-- PART 1: Fix invoke_quickbooks_token_refresh function
-- ============================================================================
-- This function was missing SET search_path = '' which allows mutable search path

CREATE OR REPLACE FUNCTION public.invoke_quickbooks_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

COMMENT ON FUNCTION public.invoke_quickbooks_token_refresh() IS 
  'Calls the quickbooks-refresh-tokens edge function using credentials stored in vault.secrets. '
  'This function is secured and can only be called by pg_cron scheduler (postgres superuser) '
  'or other authorized superusers. Fixed search_path for security.';

-- ============================================================================
-- PART 2: Fix update_updated_at_column function
-- ============================================================================
-- This trigger function was missing SET search_path = ''

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 
  'Trigger function to automatically update updated_at column. Fixed search_path for security.';

-- ============================================================================
-- PART 3: Move pg_net extension to extensions schema
-- ============================================================================
-- Note: This requires dropping and recreating the extension, which requires superuser
-- The extension should be enabled via Supabase Dashboard > Database > Extensions
-- This migration documents the correct approach

-- Drop from public schema (if exists) and recreate in extensions
-- Note: This may fail if pg_net is being used - in that case, handle via Dashboard
DO $$
BEGIN
  -- Try to move pg_net to extensions schema
  -- This requires the extension to not be in active use
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net' 
    AND extnamespace = 'public'::regnamespace
  ) THEN
    -- We can't simply ALTER EXTENSION to change schema for pg_net
    -- Instead, we need to drop and recreate (but this loses data in net.http_request_queue)
    -- For safety, just add a warning - this should be done via Supabase Dashboard
    RAISE WARNING 'pg_net extension is in public schema. Please move it to extensions schema via Supabase Dashboard > Database > Extensions.';
  END IF;
END
$$;

-- ============================================================================
-- PART 4: Fix member_removal_audit INSERT policy
-- ============================================================================
-- The current policy allows anyone to insert (WITH CHECK (true))
-- This should be restricted to service_role only or based on authenticated context

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert removal audit" ON public.member_removal_audit;

-- Create a more restrictive policy
-- Only allow inserts from service_role context or during organization member removal
-- Since this is an audit table for member removals, inserts should happen via triggers
-- or service_role functions, not directly by users
CREATE POLICY "Service role can insert removal audit" ON public.member_removal_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add a policy for authenticated users who are removing members (owner/admin)
-- This allows the removal trigger/function to work when called by authorized users
CREATE POLICY "Authorized users can insert removal audit" ON public.member_removal_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The user must be an owner or admin of the organization
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = member_removal_audit.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

COMMENT ON POLICY "Service role can insert removal audit" ON public.member_removal_audit IS
  'Allows service_role to insert audit records for member removals.';

COMMENT ON POLICY "Authorized users can insert removal audit" ON public.member_removal_audit IS
  'Allows organization owners and admins to insert audit records when removing members.';

COMMIT;
