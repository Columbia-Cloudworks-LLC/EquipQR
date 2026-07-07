-- Migration: Enforce manual external contact metadata invariants (#1173)
-- Complements 20260707125008 (RPCs) and 20260707160000 (manager RLS).
-- CHECK + trigger prevent manual rows from carrying any QuickBooks sync metadata.

BEGIN;

ALTER TABLE public.external_customer_contacts
  DROP CONSTRAINT IF EXISTS external_customer_contacts_manual_provenance_null_check;

ALTER TABLE public.external_customer_contacts
  DROP CONSTRAINT IF EXISTS external_customer_contacts_manual_sync_metadata_null_check;

ALTER TABLE public.external_customer_contacts
  ADD CONSTRAINT external_customer_contacts_manual_sync_metadata_null_check
  CHECK (
    source = 'quickbooks'
    OR (
      source_external_id IS NULL
      AND source_field IS NULL
      AND last_synced_at IS NULL
      AND source_payload IS NULL
    )
  );

COMMENT ON CONSTRAINT external_customer_contacts_manual_sync_metadata_null_check
  ON public.external_customer_contacts IS
  'Manual rows must not carry QuickBooks provenance or sync metadata (source_external_id, source_field, last_synced_at, source_payload).';

COMMENT ON POLICY "external_customer_contacts_insert" ON public.external_customer_contacts IS
  'Org admins or team managers may insert pure manual contacts for linked customer teams. Supersedes admin-only policy from 20260406000003.';

COMMENT ON POLICY "external_customer_contacts_update" ON public.external_customer_contacts IS
  'Org admins or team managers may update pure manual contacts for linked customer teams. Supersedes admin-only policy from 20260406000003.';

COMMENT ON POLICY "external_customer_contacts_delete" ON public.external_customer_contacts IS
  'Org admins or team managers may delete pure manual contacts for linked customer teams. Supersedes admin-only policy from 20260406000003.';

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
