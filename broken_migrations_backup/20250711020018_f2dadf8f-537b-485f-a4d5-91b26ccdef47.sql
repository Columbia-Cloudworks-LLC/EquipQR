-- Add missing DELETE RLS policy for teams table
CREATE POLICY "admins_delete_teams" 
ON public.teams 
FOR DELETE 
USING (is_org_admin(auth.uid(), organization_id));

-- Add trigger to handle equipment reassignment when team is deleted
CREATE OR REPLACE FUNCTION public.handle_team_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Set team_id to null for all equipment assigned to the deleted team
  UPDATE public.equipment 
  SET team_id = NULL, updated_at = now()
  WHERE team_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires before team deletion
CREATE TRIGGER before_team_delete
  BEFORE DELETE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_team_deletion();