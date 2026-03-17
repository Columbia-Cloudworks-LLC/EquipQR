-- Fix security issues identified in PR #584 review.
-- 1. Restrict EXECUTE on notify_org_admins to postgres only (trigger-invoked)
-- 2. Add org-membership auth check to log_audit_export_notification
-- 3. Remove member_email PII from notification data payloads
-- 4. Remove profiles.email fallback from display names
-- 5. Restrict EXECUTE on cleanup_old_notifications to postgres only (pg_cron)

BEGIN;

-- 1. notify_org_admins: only invoked by trigger functions running as postgres
REVOKE EXECUTE ON FUNCTION public.notify_org_admins(uuid, text, text, text, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_org_admins(uuid, text, text, text, jsonb, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_org_admins(uuid, text, text, text, jsonb, uuid) FROM authenticated;

-- 2. log_audit_export_notification: enforce caller is active owner/admin
CREATE OR REPLACE FUNCTION public.log_audit_export_notification(
  p_organization_id uuid,
  p_exported_count integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_name text;
  caller_role text;
BEGIN
  SELECT om.role INTO caller_role
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active';

  IF caller_role IS NULL OR caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: caller must be an active owner or admin of the organization';
  END IF;

  SELECT COALESCE(p.name, 'A user')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_name IS NULL THEN
    actor_name := 'A user';
  END IF;

  PERFORM public.notify_org_admins(
    p_organization_id,
    'audit_export',
    'Audit log exported',
    actor_name || ' exported ' || p_exported_count::text || ' audit records.',
    jsonb_build_object(
      'exported_count', p_exported_count
    ),
    auth.uid()
  );
END;
$$;

-- 3a. Remove member_email PII and profiles.email fallback from org member trigger
CREATE OR REPLACE FUNCTION public.notify_organization_member_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_name text;
  member_name text;
BEGIN
  SELECT COALESCE(p.name, 'A team member')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_name IS NULL THEN
    actor_name := 'A team member';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    SELECT COALESCE(p.name, 'New member')
    INTO member_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    PERFORM public.notify_org_admins(
      NEW.organization_id,
      'member_added',
      'Organization member added',
      actor_name || ' added ' || COALESCE(member_name, 'New member') || ' to the organization.',
      jsonb_build_object(
        'member_user_id', NEW.user_id,
        'member_role', NEW.role
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    SELECT COALESCE(p.name, 'Member')
    INTO member_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    PERFORM public.notify_org_admins(
      NEW.organization_id,
      'member_role_changed',
      'Organization role updated',
      actor_name || ' changed ' || COALESCE(member_name, 'Member') || '''s role from ' || OLD.role || ' to ' || NEW.role || '.',
      jsonb_build_object(
        'member_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3b. Remove member_email PII and profiles.email fallback from team member trigger
CREATE OR REPLACE FUNCTION public.notify_team_member_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_name text;
  member_name text;
  v_team_name text;
  v_organization_id uuid;
BEGIN
  SELECT COALESCE(p.name, 'A team member')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_name IS NULL THEN
    actor_name := 'A team member';
  END IF;

  SELECT t.organization_id, t.name
  INTO v_organization_id, v_team_name
  FROM public.teams t
  WHERE t.id = NEW.team_id;

  IF v_organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.name, 'Member')
  INTO member_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_org_admins(
      v_organization_id,
      'team_member_added',
      'Team member added',
      actor_name || ' added ' || COALESCE(member_name, 'Member') || ' to team "' || COALESCE(v_team_name, 'Unknown') || '".',
      jsonb_build_object(
        'team_id', NEW.team_id,
        'team_name', v_team_name,
        'member_user_id', NEW.user_id,
        'member_role', NEW.role
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM public.notify_org_admins(
      v_organization_id,
      'team_member_role_changed',
      'Team role updated',
      actor_name || ' changed ' || COALESCE(member_name, 'Member') || '''s team role from ' || OLD.role || ' to ' || NEW.role || ' in "' || COALESCE(v_team_name, 'Unknown') || '".',
      jsonb_build_object(
        'team_id', NEW.team_id,
        'team_name', v_team_name,
        'member_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5. cleanup_old_notifications: only invoked by pg_cron as postgres
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM authenticated;

COMMIT;
