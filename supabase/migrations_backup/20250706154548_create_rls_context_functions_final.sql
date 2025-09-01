-- Fix security warnings by adding explicit search_path declarations
-- to functions flagged by the database linter

-- Update set_bypass_triggers function
CREATE OR REPLACE FUNCTION public.set_bypass_triggers(bypass boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.bypass_triggers', bypass::text, true);
END;
$function$;

-- Update set_rls_context function  
CREATE OR REPLACE FUNCTION public.set_rls_context(context_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.rls_context', context_name, true);
END;
$function$;

-- Update clear_rls_context function
CREATE OR REPLACE FUNCTION public.clear_rls_context()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.rls_context', '', true);
END;
$function$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Added explicit search_path declarations to fix security warnings.';
  RAISE NOTICE 'Functions updated: set_bypass_triggers, set_rls_context, clear_rls_context';
END $$;