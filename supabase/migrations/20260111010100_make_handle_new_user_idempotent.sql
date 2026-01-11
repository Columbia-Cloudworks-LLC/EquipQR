-- Migration: Make handle_new_user trigger idempotent for seeding
-- =====================================================
-- This modification allows seeds to insert users into auth.users first,
-- then insert profiles/organizations/memberships with specific UUIDs.
-- The trigger will skip creating duplicates if data already exists.
-- =====================================================

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  invited_name text;
  existing_membership_count int;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 1: Create profile (idempotent - uses ON CONFLICT)
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        updated_at = NOW();

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 2: Check if user already has organization memberships
  -- ═══════════════════════════════════════════════════════════════════════════
  -- If the user already has active memberships (e.g., from seed data),
  -- skip organization creation. This makes the trigger idempotent for seeding.
  SELECT COUNT(*) INTO existing_membership_count
  FROM public.organization_members
  WHERE user_id = NEW.id AND status = 'active';

  IF existing_membership_count > 0 THEN
    -- User already has organization memberships (from seeds or prior run)
    -- Skip organization creation to avoid duplicates
    RETURN NEW;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 3: Create organization (only if no existing memberships)
  -- ═══════════════════════════════════════════════════════════════════════════
  
  -- Get the organization name from user metadata (or use default)
  org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');

  -- Check if user is signing up via invitation
  IF NEW.raw_user_meta_data ? 'invited_organization_id' THEN
    -- Fetch the inviter's organization name from the database
    SELECT name INTO invited_name 
    FROM public.organizations 
    WHERE id = (NEW.raw_user_meta_data->>'invited_organization_id')::uuid;
  ELSIF NEW.raw_user_meta_data ? 'invited_organization_name' THEN
    -- Use the invited organization name from metadata (fallback)
    invited_name := NEW.raw_user_meta_data->>'invited_organization_name';
  END IF;

  -- Enforce: Cannot create an organization with the same name as the inviter's
  IF invited_name IS NOT NULL AND lower(trim(org_name)) = lower(trim(invited_name)) THEN
    RAISE EXCEPTION 'ORGANIZATION_NAME_CONFLICT_WITH_INVITED'
      USING DETAIL = 'Choose a different organization name than the one inviting you.';
  END IF;

  -- Create a new organization for the user
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    org_name,
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (
    new_org_id,
    NEW.id,
    'owner',
    'active'
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."handle_new_user"() IS 
'Trigger function for new user registration. Creates user profile and organization.
Idempotent: Skips org creation if user already has active memberships (for seeding).
Prevents duplicate org names when user is invited to an existing organization.';
