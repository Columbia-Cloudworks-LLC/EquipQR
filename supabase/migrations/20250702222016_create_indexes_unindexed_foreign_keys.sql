-- Create indexes for unindexed foreign keys to improve performance

-- Equipment table indexes
CREATE INDEX IF NOT EXISTS idx_equipment_organization_id ON equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_team_id ON equipment(team_id);

-- Equipment notes indexes
CREATE INDEX IF NOT EXISTS idx_equipment_notes_equipment_id ON equipment_notes(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_notes_author_id ON equipment_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_equipment_notes_last_modified_by ON equipment_notes(last_modified_by);

-- Notes table indexes
CREATE INDEX IF NOT EXISTS idx_notes_equipment_id ON notes(equipment_id);
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);

-- Equipment note images indexes
CREATE INDEX IF NOT EXISTS idx_equipment_note_images_equipment_note_id ON equipment_note_images(equipment_note_id);
CREATE INDEX IF NOT EXISTS idx_equipment_note_images_uploaded_by ON equipment_note_images(uploaded_by);

-- Work orders indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee_id ON work_orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON work_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);

-- Work order costs indexes
CREATE INDEX IF NOT EXISTS idx_work_order_costs_work_order_id ON work_order_costs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_costs_created_by ON work_order_costs(created_by);

-- Work order notes indexes
CREATE INDEX IF NOT EXISTS idx_work_order_notes_work_order_id ON work_order_notes(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_notes_author_id ON work_order_notes(author_id);

-- Work order images indexes
CREATE INDEX IF NOT EXISTS idx_work_order_images_work_order_id ON work_order_images(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_images_uploaded_by ON work_order_images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_work_order_images_note_id ON work_order_images(note_id);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Organization invitations indexes
CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invited_by ON organization_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_accepted_by ON organization_invitations(accepted_by);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_slot_purchase_id ON organization_invitations(slot_purchase_id);

-- Scans indexes
CREATE INDEX IF NOT EXISTS idx_scans_equipment_id ON scans(equipment_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_by ON scans(scanned_by);

-- Preventative maintenance indexes
CREATE INDEX IF NOT EXISTS idx_preventative_maintenance_equipment_id ON preventative_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_preventative_maintenance_organization_id ON preventative_maintenance(organization_id);
CREATE INDEX IF NOT EXISTS idx_preventative_maintenance_work_order_id ON preventative_maintenance(work_order_id);
CREATE INDEX IF NOT EXISTS idx_preventative_maintenance_created_by ON preventative_maintenance(created_by);
CREATE INDEX IF NOT EXISTS idx_preventative_maintenance_completed_by ON preventative_maintenance(completed_by);

-- Billing and organization related indexes
CREATE INDEX IF NOT EXISTS idx_billing_events_organization_id ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_usage_organization_id ON billing_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_slots_organization_id ON organization_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_organization_id ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_slot_purchases_organization_id ON slot_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_slot_purchases_purchased_by ON slot_purchases(purchased_by);
CREATE INDEX IF NOT EXISTS idx_user_license_subscriptions_organization_id ON user_license_subscriptions(organization_id);

-- Additional performance-oriented composite indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_org_status ON work_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_org_due_date ON work_orders(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_equipment_notes_equipment_created ON equipment_notes(equipment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_status ON organization_members(organization_id, status);