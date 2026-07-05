-- Issue #1121: owner/admin-only backdated note timestamp edits on historical work orders

-- rpc-authenticated-grant-allowed: update_historical_work_order_note_timestamp

CREATE OR REPLACE FUNCTION public.update_historical_work_order_note_timestamp(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_note_id uuid,
  p_created_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_work_order public.work_orders%ROWTYPE;
  v_note public.work_order_notes%ROWTYPE;
  v_old_created_at timestamptz;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is required');
  END IF;

  IF p_created_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note timestamp is required');
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT *
  INTO v_work_order
  FROM public.work_orders
  WHERE id = p_work_order_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  IF NOT v_work_order.is_historical THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      'Note timestamp editing is only allowed for historical work orders'
    );
  END IF;

  SELECT *
  INTO v_note
  FROM public.work_order_notes
  WHERE id = p_note_id
    AND work_order_id = p_work_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Note not found');
  END IF;

  v_old_created_at := v_note.created_at;

  UPDATE public.work_order_notes
  SET
    created_at = p_created_at,
    updated_at = NOW()
  WHERE id = p_note_id;

  PERFORM public.log_audit_entry(
    v_work_order.organization_id,
    'work_order',
    p_work_order_id,
    v_work_order.title,
    'UPDATE',
    jsonb_build_object(
      'note_timestamp', jsonb_build_object(
        'old', v_old_created_at,
        'new', p_created_at
      )
    ),
    jsonb_build_object(
      'note_id', p_note_id,
      'source', 'historical_note_timestamp_editor'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', p_work_order_id,
    'note_id', p_note_id,
    'created_at', p_created_at
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to update note timestamp: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_historical_work_order_note_timestamp(uuid, uuid, uuid, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.update_historical_work_order_note_timestamp(uuid, uuid, uuid, timestamptz)
IS 'Owner/admin-only backdated note timestamp edits for historical work orders with audit logging. Issue #1121.';
