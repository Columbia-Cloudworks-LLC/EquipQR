-- Fix equip_note_images_select: unqualified "name" inside the equipment EXISTS
-- subquery resolved to equipment.name (display title), not storage.objects.name
-- (object path). That blocked authenticated createSignedUrl/createSignedUrls for
-- every equipment-note image (#1171 / local dev thumbnails).

DROP POLICY IF EXISTS "equip_note_images_select" ON storage.objects;
CREATE POLICY "equip_note_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'equipment-note-images'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.equipment e
      WHERE e.id = ((storage.foldername(storage.objects.name))[2])::uuid
        AND public.is_org_member((SELECT auth.uid()), e.organization_id)
    )
  );
