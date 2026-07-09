-- Issue #1185: note mutations with audit logging and org-configurable author edit window

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS note_author_edit_window_hours integer NOT NULL DEFAULT 24;

COMMENT ON COLUMN public.organizations.note_author_edit_window_hours IS
  'Hours after creation that note authors may edit their own notes. Org admins and team managers are not time-limited.';

ALTER TABLE public.work_order_notes
  ADD COLUMN IF NOT EXISTS last_modified_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS last_modified_at timestamptz DEFAULT now();

-- rpc-authenticated-grant-allowed: update_equipment_note
-- rpc-authenticated-grant-allowed: delete_equipment_note
-- rpc-authenticated-grant-allowed: update_work_order_note
-- rpc-authenticated-grant-allowed: delete_work_order_note
-- rpc-authenticated-grant-allowed: delete_equipment_note_image_audited
-- rpc-authenticated-grant-allowed: delete_work_order_note_image_audited

CREATE OR REPLACE FUNCTION public.is_equipment_team_manager(p_user_id uuid, p_equipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.equipment e
    JOIN public.team_members tm ON tm.team_id = e.team_id
    WHERE e.id = p_equipment_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('owner'::public.team_member_role, 'manager'::public.team_member_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_work_order_team_manager(p_user_id uuid, p_work_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_orders wo
    JOIN public.team_members tm ON tm.team_id = wo.team_id
    WHERE wo.id = p_work_order_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('owner'::public.team_member_role, 'manager'::public.team_member_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_viewer_or_requestor(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('viewer'::public.team_member_role, 'requestor'::public.team_member_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_equipment_note(
  p_user_id uuid,
  p_organization_id uuid,
  p_equipment_id uuid,
  p_note_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_note public.equipment_notes%ROWTYPE;
  v_window_hours integer;
BEGIN
  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = p_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF public.is_org_admin(p_user_id, p_organization_id)
     OR public.is_equipment_team_manager(p_user_id, p_equipment_id) THEN
    RETURN true;
  END IF;

  IF v_note.author_id IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  SELECT COALESCE(o.note_author_edit_window_hours, 24)
  INTO v_window_hours
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  RETURN v_note.created_at + make_interval(hours => v_window_hours) >= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_work_order_note(
  p_user_id uuid,
  p_organization_id uuid,
  p_work_order_id uuid,
  p_note_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_note public.work_order_notes%ROWTYPE;
  v_window_hours integer;
BEGIN
  SELECT won.* INTO v_note
  FROM public.work_order_notes won
  JOIN public.work_orders wo ON wo.id = won.work_order_id
  WHERE won.id = p_note_id
    AND won.work_order_id = p_work_order_id
    AND wo.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF public.is_org_admin(p_user_id, p_organization_id)
     OR public.is_work_order_team_manager(p_user_id, p_work_order_id) THEN
    RETURN true;
  END IF;

  IF v_note.author_id IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  SELECT COALESCE(o.note_author_edit_window_hours, 24)
  INTO v_window_hours
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  RETURN v_note.created_at + make_interval(hours => v_window_hours) >= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_object_path_segment_uuid(
  p_object_name text,
  p_segment_index integer
)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN (storage.foldername(p_object_name))[p_segment_index] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (storage.foldername(p_object_name))[p_segment_index]::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.update_equipment_note(
  p_organization_id uuid,
  p_equipment_id uuid,
  p_note_id uuid,
  p_content text DEFAULT NULL,
  p_is_private boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.equipment_notes%ROWTYPE;
  v_changes jsonb := '{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  IF NOT public.can_edit_equipment_note(v_user_id, p_organization_id, p_equipment_id, p_note_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = p_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id
  FOR UPDATE OF en;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF p_content IS NOT NULL AND p_content IS DISTINCT FROM v_note.content THEN
    v_changes := v_changes || jsonb_build_object(
      'content', jsonb_build_object('old', v_note.content, 'new', p_content)
    );
  END IF;

  IF p_is_private IS NOT NULL AND p_is_private IS DISTINCT FROM v_note.is_private THEN
    IF NOT (
      public.is_org_admin(v_user_id, p_organization_id)
      OR public.is_equipment_team_manager(v_user_id, p_equipment_id)
      OR (
        v_note.author_id = v_user_id
        AND NOT public.is_team_viewer_or_requestor(
          v_user_id,
          (SELECT e.team_id FROM public.equipment e WHERE e.id = p_equipment_id)
        )
      )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Permission denied for visibility change');
    END IF;

    v_changes := v_changes || jsonb_build_object(
      'is_private', jsonb_build_object('old', v_note.is_private, 'new', p_is_private)
    );
  END IF;

  IF v_changes = '{}'::jsonb THEN
    RETURN jsonb_build_object('success', true, 'note_id', p_note_id, 'unchanged', true);
  END IF;

  UPDATE public.equipment_notes
  SET
    content = COALESCE(p_content, content),
    is_private = COALESCE(p_is_private, is_private),
    last_modified_by = v_user_id,
    last_modified_at = now(),
    updated_at = now()
  WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'equipment',
    p_equipment_id,
    (SELECT e.name FROM public.equipment e WHERE e.id = p_equipment_id),
    'UPDATE',
    v_changes,
    jsonb_build_object('note_id', p_note_id, 'source', 'equipment_note_editor')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to update note: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_equipment_note(
  p_organization_id uuid,
  p_equipment_id uuid,
  p_note_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.equipment_notes%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = p_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id
  FOR UPDATE OF en;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_equipment_team_manager(v_user_id, p_equipment_id)
    OR v_note.author_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects o
  USING public.equipment_note_images ei
  WHERE ei.equipment_note_id = p_note_id
    AND o.bucket_id = 'equipment-note-images'
    AND o.name = ei.file_url
    AND public.storage_object_path_segment_uuid(o.name, 1) = ei.uploaded_by
    AND public.storage_object_path_segment_uuid(o.name, 2) = p_equipment_id
    AND public.storage_object_path_segment_uuid(o.name, 3) = p_note_id;

  DELETE FROM public.equipment_note_images WHERE equipment_note_id = p_note_id;
  DELETE FROM public.equipment_notes WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'equipment',
    p_equipment_id,
    (SELECT e.name FROM public.equipment e WHERE e.id = p_equipment_id),
    'DELETE',
    jsonb_build_object('note_content', v_note.content),
    jsonb_build_object('note_id', p_note_id, 'source', 'equipment_note_delete')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete note: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_work_order_note(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_note_id uuid,
  p_content text DEFAULT NULL,
  p_is_private boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.work_order_notes%ROWTYPE;
  v_changes jsonb := '{}'::jsonb;
  v_team_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  IF NOT public.can_edit_work_order_note(v_user_id, p_organization_id, p_work_order_id, p_note_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT won.* INTO v_note
  FROM public.work_order_notes won
  JOIN public.work_orders wo ON wo.id = won.work_order_id
  WHERE won.id = p_note_id
    AND won.work_order_id = p_work_order_id
    AND wo.organization_id = p_organization_id
  FOR UPDATE OF won;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF p_content IS NOT NULL AND p_content IS DISTINCT FROM v_note.content THEN
    v_changes := v_changes || jsonb_build_object(
      'content', jsonb_build_object('old', v_note.content, 'new', p_content)
    );
  END IF;

  IF p_is_private IS NOT NULL AND p_is_private IS DISTINCT FROM v_note.is_private THEN
    SELECT wo.team_id INTO v_team_id
    FROM public.work_orders wo
    WHERE wo.id = p_work_order_id;

    IF NOT (
      public.is_org_admin(v_user_id, p_organization_id)
      OR public.is_work_order_team_manager(v_user_id, p_work_order_id)
      OR (
        v_note.author_id = v_user_id
        AND (v_team_id IS NULL OR NOT public.is_team_viewer_or_requestor(v_user_id, v_team_id))
      )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Permission denied for visibility change');
    END IF;

    v_changes := v_changes || jsonb_build_object(
      'is_private', jsonb_build_object('old', v_note.is_private, 'new', p_is_private)
    );
  END IF;

  IF v_changes = '{}'::jsonb THEN
    RETURN jsonb_build_object('success', true, 'note_id', p_note_id, 'unchanged', true);
  END IF;

  UPDATE public.work_order_notes
  SET
    content = COALESCE(p_content, content),
    is_private = COALESCE(p_is_private, is_private),
    last_modified_by = v_user_id,
    last_modified_at = now(),
    updated_at = now()
  WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'work_order',
    p_work_order_id,
    (SELECT wo.title FROM public.work_orders wo WHERE wo.id = p_work_order_id),
    'UPDATE',
    v_changes,
    jsonb_build_object('note_id', p_note_id, 'source', 'work_order_note_editor')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to update note: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_work_order_note(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_note_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_note public.work_order_notes%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT won.* INTO v_note
  FROM public.work_order_notes won
  JOIN public.work_orders wo ON wo.id = won.work_order_id
  WHERE won.id = p_note_id
    AND won.work_order_id = p_work_order_id
    AND wo.organization_id = p_organization_id
  FOR UPDATE OF won;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_work_order_team_manager(v_user_id, p_work_order_id)
    OR v_note.author_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects o
  USING public.work_order_images wi
  WHERE wi.note_id = p_note_id
    AND wi.work_order_id = p_work_order_id
    AND o.bucket_id = 'work-order-images'
    AND o.name = wi.file_url
    AND public.storage_object_path_segment_uuid(o.name, 1) = wi.uploaded_by
    AND public.storage_object_path_segment_uuid(o.name, 2) = p_work_order_id
    AND public.storage_object_path_segment_uuid(o.name, 3) = p_note_id;

  DELETE FROM public.work_order_images
  WHERE note_id = p_note_id AND work_order_id = p_work_order_id;

  DELETE FROM public.work_order_notes WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'work_order',
    p_work_order_id,
    (SELECT wo.title FROM public.work_orders wo WHERE wo.id = p_work_order_id),
    'DELETE',
    jsonb_build_object('note_content', v_note.content),
    jsonb_build_object('note_id', p_note_id, 'source', 'work_order_note_delete')
  );

  RETURN jsonb_build_object('success', true, 'note_id', p_note_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete note: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_equipment_note_image_audited(
  p_organization_id uuid,
  p_equipment_id uuid,
  p_image_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_image public.equipment_note_images%ROWTYPE;
  v_note public.equipment_notes%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT ei.* INTO v_image
  FROM public.equipment_note_images ei
  JOIN public.equipment_notes en ON en.id = ei.equipment_note_id
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE ei.id = p_image_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id
  FOR UPDATE OF ei;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Image not found');
  END IF;

  SELECT en.* INTO v_note
  FROM public.equipment_notes en
  JOIN public.equipment e ON e.id = en.equipment_id
  WHERE en.id = v_image.equipment_note_id
    AND en.equipment_id = p_equipment_id
    AND e.organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_equipment_team_manager(v_user_id, p_equipment_id)
    OR public.can_edit_equipment_note(v_user_id, p_organization_id, p_equipment_id, v_note.id)
    OR v_image.uploaded_by = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'equipment-note-images'
    AND name = v_image.file_url
    AND public.storage_object_path_segment_uuid(name, 1) = v_image.uploaded_by
    AND public.storage_object_path_segment_uuid(name, 2) = p_equipment_id
    AND public.storage_object_path_segment_uuid(name, 3) = v_image.equipment_note_id;

  DELETE FROM public.equipment_note_images WHERE id = p_image_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'equipment',
    p_equipment_id,
    (SELECT e.name FROM public.equipment e WHERE e.id = p_equipment_id),
    'DELETE',
    jsonb_build_object('image_file_name', v_image.file_name),
    jsonb_build_object('note_id', v_note.id, 'image_id', p_image_id, 'source', 'equipment_note_image_delete')
  );

  RETURN jsonb_build_object('success', true, 'image_id', p_image_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete image: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_work_order_note_image_audited(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_image_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_image public.work_order_images%ROWTYPE;
  v_note_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = v_user_id
      AND om.status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT wi.* INTO v_image
  FROM public.work_order_images wi
  JOIN public.work_orders wo ON wo.id = wi.work_order_id
  WHERE wi.id = p_image_id
    AND wi.work_order_id = p_work_order_id
    AND wo.organization_id = p_organization_id
  FOR UPDATE OF wi;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Image not found');
  END IF;

  v_note_id := v_image.note_id;

  IF NOT (
    public.is_org_admin(v_user_id, p_organization_id)
    OR public.is_work_order_team_manager(v_user_id, p_work_order_id)
    OR (v_note_id IS NOT NULL AND public.can_edit_work_order_note(v_user_id, p_organization_id, p_work_order_id, v_note_id))
    OR v_image.uploaded_by = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'work-order-images'
    AND name = v_image.file_url
    AND public.storage_object_path_segment_uuid(name, 1) = v_image.uploaded_by
    AND public.storage_object_path_segment_uuid(name, 2) = p_work_order_id
    AND (v_note_id IS NULL OR public.storage_object_path_segment_uuid(name, 3) = v_note_id);

  DELETE FROM public.work_order_images WHERE id = p_image_id;

  PERFORM public.log_audit_entry(
    p_organization_id,
    'work_order',
    p_work_order_id,
    (SELECT wo.title FROM public.work_orders wo WHERE wo.id = p_work_order_id),
    'DELETE',
    jsonb_build_object('image_file_name', v_image.file_name),
    jsonb_build_object('note_id', v_note_id, 'image_id', p_image_id, 'source', 'work_order_note_image_delete')
  );

  RETURN jsonb_build_object('success', true, 'image_id', p_image_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Failed to delete image: ' || SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.is_equipment_team_manager(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_work_order_team_manager(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_team_viewer_or_requestor(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit_equipment_note(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit_work_order_note(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.storage_object_path_segment_uuid(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_equipment_note(uuid, uuid, uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_equipment_note(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_work_order_note(uuid, uuid, uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_work_order_note(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_equipment_note_image_audited(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_work_order_note_image_audited(uuid, uuid, uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_equipment_team_manager(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_work_order_team_manager(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_team_viewer_or_requestor(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_edit_equipment_note(uuid, uuid, uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.can_edit_work_order_note(uuid, uuid, uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.storage_object_path_segment_uuid(text, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_equipment_note(uuid, uuid, uuid, text, boolean) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_equipment_note(uuid, uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_work_order_note(uuid, uuid, uuid, text, boolean) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_work_order_note(uuid, uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_equipment_note_image_audited(uuid, uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_work_order_note_image_audited(uuid, uuid, uuid) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_equipment_note(uuid, uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_equipment_note(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_work_order_note(uuid, uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_work_order_note(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_equipment_note_image_audited(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_work_order_note_image_audited(uuid, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.update_equipment_note(uuid, uuid, uuid, text, boolean) IS
  'Update equipment note content/visibility with role checks and audit logging. Issue #1185.';
COMMENT ON FUNCTION public.delete_equipment_note(uuid, uuid, uuid) IS
  'Delete equipment note with role checks and audit logging. Issue #1185.';
COMMENT ON FUNCTION public.update_work_order_note(uuid, uuid, uuid, text, boolean) IS
  'Update work order note content/visibility with role checks and audit logging. Issue #1185.';
COMMENT ON FUNCTION public.delete_work_order_note(uuid, uuid, uuid) IS
  'Delete work order note with role checks and audit logging. Issue #1185.';
