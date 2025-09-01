
-- Check what foreign keys already exist and only add missing ones
-- This migration now runs after all tables are created, so it's safe to add constraints

-- Add foreign keys that don't exist yet (skipping equipment_organization_id_fkey since it exists)
DO $$
BEGIN
    -- Check and add equipment_notes foreign keys (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_notes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'equipment_notes_author_id_fkey') THEN
            ALTER TABLE equipment_notes ADD CONSTRAINT equipment_notes_author_id_fkey 
              FOREIGN KEY (author_id) REFERENCES profiles(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'equipment_notes_equipment_id_fkey') THEN
            ALTER TABLE equipment_notes ADD CONSTRAINT equipment_notes_equipment_id_fkey 
              FOREIGN KEY (equipment_id) REFERENCES equipment(id);
        END IF;
    END IF;

    -- Check and add organization_members foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'organization_members_organization_id_fkey') THEN
            ALTER TABLE organization_members ADD CONSTRAINT organization_members_organization_id_fkey 
              FOREIGN KEY (organization_id) REFERENCES organizations(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'organization_members_user_id_fkey') THEN
            ALTER TABLE organization_members ADD CONSTRAINT organization_members_user_id_fkey 
              FOREIGN KEY (user_id) REFERENCES profiles(id);
        END IF;
    END IF;

    -- Check and add scans foreign keys (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scans') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'scans_equipment_id_fkey') THEN
            ALTER TABLE scans ADD CONSTRAINT scans_equipment_id_fkey 
              FOREIGN KEY (equipment_id) REFERENCES equipment(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'scans_scanned_by_fkey') THEN
            ALTER TABLE scans ADD CONSTRAINT scans_scanned_by_fkey 
              FOREIGN KEY (scanned_by) REFERENCES profiles(id);
        END IF;
    END IF;

    -- Check and add team_members foreign keys (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'team_members_team_id_fkey') THEN
            ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_fkey 
              FOREIGN KEY (team_id) REFERENCES teams(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'team_members_user_id_fkey') THEN
            ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey 
              FOREIGN KEY (user_id) REFERENCES profiles(id);
        END IF;
    END IF;

    -- Check and add teams foreign keys (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'teams_organization_id_fkey') THEN
            ALTER TABLE teams ADD CONSTRAINT teams_organization_id_fkey 
              FOREIGN KEY (organization_id) REFERENCES organizations(id);
        END IF;
    END IF;

    -- Check and add work_orders foreign keys (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'work_orders_assignee_id_fkey') THEN
            ALTER TABLE work_orders ADD CONSTRAINT work_orders_assignee_id_fkey 
              FOREIGN KEY (assignee_id) REFERENCES profiles(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'work_orders_created_by_fkey') THEN
            ALTER TABLE work_orders ADD CONSTRAINT work_orders_created_by_fkey 
              FOREIGN KEY (created_by) REFERENCES profiles(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'work_orders_equipment_id_fkey') THEN
            ALTER TABLE work_orders ADD CONSTRAINT work_orders_equipment_id_fkey 
              FOREIGN KEY (equipment_id) REFERENCES equipment(id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'work_orders_organization_id_fkey') THEN
            ALTER TABLE work_orders ADD CONSTRAINT work_orders_organization_id_fkey 
              FOREIGN KEY (organization_id) REFERENCES organizations(id);
        END IF;
        
        -- Note: team_id was removed from work_orders in later migrations
        -- So we don't add this foreign key anymore
    END IF;
END $$;

-- Update the existing handle_new_user function to also create an organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Insert user profile (this part already exists)
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );

  -- Create a new organization for the user
  INSERT INTO public.organizations (name, plan, member_count, max_members, features)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', 'My Organization'),
    'free',
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management']
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (
    new_org_id,
    NEW.id,
    'owner',
    'active'
  );

  RETURN NEW;
END;
$$;

-- Enable RLS on all tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
        ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment') THEN
        ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders') THEN
        ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scans') THEN
        ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_notes') THEN
        ALTER TABLE equipment_notes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Organization owners can update their organization" ON organizations;
CREATE POLICY "Organization owners can update their organization" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- Create RLS policies for organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Organization owners and admins can manage members" ON organization_members;
CREATE POLICY "Organization owners and admins can manage members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

-- Create RLS policies for equipment
DROP POLICY IF EXISTS "Users can view equipment in their organizations" ON equipment;
CREATE POLICY "Users can view equipment in their organizations" ON equipment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = equipment.organization_id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can manage equipment in their organizations" ON equipment;
CREATE POLICY "Users can manage equipment in their organizations" ON equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = equipment.organization_id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Create RLS policies for work_orders
DROP POLICY IF EXISTS "Users can view work orders in their organizations" ON work_orders;
CREATE POLICY "Users can view work orders in their organizations" ON work_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = work_orders.organization_id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can manage work orders in their organizations" ON work_orders;
CREATE POLICY "Users can manage work orders in their organizations" ON work_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = work_orders.organization_id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Create RLS policies for teams
DROP POLICY IF EXISTS "Users can view teams in their organizations" ON teams;
CREATE POLICY "Users can view teams in their organizations" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = teams.organization_id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can manage teams in their organizations" ON teams;
CREATE POLICY "Users can manage teams in their organizations" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = teams.organization_id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Create RLS policies for team_members
DROP POLICY IF EXISTS "Users can view team members in their organizations" ON team_members;
CREATE POLICY "Users can view team members in their organizations" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON t.organization_id = om.organization_id
      WHERE t.id = team_members.team_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can manage team members in their organizations" ON team_members;
CREATE POLICY "Users can manage team members in their organizations" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN organization_members om ON t.organization_id = om.organization_id
      WHERE t.id = team_members.team_id 
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Create RLS policies for scans (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scans') THEN
        DROP POLICY IF EXISTS "Users can view scans in their organizations" ON scans;
        CREATE POLICY "Users can view scans in their organizations" ON scans
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM equipment e
              JOIN organization_members om ON e.organization_id = om.organization_id
              WHERE e.id = scans.equipment_id 
              AND om.user_id = auth.uid()
              AND om.status = 'active'
            )
          );

        DROP POLICY IF EXISTS "Users can create scans in their organizations" ON scans;
        CREATE POLICY "Users can create scans in their organizations" ON scans
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM equipment e
              JOIN organization_members om ON e.organization_id = om.organization_id
              WHERE e.id = scans.equipment_id 
              AND om.user_id = auth.uid()
              AND om.status = 'active'
            )
          );
    END IF;
END $$;

-- Create RLS policies for equipment_notes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_notes') THEN
        DROP POLICY IF EXISTS "Users can view notes in their organizations" ON equipment_notes;
        CREATE POLICY "Users can view notes in their organizations" ON equipment_notes
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM equipment e
              JOIN organization_members om ON e.organization_id = om.organization_id
              WHERE e.id = equipment_notes.equipment_id 
              AND om.user_id = auth.uid()
              AND om.status = 'active'
            )
          );

        DROP POLICY IF EXISTS "Users can manage notes in their organizations" ON equipment_notes;
        CREATE POLICY "Users can manage notes in their organizations" ON equipment_notes
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM equipment e
              JOIN organization_members om ON e.organization_id = om.organization_id
              WHERE e.id = equipment_notes.equipment_id 
              AND om.user_id = auth.uid()
              AND om.status = 'active'
            )
          );
    END IF;
END $$;
