-- =============================================================================
-- Improve storage security and add missing buckets
--
-- Addresses PR #561 review feedback:
--   1. (HIGH/Security) Add organization/user-scoping to storage.objects RLS
--      policies to prevent cross-tenant access via storage paths
--   2. (MEDIUM/Reliability) Add missing equipment-note-images and
--      work-order-images buckets to the migration pipeline
--   3. (LOW/Reliability) Use ON CONFLICT DO UPDATE to enforce bucket
--      configuration on environments where buckets were created manually
--
-- Storage path conventions (from application code):
--   organization-logos:    {orgId}/logo.{ext}
--   user-avatars:          {userId}/avatar.{ext}
--   team-images:           {orgId}/{teamId}/image.{ext}
--   inventory-item-images: {orgId}/{itemId}/{timestamp}.{ext}
--   equipment-note-images: {userId}/{equipmentId}/{noteId}/{timestamp}.{ext}
--   work-order-images:     {userId}/{workOrderId}/{...}/{timestamp}.{ext}
--
-- Scoping strategy:
--   - Org-prefixed buckets: RLS checks is_org_member() against path segment [1]
--   - User-prefixed buckets: RLS checks auth.uid() against path segment [1]
--   - SELECT on public-asset buckets (logos, team images) remains open to all
--     authenticated users; org scoping for reads on user-prefixed buckets is
--     enforced by metadata-table RLS (defense-in-depth)
-- =============================================================================


-- ============================================================================
-- 1. ENSURE ALL 6 STORAGE BUCKETS EXIST WITH CORRECT CONFIGURATION
--    Uses ON CONFLICT DO UPDATE to enforce settings on pre-existing buckets
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('organization-logos',    'organization-logos',    true, 5242880,  ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('user-avatars',          'user-avatars',          true, 5242880,  ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('team-images',           'team-images',           true, 5242880,  ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('inventory-item-images', 'inventory-item-images', true, 10485760, ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('equipment-note-images', 'equipment-note-images', true, 10485760, ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('work-order-images',     'work-order-images',     true, 10485760, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ============================================================================
-- 2. REPLACE STORAGE POLICIES WITH ORG/USER-SCOPED VERSIONS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2a. ORGANIZATION LOGOS (path: {orgId}/logo.{ext})
--     SELECT: any authenticated user (logos are public display assets)
--     INSERT/UPDATE/DELETE: org members only — verified via path segment [1]
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "org_logos_select" ON storage.objects;
CREATE POLICY "org_logos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'organization-logos');

DROP POLICY IF EXISTS "org_logos_insert" ON storage.objects;
CREATE POLICY "org_logos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organization-logos'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "org_logos_update" ON storage.objects;
CREATE POLICY "org_logos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'organization-logos'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "org_logos_delete" ON storage.objects;
CREATE POLICY "org_logos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );


-- --------------------------------------------------------------------------
-- 2b. USER AVATARS (path: {userId}/avatar.{ext})
--     Already correctly scoped in 20260210210000 — no changes needed.
--     Policies use (storage.foldername(name))[1] = auth.uid()::text
-- --------------------------------------------------------------------------


-- --------------------------------------------------------------------------
-- 2c. TEAM IMAGES (path: {orgId}/{teamId}/image.{ext})
--     SELECT: any authenticated user (team images are public display assets)
--     INSERT/UPDATE/DELETE: org members only — verified via path segment [1]
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "team_images_select" ON storage.objects;
CREATE POLICY "team_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'team-images');

DROP POLICY IF EXISTS "team_images_insert" ON storage.objects;
CREATE POLICY "team_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "team_images_update" ON storage.objects;
CREATE POLICY "team_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'team-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'team-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "team_images_delete" ON storage.objects;
CREATE POLICY "team_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );


-- --------------------------------------------------------------------------
-- 2d. INVENTORY ITEM IMAGES (path: {orgId}/{itemId}/{timestamp}.{ext})
--     All operations scoped to org members — verified via path segment [1]
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "inventory_images_select" ON storage.objects;
CREATE POLICY "inventory_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inventory-item-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "inventory_images_insert" ON storage.objects;
CREATE POLICY "inventory_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inventory-item-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "inventory_images_update" ON storage.objects;
CREATE POLICY "inventory_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'inventory-item-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'inventory-item-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "inventory_images_delete" ON storage.objects;
CREATE POLICY "inventory_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'inventory-item-images'
    AND "public"."is_org_member"(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );


-- --------------------------------------------------------------------------
-- 2e. EQUIPMENT NOTE IMAGES (path: {userId}/{equipmentId}/{noteId}/{ts}.{ext})
--     SELECT: any authenticated user (org scoping via metadata-table RLS)
--     INSERT/UPDATE/DELETE: uploading user only — path segment [1] = auth.uid()
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "equip_note_images_select" ON storage.objects;
CREATE POLICY "equip_note_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'equipment-note-images');

DROP POLICY IF EXISTS "equip_note_images_insert" ON storage.objects;
CREATE POLICY "equip_note_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'equipment-note-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "equip_note_images_update" ON storage.objects;
CREATE POLICY "equip_note_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'equipment-note-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'equipment-note-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "equip_note_images_delete" ON storage.objects;
CREATE POLICY "equip_note_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'equipment-note-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );


-- --------------------------------------------------------------------------
-- 2f. WORK ORDER IMAGES (path: {userId}/{workOrderId}/{...}/{ts}.{ext})
--     SELECT: any authenticated user (org scoping via metadata-table RLS)
--     INSERT/UPDATE/DELETE: uploading user only — path segment [1] = auth.uid()
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "work_order_images_select" ON storage.objects;
CREATE POLICY "work_order_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'work-order-images');

DROP POLICY IF EXISTS "work_order_images_insert" ON storage.objects;
CREATE POLICY "work_order_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'work-order-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "work_order_images_update" ON storage.objects;
CREATE POLICY "work_order_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'work-order-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'work-order-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "work_order_images_delete" ON storage.objects;
CREATE POLICY "work_order_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'work-order-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
