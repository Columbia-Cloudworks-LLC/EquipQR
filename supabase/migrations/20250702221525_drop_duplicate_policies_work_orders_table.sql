-- Drop duplicate/redundant policies on work_orders table
DROP POLICY IF EXISTS "Organization members can create work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization members can update work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization members can view work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can create work orders" ON work_orders;
DROP POLICY IF EXISTS "Users can view organization work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can manage work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can update work orders" ON work_orders;
DROP POLICY IF EXISTS "Organization admins can delete work orders" ON work_orders;
DROP POLICY IF EXISTS "Assigned users can update work orders" ON work_orders;

-- Create consolidated, non-duplicate policies for work_orders
CREATE POLICY "work_orders_select_organization_members" 
  ON work_orders 
  FOR SELECT 
  USING (
    check_org_access_secure(auth.uid(), organization_id)
  );

CREATE POLICY "work_orders_insert_organization_members" 
  ON work_orders 
  FOR INSERT 
  WITH CHECK (
    check_org_access_secure(auth.uid(), organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "work_orders_update_organization_members" 
  ON work_orders 
  FOR UPDATE 
  USING (
    check_org_access_secure(auth.uid(), organization_id)
    AND (
      -- Organization admins can update any work order
      check_org_admin_secure(auth.uid(), organization_id)
      -- Or assigned users can update their assigned work orders
      OR assignee_id = auth.uid()
      -- Or team managers can update work orders assigned to their teams
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = work_orders.team_id 
        AND tm.user_id = auth.uid() 
        AND tm.role = 'manager'
      )
    )
  );

CREATE POLICY "work_orders_delete_admins" 
  ON work_orders 
  FOR DELETE 
  USING (
    check_org_admin_secure(auth.uid(), organization_id)
  );