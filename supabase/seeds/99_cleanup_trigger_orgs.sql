-- =====================================================
-- EquipQR Seed Data - Cleanup Trigger-Created Organizations
-- =====================================================
-- This file runs LAST (99_) and removes any organizations created by the
-- handle_new_user trigger during seeding.
--
-- The trigger fires when auth.users are inserted, creating an organization
-- for each user. But we want users to use our seeded organizations with
-- specific UUIDs, not the trigger-created ones.
--
-- This cleanup:
-- 1. Identifies orgs created by the trigger (not in our seed list)
-- 2. Deletes the organization_members for those orgs
-- 3. Deletes the organizations themselves
-- =====================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- Define the list of INTENDED organization IDs from our seeds
-- ═══════════════════════════════════════════════════════════════════════════════
-- These are the 8 organizations we intentionally seeded in 03_organizations.sql
-- Any organization NOT in this list was created by the trigger and should be removed.

DO $$
DECLARE
  intended_org_ids uuid[] := ARRAY[
    -- Business Organizations
    '660e8400-e29b-41d4-a716-446655440000'::uuid,  -- Apex Construction Company
    '660e8400-e29b-41d4-a716-446655440001'::uuid,  -- Metro Equipment Services
    '660e8400-e29b-41d4-a716-446655440002'::uuid,  -- Valley Landscaping
    '660e8400-e29b-41d4-a716-446655440003'::uuid,  -- Industrial Rentals Corp
    -- Personal Organizations
    '660e8400-e29b-41d4-a716-446655440004'::uuid,  -- Amanda's Equipment Services
    '660e8400-e29b-41d4-a716-446655440005'::uuid,  -- Tom's Field Services
    '660e8400-e29b-41d4-a716-446655440006'::uuid,  -- Mike's Repair Shop
    '660e8400-e29b-41d4-a716-446655440007'::uuid   -- Multi Org Consulting
  ];
  deleted_org_count int;
  deleted_member_count int;
BEGIN
  -- Step 1: Delete organization_members for trigger-created orgs
  WITH deleted_members AS (
    DELETE FROM public.organization_members
    WHERE organization_id NOT IN (SELECT unnest(intended_org_ids))
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_member_count FROM deleted_members;

  -- Step 2: Delete the trigger-created organizations
  WITH deleted_orgs AS (
    DELETE FROM public.organizations
    WHERE id NOT IN (SELECT unnest(intended_org_ids))
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_org_count FROM deleted_orgs;

  -- Log what was cleaned up
  IF deleted_org_count > 0 OR deleted_member_count > 0 THEN
    RAISE NOTICE '🧹 Seed cleanup: Removed % trigger-created org(s) and % membership(s)', 
      deleted_org_count, deleted_member_count;
  ELSE
    RAISE NOTICE '✅ Seed cleanup: No trigger-created organizations to remove';
  END IF;
END
$$;
