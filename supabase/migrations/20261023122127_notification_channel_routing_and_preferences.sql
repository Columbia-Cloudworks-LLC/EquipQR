-- =============================================================================
-- Migration: Notification Channel Routing and User Preferences (Issue #1438)
-- =============================================================================
-- Implements:
--   1. public.user_org_notification_preferences (composite PK user_id, organization_id)
--   2. One-time fold of notification_preferences + notification_settings into the
--      new per-org JSONB preference document, making legacy tables read-only
--   3. public.notification_digest_pending for daily digest buffering
--   4. Quiet hours helper (public.is_within_notification_quiet_hours)
--   5. Updated emission path (public.create_work_order_notifications) with
--      channel-agnostic safe view, high_priority_only filter, quiet hours,
--      digest routing, and explicit pgmq enqueue for web_push + email
--   6. Updated public.broadcast_notification() so work-order / migrated-org
--      rows do not double-enqueue push notifications while global notifications
--      remain on the legacy path
--   7. Daily digest drain helper (public.drain_notification_digest_pending)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create public.user_org_notification_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_org_notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_org_notification_preferences_pkey PRIMARY KEY (user_id, organization_id),
  CONSTRAINT user_org_notification_preferences_is_object CHECK (jsonb_typeof(preferences) = 'object')
);

ALTER TABLE public.user_org_notification_preferences OWNER TO postgres;

COMMENT ON TABLE public.user_org_notification_preferences IS
  'Per-user, per-organization notification routing preferences (channels, quiet_hours, digest, high_priority_only, teams status matrix). Issue #1438.';

CREATE INDEX IF NOT EXISTS idx_user_org_notification_preferences_organization_id
  ON public.user_org_notification_preferences USING btree (organization_id);

DROP TRIGGER IF EXISTS update_user_org_notification_preferences_updated_at
  ON public.user_org_notification_preferences;

CREATE TRIGGER update_user_org_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_org_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_org_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_org_notification_preferences_user_policy"
  ON public.user_org_notification_preferences;

CREATE POLICY "user_org_notification_preferences_user_policy"
  ON public.user_org_notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid() AS uid))
  WITH CHECK (user_id = (SELECT auth.uid() AS uid));

REVOKE ALL ON TABLE public.user_org_notification_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_org_notification_preferences TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. One-time fold of legacy notification_preferences & notification_settings
-- -----------------------------------------------------------------------------
WITH team_map_per_org AS (
  SELECT
    ns.user_id,
    ns.organization_id,
    jsonb_object_agg(
      ns.team_id::text,
      jsonb_build_object(
        'enabled', COALESCE(ns.enabled, false),
        'statuses', CASE
          WHEN jsonb_typeof(ns.statuses) = 'array' THEN ns.statuses
          ELSE '[]'::jsonb
        END
      )
    ) AS teams_json
  FROM public.notification_settings ns
  GROUP BY ns.user_id, ns.organization_id
),
candidate_user_orgs AS (
  SELECT user_id, organization_id FROM team_map_per_org
  UNION
  SELECT om.user_id, om.organization_id
  FROM public.organization_members om
  INNER JOIN public.notification_preferences np ON np.user_id = om.user_id
  WHERE om.status = 'active'
)
INSERT INTO public.user_org_notification_preferences (
  user_id,
  organization_id,
  preferences
)
SELECT
  cuo.user_id,
  cuo.organization_id,
  jsonb_build_object(
    'channels', jsonb_build_object(
      'in_app', true,
      'email', COALESCE(np.email_work_orders, true),
      'web_push', COALESCE(np.push_notifications, true)
    ),
    'quiet_hours', jsonb_build_object(
      'enabled', false,
      'start', '22:00',
      'end', '07:00',
      'timezone', 'UTC'
    ),
    'digest', jsonb_build_object(
      'mode', 'realtime'
    ),
    'high_priority_only', false,
    'teams', COALESCE(tm.teams_json, '{}'::jsonb)
  )
