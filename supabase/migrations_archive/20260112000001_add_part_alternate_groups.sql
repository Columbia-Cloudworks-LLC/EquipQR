-- Migration: Add Part Alternate Groups System
-- Description: Creates tables for part-number based alternate/interchangeable parts lookup
-- Date: 2026-01-12
-- Purpose: Allow technicians to find compatible parts by part number without requiring equipment records

BEGIN;

-- ============================================================================
-- PART 1: Create part_identifier_type enum
-- ============================================================================

CREATE TYPE part_identifier_type AS ENUM (
  'oem',           -- Original Equipment Manufacturer part number
  'aftermarket',   -- Aftermarket/third-party part number
  'sku',           -- Internal SKU (maps to inventory_items.sku)
  'mpn',           -- Manufacturer Part Number
  'upc',           -- Universal Product Code
  'cross_ref'      -- Cross-reference number from compatibility guides
);

-- ============================================================================
-- PART 2: Create verification_status enum
-- ============================================================================

CREATE TYPE verification_status AS ENUM (
  'unverified',    -- Not yet verified by shop owner/manager
  'verified',      -- Verified as correct by authorized user
  'deprecated'     -- No longer recommended (but kept for history)
);

-- ============================================================================
-- PART 3: Create part_alternate_groups table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.part_alternate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Display info
  name TEXT NOT NULL,                    -- e.g., "Oil Filter - CAT D6T Compatible"
  description TEXT,                      -- Optional notes about this group
  
  -- Confidence metadata
  status verification_status NOT NULL DEFAULT 'unverified',
  notes TEXT,                            -- Evidence or verification notes
  evidence_url TEXT,                     -- Link to cross-reference guide, etc.
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.part_alternate_groups IS 
  'Groups of interchangeable part numbers. Parts in the same group can substitute for each other.';

-- Indexes for part_alternate_groups
CREATE INDEX IF NOT EXISTS idx_part_alternate_groups_org 
  ON public.part_alternate_groups(organization_id);

CREATE INDEX IF NOT EXISTS idx_part_alternate_groups_status 
  ON public.part_alternate_groups(organization_id, status);

-- ============================================================================
-- PART 4: Create part_identifiers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.part_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Identifier values
  identifier_type part_identifier_type NOT NULL,
  raw_value TEXT NOT NULL,               -- Original value as entered
  norm_value TEXT NOT NULL,              -- Normalized for matching: lower(trim(value))
  
  -- Optional link to inventory item (if this identifier is for an item we stock)
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  
  -- Metadata
  manufacturer TEXT,                     -- e.g., "WIX", "Caterpillar", "Baldwin"
  notes TEXT,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent exact duplicates within org (same type + normalized value)
  CONSTRAINT part_identifiers_unique UNIQUE (organization_id, identifier_type, norm_value)
);

-- Add comment for documentation
COMMENT ON TABLE public.part_identifiers IS 
  'Part numbers/identifiers that can be looked up. May or may not be linked to inventory items.';

-- Indexes for part_identifiers
CREATE INDEX IF NOT EXISTS idx_part_identifiers_org 
  ON public.part_identifiers(organization_id);

CREATE INDEX IF NOT EXISTS idx_part_identifiers_norm_value 
  ON public.part_identifiers(organization_id, norm_value);

CREATE INDEX IF NOT EXISTS idx_part_identifiers_inventory_item 
  ON public.part_identifiers(inventory_item_id) 
  WHERE inventory_item_id IS NOT NULL;

-- ============================================================================
-- PART 5: Create part_alternate_group_members junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.part_alternate_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.part_alternate_groups(id) ON DELETE CASCADE,
  
  -- Either link to a part identifier OR directly to an inventory item
  -- (allows flexibility for items without formal part numbers)
  part_identifier_id UUID REFERENCES public.part_identifiers(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  
  -- At least one must be set
  CONSTRAINT part_alternate_group_members_has_link 
    CHECK (part_identifier_id IS NOT NULL OR inventory_item_id IS NOT NULL),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT part_alternate_group_members_unique_identifier 
    UNIQUE (group_id, part_identifier_id),
  CONSTRAINT part_alternate_group_members_unique_item 
    UNIQUE (group_id, inventory_item_id),
  
  -- Metadata
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,  -- Mark the "main" part in the group
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.part_alternate_group_members IS 
  'Links part identifiers and/or inventory items to alternate groups.';

-- Indexes for part_alternate_group_members
CREATE INDEX IF NOT EXISTS idx_part_alternate_group_members_group 
  ON public.part_alternate_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_part_alternate_group_members_identifier 
  ON public.part_alternate_group_members(part_identifier_id) 
  WHERE part_identifier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_part_alternate_group_members_item 
  ON public.part_alternate_group_members(inventory_item_id) 
  WHERE inventory_item_id IS NOT NULL;

-- ============================================================================
-- PART 6: Enable RLS on all new tables
-- ============================================================================

ALTER TABLE public.part_alternate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_alternate_group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: Create RLS Policies
-- ============================================================================

-- part_alternate_groups policies
CREATE POLICY "part_alternate_groups_org_isolation" ON public.part_alternate_groups
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- part_identifiers policies
CREATE POLICY "part_identifiers_org_isolation" ON public.part_identifiers
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- part_alternate_group_members policies (access via group's organization)
CREATE POLICY "part_alternate_group_members_org_isolation" ON public.part_alternate_group_members
  FOR ALL
  USING (
    group_id IN (
      SELECT id FROM public.part_alternate_groups
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- ============================================================================
-- PART 8: Create updated_at triggers
-- ============================================================================

-- Trigger for part_alternate_groups
DROP TRIGGER IF EXISTS update_part_alternate_groups_updated_at ON public.part_alternate_groups;
CREATE TRIGGER update_part_alternate_groups_updated_at
  BEFORE UPDATE ON public.part_alternate_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
