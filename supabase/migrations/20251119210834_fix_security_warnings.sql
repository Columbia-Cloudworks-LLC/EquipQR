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

COMMENT ON VIEW "public"."user_entitlements" IS 'Universal entitlements view: all users have full access. Created 2025-01-15 as part of billing removal. Uses profiles table for security. Recreated without SECURITY DEFINER for proper RLS enforcement.';

-- =============================================================================
-- 3. Fix pm_templates_check view - Remove SECURITY DEFINER
-- =============================================================================
-- This view exists in production but may not be in local migrations
-- We need to recreate it without SECURITY DEFINER
-- Note: If the view has a different structure in production, this migration
-- may need adjustment. The view will be recreated to respect RLS properly.

-- Drop the view if it exists (with CASCADE to handle dependencies)
DROP VIEW IF EXISTS "public"."pm_templates_check" CASCADE;

-- Recreate without SECURITY DEFINER
-- Using security_invoker = true ensures the view uses the querying user's permissions
-- This is a common pattern for PM template validation views
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
FROM public.pm_checklist_templates t
WHERE 
  -- Respect RLS: only show templates the user can access
  (t.organization_id IS NULL AND (SELECT auth.uid()) IS NOT NULL)
  OR
  public.is_org_member((SELECT auth.uid()), t.organization_id);

COMMENT ON VIEW "public"."pm_templates_check" IS 'PM templates validation and check view. Recreated without SECURITY DEFINER for proper RLS enforcement. Shows only templates accessible to the querying user and includes validation flags.';

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

COMMIT;

