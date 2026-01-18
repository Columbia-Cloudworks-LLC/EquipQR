-- ============================================================================
-- Migration: Add Denormalized Name Columns
-- 
-- Purpose: Add author/user name columns to tables that reference users.
-- These columns are populated when users leave an organization to preserve
-- audit history even after the user's profile becomes inaccessible via RLS.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add author_name to notes table (legacy equipment notes)
-- ============================================================================

ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS author_name TEXT;

COMMENT ON COLUMN public.notes.author_name IS 
  'Denormalized author name. Populated when user leaves organization for audit trail.';

-- ============================================================================
-- PART 2: Add scanned_by_name to scans table
-- ============================================================================

ALTER TABLE public.scans 
  ADD COLUMN IF NOT EXISTS scanned_by_name TEXT;

COMMENT ON COLUMN public.scans.scanned_by_name IS 
  'Denormalized scanner name. Populated when user leaves organization for audit trail.';

-- ============================================================================
-- PART 3: Add changed_by_name to work_order_status_history table
-- ============================================================================

ALTER TABLE public.work_order_status_history 
  ADD COLUMN IF NOT EXISTS changed_by_name TEXT;

COMMENT ON COLUMN public.work_order_status_history.changed_by_name IS 
  'Denormalized name of user who changed status. Populated when user leaves organization.';

-- ============================================================================
-- PART 4: Add created_by_name to work_order_costs table
-- ============================================================================

ALTER TABLE public.work_order_costs 
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

COMMENT ON COLUMN public.work_order_costs.created_by_name IS 
  'Denormalized name of user who created cost entry. Populated when user leaves organization.';

-- ============================================================================
-- PART 5: Add name columns to inventory_transactions table
-- ============================================================================

ALTER TABLE public.inventory_transactions 
  ADD COLUMN IF NOT EXISTS user_name TEXT;

COMMENT ON COLUMN public.inventory_transactions.user_name IS 
  'Denormalized user name. Populated when user leaves organization for audit trail.';

-- ============================================================================
-- PART 6: Add name columns to preventative_maintenance table
-- ============================================================================

ALTER TABLE public.preventative_maintenance 
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.preventative_maintenance 
  ADD COLUMN IF NOT EXISTS completed_by_name TEXT;

COMMENT ON COLUMN public.preventative_maintenance.created_by_name IS 
  'Denormalized creator name. Populated when user leaves organization.';

COMMENT ON COLUMN public.preventative_maintenance.completed_by_name IS 
  'Denormalized completer name. Populated when user leaves organization.';

COMMIT;
