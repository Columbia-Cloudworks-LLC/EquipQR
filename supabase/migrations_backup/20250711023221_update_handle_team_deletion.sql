-- Fix security warning by adding explicit search_path to handle_team_deletion function
CREATE OR REPLACE FUNCTION public.handle_team_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Set team_id to null for all equipment assigned to the deleted team
  UPDATE public.equipment 
  SET team_id = NULL, updated_at = now()
  WHERE team_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';