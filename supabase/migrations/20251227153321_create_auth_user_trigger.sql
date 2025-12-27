-- Migration: Create trigger on auth.users to automatically create profile and organization
-- This trigger fires when a new user is created in auth.users and calls handle_new_user()
-- to create the user's profile and organization.

-- Drop trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after INSERT on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
'Automatically creates user profile and organization when a new user signs up.';
