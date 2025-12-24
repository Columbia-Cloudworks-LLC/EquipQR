# EquipQR™ Architecture Documentation

This document provides a comprehensive overview of EquipQR™'s system architecture and database schema, covering technology choices, design patterns, and data structures.

## System Architecture

### Overview

EquipQR™ is a modern, cloud-native fleet equipment management platform built with a focus on scalability, security, and maintainability. This document outlines the system architecture, technology choices, and design patterns used throughout the application.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  React SPA (Vite) │ Mobile Web │ QR Scanner │ Print Services   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway                                │
├─────────────────────────────────────────────────────────────────┤
│                    Supabase Platform                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  PostgreSQL  │ │  Auth Service│ │  Edge Funcs  │            │
│  │   Database   │ │   (GoTrue)   │ │   (Deno)     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Storage    │ │   Realtime   │ │    Email     │            │
│  │   (S3-like)  │ │  (Phoenix)   │ │   Service    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  External Services                              │
├─────────────────────────────────────────────────────────────────┤
│  Stripe (Billing) │ Google Maps │ Email (Resend) │ hCaptcha    │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend Architecture

**Core Technologies**
- **React 18**: Component-based UI library with concurrent features
- **TypeScript**: Type-safe JavaScript with strict configuration
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Accessible component library built on Radix UI

**State Management**
- **TanStack Query**: Server state management and caching
- **React Context**: Global client state (auth, settings, organization)
- **Local State**: useState/useReducer for component-specific state

**Routing & Navigation**
- **React Router v6**: Client-side routing with nested routes
- **Lazy Loading**: Code splitting for optimal performance
- **Protected Routes**: Authentication-based route guards

#### Backend Architecture

**Database Design**
- **PostgreSQL**: Primary database with JSONB support for flexible schemas
- **Row Level Security (RLS)**: Database-level security policies
- **Optimized Indexes**: Performance-tuned for common queries
- **Migration System**: Version-controlled schema changes

**Authentication & Authorization**
- **Supabase Auth (GoTrue)**: JWT-based authentication
- **Multi-tenant Architecture**: Organization-based data isolation
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **Session Management**: Automatic token refresh and persistence

**API Layer**
- **Supabase PostgREST**: Auto-generated REST API from PostgreSQL schema
- **Edge Functions**: Serverless functions for business logic
- **Real-time Subscriptions**: WebSocket-based live updates

### Component Architecture

#### Frontend Component Hierarchy

```
App
├── AppProviders (Context providers)
│   ├── QueryClient (TanStack Query)
│   ├── AuthProvider (Authentication)
│   ├── OrganizationProvider (Multi-tenancy)
│   └── ThemeProvider (UI theming)
├── Router
│   ├── PublicRoutes
│   │   ├── Landing
│   │   ├── Auth
│   │   └── Legal (Terms, Privacy)
│   └── ProtectedRoutes
│       ├── Dashboard Layout
│       │   ├── Sidebar Navigation
│       │   ├── TopBar
│       │   └── Main Content Area
│       ├── Feature Pages
│       │   ├── Equipment Management
│       │   ├── Work Orders
│       │   ├── Team Management
│       │   ├── Fleet Map
│       │   └── Billing
│       └── Settings & Admin
```

#### Component Design Patterns

**1. Container/Presentational Pattern**
```typescript
// Container Component (Data Logic)
const EquipmentListContainer = () => {
  const { data: equipment, isLoading, error } = useEquipment(orgId);
  
  if (isLoading) return <EquipmentListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return <EquipmentList equipment={equipment} />;
};

// Presentational Component (UI Logic)
const EquipmentList = ({ equipment }: { equipment: Equipment[] }) => {
  return (
    <div className="grid gap-4">
      {equipment.map(item => (
        <EquipmentCard key={item.id} equipment={item} />
      ))}
    </div>
  );
};
```

**2. Custom Hook Pattern**
```typescript
// Data fetching hook
const useEquipment = (organizationId: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId],
    queryFn: () => equipmentService.getAll(organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation hook
const useCreateEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: equipmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
};
```

