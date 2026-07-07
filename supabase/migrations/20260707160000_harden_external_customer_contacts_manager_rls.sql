-- Migration: Harden team-manager external_customer_contacts write policies (#1173)
-- Explicitly supersedes admin-only INSERT/UPDATE/DELETE policies from
-- 20260406000003_create_external_customer_contacts.sql (lines 65-109).
-- Aligns RLS with org-scoped SECURITY DEFINER RPCs in 20260707125008.

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
          OR (
            external_customer_contacts.source = 'manual'
            AND external_customer_contacts.source_external_id IS NULL
            AND external_customer_contacts.source_field IS NULL
            AND external_customer_contacts.last_synced_at IS NULL
            AND external_customer_contacts.source_payload IS NULL
            AND EXISTS (
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
          OR (
            external_customer_contacts.source = 'manual'
            AND external_customer_contacts.source_external_id IS NULL
            AND external_customer_contacts.source_field IS NULL
            AND external_customer_contacts.last_synced_at IS NULL
            AND external_customer_contacts.source_payload IS NULL
            AND EXISTS (
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND (
          public.is_org_admin((SELECT auth.uid()), c.organization_id)
          OR (
            external_customer_contacts.source = 'manual'
            AND external_customer_contacts.source_external_id IS NULL
            AND external_customer_contacts.source_field IS NULL
            AND external_customer_contacts.last_synced_at IS NULL
            AND external_customer_contacts.source_payload IS NULL
            AND EXISTS (
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
          OR (
            external_customer_contacts.source = 'manual'
            AND external_customer_contacts.source_external_id IS NULL
            AND external_customer_contacts.source_field IS NULL
            AND external_customer_contacts.last_synced_at IS NULL
            AND external_customer_contacts.source_payload IS NULL
            AND EXISTS (
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
  );

COMMENT ON POLICY "external_customer_contacts_insert" ON public.external_customer_contacts IS
  'Org admins or team managers may insert pure manual contacts for linked customer teams. Supersedes admin-only policy from 20260406000003.';

COMMENT ON POLICY "external_customer_contacts_update" ON public.external_customer_contacts IS
  'Org admins or team managers may update pure manual contacts for linked customer teams. Supersedes admin-only policy from 20260406000003.';

COMMENT ON POLICY "external_customer_contacts_delete" ON public.external_customer_contacts IS
  'Org admins or team managers may delete pure manual contacts for linked customer teams. Supersedes admin-only policy from 20260406000003.';

COMMIT;
