
# Work Order Workflow Documentation

## Overview

This document outlines the complete work order workflow in EquipQR, including creation methods, status management, user permissions, assignment processes, and notification systems. Work orders are the primary mechanism for tracking maintenance and repair activities across the equipment fleet.

## Work Order Lifecycle

### Status Flow

Work orders progress through a defined lifecycle with the following statuses:

1. **Submitted** - Initial state when a work order is created
2. **Accepted** - Work order has been reviewed and approved
3. **Assigned** - Work order has been assigned to a specific technician
4. **In Progress** - Active work has begun on the order
5. **On Hold** - Work has been temporarily paused
6. **Completed** - All work has been finished successfully
7. **Cancelled** - Work order has been terminated without completion

### Status Transitions

| Current Status | Possible Next States | Who Can Change | Notes |
|---------------|---------------------|----------------|-------|
| Submitted | Accepted, Cancelled | Manager, Admin, Owner | Initial review stage |
| Accepted | Assigned, Cancelled | Manager, Admin, Owner | Ready for assignment |
| Assigned | In Progress, On Hold, Cancelled | Manager, Admin, Owner, Assigned Technician | Work can begin |
| In Progress | Completed, On Hold, Cancelled | Manager, Admin, Owner, Assigned Technician | Active work phase |
| On Hold | In Progress, Cancelled | Manager, Admin, Owner, Assigned Technician | Resume or terminate |
| Completed | (Final State) | - | Work finished |
| Cancelled | (Final State) | - | Work terminated |

## User Roles and Permissions

### Organization-Level Roles

#### Owner
- **Scope**: Full access across organization
- **Capabilities**: 
  - Create, view, edit, delete any work order
  - Change any work order status
  - Assign work orders to any team or individual
  - Access all work order data and reports

#### Admin
- **Scope**: Organization-wide management
- **Capabilities**:
  - Create, view, edit, delete any work order
  - Change any work order status
  - Assign work orders to any team or individual
  - Access all work order data and reports
- **Limitations**: Cannot change organization ownership

#### Member
- **Scope**: Limited organization access
- **Capabilities**:
  - Create work orders
  - View work orders they created or are assigned to
  - View work orders for their teams
- **Limitations**: Cannot manage work order assignments or organization settings

### Team-Level Roles

#### Manager
- **Scope**: Team-specific management
- **Capabilities**:
  - Create work orders
  - Assign work orders to team members
  - Change status of team work orders
  - View all team work orders
  - Manage team member assignments

#### Technician
- **Scope**: Execution-focused
- **Capabilities**:
  - Create work orders
  - Update status of assigned work orders
  - View assigned work orders and team work orders
  - Record work completion
- **Limitations**: Cannot assign work orders to others

#### Requestor
- **Scope**: Request submission
- **Capabilities**:
  - Create work orders
  - View work orders they created
  - View team work orders (read-only)
- **Limitations**: Cannot modify work orders after submission

#### Viewer
- **Scope**: Read-only access
- **Capabilities**:
  - View team work orders
- **Limitations**: Cannot create or modify work orders

## Work Order Creation Methods

### 1. Direct Creation
- **Access**: Main Work Orders page (`/work-orders`)
- **Button**: "Create Work Order" button
- **Process**:
  1. User clicks "Create Work Order"
  2. WorkOrderForm modal opens
  3. User fills required fields (title, description, equipment)
  4. Optional fields: priority, assignee, team, due date, estimated hours
  5. Form submission creates work order with "Submitted" status

### 2. Equipment-Specific Creation
- **Access**: Equipment Details page (`/equipment/{id}`)
- **Location**: Work Orders tab
- **Process**:
  1. User navigates to specific equipment
  2. Clicks "Create Work Order" in Work Orders tab
  3. WorkOrderForm opens with equipment pre-selected
  4. Equipment field is locked and cannot be changed
  5. Form shows context-specific placeholder text

### 3. QR Code Scanning
- **Access**: QR Scanner page (`/scanner`) or mobile scanning
- **Process**:
  1. User scans equipment QR code
  2. Redirected to equipment details page
  3. Can create work order from equipment context
  4. Equipment information auto-populated

## Work Order Assignment System

### Assignment Methods

