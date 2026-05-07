-- UUID regex guards before casting storage path segment [1] to uuid for team-images and
-- inventory-item-images. Matches the work-order / equipment-note guard pattern in
-- 20260506120000_storage_select_policies_uuid_segment_guard.sql — malformed segments
-- deny instead of raising cast exceptions (500).

DROP POLICY IF EXISTS "team_images_select" ON storage.objects;
CREATE POLICY "team_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'team-images'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "team_images_insert" ON storage.objects;
CREATE POLICY "team_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-images'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
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
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'team-images'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
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
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "inventory_images_select" ON storage.objects;
CREATE POLICY "inventory_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inventory-item-images'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
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
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
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
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'inventory-item-images'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
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
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.is_org_member(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );
