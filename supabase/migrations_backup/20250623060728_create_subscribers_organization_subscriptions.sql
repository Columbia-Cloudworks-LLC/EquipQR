
-- Create subscribers table to track subscription information
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own subscription info
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

-- Create policy for edge functions to update subscription info
CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (true);

-- Create policy for edge functions to insert subscription info
CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- Create organization_subscriptions table for premium features
CREATE TABLE public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  feature_type TEXT NOT NULL, -- 'user_license', 'fleet_map', 'storage_overage'
  quantity INTEGER DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for organization subscriptions
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view their org's subscriptions
CREATE POLICY "view_org_subscriptions" ON public.organization_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_subscriptions.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- Policy for edge functions to manage subscriptions
CREATE POLICY "manage_subscriptions" ON public.organization_subscriptions
FOR ALL
USING (true);

-- Create billing usage tracking table
CREATE TABLE public.billing_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL, -- 'active_users', 'storage_mb'
  usage_value INTEGER NOT NULL,
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for billing usage
ALTER TABLE public.billing_usage ENABLE ROW LEVEL SECURITY;

-- Policy for viewing organization usage
CREATE POLICY "view_org_usage" ON public.billing_usage
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = billing_usage.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- Function to calculate current billing for an organization
CREATE OR REPLACE FUNCTION public.calculate_organization_billing(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_users INTEGER;
  storage_mb INTEGER;
  result jsonb;
BEGIN
  -- Get active user count (excluding owners)
  SELECT COUNT(*)::INTEGER INTO active_users
  FROM public.organization_members om
  JOIN public.profiles p ON om.user_id = p.id
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member');

  -- Get storage usage
  SELECT COALESCE(storage_used_mb, 0)::INTEGER INTO storage_mb
  FROM public.organizations
  WHERE id = org_id;

  -- Build result JSON
  result := jsonb_build_object(
    'organization_id', org_id,
    'active_users', active_users,
    'storage_mb', storage_mb,
    'user_license_cost', active_users * 1000, -- $10.00 per user in cents
    'storage_overage_cost', GREATEST(0, storage_mb - 1000) * 10, -- $0.10 per MB over 1GB
    'calculated_at', now()
  );

  RETURN result;
END;
$$;

-- Function to get organization premium features
CREATE OR REPLACE FUNCTION public.get_organization_premium_features(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  fleet_map_active BOOLEAN DEFAULT false;
BEGIN
  -- Check if fleet map is active
  SELECT EXISTS(
    SELECT 1 FROM public.organization_subscriptions
    WHERE organization_id = org_id
    AND feature_type = 'fleet_map'
    AND status = 'active'
    AND current_period_end > now()
  ) INTO fleet_map_active;

  result := jsonb_build_object(
    'organization_id', org_id,
    'fleet_map_enabled', fleet_map_active,
    'premium_features', CASE
      WHEN fleet_map_active THEN jsonb_build_array('Fleet Map')
      ELSE jsonb_build_array()
    END
  );

  RETURN result;
END;
$$;

-- Add updated_at trigger for new tables
CREATE TRIGGER update_subscribers_updated_at
    BEFORE UPDATE ON public.subscribers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_organization_subscriptions_updated_at
    BEFORE UPDATE ON public.organization_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
