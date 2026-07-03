-- Issue #1118: requestor/creator public notes; block cancelled inserts;
-- enforce private-note writes for field roles only.

DROP POLICY IF EXISTS "work_order_notes_insert_organization_members" ON public.work_order_notes;

CREATE POLICY "work_order_notes_insert_organization_members" ON public.work_order_notes
  FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = work_order_notes.work_order_id
        AND public.is_org_member((SELECT auth.uid()), wo.organization_id)
        AND wo.status <> 'cancelled'::public.work_order_status
        AND (
          public.is_org_admin((SELECT auth.uid()), wo.organization_id)
          OR wo.created_by = (SELECT auth.uid())
          OR (
            wo.team_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.team_members tm
              WHERE tm.user_id = (SELECT auth.uid())
                AND tm.team_id = wo.team_id
                AND tm.role IN (
                  'owner'::public.team_member_role,
                  'manager'::public.team_member_role,
                  'technician'::public.team_member_role,
                  'requestor'::public.team_member_role
                )
            )
          )
        )
    )
    AND (
      NOT is_private
      OR EXISTS (
        SELECT 1
        FROM public.work_orders wo
        WHERE wo.id = work_order_notes.work_order_id
          AND public.is_org_member((SELECT auth.uid()), wo.organization_id)
          AND (
            public.is_org_admin((SELECT auth.uid()), wo.organization_id)
            OR (
              wo.team_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.user_id = (SELECT auth.uid())
                  AND tm.team_id = wo.team_id
                  AND tm.role IN (
                    'owner'::public.team_member_role,
                    'manager'::public.team_member_role,
                    'technician'::public.team_member_role
                  )
              )
            )
          )
      )
    )
  );

COMMENT ON POLICY "work_order_notes_insert_organization_members" ON public.work_order_notes IS
  'Org-scoped note inserts require note-author eligibility, exclude cancelled work orders, and restrict private notes to field roles.';

DROP FUNCTION IF EXISTS public.can_add_work_order_note(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_write_private_work_order_note(uuid, uuid);
