-- Migration: Allow team managers to manage external customer contacts (#1173)
-- Replaces admin-only INSERT/UPDATE/DELETE policies from
-- 20260406000003_create_external_customer_contacts.sql.
-- Team managers who manage a team linked to a customer account may INSERT/UPDATE/DELETE
-- manual external contacts for that customer. Org owners/admins retain full access.
-- QuickBooks-synced rows (source = 'quickbooks') remain immutable for team managers at RLS.

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

-- Manual rows must not carry QBO provenance metadata (prevents misclassified legacy rows).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_customer_contacts_manual_provenance_null_check'
      AND conrelid = 'public.external_customer_contacts'::regclass
  ) THEN
    ALTER TABLE public.external_customer_contacts
      ADD CONSTRAINT external_customer_contacts_manual_provenance_null_check
      CHECK (
        source = 'quickbooks'
        OR (source_external_id IS NULL AND source_field IS NULL)
      );
  END IF;
END $$;

COMMIT;
