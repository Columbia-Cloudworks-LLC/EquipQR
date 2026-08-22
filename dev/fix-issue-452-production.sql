-- ============================================================================
-- Manual Fix Script for Issue #452
-- ============================================================================
-- This script fixes missing user profiles and creates the auth.users trigger
-- Run this in Supabase Dashboard SQL Editor with appropriate permissions
--
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire script
-- 3. Execute it
-- ============================================================================

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
-- PART 3: Create trigger on auth.users
-- ============================================================================
-- This trigger will automatically create profiles and organizations for future new users

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 4: Verification queries (run these separately to verify the fix)
-- ============================================================================

-- Verify trigger exists
-- SELECT 
--   t.tgname as trigger_name,
--   n.nspname as table_schema,
--   c.relname as table_name
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'auth' 
--   AND c.relname = 'users' 
--   AND t.tgname = 'on_auth_user_created'
--   AND NOT t.tgisinternal;

-- Verify affected user now has profile and organization
-- SELECT 
--   EXISTS(SELECT 1 FROM public.profiles WHERE id = 'c81d467a-7083-4436-a854-8b75c386b961') as has_profile,
--   (SELECT COUNT(*)::int FROM public.organization_members WHERE user_id = 'c81d467a-7083-4436-a854-8b75c386b961' AND status = 'active') as active_org_count,
--   (SELECT organization_id FROM public.organization_members WHERE user_id = 'c81d467a-7083-4436-a854-8b75c386b961' AND status = 'active' LIMIT 1) as org_id;
