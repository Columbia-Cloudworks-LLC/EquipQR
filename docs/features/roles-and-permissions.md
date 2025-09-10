
# EquipQR Roles and Permissions Documentation

## Overview

This document defines the comprehensive role-based access control (RBAC) system for EquipQR, including organization-level and team-level roles, their scopes, and specific permissions. This documentation serves as the foundation for implementing database Row Level Security (RLS) policies and application-level permission validation.

## Role Hierarchy

### Organization-Level Roles

#### 1. Owner
- **Scope**: Organization-wide
- **Description**: Highest level of access with full administrative control
- **Capabilities**: All permissions across the organization
- **Limitations**: Cannot be removed by other users; only one owner per organization

#### 2. Admin
- **Scope**: Organization-wide
- **Description**: Administrative access with most permissions except owner-specific actions
- **Capabilities**: Manage members, teams, equipment, work orders, and organization settings
- **Limitations**: Cannot change owner role or delete organization

#### 3. Member
- **Scope**: Organization-wide (limited)
- **Description**: Standard user with basic access to organization resources
- **Capabilities**: View equipment, create work orders, participate in teams
- **Limitations**: Cannot manage organization settings or other members

### Team-Level Roles

#### 1. Manager
- **Scope**: Team-specific
- **Description**: Team leadership with management capabilities
- **Capabilities**: Manage team members, assign work orders, update team settings
- **Limitations**: Cannot delete team or manage organization-wide settings

#### 2. Technician
- **Scope**: Team-specific
- **Description**: Field worker with execution permissions
- **Capabilities**: Update work orders, scan equipment, record maintenance
- **Limitations**: Cannot manage team members or organization settings

#### 3. Requestor
- **Scope**: Team-specific
- **Description**: User who can submit work requests
- **Capabilities**: Create work orders, view assigned equipment
- **Limitations**: Cannot modify work orders after submission

#### 4. Viewer
- **Scope**: Team-specific
- **Description**: Read-only access to team resources
- **Capabilities**: View work orders, equipment, and team information
- **Limitations**: Cannot create or modify any resources

## Permission Matrix

### Organization Management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Organization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update Organization Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Organization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Organization Details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Billing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Switch Organizations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Member Management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Invite Members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change Member Roles | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Member List | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resend Invitations | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Admin cannot change owner role or promote to owner

### Team Management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Teams | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Teams | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| Update Team Settings | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| Add Team Members | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| Remove Team Members | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |
| View Teams | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign Work Orders | ✅ | ✅ | ❌ | ✅** | ❌ | ❌ | ❌ |

**Only for teams where user has Manager role

### Equipment Management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Equipment | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Update Equipment | ✅ | ✅ | ❌ | ✅ | ✅*** | ❌ | ❌ |
| Delete Equipment | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Equipment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generate QR Codes | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Scan QR Codes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Custom Attributes | ✅ | ✅ | ❌ | ✅ | ✅*** | ❌ | ❌ |

***Limited to status updates and maintenance records

### Work Order Management

| Action | Owner | Admin | Member | Manager | Technician | Requestor | Viewer |
|--------|-------|-------|--------|---------|------------|-----------|--------|
| Create Work Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update Work Order Status | ✅ | ✅ | ❌ | ✅ | ✅**** | ❌ | ❌ |
| Assign Work Orders | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Delete Work Orders | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Work Orders | ✅ | ✅ | ✅***** | ✅ | ✅***** | ✅***** | ✅***** |
| Complete Work Orders | ✅ | ✅ | ❌ | ✅ | ✅**** | ❌ | ❌ |
| Cancel Work Orders | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

****Only assigned work orders
*****Limited to relevant work orders (assigned, created by user, or team-related)

## Permission Validation

### Application Level

```typescript
// Permission validation hook
export const usePermissions = () => {
  const { currentOrganization } = useOrganization();
  const { currentUser } = useAuth(); // When implemented
  
  const hasOrganizationPermission = (action: string): boolean => {
    if (!currentOrganization || !currentUser) return false;
    
    const userRole = currentOrganization.userRole;
    
    switch (action) {
      case 'manage_organization':
        return ['owner', 'admin'].includes(userRole);
      case 'invite_members':
        return ['owner', 'admin'].includes(userRole);
      case 'create_teams':
        return ['owner', 'admin'].includes(userRole);
      case 'create_equipment':
        return ['owner', 'admin'].includes(userRole);
      default:
        return false;
    }
  };
  
  const hasTeamPermission = (teamId: string, action: string): boolean => {
    // Implementation would check team membership and role
    return false;
  };
  
  return { hasOrganizationPermission, hasTeamPermission };
};
```

### Database Schema Recommendations

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Organizations Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Organization Members Table
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

#### Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Team Members Table
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'technician', 'requestor', 'viewer')),
  added_by UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

## Row Level Security (RLS) Policies

### Organization Access
```sql
-- Users can only access organizations they are members of
CREATE POLICY "Users can access their organizations" ON organizations
FOR ALL USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);
```

### Equipment Access
```sql
-- Users can access equipment in their organizations
CREATE POLICY "Users can access organization equipment" ON equipment
FOR ALL USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- Only owners and admins can create/delete equipment
CREATE POLICY "Owners and admins can manage equipment" ON equipment
FOR INSERT, DELETE USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
    AND status = 'active'
  )
);
```

### Work Order Access
```sql
-- Users can access work orders they created, are assigned to, or in their teams
CREATE POLICY "Users can access relevant work orders" ON work_orders
FOR SELECT USING (
  -- Created by user
  created_by = auth.uid()
  OR
  -- Assigned to user
  assigned_to = auth.uid()
  OR
  -- In user's organization
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);
```

### Team Access
```sql
-- Users can access teams in their organizations
CREATE POLICY "Users can access organization teams" ON teams
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- Only owners, admins, and team managers can modify teams
CREATE POLICY "Authorized users can manage teams" ON teams
FOR INSERT, UPDATE, DELETE USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
    AND status = 'active'
  )
  OR
  id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);
```

## Security Considerations

### Role Escalation Prevention
- Users cannot grant themselves higher roles
- Only owners can change ownership
- Admins cannot promote users to owner level
- Role changes require proper authorization

### Data Isolation
- Organizations are completely isolated from each other
- Users can only access data in organizations they belong to
- Team data is filtered based on membership and permissions

### Audit Trail
- All role changes should be logged
- Permission grants/revocations should be tracked
- Work order status changes should include user information

## Implementation Guidelines

### Frontend Validation
1. Always validate permissions on the client side for UX
2. Hide/disable UI elements based on user permissions
3. Use permission hooks consistently across components
4. Implement role-based navigation guards

### Backend Validation
1. Implement RLS policies for all database operations
2. Validate permissions in API endpoints
3. Use database functions for complex permission logic
4. Implement audit logging for sensitive operations

### Testing Strategy
1. Test each role's permissions thoroughly
2. Verify RLS policies prevent unauthorized access
3. Test edge cases (inactive users, removed teams, etc.)
4. Implement automated permission testing

## Migration Strategy

### Phase 1: Basic Organization Roles
- Implement owner, admin, member roles
- Set up basic RLS policies
- Migrate existing users to appropriate roles

### Phase 2: Team-Level Permissions
- Add team member roles
- Implement team-specific permissions
- Update work order assignment logic

### Phase 3: Advanced Features
- Implement granular permissions
- Add custom role definitions
- Implement advanced audit logging

This documentation serves as the foundation for implementing a robust, secure, and scalable permission system in EquipQR.
