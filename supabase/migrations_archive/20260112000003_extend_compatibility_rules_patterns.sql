-- Migration: Extend Compatibility Rules with Pattern Matching
-- Description: Adds model_match_type and pattern columns for PREFIX/WILDCARD matching
-- Date: 2026-01-12
-- Purpose: Allow rules like "Model starts with JL-" instead of exact match only

BEGIN;

-- ============================================================================
-- PART 1: Create model_match_type enum
-- ============================================================================

CREATE TYPE model_match_type AS ENUM (
  'any',       -- Match any model from this manufacturer (model is NULL)
  'exact',     -- Exact match on model (current behavior)
  'prefix',    -- Model starts with pattern (e.g., "JL-" matches "JL-100", "JL-200")
  'wildcard'   -- Simple wildcard pattern (e.g., "JL-*" or "*-100")
);

-- ============================================================================
-- PART 2: Add new columns to part_compatibility_rules
-- ============================================================================

-- Add match_type column with default for backwards compatibility
ALTER TABLE public.part_compatibility_rules
  ADD COLUMN IF NOT EXISTS match_type model_match_type NOT NULL DEFAULT 'exact';

-- Add pattern columns (for display and matching)
ALTER TABLE public.part_compatibility_rules
  ADD COLUMN IF NOT EXISTS model_pattern_raw TEXT,      -- What user entered (for PREFIX/WILDCARD)
  ADD COLUMN IF NOT EXISTS model_pattern_norm TEXT;     -- Normalized for matching

-- Add confidence metadata
ALTER TABLE public.part_compatibility_rules
  ADD COLUMN IF NOT EXISTS status verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================================
-- PART 3: Migrate existing data to use new match_type
-- ============================================================================

-- Update existing rules:
-- - If model_norm IS NULL → match_type = 'any'
-- - If model_norm IS NOT NULL → match_type = 'exact' (already default)
UPDATE public.part_compatibility_rules
SET match_type = 'any'
WHERE model_norm IS NULL;

-- ============================================================================
-- PART 4: Add indexes for pattern matching
-- ============================================================================

-- Index for match_type filtering
CREATE INDEX IF NOT EXISTS idx_part_compat_rules_match_type
  ON public.part_compatibility_rules(inventory_item_id, match_type);

-- Index for prefix matching (uses model_pattern_norm for LIKE 'pattern%')
CREATE INDEX IF NOT EXISTS idx_part_compat_rules_pattern_norm
  ON public.part_compatibility_rules(manufacturer_norm, model_pattern_norm)
  WHERE match_type IN ('prefix', 'wildcard');

-- ============================================================================
-- PART 5: Add comments
-- ============================================================================

COMMENT ON COLUMN public.part_compatibility_rules.match_type IS 
  'Type of model matching: any (all models), exact (exact match), prefix (starts with), wildcard (simple pattern)';

COMMENT ON COLUMN public.part_compatibility_rules.model_pattern_raw IS 
  'Original pattern as entered by user (e.g., "JL-*"). Used for display.';

COMMENT ON COLUMN public.part_compatibility_rules.model_pattern_norm IS 
  'Normalized pattern for matching. For prefix, just the prefix text. For wildcard, pattern with * converted to %.';

COMMENT ON COLUMN public.part_compatibility_rules.status IS 
  'Verification status: unverified (default), verified (confirmed by manager), deprecated (no longer recommended)';

-- ============================================================================
-- PART 6: Create updated_at trigger
-- ============================================================================

DROP TRIGGER IF EXISTS update_part_compatibility_rules_updated_at ON public.part_compatibility_rules;
CREATE TRIGGER update_part_compatibility_rules_updated_at
  BEFORE UPDATE ON public.part_compatibility_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 7: Create validation function for patterns
-- ============================================================================

-- Function to validate and normalize pattern input
-- Returns normalized pattern or raises exception if invalid

CREATE OR REPLACE FUNCTION public.normalize_compatibility_pattern(
  p_match_type model_match_type,
  p_pattern TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_normalized TEXT;
  v_asterisk_count INTEGER;
BEGIN
  -- ANY type doesn't need a pattern
  IF p_match_type = 'any' THEN
    RETURN NULL;
  END IF;
  
  -- EXACT type uses standard normalization
  IF p_match_type = 'exact' THEN
    RETURN lower(trim(COALESCE(p_pattern, '')));
  END IF;
  
  -- For PREFIX and WILDCARD, validate and normalize
  v_normalized := lower(trim(COALESCE(p_pattern, '')));
  
  IF v_normalized = '' THEN
    RAISE EXCEPTION 'Pattern cannot be empty for match type %', p_match_type
      USING ERRCODE = '22023';
  END IF;
  
  -- PREFIX: just return the normalized prefix (no wildcards allowed)
  IF p_match_type = 'prefix' THEN
    IF v_normalized LIKE '%*%' OR v_normalized LIKE '%?%' THEN
      RAISE EXCEPTION 'PREFIX patterns cannot contain wildcards. Use the pattern text directly (e.g., "jl-" instead of "jl-*")'
        USING ERRCODE = '22023';
    END IF;
    RETURN v_normalized;
  END IF;
  
  -- WILDCARD: validate and convert * to % for SQL LIKE
  IF p_match_type = 'wildcard' THEN
    -- Count asterisks
    v_asterisk_count := length(v_normalized) - length(replace(v_normalized, '*', ''));
    
    -- Limit wildcards to prevent expensive patterns
    IF v_asterisk_count > 2 THEN
      RAISE EXCEPTION 'WILDCARD patterns can have at most 2 wildcards (*)'
        USING ERRCODE = '22023';
    END IF;
    
    -- Don't allow patterns that are just wildcards (would match everything)
    IF v_normalized = '*' OR v_normalized = '**' OR v_normalized = '*-*' THEN
      RAISE EXCEPTION 'WILDCARD patterns must include at least 2 non-wildcard characters'
        USING ERRCODE = '22023';
    END IF;
    
    -- Convert * to % and ? to _ for SQL LIKE
    v_normalized := replace(v_normalized, '*', '%');
    v_normalized := replace(v_normalized, '?', '_');
    
    RETURN v_normalized;
  END IF;
  
  -- Shouldn't reach here
  RETURN v_normalized;
END;
$$;

COMMENT ON FUNCTION public.normalize_compatibility_pattern IS 
  'Validates and normalizes compatibility rule patterns. '
  'For PREFIX, returns lowercase trimmed pattern. '
  'For WILDCARD, converts * to % and validates constraints.';

COMMIT;
