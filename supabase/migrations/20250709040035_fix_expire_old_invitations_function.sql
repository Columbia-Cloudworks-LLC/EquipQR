-- Add recursion protection to the expire_old_invitations trigger
-- This prevents infinite loops when the trigger updates the same table

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS expire_old_invitations_trigger ON organization_invitations;

-- Recreate the function with recursion protection
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if we're already inside this trigger to prevent recursion
  IF current_setting('app.expire_invitations_running', true) = 'true' THEN
    RETURN NULL;
  END IF;
  
  -- Set the flag to indicate we're running
  PERFORM set_config('app.expire_invitations_running', 'true', true);
  
  -- Mark invitations as expired if they're past expiration and still pending
  UPDATE public.organization_invitations
  SET 
    status = 'expired',
    expired_at = now(),
    updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND expired_at IS NULL;
    
  -- Clear the flag
  PERFORM set_config('app.expire_invitations_running', 'false', true);
  
  RETURN NULL;
END;
$$;

-- Recreate the trigger (only on INSERT to avoid recursion on UPDATE)
CREATE TRIGGER expire_old_invitations_trigger
    AFTER INSERT ON organization_invitations
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.expire_old_invitations();

-- Add a comment explaining the recursion protection
COMMENT ON FUNCTION public.expire_old_invitations() IS 'Expires old pending invitations with recursion protection to prevent infinite loops';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Added recursion protection to expire_old_invitations trigger';
  RAISE NOTICE 'The trigger now only runs on INSERT operations and includes recursion checks';
END $$;