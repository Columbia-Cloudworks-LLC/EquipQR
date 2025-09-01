-- Remove the incorrect team_id column from work_orders table
-- Work orders should get team information through equipment assignment, not direct team assignment

-- First, remove any indexes that reference the team_id column
DROP INDEX IF EXISTS idx_work_orders_team_id;
DROP INDEX IF EXISTS idx_work_orders_team_status;

-- Remove the team_id column from work_orders table
ALTER TABLE work_orders DROP COLUMN IF EXISTS team_id;