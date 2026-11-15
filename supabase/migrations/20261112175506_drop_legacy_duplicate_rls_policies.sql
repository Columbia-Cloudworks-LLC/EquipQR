-- Migration: drop legacy duplicate RLS policies that production no longer has
-- Purpose: the migration chain still creates 17 older permissive policies on
--   four tables that were removed from production outside of a migration.
--   Every database built from the chain (preview, local, CI, ephemeral
--   branches) therefore carried them, and the Supabase performance advisor
--   reported 53 `multiple_permissive_policies` (0006) warnings there that
--   production does not have.
--
--   Dropping them makes the chain produce exactly production's policy set on
--   these tables. On production every statement below is a no-op, because
--   none of these policies exist there (verified 2026-11-12).
--
--   Two of the dropped policies were broader than the policies that remain:
--     - work_orders.members_access_work_orders (FOR ALL, any org member)
--       also allowed DELETE; with it gone, DELETE is admin-only, as in
--       production.
--     - organization_members_{insert,update,delete} applied to every role;
--       the remaining *_safe policies apply to `authenticated` only.
--   The rest duplicated, or were subsumed by, a policy that remains.
-- Affected tables: public.equipment_note_images, public.organization_members,
--   public.teams, public.work_orders

BEGIN;

-- equipment_note_images: identical copies of equipment_note_images_insert/_select
DROP POLICY IF EXISTS "Users can upload images to their notes" ON "public"."equipment_note_images";
DROP POLICY IF EXISTS "Users can view images for accessible notes" ON "public"."equipment_note_images";

-- organization_members: organization_members_*_safe remain
DROP POLICY IF EXISTS "organization_members_insert" ON "public"."organization_members";
DROP POLICY IF EXISTS "organization_members_update" ON "public"."organization_members";
DROP POLICY IF EXISTS "organization_members_delete" ON "public"."organization_members";

-- teams: teams_select_consolidated and teams_admin_insert/_update/_delete remain
DROP POLICY IF EXISTS "admins_manage_teams" ON "public"."teams";
DROP POLICY IF EXISTS "admins_delete_teams" ON "public"."teams";
DROP POLICY IF EXISTS "admins_update_teams" ON "public"."teams";
DROP POLICY IF EXISTS "members_view_teams" ON "public"."teams";

-- work_orders: work_orders_select/_insert/_update_consolidated and
-- "Admins can delete work orders" remain
DROP POLICY IF EXISTS "members_access_work_orders" ON "public"."work_orders";
DROP POLICY IF EXISTS "admins_delete_work_orders" ON "public"."work_orders";
DROP POLICY IF EXISTS "Admins can create historical work orders" ON "public"."work_orders";
DROP POLICY IF EXISTS "Users can create work orders in their organization" ON "public"."work_orders";
DROP POLICY IF EXISTS "Users can view work orders in their organization" ON "public"."work_orders";
DROP POLICY IF EXISTS "Admins can update historical work orders" ON "public"."work_orders";
DROP POLICY IF EXISTS "Users can update work orders in their organization" ON "public"."work_orders";

COMMIT;