#### Individual Assignment
- **Who Can Assign**: Owners, Admins, Team Managers
- **Process**:
  1. Select assignee from dropdown in work order form
  2. Assignee receives notification (when implemented)
  3. Work order appears in assignee's "My Work Orders" view
  4. Status can be updated to "Assigned"

#### Team Assignment
- **Who Can Assign**: Owners, Admins, Team Managers
- **Process**:
  1. Select team from dropdown in work order form
  2. All team members can view the work order
  3. Team manager can reassign to specific team member
  4. Work order appears in team's work queue

### Assignment Rules
- Work orders can be assigned to individuals, teams, or both
- Individual assignment takes precedence for status updates
- Team managers can reassign within their team
- Unassigned work orders remain in "Submitted" or "Accepted" status

## Status Management

### Automated Status Changes
- **Creation**: New work orders start with "Submitted" status
- **Assignment**: Status can be changed to "Assigned" when assignee is set
- **Completion**: Status changes to "Completed" when marked by authorized user

### Manual Status Updates
- **Access**: Work Order Details page status management panel
- **Interface**: Status-specific action buttons (Accept, Assign, Start Work, Complete, etc.)
- **Validation**: System shows only valid next status options based on current state

### Status Change Permissions
```
Submitted → Accepted: Manager+
Accepted → Assigned: Manager+
Assigned → In Progress: Manager+ or Assigned Technician
In Progress → Completed: Manager+ or Assigned Technician
Any → On Hold: Manager+ or Assigned Technician
Any → Cancelled: Manager+
```

## Access Control and Visibility

### Work Order Visibility Rules

#### Organization Members
- **Owners/Admins**: See all work orders in organization
- **Members**: See work orders they created, are assigned to, or belong to their teams

#### Team-Based Access
- **Team Managers**: See all team work orders plus organization permissions
- **Team Technicians**: See assigned work orders and team work orders
- **Team Requestors**: See work orders they created and team work orders (read-only)
- **Team Viewers**: See team work orders (read-only)

### Data Filtering
Work orders are filtered based on:
- User's organization membership
- Team membership and role
- Individual assignment
- Creation ownership

## Work Order Form Components

### Required Fields
- **Title**: Descriptive work order name
- **Description**: Detailed work instructions
- **Equipment**: Associated equipment (can be pre-selected)

### Optional Fields
- **Priority**: Low, Medium, High (defaults to Medium)
- **Assignee**: Individual technician assignment
- **Team**: Team assignment
- **Due Date**: Target completion date
- **Estimated Hours**: Expected work duration
- **Status**: Initial status (defaults to Submitted)

### Form Behavior
- **Equipment Pre-selection**: When accessed from equipment page, equipment is locked
- **Dynamic Placeholders**: Context-aware placeholder text based on selected equipment
- **Validation**: Client-side validation for required fields
- **Responsive Design**: Adapts to different screen sizes

## Timeline and Activity Tracking

### Timeline Events
Work orders maintain a chronological timeline of activities:

1. **Creation Event**: Initial work order submission
2. **Status Changes**: All status transitions with timestamps
3. **Assignment Changes**: When work order is assigned or reassigned
4. **Completion**: Final completion timestamp

### Timeline Display
- **Visual Timeline**: Icon-based timeline with connecting lines
- **Event Details**: Title, description, timestamp, and responsible user
- **Status Indicators**: Color-coded status badges
- **User Attribution**: Shows who performed each action

## Equipment Integration

### Equipment-Work Order Relationship
- **One-to-Many**: Each equipment item can have multiple work orders
- **Historical Tracking**: Maintains complete work order history per equipment
- **Status Correlation**: Equipment status may reflect ongoing work orders

### Equipment Context Features
- **Pre-filled Forms**: Equipment details auto-populate work order forms
- **Work Order History**: Equipment details page shows all related work orders
- **Quick Actions**: Direct work order creation from equipment interface

## Search and Filtering

### Work Orders Page Filters
- **Search**: Title, assignee name, team name text search
- **Status Filter**: Filter by specific work order status
- **Assignee Filter**: Show work orders for specific individuals
- **Team Filter**: Show work orders for specific teams
- **Date Range**: Filter by creation or due date ranges

### Advanced Filtering (Future Enhancement)
- Equipment type/category filtering
- Priority-based filtering
- Overdue work order identification
- Custom field filtering

