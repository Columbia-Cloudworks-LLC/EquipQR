-- Scope replace_historical_work_order_timeline by organization_id (PR #1098 / Qodo)

DROP FUNCTION IF EXISTS public.replace_historical_work_order_timeline(uuid, jsonb, boolean);

-- rpc-authenticated-grant-allowed: replace_historical_work_order_timeline

CREATE OR REPLACE FUNCTION public.replace_historical_work_order_timeline(
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
  v_event jsonb;
  v_event_count integer;
  v_index integer;
  v_previous_status public.work_order_status;
  v_old_status public.work_order_status;
  v_new_status public.work_order_status;
  v_changed_at timestamptz;
  v_reason text;
  v_assignee_id uuid;
  v_allowed public.work_order_status[];
  v_last_changed_at timestamptz;
  v_acceptance_date timestamptz;
  v_completed_date timestamptz;
  v_assignee public.work_orders.assignee_id%TYPE;
  v_metadata jsonb;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization is required');
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

  IF NOT v_work_order.is_historical THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline editing is only allowed for historical work orders');
  END IF;

  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Timeline events are required');
  END IF;

  v_event_count := jsonb_array_length(p_events);
  v_previous_status := NULL;
  v_last_changed_at := NULL;
  v_acceptance_date := NULL;
  v_completed_date := NULL;
  v_assignee := NULL;

  FOR v_index IN 0..(v_event_count - 1) LOOP
    v_event := p_events -> v_index;
    v_old_status := NULLIF(v_event ->> 'old_status', '')::public.work_order_status;
    v_new_status := NULLIF(v_event ->> 'new_status', '')::public.work_order_status;
    v_changed_at := NULLIF(v_event ->> 'changed_at', '')::timestamptz;
    v_reason := NULLIF(v_event ->> 'reason', '');
    v_assignee_id := NULLIF(v_event ->> 'assignee_id', '')::uuid;

    IF v_new_status IS NULL OR v_changed_at IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Each timeline event requires new_status and changed_at');
    END IF;

    IF v_index = 0 AND v_new_status <> 'submitted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline must begin with submitted');
    END IF;

    IF v_old_status IS DISTINCT FROM v_previous_status THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline event chain is inconsistent');
    END IF;

    IF v_previous_status IS NULL THEN
      IF v_old_status IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'First timeline event must start from created state');
      END IF;
    ELSE
      v_allowed := public.historical_timeline_allowed_next_statuses(v_previous_status);
      IF NOT (v_new_status = ANY (v_allowed)) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Invalid transition from %s to %s', v_previous_status, v_new_status)
        );
      END IF;
    END IF;

    IF v_new_status = 'assigned' AND v_assignee_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assigned events require an assignee');
    END IF;

    IF v_assignee_id IS NOT NULL
       AND NOT public.is_valid_work_order_assignee(
         v_work_order.equipment_id,
         v_work_order.organization_id,
         v_assignee_id
       ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Assignee is not valid for this work order');
    END IF;

    IF v_last_changed_at IS NOT NULL AND v_changed_at < v_last_changed_at THEN
      RETURN jsonb_build_object('success', false, 'error', 'Timeline events must be in chronological order');
    END IF;

    IF v_new_status = 'accepted'
       OR (v_new_status IN ('assigned', 'in_progress') AND v_assignee_id IS NOT NULL) THEN
      v_acceptance_date := COALESCE(v_acceptance_date, v_changed_at);
    END IF;

    IF v_new_status = 'assigned' AND v_assignee_id IS NOT NULL THEN
      v_assignee := v_assignee_id;
    END IF;

    IF v_new_status = 'completed' THEN
      v_completed_date := v_changed_at;
    ELSIF v_new_status IN ('submitted', 'accepted', 'assigned', 'in_progress', 'on_hold') THEN
      v_completed_date := NULL;
    END IF;

    v_previous_status := v_new_status;
    v_last_changed_at := v_changed_at;
  END LOOP;

  DELETE FROM public.work_order_status_history
  WHERE work_order_id = p_work_order_id;

  v_previous_status := NULL;

  FOR v_index IN 0..(v_event_count - 1) LOOP
    v_event := p_events -> v_index;
    v_old_status := NULLIF(v_event ->> 'old_status', '')::public.work_order_status;
    v_new_status := NULLIF(v_event ->> 'new_status', '')::public.work_order_status;
    v_changed_at := NULLIF(v_event ->> 'changed_at', '')::timestamptz;
    v_reason := COALESCE(NULLIF(v_event ->> 'reason', ''), 'Historical status recorded');
    v_assignee_id := NULLIF(v_event ->> 'assignee_id', '')::uuid;

    v_metadata := '{}'::jsonb;
    IF v_new_status = 'assigned' AND v_assignee_id IS NOT NULL THEN
      v_metadata := jsonb_build_object('assignee_id', v_assignee_id);
    END IF;

    INSERT INTO public.work_order_status_history (
      work_order_id,
      old_status,
      new_status,
      changed_by,
      changed_at,
      reason,
      metadata,
      is_historical_creation
    ) VALUES (
      p_work_order_id,
      v_old_status,
      v_new_status,
      auth.uid(),
      v_changed_at,
      v_reason,
      v_metadata,
      true
    );

    v_previous_status := v_new_status;
  END LOOP;

  PERFORM set_config('equipqr.skip_work_order_status_log', 'true', true);

  UPDATE public.work_orders
  SET
    status = v_previous_status,
    assignee_id = v_assignee,
    created_date = (p_events -> 0 ->> 'changed_at')::timestamptz,
    historical_start_date = (p_events -> 0 ->> 'changed_at')::timestamptz,
    acceptance_date = v_acceptance_date,
    completed_date = v_completed_date,
    updated_at = NOW()
  WHERE id = p_work_order_id;

  PERFORM set_config('equipqr.skip_work_order_status_log', 'false', true);

  IF NOT p_skip_audit THEN
    PERFORM public.log_audit_entry(
      v_work_order.organization_id,
      'work_order',
      p_work_order_id,
      v_work_order.title,
      'UPDATE',
      jsonb_build_object(
        'timeline', jsonb_build_object(
          'old', NULL,
          'new', jsonb_build_object('event_count', v_event_count)
        )
      ),
      jsonb_build_object(
        'timeline_replaced', true,
        'event_count', v_event_count,
        'source', 'historical_timeline_editor'
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', p_work_order_id,
    'event_count', v_event_count,
    'status', v_previous_status
  );

EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('equipqr.skip_work_order_status_log', 'false', true);
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to replace historical timeline: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_historical_work_order_timeline(uuid, uuid, jsonb, boolean) TO authenticated;

COMMENT ON FUNCTION public.replace_historical_work_order_timeline(uuid, uuid, jsonb, boolean)
IS 'Owner/admin-only replacement of backdated historical work order timeline events with explicit organization scoping. Issue #1080, #1098.';

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

  BEGIN
    UPDATE public.work_orders
    SET
      is_historical = true,
      historical_start_date = COALESCE(
        historical_start_date,
        (p_events -> 0 ->> 'changed_at')::timestamptz
      )
    WHERE id = p_work_order_id;

    v_replace_result := public.replace_historical_work_order_timeline(
      p_work_order_id,
      p_organization_id,
      p_events,
      p_skip_audit
    );

    IF COALESCE((v_replace_result ->> 'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = COALESCE(v_replace_result ->> 'error', 'Failed to replace historical timeline');
    END IF;
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      RETURN COALESCE(
        v_replace_result,
        jsonb_build_object('success', false, 'error', 'Failed to replace historical timeline')
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to convert work order to historical'
      );
  END;

  RETURN v_replace_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_historical_work_order_with_pm(
  p_organization_id uuid,
  p_equipment_id uuid,
  p_title text,
  p_description text,
  p_priority public.work_order_priority,
  p_status public.work_order_status,
  p_historical_start_date timestamptz,
  p_historical_notes text DEFAULT NULL,
  p_assignee_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_due_date timestamptz DEFAULT NULL,
  p_completed_date timestamptz DEFAULT NULL,
  p_has_pm boolean DEFAULT false,
  p_pm_status text DEFAULT 'pending',
  p_pm_completion_date timestamptz DEFAULT NULL,
  p_pm_notes text DEFAULT NULL,
  p_pm_checklist_data jsonb DEFAULT '[]'::jsonb,
  p_timeline_events jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  work_order_id uuid;
  pm_id uuid;
  result jsonb;
  default_checklist jsonb;
  v_timeline_events jsonb;
  v_replace_result jsonb;
BEGIN
  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  v_timeline_events := COALESCE(
    p_timeline_events,
    public.synthesize_historical_timeline_events(
      p_historical_start_date,
      p_completed_date,
      p_status,
      p_assignee_id
    )
  );

  INSERT INTO public.work_orders (
    organization_id,
    equipment_id,
    title,
    description,
    priority,
    status,
    assignee_id,
    team_id,
    due_date,
    completed_date,
    has_pm,
    is_historical,
    historical_start_date,
    historical_notes,
    created_by_admin,
    created_by,
    created_date
  ) VALUES (
    p_organization_id,
    p_equipment_id,
    p_title,
    p_description,
    p_priority,
    p_status,
    p_assignee_id,
    p_team_id,
    p_due_date,
    p_completed_date,
    p_has_pm,
    true,
    p_historical_start_date,
    p_historical_notes,
    auth.uid(),
    auth.uid(),
    p_historical_start_date
  ) RETURNING id INTO work_order_id;

  IF p_has_pm THEN
    IF p_pm_checklist_data IS NULL OR jsonb_array_length(p_pm_checklist_data) = 0 THEN
      default_checklist := '[
        {"id": "visual_001", "title": "Mast and Forks", "description": "Check mast for damage, cracks, or bent components. Inspect forks for cracks, bends, or excessive wear.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_002", "title": "Hydraulic System", "description": "Check for hydraulic fluid leaks around cylinders, hoses, and fittings.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_003", "title": "Tires and Wheels", "description": "Inspect tires for wear, cuts, or embedded objects. Check wheel bolts for tightness.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_004", "title": "Overhead Guard", "description": "Check overhead guard for damage, cracks, or loose bolts.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "visual_005", "title": "Load Backrest", "description": "Inspect load backrest for damage and proper attachment.", "condition": "good", "required": true, "section": "Visual Inspection", "completed": false},
        {"id": "engine_001", "title": "Engine Oil Level", "description": "Check engine oil level and top off if necessary. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_002", "title": "Coolant Level", "description": "Check radiator coolant level and condition. Look for leaks.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_003", "title": "Air Filter", "description": "Inspect air filter for dirt and debris. Replace if necessary.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_004", "title": "Belt Condition", "description": "Check drive belts for proper tension, cracks, or fraying.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "engine_005", "title": "Battery", "description": "Check battery terminals for corrosion and ensure secure connections.", "condition": "good", "required": true, "section": "Engine Compartment", "completed": false},
        {"id": "electrical_001", "title": "Warning Lights", "description": "Test all warning lights and indicators on the dashboard.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
        {"id": "electrical_002", "title": "Horn", "description": "Test horn operation for proper sound and function.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
        {"id": "electrical_003", "title": "Work Lights", "description": "Test all work lights for proper operation.", "condition": "good", "required": true, "section": "Electrical Inspection", "completed": false},
        {"id": "operational_001", "title": "Steering", "description": "Test steering for smooth operation and proper response.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "operational_002", "title": "Brakes", "description": "Test service and parking brake operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "operational_003", "title": "Hydraulic Functions", "description": "Test lift, lower, tilt, and side shift functions for smooth operation.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "operational_004", "title": "Transmission", "description": "Test forward and reverse operation for smooth engagement.", "condition": "good", "required": true, "section": "Operational Check", "completed": false},
        {"id": "safety_001", "title": "Seat Belt", "description": "Check seat belt for proper operation and condition.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
        {"id": "safety_002", "title": "Dead Man Switch", "description": "Test operator presence system and dead man switch.", "condition": "good", "required": true, "section": "Safety Features", "completed": false},
        {"id": "safety_003", "title": "Load Capacity Plate", "description": "Verify load capacity plate is visible and legible.", "condition": "good", "required": true, "section": "Safety Features", "completed": false}
      ]'::jsonb;
    ELSE
      default_checklist := p_pm_checklist_data;
    END IF;

    INSERT INTO public.preventative_maintenance (
      work_order_id,
      equipment_id,
      organization_id,
      status,
      completed_at,
      completed_by,
      notes,
      checklist_data,
      is_historical,
      historical_completion_date,
      historical_notes,
      created_by
    ) VALUES (
      work_order_id,
      p_equipment_id,
      p_organization_id,
      p_pm_status,
      CASE WHEN p_pm_status = 'completed' THEN COALESCE(p_pm_completion_date, p_completed_date) ELSE NULL END,
      CASE WHEN p_pm_status = 'completed' THEN auth.uid() ELSE NULL END,
      p_pm_notes,
      default_checklist,
      true,
      p_pm_completion_date,
      CONCAT('Historical PM - ', p_pm_notes),
      auth.uid()
    ) RETURNING id INTO pm_id;
  END IF;

  v_replace_result := public.replace_historical_work_order_timeline(
    work_order_id,
    p_organization_id,
    v_timeline_events,
    true
  );

  IF COALESCE((v_replace_result ->> 'success')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Failed to initialize historical timeline: %', COALESCE(v_replace_result ->> 'error', 'unknown error');
  END IF;

  result := jsonb_build_object(
    'success', true,
    'work_order_id', work_order_id,
    'pm_id', pm_id,
    'has_pm', p_has_pm
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to create historical work order: ' || SQLERRM
  );
END;
$$;
