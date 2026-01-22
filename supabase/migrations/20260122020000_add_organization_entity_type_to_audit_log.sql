-- ============================================================================
-- Migration: Add 'organization' to audit_log entity_type check constraint
-- 
-- Problem: The delete_organization function (from 20260122010000) tries to insert
-- an audit log entry with entity_type = 'organization', but this value is not
-- included in the audit_log_entity_type_check constraint.
-- 
-- Error: "new row for relation "audit_log" violates check constraint 
--        "audit_log_entity_type_check""
--
-- Solution: Update the check constraint to include 'organization' as a valid
-- entity type for audit logging.
--
-- Rollback Instructions:
-- To revert this migration, run:
--   ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_entity_type_check;
--   ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_entity_type_check 
--     CHECK (entity_type IN (
--       'equipment', 'work_order', 'inventory_item', 'preventative_maintenance',
--       'organization_member', 'team_member', 'team', 'pm_template'
--     ));
-- Note: Rolling back will break organization deletion if any orgs are deleted
-- after this migration is applied.
-- ============================================================================

BEGIN;

-- Drop the existing check constraint
ALTER TABLE public.audit_log 
DROP CONSTRAINT IF EXISTS audit_log_entity_type_check;

-- Re-create with 'organization' included in the allowed values
ALTER TABLE public.audit_log 
ADD CONSTRAINT audit_log_entity_type_check 
CHECK (entity_type IN (
  'equipment', 
  'work_order', 
  'inventory_item', 
  'preventative_maintenance',
  'organization_member',
  'team_member',
  'team',
  'pm_template',
  'organization'  -- Added to support organization deletion audit logging
));

-- Add comment documenting the change
COMMENT ON CONSTRAINT audit_log_entity_type_check ON public.audit_log IS 
'Allowed entity types for audit logging. Includes organization for deletion events.';

COMMIT;
