-- Drop duplicate/redundant policies on notes table
DROP POLICY IF EXISTS "Authors can update their own notes" ON notes;
DROP POLICY IF EXISTS "Organization members can create notes" ON notes;
DROP POLICY IF EXISTS "Organization members can view notes" ON notes;
DROP POLICY IF EXISTS "Users can manage notes in their organizations" ON notes;
DROP POLICY IF EXISTS "Users can view notes in their organizations" ON notes;

-- Keep and rename the efficient final_ policies for clarity
DROP POLICY IF EXISTS "final_notes_select_equipment_org" ON notes;
DROP POLICY IF EXISTS "final_notes_insert_equipment_org" ON notes;
DROP POLICY IF EXISTS "final_notes_update_own" ON notes;
DROP POLICY IF EXISTS "final_notes_delete_own_or_admin" ON notes;

-- Create consolidated, non-duplicate policies for notes
CREATE POLICY "notes_select_organization_members" 
  ON notes 
  FOR SELECT 
  USING (
    check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment 
      WHERE equipment.id = notes.equipment_id
    ))
  );

CREATE POLICY "notes_insert_organization_members" 
  ON notes 
  FOR INSERT 
  WITH CHECK (
    author_id = auth.uid() 
    AND check_org_access_secure(auth.uid(), (
      SELECT organization_id FROM equipment 
      WHERE equipment.id = notes.equipment_id
    ))
  );

CREATE POLICY "notes_update_own" 
  ON notes 
  FOR UPDATE 
  USING (author_id = auth.uid());

CREATE POLICY "notes_delete_own_or_admin" 
  ON notes 
  FOR DELETE 
  USING (
    author_id = auth.uid() 
    OR check_org_admin_secure(auth.uid(), (
      SELECT organization_id FROM equipment 
      WHERE equipment.id = notes.equipment_id
    ))
  );