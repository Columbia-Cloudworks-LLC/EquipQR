-- =============================================================================
-- Add SELECT policies on storage.objects for all image upload buckets.
--
-- The Storage API needs SELECT access for upsert checks, move/copy operations,
-- and internal file existence verification. Without SELECT policies, INSERT
-- with upsert fails even when INSERT/UPDATE policies exist.
-- =============================================================================

CREATE POLICY "org_logos_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'organization-logos');

CREATE POLICY "user_avatars_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "team_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'team-images');

CREATE POLICY "inventory_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'inventory-item-images');

CREATE POLICY "equip_note_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'equipment-note-images');

CREATE POLICY "work_order_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'work-order-images');
