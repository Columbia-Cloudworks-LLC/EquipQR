# Cross-Organizational Permission Testing Suite

This comprehensive testing suite covers all aspects of cross-organizational permissions in the application, ensuring proper data isolation, role-based access control, and security across multiple organizations and teams.

## Test Structure

### Core Test Files

1. **`CrossOrganizationalPermissions.test.tsx`** - Main test suite covering all permission scenarios
2. **`PageLevelPermissions.test.tsx`** - Route and page-level access control testing
3. **`ComponentLevelPermissions.test.tsx`** - UI component visibility and functionality testing
4. **`IntegrationTests.test.tsx`** - End-to-end workflow and complex scenario testing
5. **`TestUtilities.tsx`** - Test data factories, mock setups, and helper functions

## Testing Coverage

### Organization-Level Role Testing
- **Owner role** - Full organization management capabilities
- **Admin role** - Team and member management (no billing access)
- **Member role** - Basic access with team-specific permissions
- **Viewer role** - Read-only access
- **Cross-organizational isolation** - Prevents access to other organizations' data
- **Multi-organization users** - Proper permission scoping per organization

### Team-Based Permission Testing
- **Team managers** - Full team management capabilities
- **Team technicians** - Limited team access for assigned work
- **Cross-team isolation** - Prevents access to other teams' resources
- **Team membership changes** - Immediate permission updates
- **Org admin override** - Admins can access all teams

### Work Order Permission Testing
- **Work order creators** - Can edit while in submitted status
- **Assigned technicians** - Can update status and add completion data
- **Team managers** - Can assign work orders to team members
- **Cross-team work orders** - Proper access restrictions
- **Status-based permissions** - Different permissions based on work order status

### Equipment Access Testing
- **Unassigned equipment** - Only org admins can access
- **Team-assigned equipment** - Team-based access control
- **Equipment reassignment** - Permission updates on team changes
- **Note and image permissions** - Team-based content management
- **QR code generation** - Role-based access control

### Multi-Organization Context Switching
- **Organization switching** - Permission context updates
- **Permission cache invalidation** - Proper cache clearing
- **Data scoping** - Work orders remain in original organization
- **Concurrent access** - No permission bleed between organizations

### Edge Cases & Security Testing
- **Inactive members** - No access to any resources
- **Pending invitations** - No access until accepted
- **Team membership removal** - Immediate permission revocation
- **Role downgrades** - Immediate permission reduction
- **Deleted teams** - Proper handling of deleted team references

### Billing & Feature-Based Permission Testing
- **Free plan restrictions** - Limited features and member counts
- **Premium plan features** - Full feature access
- **Plan downgrades** - Existing data accessible, new features blocked
- **Member limit enforcement** - Prevents exceeding plan limits

### Page-Level Permission Testing
- **Route protection** - Redirects or access denied for unauthorized users
- **Organization settings** - Owner/admin only
- **Billing pages** - Owner/admin only
- **Team management** - Team managers and org admins
- **Work order creation** - All active members
- **Equipment management** - Team-based access

### Component-Level Permission Testing
- **Equipment forms** - Team assignment based on role
- **Work order actions** - Context-sensitive action buttons
- **Team member lists** - Management actions based on role
- **QR code generators** - Role-based visibility
- **Billing sections** - Owner/admin only
- **Dynamic updates** - Component visibility changes with permissions

### Real-time & Subscription Testing
- **Team-filtered updates** - Real-time subscriptions respect team boundaries
- **Organization isolation** - No cross-org data leaks
- **Permission updates** - Real-time permission recalculation
- **Cache management** - Proper cache invalidation

### API & Service Layer Testing
- **Organization filtering** - All service methods filter by organization
- **Team-based access** - Service layer enforces same permissions as UI
- **Batch operations** - Per-item permission checking
- **Permission caching** - No cache leaks between user contexts

## Test Utilities

### Data Factories
- `createTestUser()` - User creation with customizable properties
- `createTestOrganization()` - Organization creation with role and plan
- `createTestTeam()` - Team creation with organization context
- `createTestEquipment()` - Equipment creation with team assignment
- `createTestWorkOrder()` - Work order creation with assignment context
- `createTestTeamMembership()` - Team membership creation

### Scenario Builders
- `buildOwnerScenario()` - Owner user and organization
- `buildAdminScenario()` - Admin user and organization
- `buildMemberScenario()` - Member user and organization
- `buildTeamManagerScenario()` - Team manager with team membership
- `buildTeamTechnicianScenario()` - Team technician with team membership
- `buildMultiOrgScenario()` - User with multiple organization roles
- `buildTeamHierarchyScenario()` - Complex team structure
- `buildInactiveUserScenario()` - Inactive user scenario
- `buildPendingUserScenario()` - Pending user scenario
- `buildFreePlanScenario()` - Free plan organization
- `buildPremiumPlanScenario()` - Premium plan organization

### Helper Functions
- `renderWithPermissions()` - Custom render with permission context
- `expectPermission()` - Permission assertion helper
- `expectPermissions()` - Batch permission assertions
- `testCrossOrgIsolation()` - Cross-organization isolation testing
- `testTeamIsolation()` - Team isolation testing
- `testRoleEscalation()` - Role change testing
- `cleanupMocks()` - Mock cleanup helper
- `resetPermissionEngine()` - Permission engine reset

## Running Tests

```bash
# Run all permission tests
npm test src/tests/permissions/

# Run specific test file
npm test src/tests/permissions/CrossOrganizationalPermissions.test.tsx

# Run with coverage
npm test -- --coverage src/tests/permissions/

# Run in watch mode
npm test -- --watch src/tests/permissions/
```

## Test Data Setup

Each test uses the test utilities to create realistic scenarios:

```typescript
// Basic scenario
const { user, organization } = buildOwnerScenario();

// Complex scenario with teams
const { user, organization, teamMemberships, hierarchy } = buildTeamHierarchyScenario();

// Multi-organization scenario
const { user, orgA, orgB } = buildMultiOrgScenario();
```

## Mock Setup

The test utilities automatically set up all necessary mocks:

- **Permission Engine** - Mocked with realistic permission logic
- **Session Context** - Mocked with organization and team data
- **Auth Context** - Mocked with user authentication
- **Organization Context** - Mocked with organization switching
- **User Context** - Mocked with user data

## Best Practices

1. **Use scenario builders** - Prefer `buildOwnerScenario()` over manual setup
2. **Test edge cases** - Include inactive users, pending invitations, etc.
3. **Verify both positive and negative cases** - Test both allowed and denied access
4. **Test permission changes** - Verify immediate updates on role/team changes
5. **Use descriptive test names** - Clearly indicate what scenario is being tested
6. **Clean up mocks** - Use `cleanupMocks()` between tests
7. **Test real workflows** - Use integration tests for complete user journeys

## Security Considerations

This test suite ensures:

- **Data isolation** - No cross-organizational data access
- **Team boundaries** - Proper team-based access control
- **Role enforcement** - Permissions match user roles exactly
- **Permission escalation** - No unauthorized privilege escalation
- **Cache security** - No permission cache leaks between users
- **Real-time security** - No cross-org data in real-time updates

## Maintenance

When adding new permission features:

1. Add corresponding test cases to the appropriate test file
2. Update test utilities if new data factories are needed
3. Add integration tests for complex workflows
4. Update this README with new test coverage
5. Ensure all edge cases are covered
6. Verify security implications are tested

This comprehensive test suite provides confidence that the permission system works correctly across all scenarios and maintains proper security boundaries.