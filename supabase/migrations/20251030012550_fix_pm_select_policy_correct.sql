-- Fix PM SELECT policy (corrected version)
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Drop any existing SELECT policies to ensure clean state
DROP POLICY IF EXISTS "Users can view PM for their organization" ON "public"."preventative_maintenance";
DROP POLICY IF EXISTS "preventative_maintenance_select" ON "public"."preventative_maintenance";

-- Create consolidated SELECT policy
CREATE POLICY IF NOT EXISTS "preventative_maintenance_select" ON "public"."preventative_maintenance" 
  FOR SELECT USING (
    "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  );

COMMIT;

