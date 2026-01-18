-- Migration: Prevent duplicate organization names when signing up via invitation
-- This ensures users invited to an organization cannot create their own organization
-- with the exact same name as the inviter's organization.

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  invited_name text;
BEGIN
  -- Insert user profile (this part already exists)
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );

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
Prevents duplicate org names when user is invited to an existing organization.';

