-- Migration: Allow team managers to manage external customer contacts (#1173)
-- Team managers who manage a team linked to a customer account may INSERT/UPDATE/DELETE
-- manual external contacts for that customer. Org owners/admins retain full access.
-- QuickBooks-synced rows remain protected at the application layer (no edit/delete UI).

BEGIN;

DROP POLICY IF EXISTS "external_customer_contacts_insert" ON public.external_customer_contacts;
CREATE POLICY "external_customer_contacts_insert"
  ON public.external_customer_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND (
          public.is_org_admin((SELECT auth.uid()), c.organization_id)
          OR EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.team_members tm ON tm.team_id = t.id
            WHERE t.customer_id = c.id
              AND t.organization_id = c.organization_id
              AND tm.user_id = (SELECT auth.uid())
              AND tm.role = 'manager'::public.team_member_role
          )
        )
    )
  );

DROP POLICY IF EXISTS "external_customer_contacts_update" ON public.external_customer_contacts;
CREATE POLICY "external_customer_contacts_update"
  ON public.external_customer_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND (
          public.is_org_admin((SELECT auth.uid()), c.organization_id)
          OR EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.team_members tm ON tm.team_id = t.id
            WHERE t.customer_id = c.id
              AND t.organization_id = c.organization_id
              AND tm.user_id = (SELECT auth.uid())
              AND tm.role = 'manager'::public.team_member_role
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND (
          public.is_org_admin((SELECT auth.uid()), c.organization_id)
          OR EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.team_members tm ON tm.team_id = t.id
            WHERE t.customer_id = c.id
              AND t.organization_id = c.organization_id
              AND tm.user_id = (SELECT auth.uid())
              AND tm.role = 'manager'::public.team_member_role
          )
        )
    )
  );

DROP POLICY IF EXISTS "external_customer_contacts_delete" ON public.external_customer_contacts;
CREATE POLICY "external_customer_contacts_delete"
  ON public.external_customer_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND (
          public.is_org_admin((SELECT auth.uid()), c.organization_id)
          OR EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.team_members tm ON tm.team_id = t.id
            WHERE t.customer_id = c.id
              AND t.organization_id = c.organization_id
              AND tm.user_id = (SELECT auth.uid())
              AND tm.role = 'manager'::public.team_member_role
          )
        )
    )
  );

COMMIT;
