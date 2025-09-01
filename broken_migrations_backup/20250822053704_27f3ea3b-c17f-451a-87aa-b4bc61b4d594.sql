
-- Create idempotency table for webhook events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_events IS 'Idempotency gate for external webhooks (e.g., Stripe). A row per processed event_id.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Policies: Only service role (edge functions) can access. No user access.
-- Insert policy for service role
CREATE POLICY service_role_insert_webhook_events
  ON public.webhook_events
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

-- Select policy for service role
CREATE POLICY service_role_select_webhook_events
  ON public.webhook_events
  FOR SELECT
  TO public
  USING (auth.role() = 'service_role');

-- Update policy for service role (not needed, but added for completeness)
CREATE POLICY service_role_update_webhook_events
  ON public.webhook_events
  FOR UPDATE
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Delete policy for service role (rarely needed)
CREATE POLICY service_role_delete_webhook_events
  ON public.webhook_events
  FOR DELETE
  TO public
  USING (auth.role() = 'service_role');
