
-- 1) Idempotency log for webhook events
CREATE TABLE IF NOT EXISTS public.stripe_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  subscription_id TEXT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (block all non-service-role access by default)
ALTER TABLE public.stripe_event_logs ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon; Edge Functions use service role and bypass RLS.

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_stripe_event_logs_type ON public.stripe_event_logs(type);
CREATE INDEX IF NOT EXISTS idx_stripe_event_logs_subscription_id ON public.stripe_event_logs(subscription_id);
