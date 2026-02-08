-- =============================================================================
-- Migration: add_tickets_table
-- Description: Creates the tickets table for in-app bug reporting.
--              Tickets are user-scoped (not organization-scoped) and link to
--              GitHub Issues for developer tracking.
-- =============================================================================

-- 1. Create the tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'in_progress')),
  github_issue_number INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Users can read their own tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own tickets
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;
CREATE POLICY "Users can create their own tickets"
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role can insert tickets (used by create-ticket edge function with admin client)
DROP POLICY IF EXISTS "service_role_can_insert_tickets" ON public.tickets;
CREATE POLICY "service_role_can_insert_tickets"
  ON public.tickets
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update tickets (for future status sync from GitHub)
DROP POLICY IF EXISTS "service_role_can_update_tickets" ON public.tickets;
CREATE POLICY "service_role_can_update_tickets"
  ON public.tickets
  FOR UPDATE
  TO service_role
  USING (true);

-- NOTE: No DELETE policy is provided intentionally. Tickets serve as an audit
-- trail and should not be deletable by end users. If administrative deletion
-- is ever needed, use the service_role client.

-- 4. Index on user_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets (user_id);

-- 5. Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets (created_at DESC);
