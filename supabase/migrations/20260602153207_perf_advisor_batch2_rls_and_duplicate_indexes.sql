-- Migration: perf_advisor_batch2_rls_and_duplicate_indexes
-- Purpose: Address low-risk Supabase Performance Advisor findings on preview.
-- Target: preview Supabase project via preview branch deployment; production
--         receives this later through the normal preview -> main release flow.
--
-- Rollback:
--   CREATE INDEX IF NOT EXISTS idx_equipment_default_pm_template
--     ON public.equipment USING btree (default_pm_template_id);
--   CREATE INDEX IF NOT EXISTS idx_organization_members_user_org_active
--     ON public.organization_members USING btree (user_id, organization_id, status)
--     WHERE status = 'active';
--   Recreate esh_select_org_member with auth.uid() if the initPlan optimization
--   must be reverted.

BEGIN;

-- Wrap auth.uid() in a scalar subquery so Postgres can initPlan/cache the
-- stable request user once per statement instead of evaluating it per row.
DROP POLICY IF EXISTS "esh_select_org_member" ON public.equipment_status_history;
CREATE POLICY "esh_select_org_member"
  ON public.equipment_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.equipment e
      WHERE e.id = equipment_status_history.equipment_id
        AND public.is_org_member((SELECT auth.uid()), e.organization_id)
    )
  );

-- Duplicate index cleanup: keep the clearer/current names and remove older
-- equivalents with identical definitions confirmed in preview.
DROP INDEX IF EXISTS public.idx_equipment_default_pm_template;
DROP INDEX IF EXISTS public.idx_organization_members_user_org_active;

COMMIT;
