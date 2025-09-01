-- Fix the get_organization_slot_availability function to count actual active members
CREATE OR REPLACE FUNCTION public.get_organization_slot_availability(org_id uuid)
 RETURNS TABLE(total_purchased integer, used_slots integer, available_slots integer, current_period_start timestamp with time zone, current_period_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_slot_record RECORD;
  actual_used_slots INTEGER;
BEGIN
  -- Find currently active slots (where now() is between start and end dates)
  SELECT 
    COALESCE(SUM(os.purchased_slots), 0)::INTEGER as total_purchased,
    MIN(os.billing_period_start) as period_start,
    MAX(os.billing_period_end) as period_end
  INTO active_slot_record
  FROM public.organization_slots os
  WHERE os.organization_id = org_id
    AND os.billing_period_start <= now()
    AND os.billing_period_end >= now();
    
  -- Count actual active members (excluding owners from billing)
  SELECT COUNT(*)::INTEGER INTO actual_used_slots
  FROM public.organization_members om
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member'); -- Exclude owners from slot usage
    
  -- Return the values with proper calculation
  total_purchased := COALESCE(active_slot_record.total_purchased, 0);
  used_slots := actual_used_slots;
  available_slots := GREATEST(0, total_purchased - actual_used_slots); -- Ensure never negative
  current_period_start := COALESCE(active_slot_record.period_start, now());
  current_period_end := COALESCE(active_slot_record.period_end, now());
  
  RETURN NEXT;
END;
$function$