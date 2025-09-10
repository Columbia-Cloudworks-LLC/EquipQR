# EquipQR Database Schema Documentation

## Overview

EquipQR uses a PostgreSQL database with Row Level Security (RLS) for multi-tenant data isolation. This document provides a comprehensive overview of the database schema, relationships, and security policies.

## Schema Architecture

### Multi-Tenant Design

The database follows a shared database, shared schema multi-tenancy pattern where:
- All tenants share the same database and tables
- Data isolation is enforced through `organization_id` foreign keys
- Row Level Security (RLS) policies ensure users can only access their organization's data

## Core Entity Relationships

```
Organizations (Root Entity)
├── Organization Members (Users in Org)
├── Teams
│   └── Team Members
├── Equipment
│   ├── Equipment Notes
│   ├── Equipment Note Images
│   └── Work Orders
│       ├── Work Order Notes
│       ├── Work Order Images
│       └── Work Order Costs
├── PM Templates
├── Preventative Maintenance
├── Billing & Subscriptions
└── Notifications
```

## Table Definitions

### Core Business Tables

#### Organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Root entity for multi-tenancy
**Key Relationships**: 
- One-to-many with all other business entities
- Contains organization-wide settings and configuration

#### Organization Members
```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role organization_role NOT NULL DEFAULT 'member',
    status member_status NOT NULL DEFAULT 'pending',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);
```

**Purpose**: Links users to organizations with roles
**Roles**: `owner`, `admin`, `member`
**Statuses**: `pending`, `active`, `inactive`

#### Teams
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Organize users into functional teams
**Key Features**: 
- Team-based work order assignment
- Role-based permissions within teams

#### Team Members
```sql
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
```

**Team Roles**: `manager`, `technician`, `requestor`, `viewer`

#### Equipment
```sql
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    status equipment_status NOT NULL DEFAULT 'active',
    location TEXT,
    installation_date DATE,
    warranty_expiration DATE,
    last_maintenance DATE,
    notes TEXT,
    custom_attributes JSONB DEFAULT '{}',
    image_url TEXT,
    last_known_location JSONB,
    team_id UUID REFERENCES teams(id),
    default_pm_template_id UUID,
    working_hours DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Equipment Status**: `active`, `maintenance`, `inactive`
**Custom Attributes**: Flexible JSONB field for equipment-specific metadata
**Location Tracking**: Both text location and GPS coordinates support

#### Work Orders
```sql
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status work_order_status NOT NULL DEFAULT 'submitted',
    priority priority_level NOT NULL DEFAULT 'medium',
    assignee_id UUID REFERENCES auth.users(id),
    team_id UUID REFERENCES teams(id),
    created_by UUID REFERENCES auth.users(id),
    due_date TIMESTAMPTZ,
    estimated_hours DECIMAL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Work Order Status**: `submitted`, `accepted`, `assigned`, `in_progress`, `on_hold`, `completed`, `cancelled`
**Priority Levels**: `low`, `medium`, `high`

### Supporting Tables

#### Equipment Notes
```sql
CREATE TABLE equipment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type note_type DEFAULT 'general',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Work Order Notes
```sql
CREATE TABLE work_order_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type note_type DEFAULT 'general',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Work Order Costs
```sql
CREATE TABLE work_order_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    cost_type cost_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    quantity DECIMAL DEFAULT 1,
    unit_cost DECIMAL(10,2),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Cost Types**: `labor`, `parts`, `materials`, `external_service`

### Preventative Maintenance

#### PM Templates
```sql
CREATE TABLE pm_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    checklist_items JSONB NOT NULL DEFAULT '[]',
    is_global BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Preventative Maintenance
```sql
CREATE TABLE preventative_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    template_id UUID REFERENCES pm_checklist_templates(id),
    title TEXT NOT NULL,
    description TEXT,
    frequency_type pm_frequency_type NOT NULL,
    frequency_value INTEGER NOT NULL,
    last_completed TIMESTAMPTZ,
    next_due TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Frequency Types**: `hours`, `days`, `weeks`, `months`, `years`

### Billing & Subscription Tables

#### User License Subscriptions
```sql
CREATE TABLE user_license_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Billing Events
```sql
CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    amount_change DECIMAL(10,2),
    effective_date TIMESTAMPTZ NOT NULL,
    event_data JSONB,
    processed BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Custom Types (Enums)

```sql
-- Organization and user roles
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE team_role AS ENUM ('manager', 'technician', 'requestor', 'viewer');
CREATE TYPE member_status AS ENUM ('pending', 'active', 'inactive');

-- Equipment and work order statuses
CREATE TYPE equipment_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE work_order_status AS ENUM ('submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

-- Notes and costs
CREATE TYPE note_type AS ENUM ('general', 'maintenance', 'inspection', 'repair', 'issue');
CREATE TYPE cost_type AS ENUM ('labor', 'parts', 'materials', 'external_service');

-- Preventative maintenance
CREATE TYPE pm_frequency_type AS ENUM ('hours', 'days', 'weeks', 'months', 'years');

-- Billing
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'canceled', 'past_due');
```

## Indexes for Performance

### Primary Indexes (Automatic)
- All tables have UUID primary keys with automatic indexes

### Composite Indexes
```sql
-- Equipment queries
CREATE INDEX idx_equipment_org_status ON equipment(organization_id, status);
CREATE INDEX idx_equipment_team ON equipment(team_id) WHERE team_id IS NOT NULL;

