
-- Fix the update_pm_updated_at function security configuration
-- This addresses the security vulnerability without changing any existing functionality

CREATE OR REPLACE FUNCTION public.update_pm_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
