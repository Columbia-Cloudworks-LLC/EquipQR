-- Migration: DSR evidence model
--
-- Extends dsr_requests with verification/resolution metadata and adds
-- an append-only dsr_request_events ledger for immutable compliance proof.

BEGIN;

-- ============================================================================
-- 1. Extend dsr_requests with verification and resolution metadata
-- ============================================================================

ALTER TABLE public.dsr_requests
  ADD COLUMN IF NOT EXISTS verification_method text
    CHECK (verification_method IN ('authenticated_match', 'email_challenge', 'manual_review', 'authorized_agent')),
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS denial_reason text,
  ADD COLUMN IF NOT EXISTS extension_reason text,
  ADD COLUMN IF NOT EXISTS extended_due_at timestamptz;

COMMENT ON COLUMN public.dsr_requests.verification_method IS
  'How the requester identity was verified: authenticated match, email challenge, manual review, or authorized agent.';
COMMENT ON COLUMN public.dsr_requests.verified_by IS
  'Admin user who verified the requester identity (NULL for auto-verified authenticated requests).';
COMMENT ON COLUMN public.dsr_requests.completed_by IS
  'Admin user who completed or denied the request.';
COMMENT ON COLUMN public.dsr_requests.denial_reason IS
  'Lawful basis for denial (e.g., identity not verified, legal exception applies).';
COMMENT ON COLUMN public.dsr_requests.extension_reason IS
  'Reason for extending the 45-day deadline per CPRA allowance.';
COMMENT ON COLUMN public.dsr_requests.extended_due_at IS
  'New deadline when an extension is invoked (max 90 days from receipt per CPRA).';

-- ============================================================================
-- 2. Append-only DSR event ledger
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dsr_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dsr_request_id uuid NOT NULL REFERENCES public.dsr_requests(id) ON DELETE CASCADE,

  event_type text NOT NULL CHECK (event_type IN (
    'intake_received',
    'verification_challenge_sent',
    'verification_passed',
    'verification_failed',
    'processing_started',
    'fulfillment_step_completed',
    'extension_invoked',
    'denial_issued',
    'request_completed',
    'artifact_attached',
    'note_added'
  )),

  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  summary text NOT NULL,
  details jsonb DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dsr_request_events OWNER TO postgres;

COMMENT ON TABLE public.dsr_request_events IS
  'Immutable audit ledger for DSR lifecycle events. No updates or deletes allowed. '
  'Each row records a discrete action taken on a privacy request for compliance proof.';

CREATE INDEX IF NOT EXISTS idx_dsr_request_events_request
  ON public.dsr_request_events (dsr_request_id, created_at);

CREATE INDEX IF NOT EXISTS idx_dsr_request_events_type
  ON public.dsr_request_events (event_type, created_at);

ALTER TABLE public.dsr_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_dsr_events" ON public.dsr_request_events;
CREATE POLICY "service_role_manage_dsr_events"
  ON public.dsr_request_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_view_own_dsr_events" ON public.dsr_request_events;
CREATE POLICY "users_view_own_dsr_events"
  ON public.dsr_request_events
  FOR SELECT
  TO authenticated
  USING (
    dsr_request_id IN (
      SELECT id FROM public.dsr_requests WHERE user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON TABLE public.dsr_request_events TO authenticated;
GRANT ALL ON TABLE public.dsr_request_events TO service_role;

-- ============================================================================
-- 3. Prevent mutations on the event ledger (append-only enforcement)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_dsr_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'DSR event records are immutable and cannot be updated or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dsr_event_update ON public.dsr_request_events;
CREATE TRIGGER trg_prevent_dsr_event_update
  BEFORE UPDATE ON public.dsr_request_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_dsr_event_mutation();

DROP TRIGGER IF EXISTS trg_prevent_dsr_event_delete ON public.dsr_request_events;
CREATE TRIGGER trg_prevent_dsr_event_delete
  BEFORE DELETE ON public.dsr_request_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_dsr_event_mutation();

-- ============================================================================
-- 4. Auto-log intake event when a DSR is inserted
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_dsr_intake_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    NEW.id,
    'intake_received',
    NEW.user_id,
    NEW.requester_email,
    'Privacy request received via web form',
    jsonb_build_object(
      'request_type', NEW.request_type,
      'requester_email', NEW.requester_email,
      'has_user_id', NEW.user_id IS NOT NULL,
      'due_at', NEW.due_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_dsr_intake ON public.dsr_requests;
CREATE TRIGGER trg_log_dsr_intake
  AFTER INSERT ON public.dsr_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_dsr_intake_event();

-- ============================================================================
-- 5. Auto-log status transitions on dsr_requests
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_dsr_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_type text;
  v_summary text;
  v_details jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_details := jsonb_build_object(
    'old_status', OLD.status,
    'new_status', NEW.status
  );

  CASE NEW.status
    WHEN 'verifying' THEN
      v_event_type := 'verification_challenge_sent';
      v_summary := 'Request moved to verification';
    WHEN 'processing' THEN
      v_event_type := 'processing_started';
      v_summary := 'Request verified and processing started';
      v_details := v_details || jsonb_build_object(
        'verification_method', NEW.verification_method
      );
    WHEN 'completed' THEN
      v_event_type := 'request_completed';
      v_summary := 'Request fulfillment completed';
      v_details := v_details || jsonb_build_object(
        'completed_by', NEW.completed_by
      );
    WHEN 'denied' THEN
      v_event_type := 'denial_issued';
      v_summary := 'Request denied with lawful basis';
      v_details := v_details || jsonb_build_object(
        'denial_reason', NEW.denial_reason
      );
    ELSE
      v_event_type := 'note_added';
      v_summary := 'Status changed to ' || NEW.status;
  END CASE;

  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, summary, details
  ) VALUES (
    NEW.id,
    v_event_type,
    COALESCE(NEW.completed_by, NEW.verified_by),
    v_summary,
    v_details
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_dsr_status_change ON public.dsr_requests;
CREATE TRIGGER trg_log_dsr_status_change
  AFTER UPDATE ON public.dsr_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_dsr_status_change();

COMMIT;
