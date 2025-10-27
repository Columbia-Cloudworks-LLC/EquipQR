-- RLS Performance Index Optimization
-- Adds strategic indexes for RLS helper function performance
-- Generated: 2025-01-26
--
-- Strategy: Add composite indexes that support:
-- 1. is_org_admin() and is_org_member() function queries on organization_members
-- 2. Common RLS filter patterns in policies

BEGIN;

-- =============================================================================
-- PART 1: Critical Indexes for RLS Helper Functions
-- =============================================================================

-- organization_members table optimization for is_org_admin() and is_org_member()
-- These functions query (user_id, organization_id, role, status)
-- We want to ensure we have optimal indexes for both directions of lookup

-- Index for is_org_member: (user_id, organization_id, status) WHERE status='active'
-- Check if optimal index exists, create if missing
CREATE INDEX IF NOT EXISTS "idx_organization_members_user_org_status_active" 
ON "public"."organization_members" ("user_id", "organization_id", "status") 
WHERE status = 'active';

-- Index for is_org_admin: (user_id, organization_id, role, status) WHERE role IN ('owner','admin') AND status='active'  
CREATE INDEX IF NOT EXISTS "idx_organization_members_admin_quick" 
ON "public"."organization_members" ("user_id", "organization_id") 
WHERE role IN ('owner', 'admin') AND status = 'active';

-- =============================================================================
-- PART 2: Composite Indexes for Common RLS Patterns
-- =============================================================================

-- Work orders often filtered by organization_id + status
CREATE INDEX IF NOT EXISTS "idx_work_orders_org_status_composite" 
ON "public"."work_orders" ("organization_id", "status");

-- Equipment filtered by organization + team  
CREATE INDEX IF NOT EXISTS "idx_equipment_org_team" 
ON "public"."equipment" ("organization_id", "team_id");

-- PM records filtered by organization + status
CREATE INDEX IF NOT EXISTS "idx_pm_org_status_composite" 
ON "public"."preventative_maintenance" ("organization_id", "status");

-- =============================================================================
-- PART 3: Update Statistics
-- =============================================================================

ANALYZE "public"."organization_members";
ANALYZE "public"."work_orders";
ANALYZE "public"."equipment";
ANALYZE "public"."preventative_maintenance";

COMMIT;

