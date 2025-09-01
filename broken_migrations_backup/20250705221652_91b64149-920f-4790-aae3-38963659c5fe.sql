-- Fix the invitation system by adding missing foreign key relationship
-- and improving the database structure

-- Add foreign key constraint for invited_by column
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT organization_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id);

-- Add foreign key constraint for accepted_by column (if not already exists)
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT organization_invitations_accepted_by_fkey 
FOREIGN KEY (accepted_by) REFERENCES public.profiles(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id 
ON public.organization_invitations(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_status 
ON public.organization_invitations(status);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by 
ON public.organization_invitations(invited_by);

-- Add a function to automatically expire old invitations
CREATE OR REPLACE FUNCTION public.auto_expire_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.organization_invitations
  SET 
    status = 'expired',
    expired_at = now(),
    updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND expired_at IS NULL;
END;
$$;