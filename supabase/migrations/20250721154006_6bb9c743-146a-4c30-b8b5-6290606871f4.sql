
-- Create billing_exemptions table
CREATE TABLE public.billing_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  exemption_type TEXT NOT NULL DEFAULT 'user_licenses',
  exemption_value INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one active exemption per organization per type
  CONSTRAINT unique_active_exemption UNIQUE (organization_id, exemption_type, is_active)
);

-- Enable RLS
ALTER TABLE public.billing_exemptions ENABLE ROW LEVEL SECURITY;

-- Create policies for billing exemptions
CREATE POLICY "org_admins_view_exemptions" 
ON public.billing_exemptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = billing_exemptions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  )
);

CREATE POLICY "system_manage_exemptions" 
ON public.billing_exemptions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Grant the exemption to Matt's organization
INSERT INTO public.billing_exemptions (
  organization_id,
  exemption_type,
  exemption_value,
  reason,
  granted_at
) 
SELECT 
  o.id,
  'user_licenses',
  2,
  'Special arrangement - 2 free user licenses',
  now()
FROM public.organizations o
JOIN public.organization_members om ON o.id = om.organization_id
JOIN public.profiles p ON om.user_id = p.id
WHERE p.email = 'matt@3aequip.com'
  AND om.role = 'owner'
  AND om.status = 'active';

-- Create function to get organization exemptions
CREATE OR REPLACE FUNCTION public.get_organization_exemptions(org_id UUID)
RETURNS TABLE(
  exemption_type TEXT,
  exemption_value INTEGER,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    be.exemption_type,
    be.exemption_value,
    be.reason,
    be.expires_at
  FROM public.billing_exemptions be
  WHERE be.organization_id = org_id
    AND be.is_active = true
    AND (be.expires_at IS NULL OR be.expires_at > now());
$$;

-- Update the license billing calculation function to include exemptions
CREATE OR REPLACE FUNCTION public.get_organization_slot_availability_with_exemptions(org_id UUID)
RETURNS TABLE(
  total_purchased INTEGER,
  used_slots INTEGER,
  available_slots INTEGER,
  exempted_slots INTEGER,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_slot_record RECORD;
  actual_used_slots INTEGER;
  exemption_value INTEGER DEFAULT 0;
BEGIN
  -- Get active exemptions
  SELECT COALESCE(SUM(be.exemption_value), 0)::INTEGER INTO exemption_value
  FROM public.billing_exemptions be
  WHERE be.organization_id = org_id
    AND be.exemption_type = 'user_licenses'
    AND be.is_active = true
    AND (be.expires_at IS NULL OR be.expires_at > now());
    
  -- Find currently active purchased slots
  SELECT 
    COALESCE(SUM(os.purchased_slots), 0)::INTEGER as total_purchased,
    MIN(os.billing_period_start) as period_start,
    MAX(os.billing_period_end) as period_end
  INTO active_slot_record
  FROM public.organization_slots os
  WHERE os.organization_id = org_id
    AND os.billing_period_start <= now()
    AND os.billing_period_end >= now();
    
  -- Count actual active members (excluding owners from billing)
  SELECT COUNT(*)::INTEGER INTO actual_used_slots
  FROM public.organization_members om
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member');
    
  -- Calculate totals including exemptions
  total_purchased := COALESCE(active_slot_record.total_purchased, 0);
  used_slots := actual_used_slots;
  exempted_slots := exemption_value;
  available_slots := GREATEST(0, total_purchased + exempted_slots - actual_used_slots);
  current_period_start := COALESCE(active_slot_record.period_start, now());
  current_period_end := COALESCE(active_slot_record.period_end, now());
  
  RETURN NEXT;
END;
$$;
