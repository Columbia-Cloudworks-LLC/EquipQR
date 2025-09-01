
-- Create organization_invitations table
CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT,
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(organization_id, email, status) -- Prevent duplicate pending invitations
);

-- Create billing_events table for tracking billable events
CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('member_added', 'member_removed', 'plan_upgraded', 'plan_downgraded', 'storage_used', 'feature_enabled', 'feature_disabled')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}',
  amount_change DECIMAL(10,2) DEFAULT 0, -- Positive for increases, negative for decreases
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT FALSE
);

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_invitations BOOLEAN DEFAULT TRUE,
  email_work_orders BOOLEAN DEFAULT TRUE,
  email_equipment_alerts BOOLEAN DEFAULT TRUE,
  email_billing BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_invitations
CREATE POLICY "Users can view invitations for their organizations"
  ON public.organization_invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can create invitations"
  ON public.organization_invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

CREATE POLICY "Admins can update invitations"
  ON public.organization_invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- RLS policies for billing_events
CREATE POLICY "Admins can view billing events"
  ON public.billing_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

CREATE POLICY "System can insert billing events"
  ON public.billing_events
  FOR INSERT
  WITH CHECK (true); -- This will be restricted by application logic

-- RLS policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at triggers
CREATE TRIGGER update_organization_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add billing calculation fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billable_members INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_used_mb INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fleet_map_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_billing_calculation TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Function to calculate billable members
CREATE OR REPLACE FUNCTION public.calculate_billable_members(org_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.organization_members om
  JOIN public.profiles p ON om.user_id = p.id
  WHERE om.organization_id = org_id 
    AND om.status = 'active'
    AND om.role IN ('admin', 'member'); -- Exclude owners from billing
$$;

-- Function to update billing metrics
CREATE OR REPLACE FUNCTION public.update_organization_billing_metrics(org_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.organizations 
  SET 
    billable_members = public.calculate_billable_members(org_id),
    last_billing_calculation = now()
  WHERE id = org_id;
END;
$$;

-- Trigger to update billing metrics when membership changes
CREATE OR REPLACE FUNCTION public.handle_membership_billing_update()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update billing metrics for the affected organization
  IF TG_OP = 'INSERT' THEN
    PERFORM public.update_organization_billing_metrics(NEW.organization_id);
    
    -- Log billing event
    INSERT INTO public.billing_events (organization_id, event_type, user_id, event_data)
    VALUES (
      NEW.organization_id, 
      'member_added', 
      NEW.user_id,
      jsonb_build_object('role', NEW.role, 'status', NEW.status)
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_organization_billing_metrics(OLD.organization_id);
    
    -- Log billing event
    INSERT INTO public.billing_events (organization_id, event_type, user_id, event_data)
    VALUES (
      OLD.organization_id, 
      'member_removed', 
      OLD.user_id,
      jsonb_build_object('role', OLD.role, 'status', OLD.status)
    );
    
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update for both old and new organizations if changed
    IF OLD.organization_id != NEW.organization_id THEN
      PERFORM public.update_organization_billing_metrics(OLD.organization_id);
      PERFORM public.update_organization_billing_metrics(NEW.organization_id);
    ELSE
      PERFORM public.update_organization_billing_metrics(NEW.organization_id);
    END IF;
    
    -- Log billing event if role or status changed
    IF OLD.role != NEW.role OR OLD.status != NEW.status THEN
      INSERT INTO public.billing_events (organization_id, event_type, user_id, event_data)
      VALUES (
        NEW.organization_id, 
        'member_updated', 
        NEW.user_id,
        jsonb_build_object(
          'old_role', OLD.role, 
          'new_role', NEW.role,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for billing updates
DROP TRIGGER IF EXISTS organization_member_billing_update ON public.organization_members;
CREATE TRIGGER organization_member_billing_update
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_membership_billing_update();

-- Initialize billing metrics for existing organizations
UPDATE public.organizations 
SET 
  billable_members = public.calculate_billable_members(id),
  last_billing_calculation = now()
WHERE billable_members IS NULL OR billable_members = 0;
