-- Fix security: Set search_path for functions to make them more secure
-- This addresses the "Function Search Path Mutable" security warning

-- Update the existing update_updated_at_column function to be more secure
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;