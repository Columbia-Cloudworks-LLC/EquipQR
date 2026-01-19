-- Migration: Add is_global column to notifications table (pre-baseline)
-- This migration ensures the is_global column exists before the baseline runs
-- Required for idempotent baseline application on existing databases

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'is_global'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN is_global BOOLEAN DEFAULT false NOT NULL;
        
        COMMENT ON COLUMN public.notifications.is_global IS 
            'When true, this notification is visible regardless of which organization the user is currently viewing. Used for cross-org notifications like ownership transfer requests.';
    END IF;
END $$;

-- Add index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_notifications_is_global 
  ON public.notifications(user_id, is_global) 
  WHERE is_global = true;
