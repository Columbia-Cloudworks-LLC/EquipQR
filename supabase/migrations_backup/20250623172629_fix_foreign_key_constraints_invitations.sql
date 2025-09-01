
-- First, drop any existing RLS policies on work_order_notes table
DROP POLICY IF EXISTS "Users can view work order notes in their organization" ON work_order_notes;
DROP POLICY IF EXISTS "Users can create work order notes in their organization" ON work_order_notes;
DROP POLICY IF EXISTS "Users can update their own work order notes" ON work_order_notes;
DROP POLICY IF EXISTS "Users can delete their own work order notes" ON work_order_notes;

-- Add foreign key constraint between work_order_notes.author_id and profiles.id
ALTER TABLE work_order_notes 
ADD CONSTRAINT fk_work_order_notes_author 
FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Enable RLS on work_order_notes table
ALTER TABLE work_order_notes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for work_order_notes table
CREATE POLICY "Users can view work order notes in their organization" 
  ON work_order_notes 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id 
        AND wo.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
    AND (NOT is_private OR author_id = auth.uid())
  );

CREATE POLICY "Users can create work order notes in their organization" 
  ON work_order_notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_notes.work_order_id 
        AND wo.organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

CREATE POLICY "Users can update their own work order notes" 
  ON work_order_notes 
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own work order notes" 
  ON work_order_notes 
  FOR DELETE 
  USING (author_id = auth.uid());
