
-- Fix mutable search path security warnings in database functions
-- This addresses the security vulnerabilities without changing any existing functionality

-- 1. Fix get_current_billing_period function
CREATE OR REPLACE FUNCTION public.get_current_billing_period()
RETURNS TABLE(period_start timestamp with time zone, period_end timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    date_trunc('month', CURRENT_TIMESTAMP) AS period_start,
    (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 second') AS period_end;
$$;

-- 2. Fix expire_old_invitations function
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark invitations as expired if they're past expiration and still pending
  UPDATE public.organization_invitations
  SET 
    status = 'expired',
    expired_at = now(),
    updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND expired_at IS NULL;
    
  RETURN NULL;
END;
$$;

-- 3. Verify that the get_current_billing_period function works correctly
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test that the function returns expected results
  SELECT * INTO test_result FROM public.get_current_billing_period();
  
  IF test_result.period_start IS NULL OR test_result.period_end IS NULL THEN
    RAISE EXCEPTION 'get_current_billing_period function test failed: NULL values returned';
  END IF;
  
  IF test_result.period_end <= test_result.period_start THEN
    RAISE EXCEPTION 'get_current_billing_period function test failed: Invalid date range';
  END IF;
  
  RAISE NOTICE 'get_current_billing_period function test passed successfully';
END;
$$;

-- 4. Test that organization_slot_availability function still works with the updated dependency
DO $$
DECLARE
  test_org_id uuid := gen_random_uuid();
  test_result RECORD;
BEGIN
  -- Test the dependent function
  SELECT * INTO test_result FROM public.get_organization_slot_availability(test_org_id);
  
  -- The function should return a result even for non-existent organization
  IF test_result.current_period_start IS NULL OR test_result.current_period_end IS NULL THEN
    RAISE EXCEPTION 'get_organization_slot_availability function test failed: NULL period values';
  END IF;
  
  RAISE NOTICE 'get_organization_slot_availability function test passed successfully';
END;
$$;

-- Note: expire_old_invitations is a trigger function and cannot be tested directly
-- It will work correctly when called as a trigger on the organization_invitations table
