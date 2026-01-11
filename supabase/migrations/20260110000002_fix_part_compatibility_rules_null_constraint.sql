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

ALTER TABLE public.part_compatibility_rules
  DROP CONSTRAINT IF EXISTS part_compatibility_rules_unique;

-- ============================================================================
-- PART 2: Create unique index for specific model rules (model_norm IS NOT NULL)
-- ============================================================================

-- This index ensures uniqueness for rules that specify a particular model
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_compat_rules_unique_with_model
  ON public.part_compatibility_rules(inventory_item_id, manufacturer_norm, model_norm)
  WHERE model_norm IS NOT NULL;

-- ============================================================================
-- PART 3: Create unique index for "any model" rules (model_norm IS NULL)
-- ============================================================================

-- This index ensures only one "any model" rule per manufacturer per inventory item
-- PostgreSQL unique indexes with WHERE clause properly enforce uniqueness for NULL values
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_compat_rules_unique_any_model
  ON public.part_compatibility_rules(inventory_item_id, manufacturer_norm)
  WHERE model_norm IS NULL;

-- ============================================================================
-- PART 4: Add comment for documentation
-- ============================================================================

COMMENT ON INDEX idx_part_compat_rules_unique_with_model IS 'Ensures unique manufacturer/model combinations per inventory item when model is specified';
COMMENT ON INDEX idx_part_compat_rules_unique_any_model IS 'Ensures only one "any model" rule per manufacturer per inventory item (handles NULL model_norm)';

COMMIT;
