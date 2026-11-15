-- Migration: enforce team-scoped INSERT and DELETE on public.equipment (#650)
-- Purpose: `20261112170755_fix_perf_advisor_rls_and_duplicate_index.sql`
--   collapsed the equipment policies to one per action and deliberately kept
--   the effective rules unchanged, which left INSERT and DELETE open to every
--   org member. This migration applies the rules that issue #650 specified and
--   that the app already enforces in `PermissionEngine.ts`
--   (`equipment.create`, `equipment.delete`):
--
--   INSERT: org owners/admins, or an org member who is a manager or technician
--           on the team the new row is assigned to (team_id required).
--   DELETE: org owners/admins, or a manager on the team the row is assigned to.
--
--   SELECT and UPDATE are unchanged. Still one permissive policy per action,
--   and every auth.uid() call stays wrapped in a scalar subquery.
-- Affected tables: public.equipment

BEGIN;

DROP POLICY IF EXISTS "equipment_insert" ON "public"."equipment";
CREATE POLICY "equipment_insert" ON "public"."equipment"
  FOR INSERT WITH CHECK (
    "public"."is_org_operational_admin"((select "auth"."uid"()), "organization_id")
    OR (
      "public"."is_org_member"((select "auth"."uid"()), "organization_id")
      AND "team_id" IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM "public"."team_members" "tm"
        WHERE "tm"."user_id" = (select "auth"."uid"())
          AND "tm"."team_id" = "equipment"."team_id"
          AND "tm"."role" IN (
            'manager'::"public"."team_member_role",
            'technician'::"public"."team_member_role"
          )
      )
    )
  );

DROP POLICY IF EXISTS "equipment_delete" ON "public"."equipment";
CREATE POLICY "equipment_delete" ON "public"."equipment"
  FOR DELETE USING (
    "public"."is_org_operational_admin"((select "auth"."uid"()), "organization_id")
    OR EXISTS (
      SELECT 1
      FROM "public"."team_members" "tm"
      WHERE "tm"."user_id" = (select "auth"."uid"())
        AND "tm"."team_id" = "equipment"."team_id"
        AND "tm"."role" = 'manager'::"public"."team_member_role"
    )
  );

COMMIT;
