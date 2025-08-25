
-- Pin search_path for the trigger function to satisfy linter 0011 and harden lookup behavior
CREATE OR REPLACE FUNCTION public.set_geocoded_locations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
