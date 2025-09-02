-- Add missing foreign key indexes identified in performance analysis
-- These indexes are critical for join performance and RLS policy efficiency

-- Missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_slot_purchase_id ON organization_members(slot_purchase_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON subscribers(user_id);

-- Additional composite indexes for equipment notes optimization
CREATE INDEX IF NOT EXISTS idx_equipment_notes_equipment_author ON equipment_notes(equipment_id, author_id);
CREATE INDEX IF NOT EXISTS idx_equipment_notes_equipment_created ON equipment_notes(equipment_id, created_at DESC);

-- Team-based query optimization indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(user_id, team_id);

-- Organization member lookup optimization
CREATE INDEX IF NOT EXISTS idx_organization_members_user_status ON organization_members(user_id, status) WHERE status = 'active';

-- Work order assignment optimization
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee_status ON work_orders(assignee_id, status) WHERE assignee_id IS NOT NULL;