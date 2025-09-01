-- Baseline Migration: Production Database Schema
-- This migration represents the current production state
-- Created to replace the problematic development migration history

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  name text,
  email text,
  email_private boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'technician', 'member')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  serial_number text,
  model text,
  manufacturer text,
  location text,
  status text DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'out_of_service', 'retired')),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create work_orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  assignee_id uuid REFERENCES public.profiles(id),
  created_date timestamp with time zone DEFAULT now(),
  due_date timestamp with time zone,
  completed_date timestamp with time zone
);

-- Create scans table
CREATE TABLE IF NOT EXISTS public.scans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  scanned_by uuid NOT NULL REFERENCES public.profiles(id),
  scan_date timestamp with time zone DEFAULT now(),
  location text,
  notes text
);

-- Create equipment_notes table
CREATE TABLE IF NOT EXISTS public.equipment_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_private boolean NOT NULL DEFAULT false,
  hours_worked numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_modified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_modified_at timestamp with time zone DEFAULT now()
);

-- Create notes table for compatibility (legacy)
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_private boolean NOT NULL DEFAULT false,
  hours_worked numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_modified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_modified_at timestamp with time zone DEFAULT now()
);

-- Create other tables as needed
CREATE TABLE IF NOT EXISTS public.preventative_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  frequency text,
  last_performed timestamp with time zone,
  next_due timestamp with time zone,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  cost_type text CHECK (cost_type IN ('labor', 'parts', 'materials', 'other')),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  changed_at timestamp with time zone DEFAULT now(),
  notes text
);

