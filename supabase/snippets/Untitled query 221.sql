-- Fix: Create trigger on auth.users and fix existing user
-- Run this in Supabase Studio SQL Editor: http://127.0.0.1:54323

-- Step 1: Create the trigger (idempotent - safe to run multiple times)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 2: Fix existing user (admin@equipqr.app) by creating organization
DO $$
DECLARE
  user_id_val uuid;
  new_org_id uuid;
BEGIN
  -- Get the user ID
  SELECT id INTO user_id_val
  FROM auth.users
  WHERE email = 'admin@equipqr.app'
  LIMIT 1;

  -- Check if user exists
  IF user_id_val IS NULL THEN
    RAISE NOTICE 'User admin@equipqr.app not found - skipping';
    RETURN;
  END IF;

  -- Check if profile already exists, create if not
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id_val) THEN
    INSERT INTO public.profiles (id, email, name)
    VALUES (user_id_val, 'admin@equipqr.app', 'admin@equipqr.app')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Check if user already has an organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = user_id_val AND role = 'owner' AND status = 'active'
  ) THEN
    -- Create organization
    INSERT INTO public.organizations (name, plan, member_count, max_members, features)
    VALUES (
      'My Organization',
      'free',
      1,
      5,
      ARRAY['Equipment Management', 'Work Orders', 'Team Management']
    )
    RETURNING id INTO new_org_id;

    -- Add user as owner
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (new_org_id, user_id_val, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Created organization % for user %', new_org_id, user_id_val;
  ELSE
    RAISE NOTICE 'User already has an organization';
  END IF;
END $$;
