-- Migration: Fix Part Compatibility Rules NULL Constraint
-- Description: PostgreSQL UNIQUE constraints treat NULL values as distinct (NULL != NULL).
--              This means the original constraint (inventory_item_id, manufacturer_norm, model_norm)
--              cannot prevent duplicate "any model" rules where model_norm IS NULL.
--              This migration replaces the constraint with two unique indexes.
-- Date: 2026-01-10

BEGIN;

-- ============================================================================
-- PART 1: Drop the existing constraint that doesn't handle NULLs properly
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ DESIGN DECISION: Catalog lookup guard for safe re-runs                      │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ We use a catalog lookup to check if the constraint exists before dropping.  │
-- │ This allows the migration to be safely re-run (e.g., after partial failures │
-- │ or in idempotent deployment scenarios) without causing errors.              │
-- │                                                                             │
-- │ Migrations should still be applied once in sequence, but this guard:        │
-- │ 1. Allows recovery from partial failures without manual intervention        │
-- │ 2. Supports idempotent deployment pipelines                                 │
-- │ 3. Still proceeds to create indexes (the actual fix) regardless             │
-- │                                                                             │
-- │ For development: use `supabase db reset` to start fresh                     │
-- │ For production: this guard ensures safe re-application if needed            │
-- └─────────────────────────────────────────────────────────────────────────────┘
DO $$
BEGIN
  -- Check if constraint exists before attempting to drop
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'part_compatibility_rules_unique'
      AND n.nspname = 'public'
      AND t.relname = 'part_compatibility_rules'
  ) THEN
    ALTER TABLE public.part_compatibility_rules
      DROP CONSTRAINT part_compatibility_rules_unique;
    RAISE NOTICE 'Dropped constraint part_compatibility_rules_unique';
  ELSE
    RAISE NOTICE 'Constraint part_compatibility_rules_unique does not exist - skipping drop';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Create unique index for specific model rules (model_norm IS NOT NULL)
-- ============================================================================

-- This index ensures uniqueness for rules that specify a particular model
-- Using IF NOT EXISTS for safe re-runs (consistent with catalog guard above)
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_compat_rules_unique_with_model
  ON public.part_compatibility_rules(inventory_item_id, manufacturer_norm, model_norm)
  WHERE model_norm IS NOT NULL;

-- ============================================================================
-- PART 3: Create unique index for "any model" rules (model_norm IS NULL)
-- ============================================================================

-- This index ensures only one "any model" rule per manufacturer per inventory item
-- PostgreSQL unique indexes with WHERE clause properly enforce uniqueness for NULL values
-- Using IF NOT EXISTS for safe re-runs (consistent with catalog guard above)
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_compat_rules_unique_any_model
  ON public.part_compatibility_rules(inventory_item_id, manufacturer_norm)
  WHERE model_norm IS NULL;

-- ============================================================================
-- PART 4: Add comment for documentation
-- ============================================================================

COMMENT ON INDEX idx_part_compat_rules_unique_with_model IS 'Ensures unique manufacturer/model combinations per inventory item when model is specified';
COMMENT ON INDEX idx_part_compat_rules_unique_any_model IS 'Ensures only one "any model" rule per manufacturer per inventory item (handles NULL model_norm)';

COMMIT;
