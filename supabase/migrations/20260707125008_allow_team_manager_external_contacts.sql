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

-- Normalize legacy manual rows before enforcing provenance invariant.
UPDATE public.external_customer_contacts
SET
  source_external_id = NULL,
  source_field = NULL,
  last_synced_at = NULL,
  source_payload = NULL
WHERE source = 'manual'
  AND (
    source_external_id IS NOT NULL
    OR source_field IS NOT NULL
    OR last_synced_at IS NOT NULL
    OR source_payload IS NOT NULL
  );

ALTER TABLE public.external_customer_contacts
  DROP CONSTRAINT IF EXISTS external_customer_contacts_manual_provenance_null_check;

ALTER TABLE public.external_customer_contacts
  DROP CONSTRAINT IF EXISTS external_customer_contacts_manual_sync_metadata_null_check;

ALTER TABLE public.external_customer_contacts
  ADD CONSTRAINT external_customer_contacts_manual_sync_metadata_null_check
  CHECK (
    source = 'quickbooks'
    OR (
      source_external_id IS NULL
      AND source_field IS NULL
      AND last_synced_at IS NULL
      AND source_payload IS NULL
    )
  );

COMMENT ON CONSTRAINT external_customer_contacts_manual_sync_metadata_null_check
  ON public.external_customer_contacts IS
  'Manual rows must not carry QuickBooks provenance or sync metadata (source_external_id, source_field, last_synced_at, source_payload).';

-- rpc-authenticated-grant-allowed: can_manage_manual_external_customer_contact
DROP FUNCTION IF EXISTS public.can_manage_manual_external_customer_contact(uuid);

CREATE OR REPLACE FUNCTION public.can_manage_manual_external_customer_contact(
  p_organization_id uuid,
  p_customer_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = p_customer_id
      AND c.organization_id = p_organization_id
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_manual_external_customer_contact(uuid, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.create_manual_external_customer_contact(uuid, text, text, text, text, text);

-- rpc-authenticated-grant-allowed: create_manual_external_customer_contact
CREATE OR REPLACE FUNCTION public.create_manual_external_customer_contact(
  p_organization_id uuid,
  p_customer_id uuid,
  p_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.external_customer_contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.external_customer_contacts;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_manage_manual_external_customer_contact(p_organization_id, p_customer_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO public.external_customer_contacts (
    customer_id,
    name,
    email,
    phone,
    role,
    notes,
    source,
    source_external_id,
    source_field,
    last_synced_at,
    source_payload
  )
  VALUES (
    p_customer_id,
    p_name,
    p_email,
    p_phone,
    p_role,
    p_notes,
    'manual',
    NULL,
    NULL,
    NULL,
    NULL
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_manual_external_customer_contact(uuid, uuid, text, text, text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.update_manual_external_customer_contact(uuid, text, text, text, text, text);

-- rpc-authenticated-grant-allowed: update_manual_external_customer_contact
CREATE OR REPLACE FUNCTION public.update_manual_external_customer_contact(
  p_organization_id uuid,
  p_contact_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_role text,
  p_notes text
)
RETURNS public.external_customer_contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.external_customer_contacts;
  v_org_id uuid;
  v_source text;
  v_source_external_id text;
  v_source_field text;
  v_customer_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    ecc.customer_id,
    ecc.source,
    ecc.source_external_id,
    ecc.source_field,
    c.organization_id
  INTO
    v_customer_id,
    v_source,
    v_source_external_id,
    v_source_field,
    v_org_id
  FROM public.external_customer_contacts ecc
  JOIN public.customers c ON c.id = ecc.customer_id
  WHERE ecc.id = p_contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  IF v_org_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF public.is_org_admin((SELECT auth.uid()), v_org_id) THEN
    NULL;
  ELSIF v_source = 'manual'
    AND v_source_external_id IS NULL
    AND v_source_field IS NULL
    AND public.can_manage_manual_external_customer_contact(p_organization_id, v_customer_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.external_customer_contacts
  SET
    name = p_name,
    email = p_email,
    phone = p_phone,
    role = p_role,
    notes = p_notes
  WHERE id = p_contact_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_manual_external_customer_contact(uuid, uuid, text, text, text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.delete_manual_external_customer_contact(uuid);

-- rpc-authenticated-grant-allowed: delete_manual_external_customer_contact
CREATE OR REPLACE FUNCTION public.delete_manual_external_customer_contact(
  p_organization_id uuid,
  p_contact_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_source text;
  v_source_external_id text;
  v_source_field text;
  v_customer_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    ecc.customer_id,
    ecc.source,
    ecc.source_external_id,
    ecc.source_field,
    c.organization_id
  INTO
    v_customer_id,
    v_source,
    v_source_external_id,
    v_source_field,
    v_org_id
  FROM public.external_customer_contacts ecc
  JOIN public.customers c ON c.id = ecc.customer_id
  WHERE ecc.id = p_contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  IF v_org_id IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF public.is_org_admin((SELECT auth.uid()), v_org_id) THEN
    NULL;
  ELSIF v_source = 'manual'
    AND v_source_external_id IS NULL
    AND v_source_field IS NULL
    AND public.can_manage_manual_external_customer_contact(p_organization_id, v_customer_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM public.external_customer_contacts WHERE id = p_contact_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_manual_external_customer_contact(uuid, uuid) TO authenticated;

COMMIT;
