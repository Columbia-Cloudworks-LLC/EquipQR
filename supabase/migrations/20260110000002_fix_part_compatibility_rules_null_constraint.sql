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
-- │ DESIGN DECISION: Why we DON'T use IF EXISTS                                 │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │ Using IF EXISTS would make this migration "idempotent" but would HIDE       │
-- │ schema inconsistencies. We intentionally fail if the constraint doesn't     │
-- │ exist because:                                                              │
-- │                                                                             │
-- │ 1. It indicates migration 20260110000001 wasn't applied (broken sequence)  │
-- │ 2. It could indicate a manual schema change (drift from migrations)        │
-- │ 3. It could indicate a partial rollback (inconsistent state)               │
-- │                                                                             │
-- │ Migrations should be applied ONCE in sequence. If you need to re-run:      │
-- │ - In development: use `supabase db reset` to start fresh                   │
-- │ - In production: fix the schema inconsistency manually first               │
-- │                                                                             │
-- │ This strict approach catches issues early rather than silently proceeding  │
-- │ with a potentially inconsistent schema.                                    │
-- └─────────────────────────────────────────────────────────────────────────────┘
ALTER TABLE public.part_compatibility_rules
  DROP CONSTRAINT part_compatibility_rules_unique;

-- ============================================================================
-- PART 2: Create unique index for specific model rules (model_norm IS NOT NULL)
-- ============================================================================

-- This index ensures uniqueness for rules that specify a particular model
-- Note: No IF NOT EXISTS - this migration should only be run once
CREATE UNIQUE INDEX idx_part_compat_rules_unique_with_model
  ON public.part_compatibility_rules(inventory_item_id, manufacturer_norm, model_norm)
  WHERE model_norm IS NOT NULL;

-- ============================================================================
-- PART 3: Create unique index for "any model" rules (model_norm IS NULL)
-- ============================================================================

-- This index ensures only one "any model" rule per manufacturer per inventory item
-- PostgreSQL unique indexes with WHERE clause properly enforce uniqueness for NULL values
CREATE UNIQUE INDEX idx_part_compat_rules_unique_any_model
  ON public.part_compatibility_rules(inventory_item_id, manufacturer_norm)
  WHERE model_norm IS NULL;

-- ============================================================================
-- PART 4: Add comment for documentation
-- ============================================================================

COMMENT ON INDEX idx_part_compat_rules_unique_with_model IS 'Ensures unique manufacturer/model combinations per inventory item when model is specified';
COMMENT ON INDEX idx_part_compat_rules_unique_any_model IS 'Ensures only one "any model" rule per manufacturer per inventory item (handles NULL model_norm)';

COMMIT;
