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

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_org_qb_customer_id
  ON public.customers (organization_id, quickbooks_customer_id)
  WHERE quickbooks_customer_id IS NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_customers_account_owner
  ON public.customers (account_owner_id)
  WHERE account_owner_id IS NOT NULL;
