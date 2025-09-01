
-- 1) Allow org admins/owners to DELETE equipment
CREATE POLICY admins_delete_equipment
ON public.equipment
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- 2) Allow org admins/owners to DELETE equipment notes
CREATE POLICY admins_delete_equipment_notes
ON public.equipment_notes
FOR DELETE
USING (
  is_org_admin(
    auth.uid(),
    (SELECT e.organization_id FROM public.equipment e WHERE e.id = equipment_notes.equipment_id)
  )
);

-- 3) Allow org admins/owners to DELETE equipment note images
CREATE POLICY admins_delete_equipment_note_images
ON public.equipment_note_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.equipment_notes en
    JOIN public.equipment e ON e.id = en.equipment_id
    WHERE en.id = equipment_note_images.equipment_note_id
      AND is_org_admin(auth.uid(), e.organization_id)
  )
);

-- 4) Allow org admins/owners to DELETE preventative maintenance
CREATE POLICY admins_delete_preventative_maintenance
ON public.preventative_maintenance
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- 5) Work order family: allow org admins/owners to DELETE
-- work_orders
CREATE POLICY admins_delete_work_orders
ON public.work_orders
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- work_order_images
CREATE POLICY admins_delete_work_order_images
ON public.work_order_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.work_orders wo
    WHERE wo.id = work_order_images.work_order_id
      AND is_org_admin(auth.uid(), wo.organization_id)
  )
);

-- work_order_notes
CREATE POLICY admins_delete_work_order_notes
ON public.work_order_notes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.work_orders wo
    WHERE wo.id = work_order_notes.work_order_id
      AND is_org_admin(auth.uid(), wo.organization_id)
  )
);

-- work_order_costs
CREATE POLICY admins_delete_work_order_costs
ON public.work_order_costs
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.work_orders wo
    WHERE wo.id = work_order_costs.work_order_id
      AND is_org_admin(auth.uid(), wo.organization_id)
  )
);

-- work_order_status_history
CREATE POLICY admins_delete_work_order_status_history
ON public.work_order_status_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.work_orders wo
    WHERE wo.id = work_order_status_history.work_order_id
      AND is_org_admin(auth.uid(), wo.organization_id)
  )
);
