-- Migration: Create trigger on auth.users to automatically create profile and organization
-- This trigger fires when a new user is created in auth.users and calls handle_new_user()
-- to create the user's profile and organization.

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after INSERT on auth.users
-- Note: This trigger is created by the supabase_auth_admin role via dashboard/SQL editor
-- Regular migrations cannot create triggers on auth.users directly.
-- 
-- The trigger should be created manually via Supabase Dashboard SQL Editor:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();
--
-- This migration is a no-op placeholder since auth triggers must be managed
-- via the Supabase Dashboard with appropriate permissions.

-- No-op: auth triggers must be created via Dashboard
SELECT 1;
