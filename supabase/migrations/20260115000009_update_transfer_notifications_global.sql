-- ============================================================================
-- Migration: Update Ownership Transfer Functions to Use Global Notifications
-- 
-- Purpose: Mark ownership transfer notifications as global so users can see
-- them regardless of which organization they're currently viewing.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Update initiate_ownership_transfer to set is_global = true
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initiate_ownership_transfer(
  p_organization_id UUID,
  p_to_user_id UUID,
  p_transfer_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_from_user_id UUID;
  v_from_user_name TEXT;
  v_to_user_name TEXT;
  v_org_name TEXT;
  v_transfer_id UUID;
  v_existing_pending UUID;
BEGIN
  -- Get current user
  v_from_user_id := auth.uid();
  
  IF v_from_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate caller is the current owner
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_from_user_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the current owner can transfer ownership');
  END IF;
  
  -- Validate target is an active admin in the org
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_to_user_id
      AND role = 'admin'
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user must be an active admin in the organization');
  END IF;
  
  -- Check for existing pending transfer
  SELECT id INTO v_existing_pending
  FROM ownership_transfer_requests
  WHERE organization_id = p_organization_id
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;
  
  IF v_existing_pending IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'There is already a pending transfer request for this organization');
  END IF;
  
  -- Get user names
  SELECT name INTO v_from_user_name
  FROM profiles WHERE id = v_from_user_id;
  
  SELECT name INTO v_to_user_name
  FROM profiles WHERE id = p_to_user_id;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_organization_id;
  
  -- Create transfer request
  INSERT INTO ownership_transfer_requests (
    organization_id,
    from_user_id,
    to_user_id,
    from_user_name,
    to_user_name,
    transfer_reason,
    status,
    expires_at
  ) VALUES (
    p_organization_id,
    v_from_user_id,
    p_to_user_id,
    COALESCE(v_from_user_name, 'Unknown'),
    COALESCE(v_to_user_name, 'Unknown'),
    p_transfer_reason,
    'pending',
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_transfer_id;
  
  -- Create notification for target user (GLOBAL - visible across all orgs)
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data,
    is_global
  ) VALUES (
    p_organization_id,
    p_to_user_id,
    'ownership_transfer_request',
    'Ownership Transfer Request',
    v_from_user_name || ' wants to transfer ownership of ' || v_org_name || ' to you.',
    jsonb_build_object(
      'transfer_id', v_transfer_id,
      'organization_id', p_organization_id,
      'organization_name', v_org_name,
      'from_user_id', v_from_user_id,
      'from_user_name', v_from_user_name
    ),
    true  -- Mark as global notification
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'message', 'Transfer request sent to ' || v_to_user_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- PART 2: Update respond_to_ownership_transfer to set is_global = true
-- ============================================================================

CREATE OR REPLACE FUNCTION public.respond_to_ownership_transfer(
  p_transfer_id UUID,
  p_accept BOOLEAN,
  p_departing_owner_role TEXT DEFAULT 'admin',
  p_response_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_transfer RECORD;
  v_current_user_id UUID;
  v_org_name TEXT;
  v_new_org_id UUID;
  v_from_user_email TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get transfer request
  SELECT * INTO v_transfer
  FROM ownership_transfer_requests
  WHERE id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer request not found');
  END IF;
  
  -- Validate caller is the target user
  IF v_transfer.to_user_id != v_current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the target user can respond to this transfer request');
  END IF;
  
  -- Validate request is still pending
  IF v_transfer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request has already been processed');
  END IF;
  
  -- Check if expired
  IF v_transfer.expires_at < NOW() THEN
    UPDATE ownership_transfer_requests
    SET status = 'expired'
    WHERE id = p_transfer_id;
    
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request has expired');
  END IF;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = v_transfer.organization_id;
  
  IF p_accept THEN
    -- === ACCEPT TRANSFER ===
    
    -- Check if departing owner needs a new personal org
    -- (if they don't own any other organization)
    IF NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = v_transfer.from_user_id
        AND om.role = 'owner'
        AND om.status = 'active'
        AND om.organization_id != v_transfer.organization_id
    ) THEN
      -- Get departing owner's email for org name
      SELECT email INTO v_from_user_email
      FROM profiles WHERE id = v_transfer.from_user_id;
      
      -- Create new personal organization for departing owner
      INSERT INTO organizations (name, plan, member_count, max_members, features)
      VALUES (
        v_transfer.from_user_name || '''s Organization',
        'free',
        1,
        5,
        ARRAY['Equipment Management', 'Work Orders', 'Team Management']
      )
      RETURNING id INTO v_new_org_id;
      
      -- Add departing owner as owner of new org
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES (v_new_org_id, v_transfer.from_user_id, 'owner', 'active');
    END IF;
    
    -- Update departing owner's role (or remove them)
    IF p_departing_owner_role = 'remove' THEN
      DELETE FROM organization_members
      WHERE organization_id = v_transfer.organization_id
        AND user_id = v_transfer.from_user_id;
    ELSE
      UPDATE organization_members
      SET role = p_departing_owner_role
      WHERE organization_id = v_transfer.organization_id
        AND user_id = v_transfer.from_user_id;
    END IF;
    
    -- Promote new owner
    UPDATE organization_members
    SET role = 'owner'
    WHERE organization_id = v_transfer.organization_id
      AND user_id = v_transfer.to_user_id;
    
    -- Update transfer request
    UPDATE ownership_transfer_requests
    SET 
      status = 'accepted',
      departing_owner_role = p_departing_owner_role,
      response_reason = p_response_reason,
      responded_at = NOW(),
      completed_at = NOW()
    WHERE id = p_transfer_id;
    
    -- Notify original owner (GLOBAL - visible across all orgs)
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_transfer.organization_id,
      v_transfer.from_user_id,
      'ownership_transfer_accepted',
      'Ownership Transfer Accepted',
      v_transfer.to_user_name || ' has accepted ownership of ' || v_org_name || '.',
      jsonb_build_object(
        'transfer_id', p_transfer_id,
        'organization_id', v_transfer.organization_id,
        'organization_name', v_org_name,
        'new_org_id', v_new_org_id
      ),
      true  -- Mark as global notification
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'You are now the owner of ' || v_org_name,
      'new_personal_org_id', v_new_org_id
    );
    
  ELSE
    -- === REJECT TRANSFER ===
    
    UPDATE ownership_transfer_requests
    SET 
      status = 'rejected',
      response_reason = p_response_reason,
      responded_at = NOW()
    WHERE id = p_transfer_id;
    
    -- Notify original owner (GLOBAL - visible across all orgs)
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      is_global
    ) VALUES (
      v_transfer.organization_id,
      v_transfer.from_user_id,
      'ownership_transfer_rejected',
      'Ownership Transfer Declined',
      v_transfer.to_user_name || ' has declined the ownership transfer for ' || v_org_name || '.',
      jsonb_build_object(
        'transfer_id', p_transfer_id,
        'organization_id', v_transfer.organization_id,
        'organization_name', v_org_name,
        'reason', p_response_reason
      ),
      true  -- Mark as global notification
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Transfer request declined'
    );
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- PART 3: Update cancel_ownership_transfer to set is_global = true
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cancel_ownership_transfer(
  p_transfer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_transfer RECORD;
  v_current_user_id UUID;
  v_org_name TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get transfer request
  SELECT * INTO v_transfer
  FROM ownership_transfer_requests
  WHERE id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer request not found');
  END IF;
  
  -- Validate caller is the initiator (from_user)
  IF v_transfer.from_user_id != v_current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the initiator can cancel this transfer request');
  END IF;
  
  -- Validate request is still pending
  IF v_transfer.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This transfer request has already been processed');
  END IF;
  
  -- Get organization name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = v_transfer.organization_id;
  
  -- Cancel the transfer
  UPDATE ownership_transfer_requests
  SET status = 'cancelled', responded_at = NOW()
  WHERE id = p_transfer_id;
  
  -- Notify target user (GLOBAL - visible across all orgs)
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    data,
    is_global
  ) VALUES (
    v_transfer.organization_id,
    v_transfer.to_user_id,
    'ownership_transfer_cancelled',
    'Ownership Transfer Cancelled',
    v_transfer.from_user_name || ' has cancelled the ownership transfer request for ' || v_org_name || '.',
    jsonb_build_object(
      'transfer_id', p_transfer_id,
      'organization_id', v_transfer.organization_id,
      'organization_name', v_org_name
    ),
    true  -- Mark as global notification
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transfer request cancelled'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMIT;
