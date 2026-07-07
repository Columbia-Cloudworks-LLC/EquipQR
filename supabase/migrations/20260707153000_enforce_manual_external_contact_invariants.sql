-- Migration: Enforce manual external contact metadata invariants (#1173)
-- CHECK constraint is established in 20260707125008 after legacy cleanup.
-- This migration adds a BEFORE trigger for defense-in-depth nulling on manual rows.

BEGIN;

COMMENT ON CONSTRAINT external_customer_contacts_manual_sync_metadata_null_check
  ON public.external_customer_contacts IS
  'Manual rows must not carry QuickBooks provenance or sync metadata (source_external_id, source_field, last_synced_at, source_payload).';

CREATE OR REPLACE FUNCTION public.enforce_manual_external_contact_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.source = 'manual' THEN
    NEW.source_external_id := NULL;
    NEW.source_field := NULL;
    NEW.last_synced_at := NULL;
    NEW.source_payload := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_manual_external_contact_metadata ON public.external_customer_contacts;
CREATE TRIGGER enforce_manual_external_contact_metadata
  BEFORE INSERT OR UPDATE ON public.external_customer_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_manual_external_contact_metadata();

COMMIT;
