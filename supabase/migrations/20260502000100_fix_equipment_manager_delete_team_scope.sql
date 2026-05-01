-- Migration: fix equipment_team_manager_delete — qualify team_id reference
-- Purpose: `20260502000000_fix_equipment_delete_rls.sql` (and the originating
--   `20260501040800_tighten_equipment_create_rls.sql`) used an unqualified
--   `tm.team_id = team_id` comparison inside the EXISTS subquery of the
--   `equipment_team_manager_delete` policy. Postgres resolves the bare `team_id`
--   to the inner table alias (tm.team_id), making the condition always true for
--   any row — equivalent to `tm.team_id = tm.team_id`. This allowed any user
--   who is a manager on *any* team to DELETE equipment on *any other* team,
--   defeating the purpose of the policy.
--   This migration corrects the expression to `tm.team_id = "equipment"."team_id"`,
--   matching the qualified form already used in the INSERT policy's WITH CHECK.
-- Affected tables: public.equipment
-- Environments: applies on both preview (applied 20260501 + 20260502) and
--   production (no prior equipment_team_manager_delete policy; base migration
--   will be re-expressed here).

BEGIN;

DROP POLICY IF EXISTS "equipment_team_manager_delete" ON "public"."equipment";

CREATE POLICY "equipment_team_manager_delete" ON "public"."equipment"
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM "public"."team_members" tm
      WHERE tm.user_id = (select "auth"."uid"())
        AND tm.team_id = "equipment"."team_id"
        AND tm.role = 'manager'::"public"."team_member_role"
    )
  );

COMMIT;
