-- =============================================================================
-- Add storage.objects RLS policies for all image upload buckets
--
-- Root cause: The image upload feature migration (20260210180000) created storage
-- buckets via the Supabase Dashboard config but did NOT create storage.objects
-- RLS policies. Without these policies, all storage uploads are denied by RLS.
--
-- This migration adds SELECT/INSERT/UPDATE/DELETE policies for authenticated
-- users on all 6 buckets. Business-logic authorization (org membership,
-- ownership) is enforced by application code and metadata-table RLS policies —
-- storage policies only gate on authentication to keep the policy set simple.
--
-- NOTE: Even for public buckets, storage.objects SELECT policies are required
-- for the Storage API to perform upsert checks and internal operations.
-- =============================================================================

-- ============================================================================
-- 1. ORGANIZATION LOGOS — authenticated users can manage files in their org folder
-- ============================================================================

DROP POLICY IF EXISTS "org_logos_select" ON storage.objects;
CREATE POLICY "org_logos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'organization-logos');

DROP POLICY IF EXISTS "org_logos_insert" ON storage.objects;
CREATE POLICY "org_logos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'organization-logos');

DROP POLICY IF EXISTS "org_logos_update" ON storage.objects;
CREATE POLICY "org_logos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'organization-logos')
  WITH CHECK (bucket_id = 'organization-logos');

DROP POLICY IF EXISTS "org_logos_delete" ON storage.objects;
CREATE POLICY "org_logos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'organization-logos');

-- ============================================================================
-- 2. USER AVATARS — users can only manage files in their own folder
-- ============================================================================

DROP POLICY IF EXISTS "user_avatars_select" ON storage.objects;
CREATE POLICY "user_avatars_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "user_avatars_insert" ON storage.objects;
CREATE POLICY "user_avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "user_avatars_update" ON storage.objects;
CREATE POLICY "user_avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "user_avatars_delete" ON storage.objects;
CREATE POLICY "user_avatars_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- ============================================================================
-- 3. TEAM IMAGES — authenticated users can manage team images
-- ============================================================================

DROP POLICY IF EXISTS "team_images_select" ON storage.objects;
CREATE POLICY "team_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'team-images');

DROP POLICY IF EXISTS "team_images_insert" ON storage.objects;
CREATE POLICY "team_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'team-images');

DROP POLICY IF EXISTS "team_images_update" ON storage.objects;
CREATE POLICY "team_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'team-images')
  WITH CHECK (bucket_id = 'team-images');

DROP POLICY IF EXISTS "team_images_delete" ON storage.objects;
CREATE POLICY "team_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'team-images');

-- ============================================================================
-- 4. INVENTORY ITEM IMAGES — authenticated users can manage inventory images
-- ============================================================================

DROP POLICY IF EXISTS "inventory_images_select" ON storage.objects;
CREATE POLICY "inventory_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'inventory-item-images');

DROP POLICY IF EXISTS "inventory_images_insert" ON storage.objects;
CREATE POLICY "inventory_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inventory-item-images');

DROP POLICY IF EXISTS "inventory_images_update" ON storage.objects;
CREATE POLICY "inventory_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'inventory-item-images')
  WITH CHECK (bucket_id = 'inventory-item-images');

DROP POLICY IF EXISTS "inventory_images_delete" ON storage.objects;
CREATE POLICY "inventory_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'inventory-item-images');

-- ============================================================================
-- 5. EQUIPMENT NOTE IMAGES — authenticated users can manage note images
-- ============================================================================

DROP POLICY IF EXISTS "equip_note_images_select" ON storage.objects;
CREATE POLICY "equip_note_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'equipment-note-images');

DROP POLICY IF EXISTS "equip_note_images_insert" ON storage.objects;
CREATE POLICY "equip_note_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'equipment-note-images');

DROP POLICY IF EXISTS "equip_note_images_update" ON storage.objects;
CREATE POLICY "equip_note_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'equipment-note-images')
  WITH CHECK (bucket_id = 'equipment-note-images');

DROP POLICY IF EXISTS "equip_note_images_delete" ON storage.objects;
CREATE POLICY "equip_note_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'equipment-note-images');

-- ============================================================================
-- 6. WORK ORDER IMAGES — authenticated users can manage work order images
-- ============================================================================

DROP POLICY IF EXISTS "work_order_images_select" ON storage.objects;
CREATE POLICY "work_order_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'work-order-images');

DROP POLICY IF EXISTS "work_order_images_insert" ON storage.objects;
CREATE POLICY "work_order_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'work-order-images');

DROP POLICY IF EXISTS "work_order_images_update" ON storage.objects;
CREATE POLICY "work_order_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'work-order-images')
  WITH CHECK (bucket_id = 'work-order-images');

DROP POLICY IF EXISTS "work_order_images_delete" ON storage.objects;
CREATE POLICY "work_order_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'work-order-images');
