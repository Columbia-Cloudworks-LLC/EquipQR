-- =============================================================================
-- Migration: add_ticket_comments_and_updates
-- Description: Adds ticket_comments table for GitHub comment sync,
--              new columns to tickets for richer status tracking,
--              and realtime broadcast triggers for live updates.
-- =============================================================================

-- 1. Add new columns to tickets table
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS github_issue_url TEXT;

-- Backfill github_issue_url from metadata JSONB for existing rows
UPDATE public.tickets
SET github_issue_url = metadata->>'github_issue_url'
WHERE github_issue_url IS NULL
  AND metadata->>'github_issue_url' IS NOT NULL;

-- 2. Create ticket_comments table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  github_comment_id BIGINT UNIQUE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  is_from_team BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Enable RLS on ticket_comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Users can read comments on their own tickets (join through tickets table)
DROP POLICY IF EXISTS "Users can view comments on their own tickets" ON public.ticket_comments;
CREATE POLICY "Users can view comments on their own tickets"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets WHERE user_id = auth.uid()
    )
  );

-- Service role can insert comments (used by github-issue-webhook)
DROP POLICY IF EXISTS "service_role_can_insert_ticket_comments" ON public.ticket_comments;
CREATE POLICY "service_role_can_insert_ticket_comments"
  ON public.ticket_comments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update comments (for edits synced from GitHub)
DROP POLICY IF EXISTS "service_role_can_update_ticket_comments" ON public.ticket_comments;
CREATE POLICY "service_role_can_update_ticket_comments"
  ON public.ticket_comments
  FOR UPDATE
  TO service_role
  USING (true);

-- NOTE: No user INSERT/UPDATE/DELETE policies -- comments come only from GitHub.

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON public.ticket_comments (created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON public.tickets (updated_at DESC);

-- 5. Realtime broadcast trigger for ticket comment inserts
CREATE OR REPLACE FUNCTION public.broadcast_ticket_comment()
RETURNS trigger AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the ticket owner
  SELECT user_id INTO v_user_id FROM public.tickets WHERE id = NEW.ticket_id;
  IF v_user_id IS NOT NULL THEN
    PERFORM realtime.send(
      jsonb_build_object('ticket_id', NEW.ticket_id, 'comment_id', NEW.id),
      'ticket_update',
      'tickets:user:' || v_user_id::text,
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_broadcast_ticket_comment ON public.ticket_comments;
CREATE TRIGGER trigger_broadcast_ticket_comment
  AFTER INSERT ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_ticket_comment();

-- 6. Realtime broadcast trigger for ticket status updates
CREATE OR REPLACE FUNCTION public.broadcast_ticket_status_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.updated_at IS DISTINCT FROM NEW.updated_at THEN
    PERFORM realtime.send(
      jsonb_build_object('ticket_id', NEW.id, 'status', NEW.status),
      'ticket_update',
      'tickets:user:' || NEW.user_id::text,
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_broadcast_ticket_status_update ON public.tickets;
CREATE TRIGGER trigger_broadcast_ticket_status_update
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_ticket_status_update();
