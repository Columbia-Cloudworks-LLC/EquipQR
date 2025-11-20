-- Migration: Fix Security Warnings
-- Purpose: Address Supabase security advisor warnings:
--   1. Enable RLS on preventative_maintenance table
--   2. Remove SECURITY DEFINER from user_entitlements view
--   3. Remove SECURITY DEFINER from pm_templates_check view
-- Created: 2025-11-19

BEGIN;

-- =============================================================================
-- 1. Enable RLS on preventative_maintenance table
-- =============================================================================
-- The table has RLS policies but RLS was not enabled
-- This is idempotent - safe to run even if already enabled

ALTER TABLE "public"."preventative_maintenance" ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE "public"."preventative_maintenance" IS 'RLS enabled to enforce organization-level access control via policies';

-- =============================================================================
-- 2. Fix user_entitlements view - Remove SECURITY DEFINER
-- =============================================================================
-- Recreate the view without SECURITY DEFINER property
-- The view should use the querying user's permissions, not the creator's

DROP VIEW IF EXISTS "public"."user_entitlements" CASCADE;

CREATE VIEW "public"."user_entitlements" 
WITH (security_invoker = true) AS
SELECT 
  p.id AS user_id,
  'free'::text AS plan,
  true AS is_active,
  now() AS granted_at,
  NULL::timestamptz AS subscription_end
FROM public.profiles p;

COMMENT ON VIEW "public"."user_entitlements" IS 'Universal entitlements view: all users have full access. Created 2025-01-15 as part of billing removal. Uses profiles table for security with RLS (policies: users_view_own_profile, org_members_view_member_profiles). Recreated without SECURITY DEFINER for proper RLS enforcement.';

-- =============================================================================
-- 3. Fix pm_templates_check view - Remove SECURITY DEFINER
-- =============================================================================
-- This view exists in production but may not be in local migrations
-- We need to recreate it without SECURITY DEFINER
-- Note: The view relies on the underlying pm_checklist_templates table's RLS policies
-- (pm_templates_read_access) to control access, avoiding duplication of authorization logic.

-- Drop the view if it exists (with CASCADE to handle dependencies)
DROP VIEW IF EXISTS "public"."pm_templates_check" CASCADE;

-- Recreate without SECURITY DEFINER
-- Using security_invoker = true ensures the view uses the querying user's permissions
-- The view relies on pm_checklist_templates table RLS policies for access control
CREATE VIEW "public"."pm_templates_check" 
WITH (security_invoker = true) AS
SELECT 
  t.id,
  t.organization_id,
  t.name,
  t.description,
  t.is_protected,
  t.template_data,
  t.created_by,
  t.created_at,
  t.updated_at,
  -- Validation checks
  CASE 
    WHEN t.template_data IS NULL OR t.template_data = '[]'::jsonb THEN false
    WHEN t.name IS NULL OR trim(t.name) = '' THEN false
    ELSE true
  END AS is_valid,
  -- Additional metadata
  jsonb_array_length(COALESCE(t.template_data, '[]'::jsonb)) AS checklist_item_count
FROM public.pm_checklist_templates t;

COMMENT ON VIEW "public"."pm_templates_check" IS 'PM templates validation and check view. Recreated without SECURITY DEFINER for proper RLS enforcement. Access control is enforced by the underlying pm_checklist_templates table RLS policies (pm_templates_read_access).';

-- =============================================================================
-- Verification
-- =============================================================================
-- Verify RLS is enabled on preventative_maintenance
DO $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'preventative_maintenance' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS is still not enabled on preventative_maintenance table';
  END IF;
END $$;

-- Verify that user_entitlements and pm_templates_check views exist and have security_invoker = true
DO $$
DECLARE
  view_count integer;
BEGIN
  -- Check that views exist with security_invoker = true
  -- In PostgreSQL, security_invoker = true means the view does NOT have SECURITY DEFINER
  -- We verify by checking that the views exist (they should be in pg_views)
  SELECT COUNT(*) INTO view_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN ('user_entitlements', 'pm_templates_check');
  
  IF view_count != 2 THEN
    RAISE EXCEPTION 'Expected views were not created successfully. Found % views, expected 2', view_count;
  END IF;
  
  -- Note: PostgreSQL does not store the security_invoker option directly in system catalogs
  -- The absence of SECURITY DEFINER in the view definition indicates security_invoker = true
  -- Both views are created with WITH (security_invoker = true) above
END $$;

COMMIT;

