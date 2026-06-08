-- Migration: perf_advisor_batch4_pm_templates_read_access
-- Purpose: Drop redundant permissive SELECT policy on pm_checklist_templates.
--          pm_templates_read_access is subsumed by pm_checklist_templates_select_consolidated
--          (global-template OR is_org_member; admins are active org members).
-- Target: preview via normal migration deploy; production via preview -> main release.
--
-- Rollback:
--   Recreate pm_templates_read_access from 20250902124500_complete_performance_fix.sql
--   or supabase/rls-policies.sql if a revert is required.

BEGIN;

DROP POLICY IF EXISTS pm_templates_read_access ON public.pm_checklist_templates;

COMMIT;
