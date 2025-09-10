
# EquipQR - Fleet Equipment Management Platform

## Project Overview

EquipQR is a comprehensive fleet equipment management platform built with React, TypeScript, and modern web technologies. The application enables organizations to efficiently track, manage, and maintain their equipment fleet through QR code integration, work order management, and real-time monitoring.

### Core Purpose
- Track equipment assets with QR code integration
- Manage maintenance work orders and schedules
- Monitor equipment status and location
- Organize teams and assign responsibilities
- Visualize fleet distribution on interactive maps

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component library for consistent UI
- **React Router** for client-side routing
- **TanStack Query** for data fetching and state management

### Key Dependencies
- **Lucide React** - Icon library
- **Recharts** - Chart and data visualization
- **React Hook Form** - Form handling
- **Zod** - Runtime type validation
- **Sonner** - Toast notifications

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components (sidebar, navigation)
│   ├── equipment/      # Equipment-specific components
│   ├── work-orders/    # Work order components
│   └── teams/          # Team management components
├── pages/              # Main application pages
├── hooks/              # Custom React hooks
└── lib/                # Utility functions and configurations
```

## Core Features

### 1. Equipment Management
- **Asset Tracking**: Comprehensive equipment database with detailed specifications
- **QR Code Integration**: Generate and scan QR codes for quick equipment access
- **Status Management**: Track equipment status (active, maintenance, inactive)
- **Location Tracking**: Monitor equipment location and assignments
- **Maintenance History**: Record and track maintenance activities

### 2. Work Order System
- **Order Creation**: Create detailed work orders with priorities and assignments
- **Status Tracking**: Monitor work order progress through multiple states
- **Team Assignment**: Assign work orders to specific teams or individuals
- **Due Date Management**: Track deadlines and schedule maintenance
- **Progress Monitoring**: Real-time updates on work order completion

### 3. Team Management
- **Team Organization**: Create and manage maintenance teams
- **Role Assignment**: Define team member roles and responsibilities
- **Workload Distribution**: Balance work assignments across teams
- **Performance Tracking**: Monitor team productivity and efficiency

### 4. Fleet Visualization
- **Interactive Maps**: Visual representation of equipment locations
- **Real-time Updates**: Live tracking of equipment movements
- **Geographic Analysis**: Spatial analysis of fleet distribution
- **Route Optimization**: Optimize maintenance routes and schedules

## Data Models

### Equipment Entity
```typescript
interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'active' | 'maintenance' | 'inactive';
  location: string;
  installationDate: string;
  warrantyExpiration: string;
  lastMaintenance: string;
  notes?: string;
}
```

### Work Order Entity
```typescript
interface WorkOrder {
  id: string;
  title: string;
  description: string;
  equipmentId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assigneeId?: string;
  teamId?: string;
  createdDate: string;
  dueDate?: string;
  estimatedHours?: number;
  completedDate?: string;
}
```

### Team Entity
```typescript
interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  specializations: string[];
  activeWorkOrders: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  skills: string[];
}
```

## Navigation Structure

### Main Navigation
- **Dashboard** (`/`) - Overview and key metrics
- **Equipment** (`/equipment`) - Equipment management and tracking
- **Work Orders** (`/work-orders`) - Work order creation and management
- **Teams** (`/teams`) - Team organization and assignment
- **Fleet Map** (`/fleet-map`) - Geographic equipment visualization

### Management Section
- **Organization** (`/organization`) - Company and organizational settings
- **QR Scanner** (`/scanner`) - QR code scanning functionality
- **Billing** (`/billing`) - Subscription and payment management
- **Settings** (`/settings`) - Application configuration

## Key Components

### Layout Components
- **AppSidebar**: Main navigation sidebar with collapsible functionality
- **SidebarProvider**: Context provider for sidebar state management

### Equipment Components
- **EquipmentForm**: Modal form for creating/editing equipment
- **QRCodeDisplay**: QR code generation and display modal
- **Equipment Page**: Main equipment listing with search and filters

### Work Order Components
- **WorkOrderForm**: Comprehensive work order creation form
- **Work Orders Page**: Work order management dashboard

### UI Components
All UI components follow the shadcn/ui design system:
- Consistent styling with Tailwind CSS
- Accessible components with proper ARIA attributes
- Responsive design for all screen sizes
- Dark/light theme support

## Development Guidelines

### Code Organization
- Use TypeScript for all new code
- Follow React functional component patterns
- Implement proper error boundaries
- Use custom hooks for shared logic
- Maintain component size under 200 lines

### Styling Standards
- Use Tailwind utility classes
- Follow semantic color tokens (primary, secondary, muted, etc.)
- Implement responsive design by default
- Maintain consistent spacing and typography

### State Management
- Use TanStack Query for server state
- Implement local state with useState/useReducer
- Share state through React Context when needed
- Avoid prop drilling with proper component composition

### Performance Considerations
- Implement code splitting for large features
- Use React.memo for expensive components
- Optimize re-renders with useCallback/useMemo
- Lazy load heavy components and pages

## Future Enhancements

### Planned Features
- Real-time notifications for equipment status changes
- Advanced analytics and reporting dashboards
- Mobile app integration for field technicians
- IoT sensor integration for automated monitoring
- Predictive maintenance algorithms
- Integration with external ERP systems

### Technical Improvements
- Progressive Web App (PWA) capabilities
- Offline functionality for field operations
- Advanced caching strategies
- Performance monitoring and optimization
- Automated testing implementation
- CI/CD pipeline setup

## Troubleshooting

### Common Issues
- **Build Errors**: Check TypeScript type definitions and imports
- **Routing Issues**: Verify React Router configuration in App.tsx
- **Styling Problems**: Ensure Tailwind classes are properly applied
- **Component Errors**: Check shadcn/ui component usage and props

### Development Tips
- Use browser DevTools for debugging React components
- Monitor network requests with TanStack Query DevTools
- Test responsive design with device simulation
- Validate forms with proper error handling
- Implement loading states for better UX

This knowledge base serves as the foundation for understanding and extending the EquipQR platform. All new features should align with these architectural principles and coding standards.
