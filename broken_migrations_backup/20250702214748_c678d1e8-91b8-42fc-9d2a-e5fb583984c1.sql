-- Performance optimization: Add indexes to foreign key columns
-- Based on Supabase performance advisor recommendations

-- Index for work_order_costs table
CREATE INDEX IF NOT EXISTS idx_work_order_costs_created_by ON work_order_costs(created_by);

-- Index for work_order_notes table  
CREATE INDEX IF NOT EXISTS idx_work_order_notes_author_id ON work_order_notes(author_id);

-- Indexes for work_orders table foreign keys
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee_id ON work_orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON work_orders(team_id);

-- Composite indexes for common query patterns
-- Work orders by organization and status (common filtering pattern)
CREATE INDEX IF NOT EXISTS idx_work_orders_org_status ON work_orders(organization_id, status);

-- Work orders by organization and due date (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_work_orders_org_due_date ON work_orders(organization_id, due_date) WHERE due_date IS NOT NULL;

-- Work orders by equipment and status (equipment details page)
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_status ON work_orders(equipment_id, status);

-- Work orders by team and status (team workload queries)
CREATE INDEX IF NOT EXISTS idx_work_orders_team_status ON work_orders(team_id, status) WHERE team_id IS NOT NULL;