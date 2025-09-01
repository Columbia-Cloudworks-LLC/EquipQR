-- Create all missing base tables that the first migration expects
-- This migration creates the foundational schema before any foreign key constraints

-- Create profiles table (users)
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  email_private boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create organizations table
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  plan text DEFAULT 'free',
  member_count integer DEFAULT 1,
  max_members integer DEFAULT 5,
  features text[] DEFAULT ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create organization_members table
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  joined_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  organization_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'technician', 'member')),
  joined_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create equipment table
CREATE TABLE public.equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
  location text,
  installation_date date,
  organization_id uuid NOT NULL,
  team_id uuid,
  working_hours numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create scans table
CREATE TABLE public.scans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL,
  scanned_by uuid NOT NULL,
  scan_type text DEFAULT 'qr',
  scan_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create work_orders table
CREATE TABLE public.work_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  equipment_id uuid NOT NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  organization_id uuid NOT NULL,
  team_id uuid,
  created_by uuid NOT NULL,
  assignee_id uuid,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone,
  acceptance_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create the handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_organizations
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_organization_members
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_teams
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_team_members
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_equipment
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_work_orders
    BEFORE UPDATE ON public.work_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_teams_org_id ON public.teams(organization_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_equipment_org_id ON public.equipment(organization_id);
CREATE INDEX idx_equipment_team_id ON public.equipment(team_id);
CREATE INDEX idx_scans_equipment_id ON public.scans(equipment_id);
CREATE INDEX idx_scans_scanned_by ON public.scans(scanned_by);
CREATE INDEX idx_work_orders_org_id ON public.work_orders(organization_id);
CREATE INDEX idx_work_orders_equipment_id ON public.work_orders(equipment_id);
CREATE INDEX idx_work_orders_created_by ON public.work_orders(created_by);
CREATE INDEX idx_work_orders_assignee_id ON public.work_orders(assignee_id);

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles table';
COMMENT ON TABLE public.organizations IS 'Organizations table';
COMMENT ON TABLE public.organization_members IS 'Organization membership table';
COMMENT ON TABLE public.teams IS 'Teams within organizations';
COMMENT ON TABLE public.team_members IS 'Team membership table';
COMMENT ON TABLE public.equipment IS 'Equipment inventory table';
COMMENT ON TABLE public.scans IS 'Equipment scan history table';
COMMENT ON TABLE public.work_orders IS 'Work orders table';
