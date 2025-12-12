-- Migration: Remove Global Part Picker Tables
-- Description: Drops the old global part picker architecture tables and associated policies/indexes
-- Date: 2025-12-10

BEGIN;

-- Drop RLS policies first
DO $$ 
BEGIN
  DROP POLICY IF EXISTS distributor_listing_read_auth ON distributor_listing;
  DROP POLICY IF EXISTS distributor_read_auth ON distributor;
  DROP POLICY IF EXISTS part_identifier_read_auth ON part_identifier;
  DROP POLICY IF EXISTS part_read_auth ON part;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS ix_listing_distributor;
DROP INDEX IF EXISTS ix_listing_part;
DROP INDEX IF EXISTS ix_part_identifier_normalized;
DROP INDEX IF EXISTS ix_part_identifier_part;
DROP INDEX IF EXISTS ux_part_canonical_mpn;

-- Drop tables in dependency order
DROP TABLE IF EXISTS distributor_listing CASCADE;
DROP TABLE IF EXISTS distributor CASCADE;
DROP TABLE IF EXISTS part_identifier CASCADE;
DROP TABLE IF EXISTS part CASCADE;

COMMIT;

