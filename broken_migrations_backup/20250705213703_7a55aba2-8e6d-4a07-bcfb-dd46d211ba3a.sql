-- Update the get_organization_slot_availability function to find currently active slots
-- instead of trying to match exact billing periods
CREATE OR REPLACE FUNCTION public.get_organization_slot_availability(org_id uuid)
 RETURNS TABLE(total_purchased integer, used_slots integer, available_slots integer, current_period_start timestamp with time zone, current_period_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_slot_record RECORD;
BEGIN
  -- Find currently active slots (where now() is between start and end dates)
  SELECT 
    COALESCE(SUM(os.purchased_slots), 0)::INTEGER as total_purchased,
    COALESCE(SUM(os.used_slots), 0)::INTEGER as used_slots,
    COALESCE(SUM(os.purchased_slots) - SUM(os.used_slots), 0)::INTEGER as available_slots,
    MIN(os.billing_period_start) as period_start,
    MAX(os.billing_period_end) as period_end
  INTO active_slot_record
  FROM public.organization_slots os
  WHERE os.organization_id = org_id
    AND os.billing_period_start <= now()
    AND os.billing_period_end >= now();
    
  -- Return the values
  total_purchased := COALESCE(active_slot_record.total_purchased, 0);
  used_slots := COALESCE(active_slot_record.used_slots, 0);
  available_slots := COALESCE(active_slot_record.available_slots, 0);
  current_period_start := COALESCE(active_slot_record.period_start, now());
  current_period_end := COALESCE(active_slot_record.period_end, now());
  
  RETURN NEXT;
END;
$function$;