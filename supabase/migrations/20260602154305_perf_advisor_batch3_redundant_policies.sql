-- Migration: perf_advisor_batch3_redundant_policies
-- Purpose: Drop redundant permissive RLS policies flagged by Supabase Performance
--          Advisor (multiple_permissive_policies) on low-risk tables.
-- Target: preview via normal migration deploy; production via preview -> main release.
--
-- Rollback:
--   Recreate dropped policies from pg_policies snapshots in migration history or
--   supabase/rls-policies.sql baseline if a revert is required.

BEGIN;

-- pm_status_history: pm_status_history_member_select duplicates
-- pm_status_history_select_consolidated (identical SELECT qual on preview).
DROP POLICY IF EXISTS pm_status_history_member_select ON public.pm_status_history;

-- invitation_performance_logs: no_user_access_performance_logs (USING false) is
-- subsumed by service_role_only_performance_logs for ALL commands (permissive OR).
DROP POLICY IF EXISTS no_user_access_performance_logs ON public.invitation_performance_logs;

COMMIT;
