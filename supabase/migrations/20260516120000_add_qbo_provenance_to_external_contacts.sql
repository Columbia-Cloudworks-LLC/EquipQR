-- Migration: Add QBO provenance columns to external_customer_contacts
-- Enables identifying which contact rows were synced from QuickBooks Online
-- vs. entered manually, and which QBO Customer field they represent.
--
-- Intentional-drop note: no columns are dropped; only additions.

-- ============================================
-- PART 1: Add provenance columns
-- ============================================

ALTER TABLE public.external_customer_contacts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_external_id text,
  ADD COLUMN IF NOT EXISTS source_field text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_payload jsonb;

COMMENT ON COLUMN public.external_customer_contacts.source IS
  'Origin of this contact row: "manual" (entered in EquipQR) or "quickbooks" (synced from QBO Customer).';

COMMENT ON COLUMN public.external_customer_contacts.source_external_id IS
  'QuickBooks Customer.Id when source = ''quickbooks''; NULL for manual rows.';

COMMENT ON COLUMN public.external_customer_contacts.source_field IS
  'The specific QBO Customer field this row represents (e.g. "primary_email", "primary_phone", "mobile", "fax") when source = ''quickbooks''; NULL for manual rows.';

COMMENT ON COLUMN public.external_customer_contacts.last_synced_at IS
  'Timestamp of the last QBO sync that wrote this row; NULL for manual rows.';

COMMENT ON COLUMN public.external_customer_contacts.source_payload IS
  'Raw QBO Customer JSON snapshot at time of sync for debugging; NULL for manual rows.';

-- ============================================
-- PART 2: Check constraint on source
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_customer_contacts_source_check'
      AND conrelid = 'public.external_customer_contacts'::regclass
  ) THEN
    ALTER TABLE public.external_customer_contacts
      ADD CONSTRAINT external_customer_contacts_source_check
      CHECK (source IN ('manual', 'quickbooks'));
  END IF;
END $$;

-- ============================================
-- PART 3: Partial unique index for QBO-sourced rows
-- Ensures at most one row per (customer, QBO field) so upsert is idempotent.
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_contacts_qbo_field
  ON public.external_customer_contacts (customer_id, source_field)
  WHERE source = 'quickbooks' AND source_field IS NOT NULL;

-- ============================================
-- PART 4: Index for org-scoped QBO contact lookups (last_synced_at filter)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ext_contacts_source
  ON public.external_customer_contacts (source)
  WHERE source = 'quickbooks';

-- RLS policies are unchanged: existing member SELECT / admin mutate policies
-- on external_customer_contacts join through customers.organization_id and remain valid.
