
-- Add slot-based billing tables
CREATE TABLE public.organization_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slot_type TEXT NOT NULL DEFAULT 'user_license',
  purchased_slots INTEGER NOT NULL DEFAULT 0,
  used_slots INTEGER NOT NULL DEFAULT 0,
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add slot purchase transactions
CREATE TABLE public.slot_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  purchased_by UUID NOT NULL REFERENCES public.profiles(id),
  slot_type TEXT NOT NULL DEFAULT 'user_license',
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 1000, -- $10.00
  total_amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT,
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update organization_invitations table for better tracking
ALTER TABLE public.organization_invitations 
ADD COLUMN slot_reserved BOOLEAN DEFAULT false,
ADD COLUMN slot_purchase_id UUID REFERENCES public.slot_purchases(id),
ADD COLUMN declined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN expired_at TIMESTAMP WITH TIME ZONE;

-- Update organization_members for slot tracking
ALTER TABLE public.organization_members
ADD COLUMN slot_purchase_id UUID REFERENCES public.slot_purchases(id),
ADD COLUMN activated_slot_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.organization_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_slots
CREATE POLICY "org_members_view_slots" ON public.organization_slots
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_slots.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

CREATE POLICY "org_admins_manage_slots" ON public.organization_slots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_slots.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);

-- RLS policies for slot_purchases
CREATE POLICY "org_members_view_purchases" ON public.slot_purchases
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = slot_purchases.organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

CREATE POLICY "org_admins_manage_purchases" ON public.slot_purchases
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = slot_purchases.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);

-- Function to get current billing period
CREATE OR REPLACE FUNCTION public.get_current_billing_period()
RETURNS TABLE(period_start TIMESTAMP WITH TIME ZONE, period_end TIMESTAMP WITH TIME ZONE)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    date_trunc('month', CURRENT_TIMESTAMP) AS period_start,
    (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month' - INTERVAL '1 second') AS period_end;
$$;

-- Function to calculate available slots for an organization
CREATE OR REPLACE FUNCTION public.get_organization_slot_availability(org_id UUID)
RETURNS TABLE(
  total_purchased INTEGER,
  used_slots INTEGER,
  available_slots INTEGER,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  billing_period RECORD;
BEGIN
  -- Get current billing period
  SELECT * INTO billing_period FROM public.get_current_billing_period();
  
  -- Calculate slot availability
  SELECT 
    COALESCE(SUM(os.purchased_slots), 0)::INTEGER,
    COALESCE(SUM(os.used_slots), 0)::INTEGER,
    COALESCE(SUM(os.purchased_slots) - SUM(os.used_slots), 0)::INTEGER,
    billing_period.period_start,
    billing_period.period_end
  INTO total_purchased, used_slots, available_slots, current_period_start, current_period_end
  FROM public.organization_slots os
  WHERE os.organization_id = org_id
    AND os.billing_period_start <= billing_period.period_start
    AND os.billing_period_end >= billing_period.period_end;
    
  -- If no slots found, return zeros
  IF total_purchased IS NULL THEN
    total_purchased := 0;
    used_slots := 0;
    available_slots := 0;
    current_period_start := billing_period.period_start;
    current_period_end := billing_period.period_end;
  END IF;
  
  RETURN NEXT;
END;
$$;

-- Trigger to automatically expire invitations after 30 days
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Mark invitations as expired if they're past expiration and still pending
  UPDATE public.organization_invitations
  SET 
    status = 'expired',
    expired_at = now(),
    updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND expired_at IS NULL;
    
  RETURN NULL;
END;
$$;

-- Create trigger for invitation expiration (runs on updates)
CREATE OR REPLACE TRIGGER expire_invitations_trigger
  AFTER UPDATE OR INSERT ON public.organization_invitations
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.expire_old_invitations();

-- Function to reserve a slot for invitation (fixed - removed LIMIT)
CREATE OR REPLACE FUNCTION public.reserve_slot_for_invitation(
  org_id UUID,
  invitation_id UUID
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  slot_available BOOLEAN := FALSE;
  billing_period RECORD;
  slot_record RECORD;
BEGIN
  -- Get current billing period
  SELECT * INTO billing_period FROM public.get_current_billing_period();
  
  -- Check if slots are available and get the first available slot record
  SELECT * INTO slot_record
  FROM public.organization_slots
  WHERE organization_id = org_id
    AND billing_period_start <= billing_period.period_start
    AND billing_period_end >= billing_period.period_end
    AND (purchased_slots - used_slots) > 0
  ORDER BY created_at
  FOR UPDATE;
  
  IF FOUND THEN
    -- Reserve the slot by incrementing used_slots
    UPDATE public.organization_slots
    SET 
      used_slots = used_slots + 1,
      updated_at = now()
    WHERE id = slot_record.id;
    
    -- Mark invitation as having reserved slot
    UPDATE public.organization_invitations
    SET 
      slot_reserved = true,
      updated_at = now()
    WHERE id = invitation_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to release a reserved slot
CREATE OR REPLACE FUNCTION public.release_reserved_slot(
  org_id UUID,
  invitation_id UUID
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  billing_period RECORD;
BEGIN
  -- Get current billing period
  SELECT * INTO billing_period FROM public.get_current_billing_period();
  
  -- Release the slot by decrementing used_slots
  UPDATE public.organization_slots
  SET 
    used_slots = GREATEST(0, used_slots - 1),
    updated_at = now()
  WHERE organization_id = org_id
    AND billing_period_start <= billing_period.period_start
    AND billing_period_end >= billing_period.period_end;
  
  -- Mark invitation as no longer reserving slot
  UPDATE public.organization_invitations
  SET 
    slot_reserved = false,
    updated_at = now()
  WHERE id = invitation_id;
END;
$$;

-- Add updated_at trigger for new tables
CREATE TRIGGER handle_updated_at_organization_slots
  BEFORE UPDATE ON public.organization_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_slot_purchases
  BEFORE UPDATE ON public.slot_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
