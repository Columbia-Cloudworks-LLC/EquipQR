# EquipQR System Architecture

## Overview

EquipQR is a modern, cloud-native fleet equipment management platform built with a focus on scalability, security, and maintainability. This document outlines the system architecture, technology choices, and design patterns used throughout the application.

## High-Level Architecture

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

## Technology Stack

### Frontend Architecture

#### Core Technologies
- **React 18**: Component-based UI library with concurrent features
- **TypeScript**: Type-safe JavaScript with strict configuration
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Accessible component library built on Radix UI

#### State Management
- **TanStack Query**: Server state management and caching
- **React Context**: Global client state (auth, settings, organization)
- **Local State**: useState/useReducer for component-specific state

#### Routing & Navigation
- **React Router v6**: Client-side routing with nested routes
- **Lazy Loading**: Code splitting for optimal performance
- **Protected Routes**: Authentication-based route guards

### Backend Architecture

#### Database Design
- **PostgreSQL**: Primary database with JSONB support for flexible schemas
- **Row Level Security (RLS)**: Database-level security policies
- **Optimized Indexes**: Performance-tuned for common queries
- **Migration System**: Version-controlled schema changes

#### Authentication & Authorization
- **Supabase Auth (GoTrue)**: JWT-based authentication
- **Multi-tenant Architecture**: Organization-based data isolation
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **Session Management**: Automatic token refresh and persistence

#### API Layer
- **Supabase PostgREST**: Auto-generated REST API from PostgreSQL schema
- **Edge Functions**: Serverless functions for business logic
- **Real-time Subscriptions**: WebSocket-based live updates

## Component Architecture

### Frontend Component Hierarchy

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

### Component Design Patterns

#### 1. Container/Presentational Pattern
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

#### 2. Custom Hook Pattern
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

#### 3. Compound Component Pattern
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

## Data Architecture

### Database Schema Design

#### Core Entities
```sql
-- Organizations (Multi-tenancy)
organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment (Asset Management)
equipment (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  status equipment_status,
  location TEXT,
  custom_attributes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Orders (Maintenance Management)
work_orders (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  equipment_id UUID REFERENCES equipment(id),
  title TEXT NOT NULL,
  description TEXT,
  status work_order_status,
  priority priority_level,
  assignee_id UUID REFERENCES auth.users(id),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Security Model (RLS Policies)
```sql
-- Organization-level isolation
CREATE POLICY "Users can only access their organization's data" 
ON equipment FOR ALL 
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Role-based permissions
CREATE POLICY "Admins can manage all equipment" 
ON equipment FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = equipment.organization_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  )
);
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

## Security Architecture

### Authentication Flow
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

### Authorization Layers

#### 1. Database Level (RLS)
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

#### 2. API Level (Edge Functions)
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

#### 3. Application Level (React)
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

## Performance Architecture

### Frontend Optimization

#### 1. Code Splitting
```typescript
// Route-based splitting
const Equipment = lazy(() => import('@/pages/Equipment'));
const WorkOrders = lazy(() => import('@/pages/WorkOrders'));

// Component-based splitting
const HeavyChart = lazy(() => import('@/components/HeavyChart'));
```

#### 2. Bundle Optimization
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

#### 3. Caching Strategy
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

### Database Optimization

#### 1. Indexing Strategy
```sql
-- Composite indexes for common queries
CREATE INDEX idx_equipment_org_status ON equipment(organization_id, status);
CREATE INDEX idx_work_orders_assignee_status ON work_orders(assignee_id, status);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date) WHERE status NOT IN ('completed', 'cancelled');

-- Partial indexes for performance
CREATE INDEX idx_active_equipment ON equipment(organization_id) WHERE status = 'active';
```

#### 2. Query Optimization
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

## Deployment Architecture

### Build Pipeline
```yaml
# GitHub Actions CI/CD
Build → Test → Security Scan → Bundle Analysis → Deploy

Stages:
1. Lint & Type Check (ESLint, TypeScript)
2. Unit Tests (Vitest, 70% coverage threshold)
3. Security Audit (npm audit, CodeQL)
4. Bundle Size Check (size-limit)
5. Build Production Assets
6. Deploy to Platform (Vercel/Netlify)
```

### Environment Configuration
```typescript
// Environment-specific configuration
const config = {
  development: {
    apiUrl: 'http://localhost:54321',
    logLevel: 'debug',
    enableDevTools: true,
  },
  production: {
    apiUrl: process.env.VITE_SUPABASE_URL,
    logLevel: 'error',
    enableDevTools: false,
  },
};
```

### CDN & Caching Strategy
```
Browser Cache
├── HTML: no-cache (always check for updates)
├── CSS/JS: 1 year + hash-based versioning
├── Images: 6 months + optimization
└── API: Controlled by Cache-Control headers

CDN Edge Cache
├── Static Assets: Global distribution
├── API Responses: Regional caching (5 minutes)
└── Real-time Data: No caching
```

## Monitoring & Observability

### Error Tracking
```typescript
// Error boundary with reporting
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to monitoring service
    console.error('Application Error:', error, errorInfo);
    
    // Track user context
    const context = {
      userId: this.context.user?.id,
      organizationId: this.context.organization?.id,
      route: window.location.pathname,
    };
    
    // Send to error tracking service
    // errorTracker.captureException(error, context);
  }
}
```

### Performance Monitoring
```typescript
// Core Web Vitals tracking
const trackWebVitals = () => {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
};
```

## Scalability Considerations

### Database Scaling
- **Read Replicas**: For read-heavy workloads
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: Regular performance analysis
- **Data Archiving**: Historical data management

### Application Scaling
- **Horizontal Scaling**: Stateless application design
- **CDN Distribution**: Global content delivery
- **Edge Computing**: Regional function deployment
- **Caching Layers**: Multiple levels of caching

### Future Architecture Considerations
- **Microservices**: Domain-specific service separation
- **Event-Driven Architecture**: Decoupled system communication
- **API Gateway**: Centralized API management
- **Service Mesh**: Advanced networking and observability

This architecture provides a solid foundation for EquipQR's current needs while maintaining flexibility for future growth and evolution.
