-- Add RLS policies for pm_status_history table
CREATE POLICY "Admins can insert PM status history" 
ON pm_status_history 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM preventative_maintenance pm
        WHERE pm.id = pm_status_history.pm_id 
        AND is_org_admin(auth.uid(), pm.organization_id)
    ) AND changed_by = auth.uid()
);

CREATE POLICY "Users can view PM status history for their organization" 
ON pm_status_history 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM preventative_maintenance pm
        WHERE pm.id = pm_status_history.pm_id 
        AND is_org_member(auth.uid(), pm.organization_id)
    )
);