FROM candidate_user_orgs cuo
LEFT JOIN public.notification_preferences np
  ON np.user_id = cuo.user_id
LEFT JOIN team_map_per_org tm
  ON tm.user_id = cuo.user_id AND tm.organization_id = cuo.organization_id
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Make legacy tables read-only for client roles (no dual-write)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.notification_preferences FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.notification_settings FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can manage their own notification preferences"
  ON public.notification_preferences;
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid() AS uid));

DROP POLICY IF EXISTS "notification_settings_user_policy"
  ON public.notification_settings;
CREATE POLICY "notification_settings_user_policy"
  ON public.notification_settings
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid() AS uid));

-- -----------------------------------------------------------------------------
-- 3. Create public.notification_digest_pending
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_digest_pending (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  safe_view jsonb NOT NULL,
  channels jsonb NOT NULL DEFAULT '{"email": true, "web_push": false}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

ALTER TABLE public.notification_digest_pending OWNER TO postgres;

COMMENT ON TABLE public.notification_digest_pending IS
  'Pending non-high-priority work order notification safe views queued for daily digest delivery (#1438).';

CREATE INDEX IF NOT EXISTS idx_notification_digest_pending_unprocessed
  ON public.notification_digest_pending USING btree (user_id, organization_id, created_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_digest_pending_organization_id
  ON public.notification_digest_pending USING btree (organization_id);

CREATE INDEX IF NOT EXISTS idx_notification_digest_pending_work_order_id
  ON public.notification_digest_pending USING btree (work_order_id);

ALTER TABLE public.notification_digest_pending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_digest_pending_select_own"
  ON public.notification_digest_pending;

CREATE POLICY "notification_digest_pending_select_own"
  ON public.notification_digest_pending
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid() AS uid));