-- Work order queries
CREATE INDEX idx_work_orders_org_status ON work_orders(organization_id, status);
CREATE INDEX idx_work_orders_assignee_status ON work_orders(assignee_id, status);
CREATE INDEX idx_work_orders_equipment ON work_orders(equipment_id);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date) WHERE status NOT IN ('completed', 'cancelled');

-- Organization members
CREATE INDEX idx_organization_members_user_org ON organization_members(user_id, organization_id, status);
CREATE INDEX idx_organization_members_org_role ON organization_members(organization_id, role, status);

-- Team members
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team_role ON team_members(team_id, role);

-- Notes and attachments
CREATE INDEX idx_equipment_notes_equipment ON equipment_notes(equipment_id, created_at);
CREATE INDEX idx_work_order_notes_work_order ON work_order_notes(work_order_id, created_at);

-- Preventative maintenance
CREATE INDEX idx_pm_equipment_active ON preventative_maintenance(equipment_id, is_active);
CREATE INDEX idx_pm_next_due ON preventative_maintenance(next_due) WHERE is_active = true;
```

### Partial Indexes
```sql
-- Active records only
CREATE INDEX idx_active_equipment ON equipment(organization_id) WHERE status = 'active';
CREATE INDEX idx_active_work_orders ON work_orders(organization_id, assignee_id) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_active_organization_members ON organization_members(organization_id) WHERE status = 'active';
```

## Row Level Security (RLS) Policies

### Organization Isolation Pattern
All business tables follow this pattern:
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Basic organization isolation
CREATE POLICY "organization_isolation" ON table_name
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = (SELECT auth.uid()) AND status = 'active'
  )
);
```

### Role-Based Policies
```sql
-- Admin access
CREATE POLICY "admin_full_access" ON equipment
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = (SELECT auth.uid())
    AND om.organization_id = equipment.organization_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);

-- Team-based access
CREATE POLICY "team_member_access" ON equipment
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = (SELECT auth.uid())
  )
);
```

### Optimized RLS Patterns
For performance, auth function calls are cached:
```sql
CREATE POLICY "optimized_policy" ON equipment
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = (SELECT auth.uid()) -- Cached function call
    AND status = 'active'
  )
);
```

## Helper Functions

### Organization Membership Functions
```sql
-- Check if user is member of organization
CREATE OR REPLACE FUNCTION is_org_member(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin of organization
CREATE OR REPLACE FUNCTION is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Equipment Functions
```sql
-- Get equipment with work order counts
CREATE OR REPLACE FUNCTION get_equipment_with_stats(org_uuid UUID)
RETURNS TABLE (
  equipment_id UUID,
  name TEXT,
  status equipment_status,
  active_work_orders BIGINT,
  total_work_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.status,
    COUNT(wo.id) FILTER (WHERE wo.status NOT IN ('completed', 'cancelled')) as active_work_orders,
    COUNT(wo.id) as total_work_orders
  FROM equipment e
  LEFT JOIN work_orders wo ON e.id = wo.equipment_id
  WHERE e.organization_id = org_uuid
  GROUP BY e.id, e.name, e.status
  ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migration Strategy

### Migration File Naming
```
YYYYMMDDHHMMSS_description.sql
```

### Migration Best Practices
1. **Idempotent Operations**: Use `IF NOT EXISTS` clauses
2. **Backward Compatibility**: Avoid breaking changes
3. **Data Migrations**: Separate from schema changes
4. **Index Creation**: Use `CONCURRENTLY` for large tables
5. **RLS Policies**: Always enable RLS on new tables

### Example Migration
```sql
-- 20240101120000_add_equipment_working_hours.sql

-- Add working hours column
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS working_hours DECIMAL DEFAULT 0;

-- Add index for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_working_hours 
ON equipment(working_hours) WHERE working_hours > 0;

-- Update RLS policy if needed
DROP POLICY IF EXISTS "equipment_access" ON equipment;
CREATE POLICY "equipment_access" ON equipment
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = (SELECT auth.uid()) AND status = 'active'
  )
);
```

## Performance Considerations

### Query Optimization
1. **Use Appropriate Indexes**: Composite indexes for multi-column queries
2. **Partial Indexes**: For filtered queries (active records only)
3. **RLS Policy Optimization**: Cache auth function calls
4. **JSONB Queries**: Use GIN indexes for JSONB columns

### Monitoring Queries
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan < 10
ORDER BY idx_scan;
```

## Security Best Practices

1. **RLS Enforcement**: All business tables have RLS enabled
2. **Function Security**: Use `SECURITY DEFINER` for helper functions
3. **Input Validation**: Validate data at application and database levels
4. **Audit Trails**: Track important changes with created_by/updated_by
5. **Principle of Least Privilege**: Users only access their organization's data

This schema provides a robust foundation for EquipQR's multi-tenant architecture while maintaining performance, security, and scalability.
