-- Drop duplicate/redundant policies on scans table
DROP POLICY IF EXISTS "Organization members can create scans" ON scans;
DROP POLICY IF EXISTS "Organization members can view scans" ON scans;
DROP POLICY IF EXISTS "Users can create scans in their organizations" ON scans;
DROP POLICY IF EXISTS "Users can view scans in their organizations" ON scans;

-- Keep and rename the efficient final_ policies for clarity
DROP POLICY IF EXISTS "final_scans_select_equipment_org" ON scans;
DROP POLICY IF EXISTS "final_scans_insert_equipment_org" ON scans;
DROP POLICY IF EXISTS "final_scans_update_own" ON scans;
DROP POLICY IF EXISTS "final_scans_delete_admins" ON scans;

-- Create consolidated, non-duplicate policies for scans
CREATE POLICY "scans_select_organization_members" 
  ON scans 
  FOR SELECT 
  USING (
    check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment 
      WHERE equipment.id = scans.equipment_id
    ))
  );

CREATE POLICY "scans_insert_organization_members" 
  ON scans 
  FOR INSERT 
  WITH CHECK (
    scanned_by = auth.uid() 
    AND check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment 
      WHERE equipment.id = scans.equipment_id
    ))
  );

CREATE POLICY "scans_update_own" 
  ON scans 
  FOR UPDATE 
  USING (scanned_by = auth.uid());

CREATE POLICY "scans_delete_admins" 
  ON scans 
  FOR DELETE 
  USING (
    check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM equipment 
      WHERE equipment.id = scans.equipment_id
    ))
  );