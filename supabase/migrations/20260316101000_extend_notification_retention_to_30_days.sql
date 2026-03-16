-- Extend in-app notification retention window from 7 to 30 days.
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < (now() - interval '30 days');
END;
$function$;

COMMENT ON FUNCTION public.cleanup_old_notifications()
IS 'Cleans up notifications older than 30 days.';
