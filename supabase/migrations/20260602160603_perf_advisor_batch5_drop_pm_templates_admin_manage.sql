-- Migration: perf_advisor_batch5_drop_pm_templates_admin_manage
-- Purpose: Remove overlapping FOR ALL policy on pm_checklist_templates. Per-command policies
--          already cover SELECT/INSERT/UPDATE/DELETE; admin_manage duplicated them and allowed
--          DELETE on protected org templates that delete_consolidated and the app both deny.
-- Target: preview via normal migration deploy; production via preview -> main release.
--
-- Rollback:
--   Recreate pm_templates_admin_manage from 20250902124500_complete_performance_fix.sql
--   or supabase/rls-policies.sql if a revert is required.

BEGIN;

DROP POLICY IF EXISTS pm_templates_admin_manage ON public.pm_checklist_templates;

COMMIT;
