-- ============================================================================
-- Migration: Add Ownership Transfer Notification Types
-- 
-- Purpose: Update the notifications_type_check constraint to include
-- ownership transfer notification types.
-- ============================================================================

BEGIN;

-- Drop the existing constraint
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with ownership transfer types
ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY[
    -- Existing work order types
    'work_order_request'::text, 
    'work_order_accepted'::text, 
    'work_order_assigned'::text, 
    'work_order_completed'::text,
    'general'::text,
    -- Ownership transfer types
    'ownership_transfer_request'::text,
    'ownership_transfer_accepted'::text,
    'ownership_transfer_rejected'::text,
    'ownership_transfer_cancelled'::text
  ]));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS 
  'Ensures notification type is one of the allowed values including work order and ownership transfer types.';

COMMIT;
