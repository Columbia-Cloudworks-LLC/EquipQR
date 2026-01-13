-- ============================================================================
-- Migration: Add Global Notifications Support
-- 
-- Purpose: Allow certain notification types (like ownership transfers) to be
-- visible across all organizations, not just the one they were created in.
-- This ensures users can see critical notifications without switching orgs.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add is_global column to notifications table
-- ============================================================================

-- Add the is_global column (default false to not affect existing notifications)
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false NOT NULL;

-- Add an index to efficiently query global notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_global 
  ON public.notifications(user_id, is_global) 
  WHERE is_global = true;

-- Add comment documenting the column
COMMENT ON COLUMN public.notifications.is_global IS 
  'When true, this notification is visible regardless of which organization the user is currently viewing. Used for cross-org notifications like ownership transfer requests.';

-- ============================================================================
-- PART 2: Update RLS policies to allow viewing global notifications
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- Create updated policy that allows users to see their own notifications
-- regardless of organization when is_global is true
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Note: The policy already only filters by user_id, so global notifications
-- will automatically be visible. The client-side code will handle filtering
-- by organization when needed.

-- ============================================================================
-- PART 3: Add member_removed notification type (used when user leaves/is removed)
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with member_removed type
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY[
    -- Existing work order types
    'work_order_request'::text, 
    'work_order_accepted'::text, 
    'work_order_assigned'::text, 
    'work_order_completed'::text,
    'work_order_submitted'::text,
    'work_order_in_progress'::text,
    'work_order_on_hold'::text,
    'work_order_cancelled'::text,
    'general'::text,
    -- Ownership transfer types
    'ownership_transfer_request'::text,
    'ownership_transfer_accepted'::text,
    'ownership_transfer_rejected'::text,
    'ownership_transfer_cancelled'::text,
    -- Membership types
    'member_removed'::text
  ]));

COMMIT;
