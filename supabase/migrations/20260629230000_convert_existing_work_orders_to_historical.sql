-- Issue #1093: Convert existing operational work orders to historical records
-- so admins can backdate operational timelines on completed work orders.

-- rpc-authenticated-grant-allowed: convert_work_order_to_historical

CREATE OR REPLACE FUNCTION public.convert_work_order_to_historical(
  p_work_order_id uuid,
  p_organization_id uuid,
  p_events jsonb,
  p_skip_audit boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_work_order public.work_orders%ROWTYPE;
  v_replace_result jsonb;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is required');
  END IF;

  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline events are required');
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

  IF NOT public.is_org_admin(auth.uid(), v_work_order.organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  IF v_work_order.is_historical THEN
    RETURN jsonb_build_object('success', false, 'error', 'Work order is already historical');
  END IF;

  UPDATE public.work_orders
  SET
    is_historical = true,
    historical_start_date = COALESCE(
      historical_start_date,
      (p_events -> 0 ->> 'changed_at')::timestamptz
    ),
    updated_at = NOW()
  WHERE id = p_work_order_id;

  v_replace_result := public.replace_historical_work_order_timeline(
    p_work_order_id,
    p_events,
    p_skip_audit
  );

  IF COALESCE((v_replace_result ->> 'success')::boolean, false) IS NOT TRUE THEN
    UPDATE public.work_orders
    SET
      is_historical = v_work_order.is_historical,
      historical_start_date = v_work_order.historical_start_date,
      updated_at = v_work_order.updated_at
    WHERE id = p_work_order_id;

    RETURN v_replace_result;
  END IF;

  RETURN v_replace_result;

EXCEPTION WHEN OTHERS THEN
  IF v_work_order.id IS NOT NULL THEN
    UPDATE public.work_orders
    SET
      is_historical = v_work_order.is_historical,
      historical_start_date = v_work_order.historical_start_date,
      updated_at = v_work_order.updated_at
    WHERE id = p_work_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to convert work order to historical: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_work_order_to_historical(uuid, uuid, jsonb, boolean) TO authenticated;

COMMENT ON FUNCTION public.convert_work_order_to_historical(uuid, uuid, jsonb, boolean)
IS 'Admin-only conversion of an existing operational work order to a historical record with backdated timeline. Issue #1093.';
