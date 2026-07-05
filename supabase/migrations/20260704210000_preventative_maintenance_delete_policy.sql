-- Allow org members to delete PM rows on active (non-terminal) work orders (#1130).

CREATE POLICY "preventative_maintenance_delete_consolidated"
  ON "public"."preventative_maintenance"
  FOR DELETE
  USING (
    (
      ("is_historical" = true AND "public"."is_org_admin"((SELECT "auth"."uid"()), "organization_id"))
      OR ("is_historical" = false AND "public"."is_org_member"((SELECT "auth"."uid"()), "organization_id"))
    )
    AND EXISTS (
      SELECT 1
      FROM "public"."work_orders" "wo"
      WHERE "wo"."id" = "preventative_maintenance"."work_order_id"
        AND "wo"."status" NOT IN ('completed', 'cancelled')
    )
  );

COMMENT ON POLICY "preventative_maintenance_delete_consolidated" ON "public"."preventative_maintenance" IS
  'Org members may remove PM checklists from active work orders. Historical PM rows require org admin.';
