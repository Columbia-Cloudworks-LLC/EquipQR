-- Migration: drop equipment serial UNIQUE, keep a non-unique lookup index
-- Purpose: Serial numbers are NOT a guaranteed-unique business key. Operators
--   legitimately need to create equipment that may share a serial with an
--   existing record (mis-keyed serials, refurbished units, vendor reuse). The
--   prior UNIQUE (organization_id, serial_number) constraint turned every such
--   case into a hard 409/23505 failure and, combined with the offline queue,
--   produced infinite "failed to sync" retries on records that already existed.
--   The product contract is now: warn the operator about a possible duplicate
--   (with a link to the existing record) but never block creation.
-- Affected tables: public.equipment
-- Notes: Follows EquipQR's "never edit applied migrations" rule. The dropped
--   constraint's backing unique index is removed automatically; we add a plain
--   (non-unique) composite index so the client-side duplicate lookup
--   (EquipmentService.findBySerial) and offline idempotency replay stay fast.

BEGIN;

ALTER TABLE public.equipment
  DROP CONSTRAINT IF EXISTS equipment_organization_id_serial_number_key;

CREATE INDEX IF NOT EXISTS equipment_org_serial_idx
  ON public.equipment (organization_id, serial_number);

COMMIT;
