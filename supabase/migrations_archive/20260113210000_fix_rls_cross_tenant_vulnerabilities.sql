-- Migration: Fix RLS Cross-Tenant Vulnerabilities
-- Issue: https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/497
-- Description: Adds organization membership checks to all user-ownership policies
-- to prevent former employees from modifying/deleting records from organizations
-- they've left.
--
-- Affected tables:
-- 1. work_order_costs - created_by policies now require org membership
-- 2. notes - update policy now requires org membership
-- 3. scans - update policy now requires org membership
-- 4. work_order_notes - update/delete policies now require org membership
-- 5. work_order_images - delete policy now requires org membership
-- 6. equipment_notes - authors_manage_own_notes split into separate policies with org checks
-- 7. export_request_log - SELECT policy now requires org membership
--
-- Pattern: For tables with user-ownership policies, ALWAYS include organization
-- membership check in addition to user ownership. This ensures that when a user
-- leaves an organization, they immediately lose access to modify their records.

BEGIN;

-- ============================================================================
-- 1. FIX: work_order_costs - Add org membership check to user cost policies
-- ============================================================================
-- The consolidated policies in 20250902124500_complete_performance_fix.sql 
-- already exist, but the user portion only checks created_by without org membership.

-- Drop the existing policies
DROP POLICY IF EXISTS "work_order_costs_select" ON "public"."work_order_costs";
DROP POLICY IF EXISTS "work_order_costs_insert" ON "public"."work_order_costs";
DROP POLICY IF EXISTS "work_order_costs_update" ON "public"."work_order_costs";
DROP POLICY IF EXISTS "work_order_costs_delete" ON "public"."work_order_costs";

-- Recreate with proper org membership checks
CREATE POLICY "work_order_costs_select" ON "public"."work_order_costs"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "wo"."organization_id")
    )
  );

COMMENT ON POLICY "work_order_costs_select" ON "public"."work_order_costs"
IS 'Organization members can view costs for work orders in their org. Security fix: removed created_by fallback to prevent cross-tenant access.';

CREATE POLICY "work_order_costs_insert" ON "public"."work_order_costs"
  FOR INSERT WITH CHECK (
    "created_by" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_costs"."work_order_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "wo"."organization_id")
    )
  );

COMMENT ON POLICY "work_order_costs_insert" ON "public"."work_order_costs"
IS 'Users can insert costs only for work orders in organizations they belong to.';

CREATE POLICY "work_order_costs_update" ON "public"."work_order_costs"
  FOR UPDATE USING (
    (
      -- Admins can update all costs in their org
      EXISTS (
        SELECT 1 FROM "public"."work_orders" "wo"
        WHERE "wo"."id" = "work_order_costs"."work_order_id"
        AND "public"."is_org_admin"((SELECT "auth"."uid"()), "wo"."organization_id")
      )
      OR
      -- Users can update their own costs IF still a member of the org
      (
        "created_by" = (SELECT "auth"."uid"())
        AND EXISTS (
          SELECT 1 FROM "public"."work_orders" "wo"
          WHERE "wo"."id" = "work_order_costs"."work_order_id"
          AND "public"."is_org_member"((SELECT "auth"."uid"()), "wo"."organization_id")
        )
      )
    )
  );

COMMENT ON POLICY "work_order_costs_update" ON "public"."work_order_costs"
IS 'Admins can update all costs. Users can update own costs only while org member. Security fix: added org membership check.';

CREATE POLICY "work_order_costs_delete" ON "public"."work_order_costs"
  FOR DELETE USING (
    (
      -- Admins can delete all costs in their org
      EXISTS (
        SELECT 1 FROM "public"."work_orders" "wo"
        WHERE "wo"."id" = "work_order_costs"."work_order_id"
        AND "public"."is_org_admin"((SELECT "auth"."uid"()), "wo"."organization_id")
      )
      OR
      -- Users can delete their own costs IF still a member of the org
      (
        "created_by" = (SELECT "auth"."uid"())
        AND EXISTS (
          SELECT 1 FROM "public"."work_orders" "wo"
          WHERE "wo"."id" = "work_order_costs"."work_order_id"
          AND "public"."is_org_member"((SELECT "auth"."uid"()), "wo"."organization_id")
        )
      )
    )
  );

COMMENT ON POLICY "work_order_costs_delete" ON "public"."work_order_costs"
IS 'Admins can delete all costs. Users can delete own costs only while org member. Security fix: added org membership check.';

-- ============================================================================
-- 2. FIX: notes table - Add org membership check to update policy
-- ============================================================================

DROP POLICY IF EXISTS "notes_update_own" ON "public"."notes";

CREATE POLICY "notes_update_own" ON "public"."notes"
  FOR UPDATE USING (
    "author_id" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "notes"."equipment_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "e"."organization_id")
    )
  );

COMMENT ON POLICY "notes_update_own" ON "public"."notes"
IS 'Authors can update their own notes only while still a member of the equipment''s organization. Security fix: added org membership check.';

