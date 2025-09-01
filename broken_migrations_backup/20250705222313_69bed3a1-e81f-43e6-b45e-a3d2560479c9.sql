-- Drop existing constraints if they exist (to handle any partial state)
ALTER TABLE public.organization_invitations 
DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_fkey;

ALTER TABLE public.organization_invitations 
DROP CONSTRAINT IF EXISTS organization_invitations_accepted_by_fkey;

-- Add the foreign key constraints properly
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT organization_invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.organization_invitations 
ADD CONSTRAINT organization_invitations_accepted_by_fkey 
FOREIGN KEY (accepted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by 
ON public.organization_invitations(invited_by);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_accepted_by 
ON public.organization_invitations(accepted_by);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_status 
ON public.organization_invitations(status);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id 
ON public.organization_invitations(organization_id);