## Notification System (Planned)

### Notification Triggers
- **Work Order Created**: Notify managers and team leads
- **Work Order Assigned**: Notify assigned technician
- **Status Changes**: Notify relevant stakeholders
- **Due Date Approaching**: Remind assigned technicians
- **Work Completed**: Notify managers and requestors

### Notification Channels
- **In-App Notifications**: Real-time notifications within EquipQR
- **Email Notifications**: Email alerts for important events
- **Mobile Push**: Push notifications for mobile app users

## Data Models and Structure

### WorkOrder Entity
```typescript
interface WorkOrder {
  id: string;
  title: string;
  description: string;
  equipmentId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assigneeId?: string;
  assigneeName?: string;
  teamId?: string;
  teamName?: string;
  createdDate: string;
  dueDate?: string;
  estimatedHours?: number;
  completedDate?: string;
}
```

### Related Entities
- **Equipment**: Equipment items associated with work orders
- **Users**: Assignees and creators of work orders
- **Teams**: Team assignments and management
- **Timeline Events**: Activity history and status changes

## Best Practices

### For Work Order Creation
1. **Clear Titles**: Use descriptive, specific work order titles
2. **Detailed Descriptions**: Provide comprehensive work instructions
3. **Appropriate Priority**: Set priority based on urgency and impact
4. **Realistic Estimates**: Provide accurate time estimates when possible
5. **Equipment Context**: Create work orders from equipment pages when possible

### For Managers
1. **Timely Review**: Review and accept/reject submitted work orders promptly
2. **Appropriate Assignment**: Assign work to qualified technicians
3. **Resource Planning**: Consider team workload when assigning
4. **Progress Monitoring**: Regularly check work order status and progress
5. **Documentation**: Ensure proper completion documentation

### For Technicians
1. **Status Updates**: Keep work order status current
2. **Clear Communication**: Document any issues or complications
3. **Timely Completion**: Complete work within estimated timeframes
4. **Quality Assurance**: Verify work completion before marking as done
5. **Safety Compliance**: Follow all safety procedures during work

## Security Considerations

### Data Protection
- Work orders contain sensitive equipment and operational data
- Access is restricted based on organization and team membership
- Status changes are tracked with user attribution

### Permission Validation
- All work order operations validate user permissions
- Database Row Level Security (RLS) enforces data isolation
- API endpoints verify authorization before data access

### Audit Trail
- All work order changes are logged with timestamps
- User attribution for all status changes
- Historical data preservation for compliance

## Integration Points

### Equipment Management
- Direct integration with equipment database
- Equipment status updates based on work order status
- QR code scanning for quick work order creation

### Team Management
- Team-based assignment and visibility
- Role-based permission enforcement
- Team workload distribution

### Fleet Map
- Geographic context for equipment work orders
- Route optimization for field technicians
- Location-based work order assignment

## Future Enhancements

### Planned Features
1. **Real-time Notifications**: Instant alerts for status changes
2. **Mobile App Integration**: Field technician mobile interface
3. **Automated Workflows**: Rules-based status transitions
4. **Custom Fields**: Organization-specific work order attributes
5. **Reporting Dashboard**: Work order analytics and metrics
6. **Integration APIs**: Third-party system connections
7. **Predictive Maintenance**: AI-driven work order suggestions
8. **Offline Capability**: Field work without internet connection

### Technical Improvements
1. **Performance Optimization**: Faster loading for large work order lists
2. **Advanced Search**: Full-text search with filters
3. **Bulk Operations**: Multi-select work order management
4. **Export Capabilities**: PDF and Excel work order exports
5. **Template System**: Reusable work order templates

## Troubleshooting

### Common Issues
1. **Permission Denied**: Verify user role and team membership
2. **Equipment Not Found**: Ensure equipment exists and user has access
3. **Assignment Failures**: Check team membership and role permissions
4. **Status Update Errors**: Verify valid status transitions and permissions

### Error Handling
- Clear error messages for permission violations
- Validation feedback for form submission errors
- Graceful handling of network connectivity issues
- User guidance for resolution steps

This documentation provides a comprehensive overview of the work order workflow in EquipQR. For technical implementation details, refer to the codebase and API documentation.
