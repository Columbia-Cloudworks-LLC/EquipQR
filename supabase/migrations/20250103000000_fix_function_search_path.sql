-- Fix Function Search Path Security Issue
-- Addresses Supabase Security Advisor warnings about mutable search_path
-- Issue: Functions should have search_path parameter set for security
-- Generated: 2025-01-03

BEGIN;

-- =============================================================================
-- Fix Function Search Path Issues
-- Add SET search_path = '' to all functions flagged by Security Advisor
-- =============================================================================

-- Fix cleanup_old_notifications function
CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < (now() - interval '7 days');
END;
$function$;

-- Fix get_user_teams_for_notifications function
CREATE OR REPLACE FUNCTION "public"."get_user_teams_for_notifications"(user_uuid uuid)
RETURNS TABLE(organization_id uuid, organization_name text, team_id uuid, team_name text, user_role text, has_access boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    t.id as team_id,
    t.name as team_name,
    COALESCE(tm.role::text, om.role) as user_role,
    CASE 
      WHEN om.role IN ('owner', 'admin') THEN true
      WHEN tm.role IN ('technician', 'requestor', 'manager') THEN true
      ELSE false
    END as has_access
  FROM public.organizations o
  JOIN public.organization_members om ON o.id = om.organization_id
  JOIN public.teams t ON o.id = t.organization_id
  LEFT JOIN public.team_members tm ON t.id = tm.team_id AND tm.user_id = user_uuid
  WHERE om.user_id = user_uuid
    AND om.status = 'active'
    AND (
      om.role IN ('owner', 'admin') OR 
      tm.role IN ('technician', 'requestor', 'manager')
    )
  ORDER BY o.name, t.name;
END;
$function$;

-- Fix update_notification_settings_updated_at function
CREATE OR REPLACE FUNCTION "public"."update_notification_settings_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix should_notify_user_for_work_order function
CREATE OR REPLACE FUNCTION "public"."should_notify_user_for_work_order"(user_uuid uuid, work_order_team_id uuid, work_order_status text, organization_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  notification_enabled boolean := false;
  status_enabled boolean := false;
BEGIN
  -- Check if user has notification settings for this team
  SELECT 
    ns.enabled,
    (ns.statuses @> to_jsonb(ARRAY[work_order_status]))
  INTO notification_enabled, status_enabled
  FROM public.notification_settings ns
  WHERE ns.user_id = user_uuid 
    AND ns.team_id = work_order_team_id
    AND ns.organization_id = organization_uuid;
  
  -- If no settings found, default to false (opt-in)
  IF notification_enabled IS NULL THEN
    RETURN false;
  END IF;
  
  -- Return true only if notifications are enabled AND the specific status is enabled
  RETURN notification_enabled AND status_enabled;
END;
$function$;

-- Fix create_work_order_notifications function
CREATE OR REPLACE FUNCTION "public"."create_work_order_notifications"(work_order_uuid uuid, new_status text, changed_by_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  wo_record record;
  user_id_to_notify uuid;
  notification_title text;
  notification_message text;
BEGIN
  -- Get work order details
  SELECT wo.*, t.name as team_name, e.name as equipment_name
  INTO wo_record
  FROM public.work_orders wo
  LEFT JOIN public.teams t ON wo.team_id = t.id
  LEFT JOIN public.equipment e ON wo.equipment_id = e.id
  WHERE wo.id = work_order_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Create notification title and message
  notification_title := 'Work Order ' || REPLACE(INITCAP(new_status), '_', ' ');
  notification_message := 'Work order "' || wo_record.title || '"';
  
  IF wo_record.equipment_name IS NOT NULL THEN
    notification_message := notification_message || ' for ' || wo_record.equipment_name;
  END IF;
  
  notification_message := notification_message || ' has been ' || REPLACE(new_status, '_', ' ') || '.';
  
  -- Find users who should be notified based on their notification settings
  FOR user_id_to_notify IN
    SELECT DISTINCT om.user_id
    FROM public.organization_members om
    LEFT JOIN public.team_members tm ON tm.user_id = om.user_id AND tm.team_id = wo_record.team_id
    WHERE om.organization_id = wo_record.organization_id
      AND om.status = 'active'
      AND om.user_id != changed_by_user_id
      AND (
        -- Organization admins/owners get access to all teams
        om.role IN ('owner', 'admin') OR
        -- Team members with appropriate roles
        tm.role IN ('technician', 'requestor', 'manager')
      )
      AND public.should_notify_user_for_work_order(om.user_id, wo_record.team_id, new_status, wo_record.organization_id)
  LOOP
    -- Insert notification
    INSERT INTO public.notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      data,
      read
    ) VALUES (
      wo_record.organization_id,
      user_id_to_notify,
      'work_order_' || new_status,
      notification_title,
      notification_message,
      jsonb_build_object('work_order_id', work_order_uuid, 'team_id', wo_record.team_id),
      false
    );
  END LOOP;
END;
$function$;

-- Fix log_work_order_status_change function
CREATE OR REPLACE FUNCTION "public"."log_work_order_status_change"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  changed_by_user uuid;
BEGIN
  -- Get the current user ID
  changed_by_user := auth.uid();
  
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert into status history (existing functionality)
    IF NOT EXISTS (
      SELECT 1 FROM public.work_order_status_history 
      WHERE work_order_id = NEW.id 
        AND old_status IS NULL 
        AND new_status = NEW.status
    ) THEN
      INSERT INTO public.work_order_status_history (
        work_order_id, old_status, new_status, changed_by, reason
      ) VALUES (
        NEW.id, OLD.status, NEW.status, changed_by_user, 'Status updated'
      );
    END IF;
    
    -- Create notifications for the status change
    PERFORM public.create_work_order_notifications(NEW.id, NEW.status::text, changed_by_user);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- =============================================================================
-- Add Performance Comments
-- =============================================================================

COMMENT ON FUNCTION "public"."cleanup_old_notifications"() 
IS 'Cleans up notifications older than 7 days. Fixed search_path for security.';

COMMENT ON FUNCTION "public"."get_user_teams_for_notifications"(uuid) 
IS 'Returns teams and access info for user notifications. Fixed search_path for security.';

COMMENT ON FUNCTION "public"."update_notification_settings_updated_at"() 
IS 'Trigger function to update notification settings timestamp. Fixed search_path for security.';

COMMENT ON FUNCTION "public"."should_notify_user_for_work_order"(uuid, uuid, text, uuid) 
IS 'Determines if user should receive work order notifications. Fixed search_path for security.';

COMMENT ON FUNCTION "public"."create_work_order_notifications"(uuid, text, uuid) 
IS 'Creates notifications for work order status changes. Fixed search_path for security.';

COMMENT ON FUNCTION "public"."log_work_order_status_change"() 
IS 'Trigger function to log work order status changes and create notifications. Fixed search_path for security.';

COMMIT;
