-- Baseline migration: Create all core tables
-- This runs first to ensure all tables exist before other migrations try to add constraints

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
  plan text DEFAULT 'free',
  member_count integer DEFAULT 0,
  max_members integer DEFAULT 5,
  features text[] DEFAULT ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
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
  joined_date timestamp with time zone DEFAULT now(),
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
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member', 'technician')),
  joined_date timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
  location text,
  installation_date date,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  working_hours numeric DEFAULT 0,
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

-- Create equipment_note_images table
CREATE TABLE IF NOT EXISTS public.equipment_note_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_note_id uuid NOT NULL REFERENCES public.equipment_notes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  description text,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create preventative_maintenance table
CREATE TABLE IF NOT EXISTS public.preventative_maintenance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  scheduled_date date NOT NULL,
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES public.profiles(id),
  notes text,
  checklist_data jsonb DEFAULT '[]',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create work_order_notes table
CREATE TABLE IF NOT EXISTS public.work_order_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_private boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create work_order_images table
CREATE TABLE IF NOT EXISTS public.work_order_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  description text,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create work_order_costs table
CREATE TABLE IF NOT EXISTS public.work_order_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  cost_type text NOT NULL CHECK (cost_type IN ('labor', 'parts', 'materials', 'other')),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'USD',
  date_incurred date NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Create work_order_status_history table
CREATE TABLE IF NOT EXISTS public.work_order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  metadata jsonb DEFAULT '{}'
);

-- Create pm_checklist_templates table
CREATE TABLE IF NOT EXISTS public.pm_checklist_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  template_data jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_work_orders boolean DEFAULT true,
  email_equipment_alerts boolean DEFAULT true,
  email_invitations boolean DEFAULT true,
  email_billing boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create organization_invitations table
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invitation_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  message text,
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  UNIQUE(organization_id, email)
);

-- Create billing_events table
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Create subscribers table
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  stripe_customer_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create organization_subscriptions table
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_type text NOT NULL,
  stripe_subscription_id text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create billing_usage table
CREATE TABLE IF NOT EXISTS public.billing_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_type text NOT NULL,
  usage_date date NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create organization_slots table
CREATE TABLE IF NOT EXISTS public.organization_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slot_type text NOT NULL CHECK (slot_type IN ('user_license', 'feature')),
  quantity integer NOT NULL DEFAULT 0,
  used_quantity integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, slot_type)
);

-- Create slot_purchases table
CREATE TABLE IF NOT EXISTS public.slot_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slot_type text NOT NULL,
  quantity integer NOT NULL,
  stripe_session_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Create billing_exemptions table
CREATE TABLE IF NOT EXISTS public.billing_exemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  exemption_type text NOT NULL CHECK (exemption_type IN ('user_licenses', 'features', 'billing')),
  exemption_value text NOT NULL,
  reason text,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  granted_by uuid NOT NULL REFERENCES public.profiles(id),
  granted_at timestamp with time zone DEFAULT now()
);

-- Create user_license_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_license_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  quantity integer NOT NULL,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON public.organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON public.team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_org ON public.equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON public.work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_notes_equipment ON public.equipment_notes(equipment_id);
CREATE INDEX IF NOT EXISTS idx_preventative_maintenance_org ON public.preventative_maintenance(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON public.organization_invitations(invitation_token);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that need them
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_organizations
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_teams
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_equipment
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_preventative_maintenance
    BEFORE UPDATE ON public.preventative_maintenance
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_pm_checklist_templates
    BEFORE UPDATE ON public.pm_checklist_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_organization_subscriptions
    BEFORE UPDATE ON public.organization_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_organization_slots
    BEFORE UPDATE ON public.organization_slots
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_subscribers
    BEFORE UPDATE ON public.subscribers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_user_license_subscriptions
    BEFORE UPDATE ON public.user_license_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
