-- Migration: Fix missing user profiles and create auth.users trigger
-- This addresses issue #452 where new users don't get profiles/organizations created

-- ============================================================================
-- PART 1: Create SECURITY DEFINER function to backfill missing user data
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_user_profile_and_org(user_id_val uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  user_email_val text;
  user_name_val text;
  org_name_val text;
  new_org_id uuid;
  result jsonb;
BEGIN
  -- Get user data from auth.users
  SELECT email, 
         COALESCE(raw_user_meta_data->>'name', email),
         COALESCE(raw_user_meta_data->>'organization_name', 'My Organization')
  INTO user_email_val, user_name_val, org_name_val
  FROM auth.users
  WHERE id = user_id_val;

  -- Check if user exists
  IF user_email_val IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users', user_id_val;
  END IF;

  -- Create profile if it doesn't exist
  INSERT INTO public.profiles (id, email, name)
  VALUES (user_id_val, user_email_val, user_name_val)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name);

  -- Check if user already has an organization membership
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = user_id_val AND status = 'active'
  ) THEN
    -- Create organization
    INSERT INTO public.organizations (name, plan, member_count, max_members, features)
    VALUES (
      org_name_val,
      'free',
      1,
      5,
      ARRAY['Equipment Management', 'Work Orders', 'Team Management']
    )
    RETURNING id INTO new_org_id;

    -- Add user as owner
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (new_org_id, user_id_val, 'owner', 'active')
    ON CONFLICT DO NOTHING;

    result := jsonb_build_object(
      'success', true,
      'user_id', user_id_val,
      'organization_id', new_org_id,
      'message', 'Created profile and organization for user'
    );
  ELSE
    result := jsonb_build_object(
      'success', true,
      'user_id', user_id_val,
      'message', 'Profile created/updated, user already has organization membership'
    );
  END IF;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.backfill_user_profile_and_org(uuid) IS 
'Backfills missing profile and organization data for a user. Used to fix users created before the auth.users trigger was in place.';

-- ============================================================================
-- PART 2: Backfill ALL users missing profiles (environment-safe)
-- ============================================================================
-- This finds any auth.users without corresponding profiles and backfills them.
-- Safe to run on any environment - only processes users that actually exist.

DO $$
DECLARE
  missing_user RECORD;
  backfill_result jsonb;
  users_fixed int := 0;
BEGIN
  -- Find all auth.users without a profile
  FOR missing_user IN
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      backfill_result := public.backfill_user_profile_and_org(missing_user.id);
      users_fixed := users_fixed + 1;
      RAISE NOTICE 'Backfilled user %: %', missing_user.id, backfill_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to backfill user %: %', missing_user.id, SQLERRM;
    END;
  END LOOP;
  
  IF users_fixed > 0 THEN
    RAISE NOTICE 'Successfully backfilled % user(s) missing profiles', users_fixed;
  ELSE
    RAISE NOTICE 'No users found missing profiles - all users are properly configured';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Create trigger on auth.users (if permissions allow)
-- ============================================================================
-- Note: This may fail if run without supabase_auth_admin permissions.
-- If it fails, the trigger must be created manually via Supabase Dashboard SQL Editor
-- using the SQL below.

DO $$
BEGIN
  -- Try to create the trigger
  BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    
    RAISE NOTICE 'Successfully created trigger on_auth_user_created on auth.users';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE WARNING 'Insufficient privileges to create trigger on auth.users. Please create manually via Supabase Dashboard SQL Editor using: CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create trigger: %', SQLERRM;
  END;
END $$;
