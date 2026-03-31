-- Migration: Add Data Subject Request (DSR) tracking table
--
-- Supports CCPA/CPRA consumer rights: access, deletion, correction,
-- opt-out, and limit-use requests. Tracks intake through fulfillment
-- with statutory deadlines.

BEGIN;

CREATE TABLE IF NOT EXISTS public.dsr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  requester_email text NOT NULL,
  requester_name text NOT NULL,
  request_type text NOT NULL
    CHECK (request_type IN ('access', 'deletion', 'correction', 'opt_out', 'limit_use')),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'verifying', 'processing', 'completed', 'denied')),

  details text,

  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  received_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  due_at timestamptz NOT NULL DEFAULT (now() + interval '45 days'),
  completed_at timestamptz,

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dsr_requests OWNER TO postgres;

COMMENT ON TABLE public.dsr_requests IS
  'Tracks CCPA/CPRA Data Subject Requests from intake through fulfillment. '
  'Supports access, deletion, correction, opt-out, and limit-use request types.';

CREATE INDEX IF NOT EXISTS idx_dsr_requests_status
  ON public.dsr_requests (status)
  WHERE status NOT IN ('completed', 'denied');

CREATE INDEX IF NOT EXISTS idx_dsr_requests_email
  ON public.dsr_requests (requester_email);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_due
  ON public.dsr_requests (due_at)
  WHERE status NOT IN ('completed', 'denied');

ALTER TABLE public.dsr_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_dsr_requests" ON public.dsr_requests;
CREATE POLICY "service_role_manage_dsr_requests"
  ON public.dsr_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_view_own_dsr_requests" ON public.dsr_requests;
CREATE POLICY "users_view_own_dsr_requests"
  ON public.dsr_requests
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE TRIGGER handle_dsr_requests_updated_at
  BEFORE UPDATE ON public.dsr_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

GRANT SELECT ON TABLE public.dsr_requests TO authenticated;
GRANT ALL ON TABLE public.dsr_requests TO service_role;

COMMIT;
