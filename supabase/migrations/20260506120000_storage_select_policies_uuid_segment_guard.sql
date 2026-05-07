-- Guard storage.objects SELECT policies that cast path segments to uuid.
-- Malformed segment [2] values previously caused cast exceptions (500) instead of deny.

DROP POLICY IF EXISTS "work_order_images_select" ON storage.objects;
CREATE POLICY "work_order_images_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'work-order-images'
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = ((storage.foldername(name))[2])::uuid
        AND public.is_org_member((SELECT auth.uid()), wo.organization_id)
    )
  );

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
      WHERE e.id = ((storage.foldername(name))[2])::uuid
        AND public.is_org_member((SELECT auth.uid()), e.organization_id)
    )
  );
