
-- Ensure admin DELETE policy exists for equipment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'equipment' 
      AND policyname = 'admins_delete_equipment'
  ) THEN
    CREATE POLICY admins_delete_equipment
    ON public.equipment
    FOR DELETE
    USING (is_org_admin(auth.uid(), organization_id));
  END IF;
END$$;

-- Ensure admin DELETE policy exists for equipment_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'equipment_notes' 
      AND policyname = 'admins_delete_equipment_notes'
  ) THEN
    CREATE POLICY admins_delete_equipment_notes
    ON public.equipment_notes
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.equipment e
        WHERE e.id = equipment_notes.equipment_id
          AND is_org_admin(auth.uid(), e.organization_id)
      )
    );
  END IF;
END$$;

-- Ensure admin DELETE policy exists for equipment_note_images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'equipment_note_images' 
      AND policyname = 'admins_delete_equipment_note_images'
  ) THEN
    CREATE POLICY admins_delete_equipment_note_images
    ON public.equipment_note_images
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.equipment_notes en
        JOIN public.equipment e ON e.id = en.equipment_id
        WHERE en.id = equipment_note_images.equipment_note_id
          AND is_org_admin(auth.uid(), e.organization_id)
      )
    );
  END IF;
END$$;
