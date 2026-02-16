-- Migration: fix_security_advisor_warnings_v2
-- Purpose: Address Supabase security advisor warnings:
-- 1. Set search_path on functions missing it (prevents search_path injection attacks)
-- 2. Fix permissive RLS policy on invitation_performance_logs
--
-- Security advisories addressed:
-- - function_search_path_mutable: list_pm_templates, normalize_email, normalize_domain
-- - rls_policy_always_true: invitation_performance_logs.service_role_only_performance_logs

-- ============================================================================
-- FIX 1: list_pm_templates() - add search_path (the no-parameter overload)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_pm_templates()
RETURNS TABLE(template_name text, item_count bigint, is_global boolean)
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $function$
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
$function$;

-- ============================================================================
-- FIX 2: normalize_domain() - add search_path
-- ============================================================================
CREATE OR REPLACE FUNCTION public.normalize_domain(p_domain text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
BEGIN
  -- Return NULL for NULL input to prevent errors in queries
  IF p_domain IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(trim(p_domain));
END;
$function$;

-- ============================================================================
-- FIX 3: normalize_email() - add search_path
-- ============================================================================
CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
BEGIN
  -- Return NULL for NULL input to prevent errors in queries
  IF p_email IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(trim(p_email));
END;
$function$;

-- ============================================================================
-- FIX 4: Fix permissive RLS policy on invitation_performance_logs
-- The existing policy has USING clause as null (implicitly true for reads)
-- We need to properly restrict both reads and writes to service_role only
-- ============================================================================

-- Drop the problematic policy first
DROP POLICY IF EXISTS service_role_only_performance_logs ON public.invitation_performance_logs;

-- Recreate with proper USING clause (restricts reads) and WITH CHECK (restricts writes)
CREATE POLICY service_role_only_performance_logs ON public.invitation_performance_logs
    FOR ALL
    TO public
    USING ((SELECT auth.role()) = 'service_role')
    WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ============================================================================
-- VERIFICATION: Ensure RLS is still enabled
-- ============================================================================
ALTER TABLE public.invitation_performance_logs ENABLE ROW LEVEL SECURITY;
