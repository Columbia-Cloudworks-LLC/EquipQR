-- Migration: Quick Equipment Creation Support
-- Description: Documents the permission model for team member equipment creation
-- Date: 2026-01-14
-- Purpose: Allow technicians to create equipment inline during work order creation

-- NOTE: The existing RLS policy "equipment_member_access" already allows org members
-- to INSERT equipment records:
--
--   CREATE POLICY "equipment_member_access" ON "public"."equipment"
--     FOR ALL USING ("public"."is_org_member"((select "auth"."uid"()), "organization_id"));
--
-- This policy permits any organization member to create equipment. The restriction
-- that technicians can only create equipment FOR THEIR TEAM is enforced at the
-- application layer (frontend permissions + service validation).
--
-- We intentionally do NOT add a more restrictive RLS policy because:
-- 1. RLS policies are ORed - adding a restrictive policy won't limit the broader one
-- 2. Admins/owners need the ability to create equipment without team assignment
-- 3. Application-layer enforcement provides better error messages for users

-- This migration is intentionally empty as no schema changes are required.
-- The equipment creation permission model:
--   - Admins/Owners: Can create equipment for any team or no team
--   - Team Members: Can create equipment only for teams they belong to (frontend enforced)

BEGIN;

-- Add a comment to the equipment table documenting the permission model
COMMENT ON TABLE public.equipment IS 
  'Equipment records with multi-tenancy. INSERT permissions: admins can create any equipment; team members can create equipment for their team (enforced in application layer).';

COMMIT;
