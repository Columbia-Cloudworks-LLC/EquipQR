-- Harden delete_work_order_cascade: storage cleanup failures must not block row deletion (#1130).

CREATE OR REPLACE FUNCTION public.delete_work_order_cascade(p_work_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.work_orders
  WHERE id = p_work_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order not found');
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.work_orders
  SET primary_image_id = NULL
  WHERE id = p_work_order_id;

  BEGIN
    DELETE FROM storage.objects o
    USING public.work_order_images wi
    WHERE wi.work_order_id = p_work_order_id
      AND o.bucket_id = 'work-order-images'
      AND o.name = wi.file_url
      AND (storage.foldername(o.name))[2] = p_work_order_id::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'delete_work_order_cascade storage cleanup failed for %: %',
      p_work_order_id, SQLERRM;
  END;

  DELETE FROM public.work_order_images WHERE work_order_id = p_work_order_id;
  DELETE FROM public.preventative_maintenance WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_notes WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_costs WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_status_history WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_order_equipment WHERE work_order_id = p_work_order_id;
  DELETE FROM public.quickbooks_export_logs WHERE work_order_id = p_work_order_id;
  DELETE FROM public.work_orders WHERE id = p_work_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', p_work_order_id,
    'organization_id', v_org_id
  );
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'delete_work_order_cascade failed for %: %', p_work_order_id, SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', 'Deletion failed');
END;
$$;

COMMENT ON FUNCTION public.delete_work_order_cascade(uuid) IS
  'Permanently deletes a work order, related rows, and storage objects. Org owners/admins only. Storage cleanup is best-effort and scoped to objects under the work order folder.';