**3. Compound Component Pattern**
```typescript
// Flexible, composable components
const EquipmentCard = ({ children, equipment }) => (
  <Card className="p-4">
    <EquipmentCardContext.Provider value={{ equipment }}>
      {children}
    </EquipmentCardContext.Provider>
  </Card>
);

EquipmentCard.Header = ({ children }) => (
  <div className="flex justify-between items-center mb-2">
    {children}
  </div>
);

EquipmentCard.Title = () => {
  const { equipment } = useEquipmentCardContext();
  return <h3 className="font-semibold">{equipment.name}</h3>;
};
```

### Data Flow Patterns

#### 1. Query Pattern
```typescript
// Service Layer
export const equipmentService = {
  async getAll(organizationId: string): Promise<Equipment[]> {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        work_orders(count),
        team:teams(name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// Hook Layer
const useEquipment = (orgId: string) => {
  return useQuery({
    queryKey: ['equipment', orgId],
    queryFn: () => equipmentService.getAll(orgId),
    staleTime: 5 * 60 * 1000,
  });
};

// Component Layer
const EquipmentPage = () => {
  const { currentOrganization } = useOrganization();
  const { data: equipment, isLoading } = useEquipment(currentOrganization.id);
  
  return <EquipmentList equipment={equipment} loading={isLoading} />;
};
```

#### 2. Mutation Pattern
```typescript
// Optimistic Updates
const useUpdateEquipment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: equipmentService.update,
    onMutate: async (newEquipment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['equipment'] });
      
      // Snapshot previous value
      const previousEquipment = queryClient.getQueryData(['equipment']);
      
      // Optimistically update
      queryClient.setQueryData(['equipment'], (old: Equipment[]) =>
        old.map(item => 
          item.id === newEquipment.id ? { ...item, ...newEquipment } : item
        )
      );
      
      return { previousEquipment };
    },
    onError: (err, newEquipment, context) => {
      // Rollback on error
      queryClient.setQueryData(['equipment'], context?.previousEquipment);
      toast.error('Failed to update equipment');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
};
```

#### 3. Real-time Updates
```typescript
// Real-time subscription pattern
const useRealtimeEquipment = (organizationId: string) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const subscription = supabase
      .channel('equipment_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'equipment',
          filter: `organization_id=eq.${organizationId}`
        }, 
        (payload) => {
          // Update query cache with real-time changes
          queryClient.setQueryData(['equipment', organizationId], (old: Equipment[]) => {
            if (!old) return old;
            
            switch (payload.eventType) {
              case 'INSERT':
                return [...old, payload.new as Equipment];
              case 'UPDATE':
                return old.map(item => 
                  item.id === payload.new.id ? payload.new as Equipment : item
                );
              case 'DELETE':
                return old.filter(item => item.id !== payload.old.id);
              default:
                return old;
            }
          });
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [organizationId, queryClient]);
};
```

### Security Architecture

#### Authentication Flow
```
1. User Login
   ├── Email/Password → Supabase Auth
   ├── Magic Link → Email → Supabase Auth
   └── OAuth → Provider → Supabase Auth
   
2. Token Management
   ├── JWT Access Token (1 hour expiry)
   ├── Refresh Token (stored in httpOnly cookie)
   └── Automatic refresh via Supabase client

3. Session Persistence
   ├── localStorage (access token)
   ├── sessionStorage (temporary data)
   └── Secure cookie (refresh token)
```

#### Authorization Layers

**1. Database Level (RLS)**
```sql
-- Multi-tenant isolation
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_isolation" ON equipment
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

**2. API Level (Edge Functions)**
```typescript
// Function-level authorization
export default async function handler(req: Request) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  const { user, error } = await supabase.auth.getUser(jwt);
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Additional business logic authorization
  const hasPermission = await checkUserPermission(user.id, 'equipment:write');
  if (!hasPermission) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Process request
}
```

**3. Application Level (React)**
```typescript
// Component-level authorization
const EquipmentActions = ({ equipment }) => {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  
  const canEdit = checkPermission('equipment:write', equipment.organization_id);
  const canDelete = checkPermission('equipment:delete', equipment.organization_id);
  
  return (
    <div>
      {canEdit && <EditButton equipment={equipment} />}
      {canDelete && <DeleteButton equipment={equipment} />}
    </div>
  );
};
```

### Performance Architecture

#### Frontend Optimization

**1. Code Splitting**
```typescript
// Route-based splitting with feature modules
const Equipment = lazy(() => import('@/features/equipment/pages/Equipment'));
const WorkOrders = lazy(() => import('@/features/work-orders/pages/WorkOrders'));

