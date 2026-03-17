BEGIN;

-- Expand allowed notification types with SOC-2 security events.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'work_order_request'::text,
    'work_order_accepted'::text,
    'work_order_assigned'::text,
    'work_order_completed'::text,
    'work_order_submitted'::text,
    'work_order_in_progress'::text,
    'work_order_on_hold'::text,
    'work_order_cancelled'::text,
    'general'::text,
    'ownership_transfer_request'::text,
    'ownership_transfer_accepted'::text,
    'ownership_transfer_rejected'::text,
    'ownership_transfer_cancelled'::text,
    'member_removed'::text,
    'workspace_migration'::text,
    'workspace_merge_request'::text,
    'workspace_merge_accepted'::text,
    'workspace_merge_rejected'::text,
    'member_added'::text,
    'member_role_changed'::text,
    'team_member_added'::text,
    'team_member_role_changed'::text,
    'audit_export'::text
  ]));

CREATE OR REPLACE FUNCTION public.notify_org_admins(
  p_organization_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT auth.uid()
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (organization_id, user_id, type, title, message, data, is_global)
  SELECT
    p_organization_id,
    om.user_id,
    p_type,
    p_title,
    p_message,
    p_data,
    false
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.status = 'active'
    AND om.role IN ('owner', 'admin')
    AND (p_actor_id IS NULL OR om.user_id <> p_actor_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_organization_member_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_name text;
  member_name text;
  member_email text;
BEGIN
  SELECT COALESCE(p.name, p.email, 'A team member')
  INTO actor_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF actor_name IS NULL THEN
    actor_name := 'A team member';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    SELECT COALESCE(p.name, p.email, 'New member'), p.email
    INTO member_name, member_email
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    PERFORM public.notify_org_admins(
      NEW.organization_id,
      'member_added',
      'Organization member added',
      actor_name || ' added ' || member_name || ' to the organization.',
      jsonb_build_object(
        'member_user_id', NEW.user_id,
        'member_role', NEW.role,
        'member_email', member_email
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    SELECT COALESCE(p.name, p.email, 'Member'), p.email
    INTO member_name, member_email
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    PERFORM public.notify_org_admins(
      NEW.organization_id,
      'member_role_changed',
      'Organization role updated',
      actor_name || ' changed ' || member_name || '''s role from ' || OLD.role || ' to ' || NEW.role || '.',
      jsonb_build_object(
        'member_user_id', NEW.user_id,
        'member_email', member_email,
        'old_role', OLD.role,
        'new_role', NEW.role
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS org_member_security_notifications_trigger ON public.organization_members;
CREATE TRIGGER org_member_security_notifications_trigger
AFTER INSERT OR UPDATE OF role ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_organization_member_security_events();

CREATE OR REPLACE FUNCTION public.notify_team_member_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_name text;
  member_name text;
  member_email text;
  v_team_name text;
  v_organization_id uuid;
BEGIN
  SELECT COALESCE(p.name, p.email, 'A team member')
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

  SELECT COALESCE(p.name, p.email, 'Member'), p.email
  INTO member_name, member_email
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_org_admins(
      v_organization_id,
      'team_member_added',
      'Team member added',
      actor_name || ' added ' || member_name || ' to team "' || COALESCE(v_team_name, 'Unknown') || '".',
      jsonb_build_object(
        'team_id', NEW.team_id,
        'team_name', v_team_name,
        'member_user_id', NEW.user_id,
        'member_email', member_email,
        'member_role', NEW.role
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM public.notify_org_admins(
      v_organization_id,
      'team_member_role_changed',
      'Team role updated',
      actor_name || ' changed ' || member_name || '''s team role from ' || OLD.role || ' to ' || NEW.role || ' in "' || COALESCE(v_team_name, 'Unknown') || '".',
      jsonb_build_object(
        'team_id', NEW.team_id,
        'team_name', v_team_name,
        'member_user_id', NEW.user_id,
        'member_email', member_email,
        'old_role', OLD.role,
        'new_role', NEW.role
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_member_security_notifications_trigger ON public.team_members;
CREATE TRIGGER team_member_security_notifications_trigger
AFTER INSERT OR UPDATE OF role ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_member_security_events();

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
BEGIN
  SELECT COALESCE(p.name, p.email, 'A user')
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

GRANT EXECUTE ON FUNCTION public.log_audit_export_notification(uuid, integer) TO authenticated;

COMMIT;