CREATE TABLE IF NOT EXISTS public.pm_checklist_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Create billing and subscription tables
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_customer_id text,
  email text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  plan_name text NOT NULL,
  status text DEFAULT 'active',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  usage_value numeric NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slot_type text NOT NULL,
  total_slots integer NOT NULL DEFAULT 0,
  used_slots integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.slot_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slot_type text NOT NULL,
  quantity integer NOT NULL,
  stripe_payment_intent_id text,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_exemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  exemption_type text NOT NULL,
  reason text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_license_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  license_type text NOT NULL,
  status text DEFAULT 'active',
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_equipment_org_id ON public.equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_team_id ON public.equipment(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment_id ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee_id ON public.work_orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_scans_equipment_id ON public.scans(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_notes_equipment_id ON public.equipment_notes(equipment_id);
CREATE INDEX IF NOT EXISTS idx_notes_equipment_id ON public.notes(equipment_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_equipment_notes_updated_at
  BEFORE UPDATE ON public.equipment_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_preventative_maintenance_updated_at
  BEFORE UPDATE ON public.preventative_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_work_order_notes_updated_at
  BEFORE UPDATE ON public.work_order_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_organization_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_organization_slots_updated_at
  BEFORE UPDATE ON public.organization_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_slot_purchases_updated_at
  BEFORE UPDATE ON public.slot_purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_license_subscriptions_updated_at
  BEFORE UPDATE ON public.user_license_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.is_org_admin(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_org_access_secure(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_org_admin_secure(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_team_role(user_uuid uuid, team_uuid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid 
      AND tm.role = role_name
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_team_access(user_uuid uuid, team_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = user_uuid 
      AND tm.team_id = team_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_role(user_uuid uuid, org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT om.role
  FROM organization_members om
  WHERE om.user_id = user_uuid 
    AND om.organization_id = org_id 
    AND om.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_organization_access(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_organization_admin(user_uuid uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = user_uuid 
      AND om.organization_id = org_id 
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
  );
$$;

-- Create additional utility functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.remove_organization_member_safely(user_uuid uuid, org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove from teams first
  DELETE FROM team_members 
  WHERE user_id = user_uuid 
    AND team_id IN (SELECT id FROM teams WHERE organization_id = org_id);
  
  -- Then remove from organization
  DELETE FROM organization_members 
  WHERE user_id = user_uuid AND organization_id = org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_organization_safely(user_uuid uuid, org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove from teams first
  DELETE FROM team_members 
  WHERE user_id = user_uuid 
    AND team_id IN (SELECT id FROM teams WHERE organization_id = org_id);
  
  -- Then remove from organization
  DELETE FROM organization_members 
  WHERE user_id = user_uuid AND organization_id = org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.preserve_user_attribution()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_by = auth.uid();
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_team_manager_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- If a manager is being removed, reassign equipment to unassigned
  UPDATE equipment 
  SET team_id = NULL 
  WHERE team_id = OLD.team_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token_secure(token_value text)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  email text,
  role text,
  expires_at timestamp with time zone,
  created_by uuid
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, organization_id, email, role, expires_at, created_by
  FROM organization_invitations
  WHERE token = token_value AND expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.get_organization_member_profile(user_uuid uuid, org_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  status text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name, p.email, om.role, om.status, om.created_at
  FROM profiles p
  JOIN organization_members om ON p.id = om.user_id
  WHERE om.user_id = user_uuid AND om.organization_id = org_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_access_snapshot(user_uuid uuid)
RETURNS TABLE (
  organization_id uuid,
  org_name text,
  user_role text,
  team_count bigint,
  equipment_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    o.id as organization_id,
    o.name as org_name,
    om.role as user_role,
    COUNT(DISTINCT t.id) as team_count,
    COUNT(DISTINCT e.id) as equipment_count
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  LEFT JOIN teams t ON o.id = t.organization_id
  LEFT JOIN equipment e ON o.id = e.organization_id
  WHERE om.user_id = user_uuid AND om.status = 'active'
  GROUP BY o.id, o.name, om.role;
$$;

CREATE OR REPLACE FUNCTION public.set_geocoded_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_organization_member_count()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to maintain denormalized counts
  -- Implementation depends on specific requirements
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to validate member limits
  -- Implementation depends on specific requirements
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventative_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_license_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Create RLS policies for organizations
CREATE POLICY "Users can view their organizations" ON public.organizations FOR SELECT USING (public.user_has_organization_access(auth.uid(), id));
CREATE POLICY "Organization admins can update organizations" ON public.organizations FOR UPDATE USING (public.user_is_organization_admin(auth.uid(), id));

-- Create RLS policies for organization_members
CREATE POLICY "Users can view organization members" ON public.organization_members FOR SELECT USING (public.user_has_organization_access(auth.uid(), organization_id));
CREATE POLICY "Organization admins can manage members" ON public.organization_members FOR ALL USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Create RLS policies for teams
CREATE POLICY "Users can view organization teams" ON public.teams FOR SELECT USING (public.user_has_organization_access(auth.uid(), organization_id));
CREATE POLICY "Organization admins can manage teams" ON public.teams FOR ALL USING (public.user_is_organization_admin(auth.uid(), organization_id));
CREATE POLICY "Team managers can update their teams" ON public.teams FOR UPDATE USING (public.check_user_team_role(auth.uid(), id, 'manager'));

-- Create RLS policies for team_members
CREATE POLICY "Users can view team members" ON public.team_members FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM teams WHERE id = team_id)));
CREATE POLICY "Organization admins can manage team members" ON public.team_members FOR ALL USING (public.user_is_organization_admin(auth.uid(), (SELECT organization_id FROM teams WHERE id = team_id)));
CREATE POLICY "Team managers can manage their team members" ON public.team_members FOR ALL USING (public.check_user_team_role(auth.uid(), team_id, 'manager'));

-- Create RLS policies for equipment
CREATE POLICY "Users can view organization equipment" ON public.equipment FOR SELECT USING (public.user_has_organization_access(auth.uid(), organization_id));
CREATE POLICY "Organization admins can manage equipment" ON public.equipment FOR ALL USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Create RLS policies for work_orders
CREATE POLICY "Users can view organization work orders" ON public.work_orders FOR SELECT USING (public.user_has_organization_access(auth.uid(), organization_id));
CREATE POLICY "Users can create work orders" ON public.work_orders FOR INSERT WITH CHECK (public.user_has_organization_access(auth.uid(), organization_id) AND created_by = auth.uid());
CREATE POLICY "Organization admins can manage work orders" ON public.work_orders FOR UPDATE USING (public.user_is_organization_admin(auth.uid(), organization_id));
CREATE POLICY "Organization admins can delete work orders" ON public.work_orders FOR DELETE USING (public.user_is_organization_admin(auth.uid(), organization_id));
CREATE POLICY "Assigned users can update work orders" ON public.work_orders FOR UPDATE USING (assignee_id = auth.uid());

-- Create RLS policies for scans
CREATE POLICY "Users can view organization scans" ON public.scans FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id)));
CREATE POLICY "Users can create scans" ON public.scans FOR INSERT WITH CHECK (scanned_by = auth.uid() AND public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id)));

-- Create RLS policies for equipment_notes
CREATE POLICY "Users can view organization notes" ON public.equipment_notes FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id)));
CREATE POLICY "Users can create notes" ON public.equipment_notes FOR INSERT WITH CHECK (author_id = auth.uid() AND public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id)));
CREATE POLICY "Authors can update own notes" ON public.equipment_notes FOR UPDATE USING (author_id = auth.uid());

-- Create RLS policies for notes (legacy)
CREATE POLICY "Users can view organization notes" ON public.notes FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id)));
CREATE POLICY "Users can create notes" ON public.notes FOR INSERT WITH CHECK (author_id = auth.uid() AND public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM equipment WHERE id = equipment_id)));
CREATE POLICY "Authors can update own notes" ON public.notes FOR UPDATE USING (author_id = auth.uid());

