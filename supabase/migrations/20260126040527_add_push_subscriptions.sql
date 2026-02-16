-- ============================================================================
-- Migration: Add Push Subscriptions Table
-- 
-- Purpose: Store Web Push subscription endpoints for PWA push notifications.
--          Each user can have multiple subscriptions (different browsers/devices).
-- 
-- Security:
--   - RLS enabled: users can only manage their own subscriptions
--   - Cascading delete when user is removed from auth.users
--   - Service role access for Edge Function to query subscriptions when sending push
--
-- Down Migration (to revert):
--   DROP TRIGGER IF EXISTS handle_updated_at ON public.push_subscriptions;
--   DROP INDEX IF EXISTS idx_push_subscriptions_user_id;
--   DROP POLICY IF EXISTS "service_role_full_access_push_subscriptions" ON public.push_subscriptions;
--   DROP POLICY IF EXISTS "users_manage_own_push_subscriptions" ON public.push_subscriptions;
--   DROP TABLE IF EXISTS public.push_subscriptions;
-- ============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Create Push Subscriptions Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User who owns this subscription
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Web Push subscription details
  -- These come from PushSubscription.toJSON() on the client
  endpoint TEXT NOT NULL,           -- The push service URL (FCM, APNs, Mozilla, etc.)
  p256dh TEXT NOT NULL,             -- Public key for message encryption (base64)
  auth TEXT NOT NULL,               -- Auth secret for message encryption (base64)
  
  -- Optional metadata for debugging/management
  user_agent TEXT,                  -- Browser/device info when subscription was created
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- A user can have one subscription per endpoint (same browser = same endpoint)
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions OWNER TO postgres;

COMMENT ON TABLE public.push_subscriptions IS 
  'Stores Web Push subscription endpoints for PWA push notifications. Each user can have multiple subscriptions across different browsers/devices.';

COMMENT ON COLUMN public.push_subscriptions.endpoint IS 
  'The push service URL (e.g., FCM endpoint). Provided by the browser when user subscribes to push.';

COMMENT ON COLUMN public.push_subscriptions.p256dh IS 
  'ECDH public key for encrypting push messages. Base64-encoded.';

COMMENT ON COLUMN public.push_subscriptions.auth IS 
  'Shared authentication secret for push messages. Base64-encoded.';

-- =============================================================================
-- PART 2: Enable Row Level Security
-- =============================================================================

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own push subscriptions
DROP POLICY IF EXISTS "users_manage_own_push_subscriptions" ON public.push_subscriptions;

CREATE POLICY "users_manage_own_push_subscriptions" 
ON public.push_subscriptions 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "users_manage_own_push_subscriptions" ON public.push_subscriptions IS 
  'Users can only view, create, update, and delete their own push subscriptions.';

-- Service role needs full access for the Edge Function to query subscriptions
-- JUSTIFICATION for USING (true): The send-push-notification Edge Function runs
-- with service_role to look up push subscriptions for any user when sending 
-- notifications triggered by database events. The Edge Function validates the
-- request comes from an authenticated source (pg_net with service_role_key from
-- vault) and only queries subscriptions for the specific user_id in the payload.
DROP POLICY IF EXISTS "service_role_full_access_push_subscriptions" ON public.push_subscriptions;

CREATE POLICY "service_role_full_access_push_subscriptions"
ON public.push_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "service_role_full_access_push_subscriptions" ON public.push_subscriptions IS 
  'Service role access for send-push-notification Edge Function. Required to query subscriptions when broadcasting push notifications from database triggers.';

-- =============================================================================
-- PART 3: Create Indexes
-- =============================================================================

-- Index for looking up subscriptions by user (used when sending push)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
ON public.push_subscriptions(user_id);

-- =============================================================================
-- PART 4: Create Updated At Trigger
-- =============================================================================
-- Reuse the existing handle_updated_at() function (consistent with other tables)

DROP TRIGGER IF EXISTS handle_updated_at ON public.push_subscriptions;

CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- PART 5: Grant Permissions
-- =============================================================================

GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;

COMMIT;
