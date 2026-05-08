-- =============================================================================
-- Private image buckets + scoped SELECT policies + landing-page-images public
--
-- Compliance (C2): Only organization-logos and landing-page-images remain
-- world-readable via public bucket flags. Application images use signed URLs.
-- SELECT on private buckets is org/user scoped (not broad authenticated).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Bucket visibility
-- -----------------------------------------------------------------------------

UPDATE storage.buckets SET public = false WHERE id IN (
  'work-order-images',
  'equipment-note-images',
  'team-images',
  'user-avatars',
  'inventory-item-images'
);

UPDATE storage.buckets SET public = true WHERE id = 'organization-logos';

-- Marketing-only bucket (may already exist from dashboard/scripts).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-page-images',
  'landing-page-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2) landing-page-images: anonymous read for marketing traffic (public URLs)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "landing_page_images_select" ON storage.objects;
CREATE POLICY "landing_page_images_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'landing-page-images');

-- -----------------------------------------------------------------------------
-- 3) Team images — SELECT limited to org members (path segment [1] = org id)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "team_images_select" ON storage.objects;
CREATE POLICY "team_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'team-images'
    AND public.is_org_member(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid
    )
  );

-- -----------------------------------------------------------------------------
-- 4) User avatars — SELECT for users who share an active org membership with
--    the avatar owner (path segment [1] = profile user id)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "user_avatars_select" ON storage.objects;
CREATE POLICY "user_avatars_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om_self
      JOIN public.organization_members om_peer
        ON om_self.organization_id = om_peer.organization_id
      WHERE om_self.user_id = (SELECT auth.uid())
        AND om_self.status = 'active'
        AND om_peer.status = 'active'
        AND om_peer.user_id::text = (storage.foldername(name))[1]
    )
  );

-- -----------------------------------------------------------------------------
-- 5) Work order images — SELECT requires org membership for the work order in
--    path segment [2] (paths: {userId}/{workOrderId}/...)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "work_order_images_select" ON storage.objects;
CREATE POLICY "work_order_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-order-images'
    AND EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = ((storage.foldername(name))[2])::uuid
        AND public.is_org_member((SELECT auth.uid()), wo.organization_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 6) Equipment note images — SELECT requires org membership for equipment in
--    path segment [2] (paths: {userId}/{equipmentId}/{noteId}/...)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "equip_note_images_select" ON storage.objects;
CREATE POLICY "equip_note_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'equipment-note-images'
    AND EXISTS (
      SELECT 1
      FROM public.equipment e
      WHERE e.id = ((storage.foldername(name))[2])::uuid
        AND public.is_org_member((SELECT auth.uid()), e.organization_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 7) Backfill: legacy public URLs -> canonical object paths (DB stores path)
-- -----------------------------------------------------------------------------

UPDATE public.work_order_images
SET file_url = regexp_replace(split_part(file_url, '?', 1), '^.*storage/v1/object/public/work-order-images/', '')
WHERE file_url LIKE '%/storage/v1/object/public/work-order-images/%';

UPDATE public.equipment_note_images
SET file_url = regexp_replace(split_part(file_url, '?', 1), '^.*storage/v1/object/public/equipment-note-images/', '')
WHERE file_url LIKE '%/storage/v1/object/public/equipment-note-images/%';

UPDATE public.inventory_item_images
SET file_url = regexp_replace(split_part(file_url, '?', 1), '^.*storage/v1/object/public/inventory-item-images/', '')
WHERE file_url LIKE '%/storage/v1/object/public/inventory-item-images/%';

UPDATE public.profiles
SET avatar_url = regexp_replace(split_part(avatar_url, '?', 1), '^.*storage/v1/object/public/user-avatars/', '')
WHERE avatar_url LIKE '%/storage/v1/object/public/user-avatars/%';

UPDATE public.teams
SET image_url = regexp_replace(split_part(image_url, '?', 1), '^.*storage/v1/object/public/team-images/', '')
WHERE image_url LIKE '%/storage/v1/object/public/team-images/%';

UPDATE public.equipment
SET image_url = regexp_replace(split_part(image_url, '?', 1), '^.*storage/v1/object/public/work-order-images/', '')
WHERE image_url LIKE '%/storage/v1/object/public/work-order-images/%';

UPDATE public.equipment
SET image_url = regexp_replace(split_part(image_url, '?', 1), '^.*storage/v1/object/public/equipment-note-images/', '')
WHERE image_url LIKE '%/storage/v1/object/public/equipment-note-images/%';
