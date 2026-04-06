-- Migration: Extend customers table with CRM columns
-- Adds email, phone, addresses, account owner, QuickBooks identifiers, notes, and updated_at.
-- Widens RLS so all org members can SELECT (admins keep mutate rights).

-- ============================================
-- PART 1: Add new columns
-- ============================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS account_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quickbooks_customer_id text,
  ADD COLUMN IF NOT EXISTS quickbooks_display_name text,
  ADD COLUMN IF NOT EXISTS quickbooks_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notes text;

-- ============================================
-- PART 2: Partial unique index for QB customer ID per org
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_org_qb_customer_id
  ON public.customers (organization_id, quickbooks_customer_id)
  WHERE quickbooks_customer_id IS NOT NULL;

-- ============================================
-- PART 3: updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
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

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON public.customers;
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customers_updated_at();

-- ============================================
-- PART 4: Widen RLS — org-member SELECT
-- ============================================

DROP POLICY IF EXISTS "customers_members_select" ON public.customers;
CREATE POLICY "customers_members_select"
  ON public.customers
  FOR SELECT
  USING (
    public.is_org_member(
      (SELECT auth.uid()),
      organization_id
    )
  );

-- ============================================
-- PART 5: Index on account_owner_id for lookups
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customers_account_owner
  ON public.customers (account_owner_id)
  WHERE account_owner_id IS NOT NULL;