// Component-based splitting
const HeavyChart = lazy(() => import('@/components/HeavyChart'));
```

**2. Bundle Optimization**
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts'],
        },
      },
    },
  },
});
```

**3. Caching Strategy**
```typescript
// Query caching with TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

#### Database Optimization

**1. Indexing Strategy**
```sql
-- Composite indexes for common queries
CREATE INDEX idx_equipment_org_status ON equipment(organization_id, status);
CREATE INDEX idx_work_orders_assignee_status ON work_orders(assignee_id, status);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date) WHERE status NOT IN ('completed', 'cancelled');

-- Partial indexes for performance
CREATE INDEX idx_active_equipment ON equipment(organization_id) WHERE status = 'active';
```

**2. Query Optimization**
```sql
-- Optimized RLS policies with subquery caching
CREATE POLICY "equipment_access" ON equipment
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = (SELECT auth.uid()) -- Cached function call
    AND status = 'active'
  )
);
```

## Database Schema

### Overview

EquipQR™ uses a PostgreSQL database with Row Level Security (RLS) for multi-tenant data isolation. This section provides a comprehensive overview of the database schema, relationships, and security policies.

### Schema Architecture

#### Multi-Tenant Design

The database follows a shared database, shared schema multi-tenancy pattern where:
- All tenants share the same database and tables
- Data isolation is enforced through `organization_id` foreign keys
- Row Level Security (RLS) policies ensure users can only access their organization's data

### Core Entity Relationships

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

### Table Definitions

#### Core Business Tables

**Organizations**
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

**Organization Members**
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

**Equipment**
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

**Work Orders**
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

### Custom Types (Enums)

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

### Indexes for Performance

#### Primary Indexes (Automatic)
- All tables have UUID primary keys with automatic indexes

#### Composite Indexes
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
```

#### Partial Indexes
```sql
-- Active records only
CREATE INDEX idx_active_equipment ON equipment(organization_id) WHERE status = 'active';
CREATE INDEX idx_active_work_orders ON work_orders(organization_id, assignee_id) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_active_organization_members ON organization_members(organization_id) WHERE status = 'active';
```

### Row Level Security (RLS) Policies

#### Organization Isolation Pattern
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

#### Role-Based Policies
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

#### Optimized RLS Patterns
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

### Helper Functions

#### Organization Membership Functions
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

### Migration Strategy

#### Migration File Naming
```
YYYYMMDDHHMMSS_description.sql
```

#### Migration Best Practices
1. **Idempotent Operations**: Use `IF NOT EXISTS` clauses
2. **Backward Compatibility**: Avoid breaking changes
3. **Data Migrations**: Separate from schema changes
4. **Index Creation**: Use `CONCURRENTLY` for large tables
5. **RLS Policies**: Always enable RLS on new tables

### Performance Considerations

#### Query Optimization
1. **Use Appropriate Indexes**: Composite indexes for multi-column queries
2. **Partial Indexes**: For filtered queries (active records only)
3. **RLS Policy Optimization**: Cache auth function calls
4. **JSONB Queries**: Use GIN indexes for JSONB columns

### Security Best Practices

1. **RLS Enforcement**: All business tables have RLS enabled
2. **Function Security**: Use `SECURITY DEFINER` for helper functions
3. **Input Validation**: Validate data at application and database levels
4. **Audit Trails**: Track important changes with created_by/updated_by
5. **Principle of Least Privilege**: Users only access their organization's data

This architecture and schema provide a robust foundation for EquipQR™'s multi-tenant architecture while maintaining performance, security, and scalability.

