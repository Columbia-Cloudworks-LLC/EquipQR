-- Fix missing/consolidated SELECT policy for preventative_maintenance table
-- The SELECT policy was not consolidated like INSERT and UPDATE policies were
-- This causes 406 errors when trying to read PM records, making the app think
-- no PM exists and creating duplicate records on every refresh.

BEGIN;

-- Drop any existing SELECT policies to ensure clean state
DROP POLICY IF EXISTS "Users can view PM for their organization" ON "public"."preventative_maintenance";
DROP POLICY IF EXISTS "preventative_maintenance_select" ON "public"."preventative_maintenance";

-- Create consolidated SELECT policy matching INSERT/UPDATE pattern
-- This allows organization members to view all PM records for their organization
CREATE POLICY "preventative_maintenance_select" ON "public"."preventative_maintenance" 
  FOR SELECT USING (
    "public"."is_org_member"((select "auth"."uid"()), "organization_id")
  );

-- Update statistics for query optimization
ANALYZE "public"."preventative_maintenance";

COMMIT;

