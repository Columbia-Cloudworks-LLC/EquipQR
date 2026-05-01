-- Migration: fix equipment DELETE RLS — replace over-permissive member policy
-- Purpose: `20260501040800_tighten_equipment_create_rls.sql` recreated
--   `equipment_member_delete` using `is_org_member()`, which grants DELETE to
--   every active org member regardless of role. This contradicts the
--   permissions matrix (Delete Equipment: owner/admin/manager only) and allows
--   Data API deletes by requestors/viewers who cannot reach the delete UI.
--   This migration drops the broad policy and replaces it with
--   `equipment_team_manager_delete` scoped to team managers (matching the
--   `equipment.delete` rule in PermissionEngine.ts). Org admins/owners remain
--   covered by the existing `equipment_admin_access` (FOR ALL) policy and do
--   not need a separate DELETE policy entry.
-- Affected tables: public.equipment
-- Environments: fixes preview (which ran 20260501040800 with the broad policy);
--   is a safe no-op on production (base migration already ships the correct
--   `equipment_team_manager_delete` policy after this fix was forward-ported).

BEGIN;

DROP POLICY IF EXISTS "equipment_member_delete" ON "public"."equipment";
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
