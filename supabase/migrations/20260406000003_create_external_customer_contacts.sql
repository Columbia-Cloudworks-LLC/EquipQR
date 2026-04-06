-- Migration: Create external_customer_contacts table
-- Stores contacts who are NOT registered EquipQR users (e.g. a client's site manager,
-- billing contact, dispatcher). Separate from the existing customer_contacts table
-- which requires user_id FK → profiles.

CREATE TABLE IF NOT EXISTS public.external_customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.external_customer_contacts OWNER TO postgres;

COMMENT ON TABLE public.external_customer_contacts IS
  'External contacts for a customer account — people who do not have EquipQR logins (site managers, billing contacts, dispatchers, etc.).';

-- Index for parent lookup
CREATE INDEX IF NOT EXISTS idx_external_customer_contacts_customer
  ON public.external_customer_contacts (customer_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_external_customer_contacts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_external_customer_contacts_updated_at ON public.external_customer_contacts;
CREATE TRIGGER trigger_external_customer_contacts_updated_at
  BEFORE UPDATE ON public.external_customer_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_external_customer_contacts_updated_at();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.external_customer_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member (via join to customers.organization_id)
DROP POLICY IF EXISTS "external_customer_contacts_select" ON public.external_customer_contacts;
CREATE POLICY "external_customer_contacts_select"
  ON public.external_customer_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND public.is_org_member((SELECT auth.uid()), c.organization_id)
    )
  );

-- INSERT: org admin only
DROP POLICY IF EXISTS "external_customer_contacts_insert" ON public.external_customer_contacts;
CREATE POLICY "external_customer_contacts_insert"
  ON public.external_customer_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND public.is_org_admin((SELECT auth.uid()), c.organization_id)
    )
  );

-- UPDATE: org admin only
DROP POLICY IF EXISTS "external_customer_contacts_update" ON public.external_customer_contacts;
CREATE POLICY "external_customer_contacts_update"
  ON public.external_customer_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND public.is_org_admin((SELECT auth.uid()), c.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND public.is_org_admin((SELECT auth.uid()), c.organization_id)
    )
  );

-- DELETE: org admin only
DROP POLICY IF EXISTS "external_customer_contacts_delete" ON public.external_customer_contacts;
CREATE POLICY "external_customer_contacts_delete"
  ON public.external_customer_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = external_customer_contacts.customer_id
        AND public.is_org_admin((SELECT auth.uid()), c.organization_id)
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_customer_contacts TO authenticated;
GRANT ALL ON public.external_customer_contacts TO service_role;
