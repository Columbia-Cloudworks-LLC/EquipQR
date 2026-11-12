-- Migration: clear Supabase performance advisor warnings (2026-11-12)
-- Purpose: resolve three groups of WARN-level performance lints reported for
--   production. No access rule changes: every policy below grants exactly what
--   the previous set of policies granted in combination.
--
--   1. auth_rls_initplan (0003) on public.pm_interval_policies: the four
--      policies called auth.uid() directly, so Postgres re-evaluated it for
--      every row. Wrapping it as (select auth.uid()) makes it a one-time
--      InitPlan.
--   2. multiple_permissive_policies (0006) on public.equipment: the FOR ALL
--      policy `equipment_access_consolidated` overlapped a second permissive
--      policy for every action, so two policies ran per query. They are
--      replaced by one policy per action.
--   3. duplicate_index (0009) on public.operator_checklist_templates: the
--      unique constraint `operator_checklist_templates_id_organization_id_key`
--      duplicated the unique index `idx_operator_checklist_templates_id_org`.
-- Affected tables: public.pm_interval_policies, public.equipment,
--   public.operator_checklist_templates

BEGIN;

-- ============================================================================
-- 1. pm_interval_policies: evaluate auth.uid() once per statement
-- ============================================================================

ALTER POLICY pm_interval_policies_select ON public.pm_interval_policies
USING (
  organization_id IN (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = (select auth.uid())
      AND om.status = 'active'
  )
);

ALTER POLICY pm_interval_policies_insert ON public.pm_interval_policies
WITH CHECK (
  public.is_org_operational_admin((select auth.uid()), organization_id)
  AND (
    equipment_id IS NULL
    OR equipment_id IN (
      SELECT e.id
      FROM public.equipment e
      WHERE e.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    team_id IS NULL
    OR team_id IN (
      SELECT t.id
      FROM public.teams t
      WHERE t.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    pm_template_id IS NULL
    OR pm_template_id IN (
      SELECT t.id
      FROM public.pm_checklist_templates t
      WHERE t.organization_id IS NULL
         OR t.organization_id = pm_interval_policies.organization_id
    )
  )
);

ALTER POLICY pm_interval_policies_update ON public.pm_interval_policies
USING (
  public.is_org_operational_admin((select auth.uid()), organization_id)
)
WITH CHECK (
  public.is_org_operational_admin((select auth.uid()), organization_id)
  AND (
    equipment_id IS NULL
    OR equipment_id IN (
      SELECT e.id
      FROM public.equipment e
      WHERE e.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    team_id IS NULL
    OR team_id IN (
      SELECT t.id
      FROM public.teams t
      WHERE t.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    pm_template_id IS NULL
    OR pm_template_id IN (
      SELECT t.id
      FROM public.pm_checklist_templates t
      WHERE t.organization_id IS NULL
         OR t.organization_id = pm_interval_policies.organization_id
    )
  )
);

ALTER POLICY pm_interval_policies_delete ON public.pm_interval_policies
USING (
  public.is_org_operational_admin((select auth.uid()), organization_id)
);

-- ============================================================================
-- 2. equipment: one permissive policy per action
-- ============================================================================
-- Before this migration the table carried these permissive policies:
--   equipment_access_consolidated  FOR ALL     admin OR member
--   equipment_admin_access         FOR ALL     admin (preview/local only;
--                                              absent in production)
--   equipment_member_select        FOR SELECT  member
--   equipment_member_update        FOR UPDATE  member
--   team_members_create_equipment  FOR INSERT  admin OR (member AND manager/
--                                              technician on the row's team)
--   equipment_team_manager_delete  FOR DELETE  manager on the row's team
-- Postgres ORs permissive policies together, so each new policy below is the
-- OR of everything that applied to its action.
--
-- NOTE: `equipment_access_consolidated` was FOR ALL, so its "admin OR member"
-- rule was already the effective rule for INSERT and DELETE as well, on top of
-- the narrower per-action policies. This migration keeps the effective rules
-- unchanged on purpose; any change to who may INSERT or DELETE is an access
-- change and belongs in its own migration.

DROP POLICY IF EXISTS "equipment_access_consolidated" ON "public"."equipment";
DROP POLICY IF EXISTS "equipment_admin_access" ON "public"."equipment";
DROP POLICY IF EXISTS "equipment_member_select" ON "public"."equipment";
DROP POLICY IF EXISTS "equipment_member_update" ON "public"."equipment";
DROP POLICY IF EXISTS "team_members_create_equipment" ON "public"."equipment";
DROP POLICY IF EXISTS "equipment_team_manager_delete" ON "public"."equipment";

DROP POLICY IF EXISTS "equipment_select" ON "public"."equipment";
CREATE POLICY "equipment_select" ON "public"."equipment"
  FOR SELECT USING (
    "public"."is_org_operational_admin"((select "auth"."uid"()), "organization_id")
    OR "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  );

DROP POLICY IF EXISTS "equipment_insert" ON "public"."equipment";
CREATE POLICY "equipment_insert" ON "public"."equipment"
  FOR INSERT WITH CHECK (
    "public"."is_org_operational_admin"((select "auth"."uid"()), "organization_id")
    OR "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  );

DROP POLICY IF EXISTS "equipment_update" ON "public"."equipment";
CREATE POLICY "equipment_update" ON "public"."equipment"
  FOR UPDATE USING (
    "public"."is_org_operational_admin"((select "auth"."uid"()), "organization_id")
    OR "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  )
  WITH CHECK (
    "public"."is_org_operational_admin"((select "auth"."uid"()), "organization_id")
    OR "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  );

DROP POLICY IF EXISTS "equipment_delete" ON "public"."equipment";
CREATE POLICY "equipment_delete" ON "public"."equipment"
  FOR DELETE USING (
    "public"."is_org_operational_admin"((select "auth"."uid"()), "organization_id")
    OR "public"."is_org_member"((select "auth"."uid"()), "organization_id")
    OR EXISTS (
      SELECT 1
      FROM "public"."team_members" "tm"
      WHERE "tm"."user_id" = (select "auth"."uid"())
        AND "tm"."team_id" = "equipment"."team_id"
        AND "tm"."role" = 'manager'::"public"."team_member_role"
    )
  );

-- ============================================================================
-- 3. operator_checklist_templates: drop the duplicate unique constraint
-- ============================================================================
-- Both composite foreign keys that reference (id, organization_id)
-- (`equipment_operator_checkin_settings_template_org_fkey` and
-- `operator_checkin_submissions_template_organization_fkey`) depend on
-- `idx_operator_checklist_templates_id_org`, so that index stays. Nothing
-- depends on the constraint's own index, and uniqueness of
-- (id, organization_id) is still enforced by the retained unique index.

ALTER TABLE "public"."operator_checklist_templates"
  DROP CONSTRAINT IF EXISTS "operator_checklist_templates_id_organization_id_key";

COMMIT;