-- ============================================================================
-- 3. FIX: scans table - Add org membership check to update policy
-- ============================================================================

DROP POLICY IF EXISTS "scans_update_own" ON "public"."scans";

CREATE POLICY "scans_update_own" ON "public"."scans"
  FOR UPDATE USING (
    "scanned_by" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "scans"."equipment_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "e"."organization_id")
    )
  );

COMMENT ON POLICY "scans_update_own" ON "public"."scans"
IS 'Users can update their own scans only while still a member of the equipment''s organization. Security fix: added org membership check.';

-- ============================================================================
-- 4. FIX: work_order_notes - Add org membership check to update/delete policies
-- ============================================================================

DROP POLICY IF EXISTS "work_order_notes_update_own" ON "public"."work_order_notes";
DROP POLICY IF EXISTS "work_order_notes_delete_own" ON "public"."work_order_notes";

CREATE POLICY "work_order_notes_update_own" ON "public"."work_order_notes"
  FOR UPDATE USING (
    "author_id" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_notes"."work_order_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "wo"."organization_id")
    )
  );

COMMENT ON POLICY "work_order_notes_update_own" ON "public"."work_order_notes"
IS 'Authors can update their own notes only while still a member of the work order''s organization. Security fix: added org membership check.';

CREATE POLICY "work_order_notes_delete_own" ON "public"."work_order_notes"
  FOR DELETE USING (
    "author_id" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_notes"."work_order_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "wo"."organization_id")
    )
  );

COMMENT ON POLICY "work_order_notes_delete_own" ON "public"."work_order_notes"
IS 'Authors can delete their own notes only while still a member of the work order''s organization. Security fix: added org membership check.';

-- ============================================================================
-- 5. FIX: work_order_images - Add org membership check to delete policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their own work order images" ON "public"."work_order_images";

CREATE POLICY "work_order_images_delete_own" ON "public"."work_order_images"
  FOR DELETE USING (
    "uploaded_by" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "work_order_images"."work_order_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "wo"."organization_id")
    )
  );

COMMENT ON POLICY "work_order_images_delete_own" ON "public"."work_order_images"
IS 'Users can delete their own images only while still a member of the work order''s organization. Security fix: added org membership check.';

-- ============================================================================
-- 6. FIX: equipment_notes - Replace FOR ALL policy with specific operations
-- ============================================================================
-- The current policy "authors_manage_own_notes" allows authors to SELECT, INSERT,
-- UPDATE, DELETE their notes without any organization check.

DROP POLICY IF EXISTS "authors_manage_own_notes" ON "public"."equipment_notes";

-- The existing "members_view_notes" policy handles SELECT properly with org check
-- The existing "members_create_notes" policy handles INSERT properly with org check
-- We only need to add UPDATE and DELETE policies with org checks

CREATE POLICY "equipment_notes_update_own" ON "public"."equipment_notes"
  FOR UPDATE USING (
    "author_id" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "equipment_notes"."equipment_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "e"."organization_id")
    )
  );

COMMENT ON POLICY "equipment_notes_update_own" ON "public"."equipment_notes"
IS 'Authors can update their own notes only while still a member of the equipment''s organization. Security fix: replaces FOR ALL policy with proper org check.';

CREATE POLICY "equipment_notes_delete_own" ON "public"."equipment_notes"
  FOR DELETE USING (
    "author_id" = (SELECT "auth"."uid"())
    AND EXISTS (
      SELECT 1 FROM "public"."equipment" "e"
      WHERE "e"."id" = "equipment_notes"."equipment_id"
      AND "public"."is_org_member"((SELECT "auth"."uid"()), "e"."organization_id")
    )
  );

COMMENT ON POLICY "equipment_notes_delete_own" ON "public"."equipment_notes"
IS 'Authors can delete their own notes only while still a member of the equipment''s organization. Security fix: replaces FOR ALL policy with proper org check.';

-- ============================================================================
-- 7. FIX: export_request_log - Add org membership check to SELECT policy
-- ============================================================================
-- The current policy allows users to see their export history from organizations
-- they've left, potentially leaking organization names and report types.

DROP POLICY IF EXISTS "Users can view own export history" ON "public"."export_request_log";

CREATE POLICY "Users can view own export history" ON "public"."export_request_log"
  FOR SELECT TO authenticated
  USING (
    "user_id" = (SELECT "auth"."uid"())
    AND "public"."is_org_member"((SELECT "auth"."uid"()), "organization_id")
  );

COMMENT ON POLICY "Users can view own export history" ON "public"."export_request_log"
IS 'Users can view their own export history only for organizations they currently belong to. Security fix: added org membership check.';

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing after migration)
-- ============================================================================
-- Uncomment and run these to verify policies are correctly applied:

-- SELECT schemaname, tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('work_order_costs', 'notes', 'scans', 'work_order_notes', 
--                     'work_order_images', 'equipment_notes', 'export_request_log')
-- ORDER BY tablename, policyname;

COMMIT;
