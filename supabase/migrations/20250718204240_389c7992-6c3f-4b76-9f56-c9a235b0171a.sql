-- Enable real-time for organization_members table
ALTER TABLE public.organization_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;

-- Enable real-time for profiles table  
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable real-time for organization_slots table for license availability updates
ALTER TABLE public.organization_slots REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_slots;