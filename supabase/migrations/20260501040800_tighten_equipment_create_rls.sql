-- Migration: tighten equipment INSERT RLS to manager/technician scope (#650)
-- Purpose: Align Supabase row-level security with the new client-side
--   equipment-create matrix introduced for issue #650. Previously the
--   `equipment_member_access` policy in `20250902124500_complete_performance_fix.sql`
--   granted FOR ALL to every active org member, so any member (including
--   `requestor`/`viewer` team roles and members with no team membership) could
--   INSERT equipment via the Data API even though the React UI hid the gate.
--   This migration narrows INSERT to org owners/admins plus team
--   managers/technicians on the assigned team while preserving the existing
--   member SELECT/UPDATE/DELETE behavior (UI gates and `equipment.edit` rules
--   continue to constrain modify operations at the application layer).
-- Affected tables: public.equipment
-- Notes: This migration follows EquipQR's "never edit applied migrations"
--   rule. The earlier `20250901235558_remote_schema.sql` and
--   `20250902123800_performance_optimization.sql` migrations already shipped
--   their own variants of `team_members_create_equipment`; that policy was
--   then dropped and replaced by `equipment_member_access` (FOR ALL) in
--   `20250902124500_complete_performance_fix.sql`. This migration replays the
--   defense-in-depth team-role check from the original policy on top of the
--   consolidated baseline.

BEGIN;

-- 1) Drop the FOR ALL `equipment_member_access` policy from
--    `20250902124500_complete_performance_fix.sql`. This policy granted
--    SELECT, INSERT, UPDATE, and DELETE to every active org member with no
--    team-role check, which is what allowed equipment to be created by users
--    that the UI gate hid the affordance from.
DROP POLICY IF EXISTS "equipment_member_access" ON "public"."equipment";

-- 2) Recreate the SELECT half of the dropped policy unchanged so existing
--    member view behavior (used across `/dashboard/equipment`, work orders,
--    fleet map, inventory part-equipment lookups, and audit-log entity
--    expansions) keeps working.
DROP POLICY IF EXISTS "equipment_member_select" ON "public"."equipment";
CREATE POLICY "equipment_member_select" ON "public"."equipment"
  FOR SELECT USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- 3) Recreate the UPDATE half of the dropped policy. Application-layer
--    `equipment.edit` rules (admin org-wide, team manager per team) continue
--    to constrain who can mutate equipment in practice; the broader
--    member-level UPDATE permission is preserved here only so that legacy
--    flows (equipment status updates, working-hours updates, location
--    history triggers) keep functioning. Tightening UPDATE to per-team-role
--    is intentionally out of scope for this Change Record (#650).
DROP POLICY IF EXISTS "equipment_member_update" ON "public"."equipment";
CREATE POLICY "equipment_member_update" ON "public"."equipment"
  FOR UPDATE USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));

-- 4) Remove the broad member DELETE policy that was in `equipment_member_access`
--    (FOR ALL). Org admins/owners are already covered by `equipment_admin_access`
--    (FOR ALL). A separate scoped policy `equipment_team_manager_delete` is
--    created below to allow team managers to delete equipment on their team,
--    matching the `equipment.delete` rule in PermissionEngine.ts.
--    The old broad `equipment_member_delete` is dropped; it is NOT recreated.
DROP POLICY IF EXISTS "equipment_member_delete" ON "public"."equipment";
DROP POLICY IF EXISTS "equipment_team_manager_delete" ON "public"."equipment";
CREATE POLICY "equipment_team_manager_delete" ON "public"."equipment"
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM "public"."team_members" tm
      WHERE tm.user_id = (select "auth"."uid"())
        AND tm.team_id = team_id
        AND tm.role = 'manager'::"public"."team_member_role"
    )
  );

-- 5) Add the tightened INSERT policy. Owners and admins can create equipment
--    org-wide (no team_id required). Active org members can only insert when
--    `team_id` is non-null and they hold a `manager` or `technician` role on
--    the assigned team. This mirrors the `equipment.create` rule in
--    `src/services/permissions/PermissionEngine.ts` and the updated
--    `equipment.canCreateForTeam` helper in
--    `src/hooks/useUnifiedPermissions.ts`.
DROP POLICY IF EXISTS "team_members_create_equipment" ON "public"."equipment";
CREATE POLICY "team_members_create_equipment" ON "public"."equipment"
  FOR INSERT WITH CHECK (
    "public"."is_org_admin"((select "auth"."uid"()), "organization_id")
    OR (
      "public"."is_org_member"((select "auth"."uid"()), "organization_id")
      AND "team_id" IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM "public"."team_members" "tm"
        WHERE "tm"."user_id" = (select "auth"."uid"())
          AND "tm"."team_id" = "equipment"."team_id"
          AND "tm"."role" IN ('manager'::"public"."team_member_role", 'technician'::"public"."team_member_role")
      )
    )
  );

COMMIT;
