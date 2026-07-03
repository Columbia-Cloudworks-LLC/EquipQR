-- Issue #1118: requestor/creator public notes; block cancelled inserts;
-- enforce private-note writes for field roles only.

CREATE OR REPLACE FUNCTION public.can_add_work_order_note(
  p_user_id uuid,
  p_work_order_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.is_org_member(p_user_id, wo.organization_id)
    AND wo.status <> 'cancelled'::public.work_order_status
    AND (
      public.is_org_admin(p_user_id, wo.organization_id)
      OR wo.created_by = p_user_id
      OR (
        wo.team_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.user_id = p_user_id
            AND tm.team_id = wo.team_id
            AND tm.role IN (
              'manager'::public.team_member_role,
              'technician'::public.team_member_role,
              'requestor'::public.team_member_role
            )
        )
      )
    )
  FROM public.work_orders wo
  WHERE wo.id = p_work_order_id;
$$;

COMMENT ON FUNCTION public.can_add_work_order_note(uuid, uuid) IS
  'True when the user may insert a work_order_notes row: org admin, creator, or team manager/technician/requestor on the work order team. Cancelled work orders are excluded.';

CREATE OR REPLACE FUNCTION public.can_write_private_work_order_note(
  p_user_id uuid,
  p_work_order_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.is_org_admin(p_user_id, wo.organization_id)
    OR (
      wo.team_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.team_members tm
        WHERE tm.user_id = p_user_id
          AND tm.team_id = wo.team_id
          AND tm.role IN (
            'manager'::public.team_member_role,
            'technician'::public.team_member_role
          )
      )
    )
  FROM public.work_orders wo
  WHERE wo.id = p_work_order_id;
$$;

COMMENT ON FUNCTION public.can_write_private_work_order_note(uuid, uuid) IS
  'True when the user may set work_order_notes.is_private = true (org admin or team manager/technician on the work order team).';

DROP POLICY IF EXISTS "work_order_notes_insert_organization_members" ON public.work_order_notes;

CREATE POLICY "work_order_notes_insert_organization_members" ON public.work_order_notes
  FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND public.can_add_work_order_note((SELECT auth.uid()), work_order_id)
    AND (
      NOT is_private
      OR public.can_write_private_work_order_note((SELECT auth.uid()), work_order_id)
    )
  );

COMMENT ON POLICY "work_order_notes_insert_organization_members" ON public.work_order_notes IS
  'Org-scoped note inserts require note-author eligibility, exclude cancelled work orders, and restrict private notes to field roles.';