REVOKE ALL ON TABLE public.notification_digest_pending FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.notification_digest_pending TO authenticated;
GRANT ALL ON TABLE public.notification_digest_pending TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Quiet hours evaluation helper (SECURITY INVOKER, internal/service only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_within_notification_quiet_hours(
  p_quiet_hours jsonb,
  p_now timestamp with time zone DEFAULT now()
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_enabled boolean;
  v_tz text;
  v_start_str text;
  v_end_str text;
  v_start time;
  v_end time;
  v_local_time time;
BEGIN
  IF p_quiet_hours IS NULL OR jsonb_typeof(p_quiet_hours) <> 'object' THEN
    RETURN false;
  END IF;

  v_enabled := CASE
    WHEN jsonb_typeof(p_quiet_hours -> 'enabled') = 'boolean'
    THEN (p_quiet_hours ->> 'enabled')::boolean
    ELSE false
  END;

  IF NOT v_enabled THEN
    RETURN false;
  END IF;

  v_tz := COALESCE(NULLIF( btrim(p_quiet_hours ->> 'timezone'), '' ), 'UTC');
  v_start_str := COALESCE(NULLIF( btrim(p_quiet_hours ->> 'start'), '' ), '22:00');
  v_end_str := COALESCE(NULLIF( btrim(p_quiet_hours ->> 'end'), '' ), '07:00');

  BEGIN
    v_start := v_start_str::time;
  EXCEPTION WHEN OTHERS THEN
    v_start := '22:00'::time;
  END;

  BEGIN
    v_end := v_end_str::time;
  EXCEPTION WHEN OTHERS THEN
    v_end := '07:00'::time;
  END;

  BEGIN
    v_local_time := (p_now AT TIME ZONE v_tz)::time;
  EXCEPTION WHEN OTHERS THEN
    v_local_time := (p_now AT TIME ZONE 'UTC')::time;
  END;

  IF v_start = v_end THEN
    RETURN false;
  ELSIF v_start < v_end THEN
    RETURN v_local_time >= v_start AND v_local_time < v_end;
  ELSE
    -- Overnight window (e.g., 22:00 to 07:00)
    RETURN v_local_time >= v_start OR v_local_time < v_end;
  END IF;
END;
$$;

ALTER FUNCTION public.is_within_notification_quiet_hours(jsonb, timestamp with time zone) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_within_notification_quiet_hours(jsonb, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_within_notification_quiet_hours(jsonb, timestamp with time zone) TO service_role;

COMMENT ON FUNCTION public.is_within_notification_quiet_hours(jsonb, timestamp with time zone) IS
  'Evaluates whether p_now falls inside the user preference quiet_hours window [start, end) in the configured timezone (UTC fallback).';

-- -----------------------------------------------------------------------------
-- 5. Update should_notify_user_for_work_order to read new preference document
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.should_notify_user_for_work_order(
  user_uuid uuid,
  work_order_team_id uuid,
  work_order_status text,
  organization_uuid uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_prefs jsonb;
  v_team_pref jsonb;
  v_team_enabled boolean := false;
  v_status_enabled boolean := false;
BEGIN
  IF work_order_team_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT uo.preferences
  INTO v_prefs
  FROM public.user_org_notification_preferences uo
  WHERE uo.user_id = user_uuid
    AND uo.organization_id = organization_uuid;

  IF v_prefs IS NULL OR jsonb_typeof(v_prefs) <> 'object' THEN
    RETURN false;
  END IF;

  v_team_pref := v_prefs -> 'teams' -> (work_order_team_id::text);
  IF v_team_pref IS NULL OR jsonb_typeof(v_team_pref) <> 'object' THEN
    RETURN false;
  END IF;

  v_team_enabled := CASE
    WHEN jsonb_typeof(v_team_pref -> 'enabled') = 'boolean'
    THEN (v_team_pref ->> 'enabled')::boolean
    ELSE false
  END;

  v_status_enabled := CASE
    WHEN jsonb_typeof(v_team_pref -> 'statuses') = 'array'
    THEN (v_team_pref -> 'statuses') @> to_jsonb(ARRAY[work_order_status])
    ELSE false
  END;

  RETURN v_team_enabled AND v_status_enabled;
END;
$$;

ALTER FUNCTION public.should_notify_user_for_work_order(uuid, uuid, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.should_notify_user_for_work_order(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.should_notify_user_for_work_order(uuid, uuid, text, uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 6. Update create_work_order_notifications (SECURITY DEFINER emission path)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_work_order_notifications(
  work_order_uuid uuid,
  new_status text,
  changed_by_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  wo_record record;
  candidate_record record;
  notification_title text;
  notification_message text;
  v_safe_view jsonb;
  v_prefs jsonb;
  v_team_pref jsonb;
  v_team_enabled boolean;
  v_status_enabled boolean;
  v_high_priority_only boolean;
  v_is_high_priority boolean;
  v_ch_in_app boolean;
  v_ch_email boolean;
  v_ch_web_push boolean;
  v_quiet_suppressed boolean;
  v_digest_mode text;
  v_notification_id uuid;
BEGIN
  -- 1. Load work order (including priority, team, equipment, organization)
  SELECT
    wo.id,
    wo.title,
    wo.priority::text AS priority,
    wo.team_id,
    wo.organization_id,
    t.name AS team_name,
    e.name AS equipment_name,
    o.name AS organization_name
  INTO wo_record
  FROM public.work_orders wo
  INNER JOIN public.organizations o ON o.id = wo.organization_id
  LEFT JOIN public.teams t ON wo.team_id = t.id
  LEFT JOIN public.equipment e ON wo.equipment_id = e.id
  WHERE wo.id = work_order_uuid;

  IF NOT FOUND OR wo_record.team_id IS NULL THEN
    RETURN;
  END IF;

  v_is_high_priority := (COALESCE(wo_record.priority, 'medium') = 'high');

  -- Build channel-agnostic Safe View (explicitly excludes cost, labor hours,
  -- inventory/stock quantities, private notes, customer financial data, and
  -- any fields governed by limit_sensitive_pi)
  v_safe_view := jsonb_build_object(
    'work_order_id', work_order_uuid,
    'title', wo_record.title,
    'new_status', new_status,
    'priority', COALESCE(wo_record.priority, 'medium'),
    'equipment_name', wo_record.equipment_name,
    'team_name', wo_record.team_name,
    'organization_name', wo_record.organization_name,
    'deep_link_path', '/dashboard/work-orders/' || work_order_uuid::text
  );

  -- Create notification title and message from safe view fields
  notification_title := 'Work Order ' || REPLACE(INITCAP(new_status), '_', ' ');
  notification_message := 'Work order "' || wo_record.title || '"';

  IF wo_record.equipment_name IS NOT NULL THEN
    notification_message := notification_message || ' for ' || wo_record.equipment_name;
  END IF;

  notification_message := notification_message || ' has been ' || REPLACE(new_status, '_', ' ') || '.';

  -- 2. Determine candidate users (existing membership rules) and load preferences
  FOR candidate_record IN
    SELECT DISTINCT
      om.user_id,
      uo.preferences
    FROM public.organization_members om
    LEFT JOIN public.team_members tm
      ON tm.user_id = om.user_id AND tm.team_id = wo_record.team_id
    LEFT JOIN public.user_org_notification_preferences uo
      ON uo.user_id = om.user_id AND uo.organization_id = wo_record.organization_id
    WHERE om.organization_id = wo_record.organization_id
      AND om.status = 'active'
      AND (changed_by_user_id IS NULL OR om.user_id <> changed_by_user_id)
      AND (
        om.role IN ('owner', 'admin') OR
        tm.role IN ('technician', 'requestor', 'manager')
      )
  LOOP
    -- 3. Load (or default) preference document; never auto-insert missing row
    v_prefs := CASE
      WHEN candidate_record.preferences IS NOT NULL AND jsonb_typeof(candidate_record.preferences) = 'object'
      THEN candidate_record.preferences
      ELSE '{}'::jsonb
    END;

    -- 4. Apply team status matrix (defaults to opt-in false when missing)
    v_team_pref := v_prefs -> 'teams' -> (wo_record.team_id::text);
    v_team_enabled := CASE
      WHEN v_team_pref IS NOT NULL AND jsonb_typeof(v_team_pref -> 'enabled') = 'boolean'
      THEN (v_team_pref ->> 'enabled')::boolean
      ELSE false
    END;
    v_status_enabled := CASE
      WHEN v_team_pref IS NOT NULL AND jsonb_typeof(v_team_pref -> 'statuses') = 'array'
      THEN (v_team_pref -> 'statuses') @> to_jsonb(ARRAY[new_status])
      ELSE false
    END;

    IF NOT (v_team_enabled AND v_status_enabled) THEN
      CONTINUE;
    END IF;

    -- Apply high_priority_only additional filter (default false)
    v_high_priority_only := CASE
      WHEN jsonb_typeof(v_prefs -> 'high_priority_only') = 'boolean'
      THEN (v_prefs ->> 'high_priority_only')::boolean
      ELSE false
    END;

    IF v_high_priority_only AND NOT v_is_high_priority THEN
      CONTINUE;
    END IF;

    -- Channel toggles (default all true when missing)
    v_ch_in_app := CASE
      WHEN jsonb_typeof(v_prefs #> '{channels,in_app}') = 'boolean'
      THEN (v_prefs #>> '{channels,in_app}')::boolean
      ELSE true
    END;
    v_ch_email := CASE
      WHEN jsonb_typeof(v_prefs #> '{channels,email}') = 'boolean'
      THEN (v_prefs #>> '{channels,email}')::boolean
      ELSE true
    END;
    v_ch_web_push := CASE
      WHEN jsonb_typeof(v_prefs #> '{channels,web_push}') = 'boolean'
      THEN (v_prefs #>> '{channels,web_push}')::boolean
      ELSE true
    END;

    v_notification_id := NULL;

    -- 5. Always write in-app notification row when channels.in_app allows
    --    (never suppressed by quiet hours)
    IF v_ch_in_app THEN
      INSERT INTO public.notifications (
        organization_id,
        user_id,
        type,
        title,
        message,
        data,
        read
      ) VALUES (
        wo_record.organization_id,
        candidate_record.user_id,
        'work_order_' || new_status,
        notification_title,
        notification_message,
        v_safe_view || jsonb_build_object('team_id', wo_record.team_id, 'routed_v2', true),
        false
      )
      RETURNING id INTO v_notification_id;
    END IF;

    -- 6. Evaluate quiet hours & digest for email and web_push
    IF NOT v_ch_email AND NOT v_ch_web_push THEN
      CONTINUE;
    END IF;

    v_quiet_suppressed := (NOT v_is_high_priority)
      AND public.is_within_notification_quiet_hours(v_prefs -> 'quiet_hours', now());

    IF v_quiet_suppressed THEN
      CONTINUE;
    END IF;

    v_digest_mode := COALESCE(v_prefs #>> '{digest,mode}', 'realtime');

    -- 7. Channel failures never roll back the in-app insert
    IF v_digest_mode = 'daily' AND NOT v_is_high_priority THEN
      BEGIN
        INSERT INTO public.notification_digest_pending (
          user_id,
          organization_id,
          work_order_id,
          event_type,
          safe_view,
          channels
        ) VALUES (
          candidate_record.user_id,
          wo_record.organization_id,
          work_order_uuid,
          'work_order_' || new_status,
          v_safe_view,
          jsonb_build_object('email', v_ch_email, 'web_push', v_ch_web_push)
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notification_digest_pending insert failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      END;
    ELSE
      IF v_ch_web_push THEN
        BEGIN
          PERFORM pgmq_public.send(
            'notifications',
            jsonb_build_object(
              'channel', 'web_push',
              'user_id', candidate_record.user_id,
              'title', notification_title,
              'body', notification_message,
              'data', jsonb_build_object(
                'notification_id', v_notification_id,
                'type', 'work_order_' || new_status,
                'work_order_id', work_order_uuid,
                'organization_id', wo_record.organization_id,
                'safe_view', v_safe_view
              ),
              'url', v_safe_view ->> 'deep_link_path'
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'pgmq web_push enqueue failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        END;
      END IF;

      IF v_ch_email THEN
        BEGIN
          PERFORM pgmq_public.send(
            'notifications',
            jsonb_build_object(
              'channel', 'email',
              'user_id', candidate_record.user_id,
              'organization_id', wo_record.organization_id,
              'title', notification_title,
              'body', notification_message,
              'safe_view', v_safe_view,
              'url', v_safe_view ->> 'deep_link_path'
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'pgmq email enqueue failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        END;
      END IF;
    END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION public.create_work_order_notifications(uuid, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_work_order_notifications(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.create_work_order_notifications(uuid, text, uuid) TO service_role;

COMMENT ON FUNCTION public.create_work_order_notifications(uuid, text, uuid) IS
  'Routes work order status notifications across in_app, email, and web_push using user_org_notification_preferences, safe view redaction, quiet hours, and daily digest buffering (#1438).';

-- -----------------------------------------------------------------------------
-- 7. Update broadcast_notification() trigger so push is only auto-enqueued for
--    global / legacy notifications when the new preference document is absent
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.broadcast_notification() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_has_org_pref boolean := false;
BEGIN
  -- ===========================================================================
  -- PART A: Realtime broadcast (online/connected users) - UNCHANGED
  -- ===========================================================================
  PERFORM realtime.send(
    jsonb_build_object(
      'notification_id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'is_global', NEW.is_global,
      'created_at', NEW.created_at
    ),
    'new_notification',
    'notifications:user:' || NEW.user_id::text,
    true
  );

  -- ===========================================================================
  -- PART B: Legacy push notification enqueue
  -- ===========================================================================
  -- Push is now an explicit enqueue from create_work_order_notifications (#1438).
  -- The trigger push enqueue is a no-op when routed_v2 is set, for work_order_*
  -- events, or once a user_org_notification_preferences document exists for the
  -- (user_id, organization_id). Global / cross-org notifications stay on the
  -- legacy path for this slice.
  IF NEW.is_global = false THEN
    IF COALESCE((NEW.data ->> 'routed_v2')::boolean, false)
       OR NEW.type LIKE 'work_order_%' THEN
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.user_org_notification_preferences uo
      WHERE uo.user_id = NEW.user_id
        AND uo.organization_id = NEW.organization_id
    ) INTO v_has_org_pref;

    IF v_has_org_pref THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    PERFORM pgmq_public.send(
      'notifications',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'data', jsonb_build_object(
          'notification_id', NEW.id,
          'type', NEW.type,
          'work_order_id', NEW.data ->> 'work_order_id',
          'organization_id', NEW.organization_id
        ),
        'url', CASE
          WHEN NEW.data ->> 'work_order_id' IS NOT NULL
          THEN '/dashboard/work-orders/' || (NEW.data ->> 'work_order_id')
          ELSE '/dashboard/notifications'
        END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pgmq enqueue failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'broadcast_notification failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.broadcast_notification() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.broadcast_notification() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.broadcast_notification() TO service_role;

-- -----------------------------------------------------------------------------
-- 8. Daily digest drain helper & pg_cron schedule
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.drain_notification_digest_pending(
  p_now timestamp with time zone DEFAULT now()
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  digest_group record;
  v_enqueued integer := 0;
BEGIN
  FOR digest_group IN
    SELECT
      ndp.user_id,
      ndp.organization_id,
      COALESCE(MAX(ndp.safe_view ->> 'organization_name'), 'EquipQR') AS organization_name,
      array_agg(ndp.id ORDER BY ndp.created_at ASC) AS pending_ids,
      jsonb_agg(ndp.safe_view ORDER BY ndp.created_at ASC) AS safe_views,
      bool_or(COALESCE((ndp.channels ->> 'email')::boolean, false)) AS send_email,
      bool_or(COALESCE((ndp.channels ->> 'web_push')::boolean, false)) AS send_web_push,
      uo.preferences -> 'quiet_hours' AS quiet_hours
    FROM public.notification_digest_pending ndp
    LEFT JOIN public.user_org_notification_preferences uo
      ON uo.user_id = ndp.user_id AND uo.organization_id = ndp.organization_id
    WHERE ndp.processed_at IS NULL
    GROUP BY ndp.user_id, ndp.organization_id, uo.preferences
  LOOP
    -- Respect quiet hours when draining daily digests
    IF public.is_within_notification_quiet_hours(digest_group.quiet_hours, p_now) THEN
      CONTINUE;
    END IF;

    PERFORM pgmq_public.send(
      'notifications',
      jsonb_build_object(
        'channel', 'digest',
        'user_id', digest_group.user_id,
        'organization_id', digest_group.organization_id,
        'organization_name', digest_group.organization_name,
        'safe_views', digest_group.safe_views,
        'send_email', digest_group.send_email,
        'send_web_push', digest_group.send_web_push,
        'url', '/dashboard/notifications'
      )
    );

    UPDATE public.notification_digest_pending
    SET processed_at = p_now
    WHERE id = ANY(digest_group.pending_ids);

    v_enqueued := v_enqueued + 1;
  END LOOP;

  RETURN v_enqueued;
END;
$$;

ALTER FUNCTION public.drain_notification_digest_pending(timestamp with time zone) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.drain_notification_digest_pending(timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drain_notification_digest_pending(timestamp with time zone) TO service_role;

COMMENT ON FUNCTION public.drain_notification_digest_pending(timestamp with time zone) IS
  'Groups unprocessed notification_digest_pending rows per (user_id, organization_id), enqueues one digest job into pgmq notifications queue, and marks rows processed (#1438).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('drain-notification-digests');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'drain-notification-digests',
      '0 13 * * *',
      'SELECT public.drain_notification_digest_pending();'
    );
  END IF;
END;
$$;
