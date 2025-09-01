-- Step 1: Add unique constraint to organization_slots table to fix sync function
ALTER TABLE public.organization_slots 
ADD CONSTRAINT unique_org_billing_period 
UNIQUE (organization_id, billing_period_start);

-- Step 2: Sync existing license subscriptions to organization_slots
-- This will populate the organization_slots table with data from user_license_subscriptions
INSERT INTO public.organization_slots (
  organization_id,
  slot_type,
  purchased_slots,
  used_slots,
  billing_period_start,
  billing_period_end,
  stripe_subscription_id,
  amount_paid_cents
)
SELECT 
  uls.organization_id,
  'user_license' as slot_type,
  uls.quantity as purchased_slots,
  0 as used_slots, -- Start with 0 used slots
  uls.current_period_start as billing_period_start,
  uls.current_period_end as billing_period_end,
  uls.stripe_subscription_id,
  (uls.quantity * 1000) as amount_paid_cents -- $10 per slot in cents
FROM public.user_license_subscriptions uls
WHERE uls.status = 'active'
ON CONFLICT (organization_id, billing_period_start) DO UPDATE SET
  purchased_slots = EXCLUDED.purchased_slots,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  amount_paid_cents = EXCLUDED.amount_paid_cents,
  updated_at = now();

COMMENT ON CONSTRAINT unique_org_billing_period ON public.organization_slots IS 'Ensures one slot record per organization per billing period for proper upsert operations';