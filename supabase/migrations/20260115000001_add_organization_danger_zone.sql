-- ============================================================================
-- Migration: Organization Danger Zone Feature
-- 
-- Purpose: Add tables and functions for ownership transfer, user departure
-- queue with batch denormalization, and organization deletion.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Create ownership_transfer_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ownership_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Transfer parties
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_name TEXT NOT NULL,
  to_user_name TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  
  -- New owner's choice for departing owner's role after transfer
  departing_owner_role TEXT DEFAULT 'admin'
    CHECK (departing_owner_role IN ('admin', 'member', 'remove')),
  
  -- Audit fields
  transfer_reason TEXT,
  response_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Add comment
COMMENT ON TABLE public.ownership_transfer_requests IS 
  'Tracks pending and completed ownership transfer requests for organizations. '
  'Used for audit trail and in-app confirmation workflow.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ownership_transfer_org 
  ON public.ownership_transfer_requests(organization_id);

CREATE INDEX IF NOT EXISTS idx_ownership_transfer_from_user 
  ON public.ownership_transfer_requests(from_user_id);

CREATE INDEX IF NOT EXISTS idx_ownership_transfer_to_user 
  ON public.ownership_transfer_requests(to_user_id);

CREATE INDEX IF NOT EXISTS idx_ownership_transfer_pending 
  ON public.ownership_transfer_requests(status) 
  WHERE status = 'pending';

-- ============================================================================
-- PART 2: Create user_departure_queue table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_departure_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Batch progress tracking (per table)
  -- Example: {"notes": {"total": 150, "processed": 0}, "scans": {"total": 42, "processed": 42}}
  tables_to_process JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_batch_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Add comment
COMMENT ON TABLE public.user_departure_queue IS 
  'Queue for batch processing user departures. When a user leaves an organization, '
  'their name is denormalized into historical records before RLS restricts access.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departure_queue_pending 
  ON public.user_departure_queue(status) 
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_departure_queue_org 
  ON public.user_departure_queue(organization_id);

CREATE INDEX IF NOT EXISTS idx_departure_queue_user 
  ON public.user_departure_queue(user_id);

-- ============================================================================
-- PART 3: Enable RLS on new tables
-- ============================================================================

ALTER TABLE public.ownership_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departure_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: RLS Policies for ownership_transfer_requests
-- ============================================================================

-- Owners and admins can view transfer requests for their organization
CREATE POLICY "org_admins_view_transfer_requests"
  ON public.ownership_transfer_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ownership_transfer_requests.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Users can view transfer requests where they are the target
CREATE POLICY "users_view_own_transfer_requests"
  ON public.ownership_transfer_requests
  FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid());

-- Only owners can create transfer requests (enforced by RPC)
CREATE POLICY "service_role_manage_transfer_requests"
  ON public.ownership_transfer_requests
  FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- PART 5: RLS Policies for user_departure_queue
-- ============================================================================

-- Only service role can manage departure queue (batch processing)
CREATE POLICY "service_role_manage_departure_queue"
  ON public.user_departure_queue
  FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can view departure queue for their org (for monitoring)
CREATE POLICY "org_admins_view_departure_queue"
  ON public.user_departure_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = user_departure_queue.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

COMMIT;
