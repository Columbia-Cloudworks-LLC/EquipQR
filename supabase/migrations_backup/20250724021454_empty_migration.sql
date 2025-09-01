-- Add missing UPDATE and DELETE policies for equipment_working_hours_history
CREATE POLICY "Admins can update working hours history"
ON public.equipment_working_hours_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = equipment_working_hours_history.equipment_id
    AND is_org_admin(auth.uid(), e.organization_id)
  )
);

CREATE POLICY "Admins can delete working hours history"
ON public.equipment_working_hours_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.equipment e
    WHERE e.id = equipment_working_hours_history.equipment_id
    AND is_org_admin(auth.uid(), e.organization_id)
  )
);