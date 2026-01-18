-- Migration: Update handle_new_user to always create personal org and apply workspace claims
-- Description: Personal org is always created; workspace org memberships applied by email claims
-- Author: System
-- Date: 2026-01-18

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  personal_org_id uuid;
  org_name text;
  invited_name text;
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
  -- STEP 2: Always create personal organization if missing
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT organization_id INTO personal_org_id
  FROM public.personal_organizations
  WHERE user_id = NEW.id;

  IF personal_org_id IS NULL THEN
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');

    -- Check if user is signing up via invitation (prevent name collision)
    IF NEW.raw_user_meta_data ? 'invited_organization_id' THEN
      SELECT name INTO invited_name
      FROM public.organizations
      WHERE id = (NEW.raw_user_meta_data->>'invited_organization_id')::uuid;
    ELSIF NEW.raw_user_meta_data ? 'invited_organization_name' THEN
      invited_name := NEW.raw_user_meta_data->>'invited_organization_name';
    END IF;

    IF invited_name IS NOT NULL AND lower(trim(org_name)) = lower(trim(invited_name)) THEN
      RAISE EXCEPTION 'ORGANIZATION_NAME_CONFLICT_WITH_INVITED'
        USING DETAIL = 'Choose a different organization name than the one inviting you.';
    END IF;

    INSERT INTO public.organizations (name, plan, member_count, max_members, features)
    VALUES (
      org_name,
      'free',
      1,
      5,
      ARRAY['Equipment Management', 'Work Orders', 'Team Management']
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.personal_organizations (user_id, organization_id)
    VALUES (NEW.id, new_org_id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (new_org_id, NEW.id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 3: Apply workspace member claims by email
  -- ═══════════════════════════════════════════════════════════════════════════
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  SELECT c.organization_id, NEW.id, 'member', 'active'
  FROM public.organization_member_claims c
  WHERE public.normalize_email(c.email) = public.normalize_email(NEW.email)
    AND c.status IN ('selected', 'claimed')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.organization_member_claims
  SET status = 'claimed',
      claimed_user_id = NEW.id,
      claimed_at = now()
  WHERE public.normalize_email(email) = public.normalize_email(NEW.email)
    AND status = 'selected';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- STEP 4: Apply pending admin grants if user verified via Google OAuth
  -- ═══════════════════════════════════════════════════════════════════════════
  PERFORM public.apply_pending_admin_grants_for_user(NEW.id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function for new user registration. Creates profile and personal organization; applies workspace membership claims and pending admin grants.';

