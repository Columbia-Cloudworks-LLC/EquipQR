-- Migration: drop_deprecated_billing_and_part_picker_tables
-- Purpose: Permanently remove deprecated billing tables and resurrected global
--          part-picker tables to clear all 13 unindexed_foreign_keys advisor findings.
-- Context:
--   Billing was deprecated in 20251028012503. Global part picker was removed in
--   20251210163000. The 20260114000000 baseline inadvertently recreated both sets
--   via CREATE TABLE IF NOT EXISTS, which re-introduced FK constraints that now
--   generate Supabase advisor noise.
--
-- ROLLBACK: Not recommended. If billing is re-implemented it should use a fresh
--           schema. Historical data has been inert since Jan 2025.
--
-- Affected advisor findings:
--   unindexed_foreign_keys on billing_events (2), billing_exemptions (1),
--   billing_usage (1), distributor_listing (2), organization_invitations (1),
--   organization_members (1), part_identifier (1), slot_purchases (2),
--   subscribers (1), user_license_subscriptions (1) = 13 total

BEGIN;

-- =============================================================================
-- Section A: Drop FK constraints from active tables that reference deprecated tables
-- =============================================================================

ALTER TABLE IF EXISTS public.organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_slot_purchase_id_fkey;

ALTER TABLE IF EXISTS public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_slot_purchase_id_fkey;

-- =============================================================================
-- Section B: Drop deprecated billing tables (CASCADE removes remaining FKs,
--            triggers, policies, indexes)
-- =============================================================================

DROP TABLE IF EXISTS public.billing_events CASCADE;
DROP TABLE IF EXISTS public.billing_usage CASCADE;
DROP TABLE IF EXISTS public.billing_exemptions CASCADE;
DROP TABLE IF EXISTS public.organization_subscriptions CASCADE;
DROP TABLE IF EXISTS public.organization_slots CASCADE;
DROP TABLE IF EXISTS public.slot_purchases CASCADE;
DROP TABLE IF EXISTS public.subscribers CASCADE;
DROP TABLE IF EXISTS public.user_license_subscriptions CASCADE;
DROP TABLE IF EXISTS public.stripe_event_logs CASCADE;

-- =============================================================================
-- Section C: Drop resurrected global part-picker tables
-- The baseline recreated these even though 20251210163000 already dropped them.
-- =============================================================================

DROP POLICY IF EXISTS distributor_listing_read_auth ON public.distributor_listing;
DROP POLICY IF EXISTS distributor_read_auth ON public.distributor;
DROP POLICY IF EXISTS part_identifier_read_auth ON public.part_identifier;
DROP POLICY IF EXISTS part_read_auth ON public.part;

DROP TABLE IF EXISTS public.distributor_listing CASCADE;
DROP TABLE IF EXISTS public.distributor CASCADE;
DROP TABLE IF EXISTS public.part_identifier CASCADE;
DROP TABLE IF EXISTS public.part CASCADE;

-- =============================================================================
-- Section D: Drop orphaned billing functions that reference dropped tables
-- =============================================================================

DROP FUNCTION IF EXISTS public.sync_stripe_subscription_slots CASCADE;
DROP FUNCTION IF EXISTS public.billing_is_disabled CASCADE;

COMMIT;
