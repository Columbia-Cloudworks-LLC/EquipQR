-- Enable real-time for organization tables
ALTER TABLE public.organization_members REPLICA IDENTITY FULL;
ALTER TABLE public.organization_slots REPLICA IDENTITY FULL;
ALTER TABLE public.organization_invitations REPLICA IDENTITY FULL;

-- Add tables to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_invitations;