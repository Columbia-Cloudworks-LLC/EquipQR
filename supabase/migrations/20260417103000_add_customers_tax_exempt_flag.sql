-- Add QBO tax-exempt sync field to customer accounts.
-- Rollback:
--   ALTER TABLE public.customers DROP COLUMN IF EXISTS is_tax_exempt;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS is_tax_exempt boolean;

COMMENT ON COLUMN public.customers.is_tax_exempt IS
'Derived from QuickBooks Customer.Taxable (false => tax exempt). QBO is source of truth.';