-- Create RLS policies for other tables
CREATE POLICY "Users can view organization data" ON public.preventative_maintenance FOR SELECT USING (public.user_has_organization_access(auth.uid(), organization_id));
CREATE POLICY "Organization admins can manage data" ON public.preventative_maintenance FOR ALL USING (public.user_is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Users can view work order notes" ON public.work_order_notes FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));
CREATE POLICY "Users can create work order notes" ON public.work_order_notes FOR INSERT WITH CHECK (author_id = auth.uid() AND public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));

CREATE POLICY "Users can view work order images" ON public.work_order_images FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));
CREATE POLICY "Users can upload work order images" ON public.work_order_images FOR INSERT WITH CHECK (uploaded_by = auth.uid() AND public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));

CREATE POLICY "Users can view work order costs" ON public.work_order_costs FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));
CREATE POLICY "Organization admins can manage costs" ON public.work_order_costs FOR ALL USING (public.user_is_organization_admin(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));

CREATE POLICY "Users can view work order status history" ON public.work_order_status_history FOR SELECT USING (public.user_has_organization_access(auth.uid(), (SELECT organization_id FROM work_orders WHERE id = work_order_id)));

CREATE POLICY "Users can view organization templates" ON public.pm_checklist_templates FOR SELECT USING (public.user_has_organization_access(auth.uid(), organization_id));
CREATE POLICY "Organization admins can manage templates" ON public.pm_checklist_templates FOR ALL USING (public.user_is_organization_admin(auth.uid(), organization_id));

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view organization invitations" ON public.organization_invitations FOR SELECT USING (public.user_is_organization_admin(auth.uid(), organization_id));
CREATE POLICY "Organization admins can manage invitations" ON public.organization_invitations FOR ALL USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Create RLS policies for billing tables (restrictive)
CREATE POLICY "Organization admins can view billing" ON public.billing_events FOR SELECT USING (public.user_is_organization_admin(auth.uid(), organization_id));
CREATE POLICY "Organization admins can view subscriptions" ON public.organization_subscriptions FOR SELECT USING (public.user_is_organization_admin(auth.uid(), organization_id));
CREATE POLICY "Organization admins can view usage" ON public.billing_usage FOR SELECT USING (public.user_is_organization_admin(auth.uid(), organization_id));

-- Create triggers for user management
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for equipment_notes
CREATE TRIGGER trigger_equipment_notes_preserve_attribution
  BEFORE UPDATE ON public.equipment_notes
  FOR EACH ROW EXECUTE FUNCTION public.preserve_user_attribution();

-- Create triggers for notes (legacy)
CREATE TRIGGER trigger_notes_preserve_attribution
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.preserve_user_attribution();

-- Create triggers for team management
CREATE TRIGGER trigger_team_manager_removal
  BEFORE DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_team_manager_removal();

-- Set replica identity for realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.organizations REPLICA IDENTITY FULL;
ALTER TABLE public.organization_members REPLICA IDENTITY FULL;
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.equipment REPLICA IDENTITY FULL;
ALTER TABLE public.work_orders REPLICA IDENTITY FULL;
ALTER TABLE public.scans REPLICA IDENTITY FULL;
ALTER TABLE public.equipment_notes REPLICA IDENTITY FULL;
ALTER TABLE public.notes REPLICA IDENTITY FULL;
