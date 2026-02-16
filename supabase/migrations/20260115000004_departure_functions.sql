-- ============================================================================
-- Migration: User Departure and Batch Processing Functions
-- 
-- Purpose: Implement functions for leaving organizations and batch processing
-- user departures to denormalize names in historical records.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Leave Organization Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.leave_organization(
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_role TEXT;
  v_org_name TEXT;
  v_queue_id UUID;
  v_notes_count INTEGER;
  v_scans_count INTEGER;
  v_status_history_count INTEGER;
  v_costs_count INTEGER;
  v_transactions_count INTEGER;
  v_pm_count INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get user's role in this organization
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_current_user_id
    AND status = 'active';
  
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this organization');
  END IF;
  
  -- Owners cannot leave - they must transfer ownership first
  IF v_user_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Owners cannot leave the organization. Transfer ownership first.');
  END IF;
  
  -- Get user details
  SELECT name, email INTO v_user_name, v_user_email
  FROM profiles WHERE id = v_current_user_id;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  -- Count records that need denormalization
  SELECT COUNT(*) INTO v_notes_count
  FROM notes n
  JOIN equipment e ON e.id = n.equipment_id
  WHERE n.author_id = v_current_user_id
    AND e.organization_id = p_organization_id
    AND n.author_name IS NULL;
  
  SELECT COUNT(*) INTO v_scans_count
  FROM scans s
  JOIN equipment e ON e.id = s.equipment_id
  WHERE s.scanned_by = v_current_user_id
    AND e.organization_id = p_organization_id
    AND s.scanned_by_name IS NULL;
  
  SELECT COUNT(*) INTO v_status_history_count
  FROM work_order_status_history wosh
  JOIN work_orders wo ON wo.id = wosh.work_order_id
  WHERE wosh.changed_by = v_current_user_id
    AND wo.organization_id = p_organization_id
    AND wosh.changed_by_name IS NULL;
  
  SELECT COUNT(*) INTO v_costs_count
  FROM work_order_costs woc
  JOIN work_orders wo ON wo.id = woc.work_order_id
  WHERE woc.created_by = v_current_user_id
    AND wo.organization_id = p_organization_id
    AND woc.created_by_name IS NULL;
  
  SELECT COUNT(*) INTO v_transactions_count
  FROM inventory_transactions it
  JOIN inventory_items ii ON ii.id = it.inventory_item_id
  WHERE it.user_id = v_current_user_id
    AND ii.organization_id = p_organization_id
    AND it.user_name IS NULL;
  
  SELECT COUNT(*) INTO v_pm_count
  FROM preventative_maintenance pm
  WHERE (pm.created_by = v_current_user_id OR pm.completed_by = v_current_user_id)
    AND pm.organization_id = p_organization_id
    AND (pm.created_by_name IS NULL OR pm.completed_by_name IS NULL);
  
  -- Create departure queue entry if there are records to process
  IF (v_notes_count + v_scans_count + v_status_history_count + v_costs_count + v_transactions_count + v_pm_count) > 0 THEN
    INSERT INTO user_departure_queue (
      organization_id,
      user_id,
      user_name,
      user_email,
      status,
      tables_to_process
    ) VALUES (
      p_organization_id,
      v_current_user_id,
      COALESCE(v_user_name, v_user_email, 'Unknown'),
      COALESCE(v_user_email, 'unknown@unknown.com'),
      'pending',
      jsonb_build_object(
        'notes', jsonb_build_object('total', v_notes_count, 'processed', 0),
        'scans', jsonb_build_object('total', v_scans_count, 'processed', 0),
        'work_order_status_history', jsonb_build_object('total', v_status_history_count, 'processed', 0),
        'work_order_costs', jsonb_build_object('total', v_costs_count, 'processed', 0),
        'inventory_transactions', jsonb_build_object('total', v_transactions_count, 'processed', 0),
        'preventative_maintenance', jsonb_build_object('total', v_pm_count, 'processed', 0)
      )
    )
    RETURNING id INTO v_queue_id;
  END IF;
  
  -- Create audit record
  INSERT INTO member_removal_audit (
    organization_id,
    removed_user_id,
    removed_user_name,
    removed_user_role,
    removed_by,
    removal_reason,
    metadata
  ) VALUES (
    p_organization_id,
    v_current_user_id,
    COALESCE(v_user_name, v_user_email, 'Unknown'),
    v_user_role,
    v_current_user_id, -- Self-removal
    'User left organization voluntarily',
    jsonb_build_object(
      'departure_queue_id', v_queue_id,
      'records_to_denormalize', v_notes_count + v_scans_count + v_status_history_count + v_costs_count + v_transactions_count + v_pm_count
    )
  );
  
  -- Remove from team_members first (to avoid FK issues)
  DELETE FROM team_members
  WHERE user_id = v_current_user_id
    AND team_id IN (
      SELECT id FROM teams WHERE organization_id = p_organization_id
    );
  
  -- Remove from parts_managers
  DELETE FROM parts_managers
  WHERE user_id = v_current_user_id
    AND organization_id = p_organization_id;
  
  -- Remove from notification_settings
  DELETE FROM notification_settings
  WHERE user_id = v_current_user_id
    AND organization_id = p_organization_id;
  
  -- Finally remove from organization_members
  DELETE FROM organization_members
  WHERE user_id = v_current_user_id
    AND organization_id = p_organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'You have left ' || v_org_name,
    'departure_queue_id', v_queue_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.leave_organization(UUID) IS 
  'Leave an organization. Queues departure for batch denormalization processing.';

-- ============================================================================
-- PART 2: Process Single Departure Batch
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_departure_batch(
  p_queue_id UUID,
  p_batch_size INTEGER DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_queue RECORD;
  v_tables_status JSONB;
  v_rows_updated INTEGER;
  v_all_complete BOOLEAN := true;
  v_table_name TEXT;
  v_processed INTEGER;
  v_total INTEGER;
BEGIN
  -- Lock the queue entry
  SELECT * INTO v_queue
  FROM user_departure_queue
  WHERE id = p_queue_id
  FOR UPDATE SKIP LOCKED;
  
  IF v_queue IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Queue entry not found or locked');
  END IF;
  
  IF v_queue.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already completed');
  END IF;
  
  v_tables_status := v_queue.tables_to_process;
  
  -- Mark as processing
  UPDATE user_departure_queue
  SET status = 'processing', started_at = COALESCE(started_at, NOW())
  WHERE id = p_queue_id;
  
  -- Process each table
  FOR v_table_name IN SELECT jsonb_object_keys(v_tables_status)
  LOOP
    v_processed := (v_tables_status->v_table_name->>'processed')::int;
    v_total := (v_tables_status->v_table_name->>'total')::int;
    
    -- Skip if already complete
    IF v_processed >= v_total THEN
      CONTINUE;
    END IF;
    
    v_all_complete := false;
    v_rows_updated := 0;
    
    -- Process batch for this table
    CASE v_table_name
      WHEN 'notes' THEN
        WITH updated AS (
          UPDATE notes n
          SET author_name = v_queue.user_name
          FROM equipment e
          WHERE n.equipment_id = e.id
            AND n.author_id = v_queue.user_id
            AND e.organization_id = v_queue.organization_id
            AND n.author_name IS NULL
          RETURNING n.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'scans' THEN
        WITH updated AS (
          UPDATE scans s
          SET scanned_by_name = v_queue.user_name
          FROM equipment e
          WHERE s.equipment_id = e.id
            AND s.scanned_by = v_queue.user_id
            AND e.organization_id = v_queue.organization_id
            AND s.scanned_by_name IS NULL
          RETURNING s.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'work_order_status_history' THEN
        WITH updated AS (
          UPDATE work_order_status_history wosh
          SET changed_by_name = v_queue.user_name
          FROM work_orders wo
          WHERE wosh.work_order_id = wo.id
            AND wosh.changed_by = v_queue.user_id
            AND wo.organization_id = v_queue.organization_id
            AND wosh.changed_by_name IS NULL
          RETURNING wosh.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'work_order_costs' THEN
        WITH updated AS (
          UPDATE work_order_costs woc
          SET created_by_name = v_queue.user_name
          FROM work_orders wo
          WHERE woc.work_order_id = wo.id
            AND woc.created_by = v_queue.user_id
            AND wo.organization_id = v_queue.organization_id
            AND woc.created_by_name IS NULL
          RETURNING woc.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'inventory_transactions' THEN
        WITH updated AS (
          UPDATE inventory_transactions it
          SET user_name = v_queue.user_name
          FROM inventory_items ii
          WHERE it.inventory_item_id = ii.id
            AND it.user_id = v_queue.user_id
            AND ii.organization_id = v_queue.organization_id
            AND it.user_name IS NULL
          RETURNING it.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated;
        
      WHEN 'preventative_maintenance' THEN
        -- Update created_by_name
        WITH updated_created AS (
          UPDATE preventative_maintenance pm
          SET created_by_name = v_queue.user_name
          WHERE pm.created_by = v_queue.user_id
            AND pm.organization_id = v_queue.organization_id
            AND pm.created_by_name IS NULL
          RETURNING pm.id
        )
        SELECT COUNT(*) INTO v_rows_updated FROM updated_created;
        
        -- Also update completed_by_name
        UPDATE preventative_maintenance pm
        SET completed_by_name = v_queue.user_name
        WHERE pm.completed_by = v_queue.user_id
          AND pm.organization_id = v_queue.organization_id
          AND pm.completed_by_name IS NULL;
        
      ELSE
        v_rows_updated := 0;
    END CASE;
    
    -- Update progress
    v_tables_status := jsonb_set(
      v_tables_status,
      ARRAY[v_table_name, 'processed'],
      to_jsonb(v_processed + v_rows_updated)
    );
    
    -- If we processed rows, we're not done yet
    IF v_rows_updated > 0 THEN
      v_all_complete := false;
    END IF;
  END LOOP;
  
  -- Re-check if all complete
  v_all_complete := true;
  FOR v_table_name IN SELECT jsonb_object_keys(v_tables_status)
  LOOP
    v_processed := (v_tables_status->v_table_name->>'processed')::int;
    v_total := (v_tables_status->v_table_name->>'total')::int;
    IF v_processed < v_total THEN
      v_all_complete := false;
      EXIT;
    END IF;
  END LOOP;
  
  -- Update queue entry
  UPDATE user_departure_queue
  SET 
    tables_to_process = v_tables_status,
    last_batch_at = NOW(),
    status = CASE WHEN v_all_complete THEN 'completed' ELSE 'processing' END,
    completed_at = CASE WHEN v_all_complete THEN NOW() ELSE NULL END
  WHERE id = p_queue_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'all_complete', v_all_complete,
    'progress', v_tables_status
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Mark as failed
  UPDATE user_departure_queue
  SET status = 'failed', error_message = SQLERRM, retry_count = retry_count + 1
  WHERE id = p_queue_id;
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.process_departure_batch(UUID, INTEGER) IS 
  'Process a batch of records for a user departure. Updates denormalized name columns.';

-- ============================================================================
-- PART 3: Process All Pending Departures (for pg_cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_all_pending_departures()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_queue_record RECORD;
  v_processed_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Process up to 10 queue entries per run
  FOR v_queue_record IN
    SELECT id
    FROM user_departure_queue
    WHERE status IN ('pending', 'processing')
      AND (retry_count < 5 OR retry_count IS NULL)
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    v_result := process_departure_batch(v_queue_record.id, 1000);
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'queues_processed', v_processed_count
  );
END;
$$;

COMMENT ON FUNCTION public.process_all_pending_departures() IS 
  'Process all pending user departures. Called by pg_cron every 5 minutes.';

COMMIT;
