-- Create consolidated, non-duplicate policies with clear naming
CREATE POLICY "work_order_notes_select_organization_members" 
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

CREATE POLICY "work_order_notes_insert_organization_members" 
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

CREATE POLICY "work_order_notes_update_own" 
  ON work_order_notes 
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "work_order_notes_delete_own" 
  ON work_order_notes 
  FOR DELETE 
  USING (author_id = auth.uid());