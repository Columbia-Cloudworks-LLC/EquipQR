
-- Add Stripe integration fields to organization_slots table
ALTER TABLE public.organization_slots 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;

-- Create user_license_subscriptions table for tracking Stripe subscriptions
CREATE TABLE IF NOT EXISTS public.user_license_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.user_license_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_license_subscriptions
CREATE POLICY "org_members_view_license_subs" ON public.user_license_subscriptions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = user_license_subscriptions.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

CREATE POLICY "org_admins_manage_license_subs" ON public.user_license_subscriptions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = user_license_subscriptions.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_user_license_subscriptions
  BEFORE UPDATE ON public.user_license_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to sync Stripe subscription with organization slots
CREATE OR REPLACE FUNCTION public.sync_stripe_subscription_slots(
  org_id UUID,
  subscription_id TEXT,
  quantity INTEGER,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert organization slots based on Stripe subscription
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
  VALUES (
    org_id,
    'user_license',
    quantity,
    0, -- Reset used slots for new period
    period_start,
    period_end,
    subscription_id,
    quantity * 1000 -- $10 per slot in cents
  )
  ON CONFLICT (organization_id, billing_period_start) 
  DO UPDATE SET
    purchased_slots = EXCLUDED.purchased_slots,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    amount_paid_cents = EXCLUDED.amount_paid_cents,
    updated_at = now();
END;
$$;
