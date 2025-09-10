
# EquipQR Technical Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern browser with ES2020+ support
- Git for version control

### Installation
```bash
git clone <repository-url>
cd equipqr
npm install
npm run dev
```

## Architecture Deep Dive

### Component Architecture
EquipQR follows a modular component architecture with clear separation of concerns:

#### Page Components
Located in `src/pages/`, these are route-level components that compose smaller components:
- Handle route-specific state
- Coordinate data fetching
- Manage page-level layouts
- Should not exceed 300 lines of code

#### Feature Components
Located in `src/components/[feature]/`, these handle specific domain logic:
- Equipment management (`src/components/equipment/`)
- Work order processing (`src/components/work-orders/`)
- Team organization (`src/components/teams/`)

#### UI Components
Located in `src/components/ui/`, these are reusable interface elements:
- Based on shadcn/ui design system
- Fully accessible with ARIA support
- Consistent styling and behavior
- Type-safe props with TypeScript

### State Management Strategy

#### Server State (TanStack Query)
```typescript
// Example: Equipment data fetching
const { data: equipment, isLoading, error } = useQuery({
  queryKey: ['equipment'],
  queryFn: fetchEquipment,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

#### Local State (React Hooks)
```typescript
// Example: Form state management
const [formData, setFormData] = useState<EquipmentFormData>({
  name: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
});
```

#### Global State (React Context)
```typescript
// Example: User preferences
const { theme, setTheme } = useTheme();
const { sidebarOpen, setSidebarOpen } = useSidebar();
```

### Routing Configuration

The application uses React Router v6 with nested routing:

```typescript
// Main route structure in App.tsx
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/equipment" element={<Equipment />} />
  <Route path="/work-orders" element={<WorkOrders />} />
  <Route path="/teams" element={<Teams />} />
  <Route path="/fleet-map" element={<FleetMap />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Form Handling Patterns

#### React Hook Form Integration
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const equipmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  model: z.string().min(1, 'Model is required'),
});

const EquipmentForm = () => {
  const form = useForm({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      model: '',
    },
  });
};
```

## Development Best Practices

### Code Style Guidelines

#### TypeScript Usage
- Use strict type checking
- Define interfaces for all data structures
- Avoid `any` type, use `unknown` when necessary
- Implement proper error handling with typed exceptions

#### Component Design
```typescript
// Good: Focused, single responsibility
interface EquipmentCardProps {
  equipment: Equipment;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  onEdit,
  onDelete,
}) => {
  // Component implementation
};
```

#### Error Handling
```typescript
// Implement proper error boundaries
const EquipmentList = () => {
  const { data, error, isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: fetchEquipment,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (error) {
    console.error('Equipment loading failed:', error);
    return <ErrorMessage message="Failed to load equipment" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <EquipmentGrid equipment={data} />;
};
```

### Testing Strategy

#### Unit Testing
- Test component rendering with React Testing Library
- Mock external dependencies
- Test user interactions and state changes
- Maintain >80% code coverage

#### Integration Testing
- Test complete user workflows
- Verify API integration points
- Test routing and navigation
- Validate form submissions

### Performance Optimization

#### Code Splitting
```typescript
// Lazy load heavy components
const FleetMap = lazy(() => import('./pages/FleetMap'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <FleetMap />
</Suspense>
```

#### Memoization
```typescript
// Expensive calculations
const expensiveValue = useMemo(() => 
  calculateComplexMetrics(equipment), 
  [equipment]
);

// Stable callback references
const handleEquipmentUpdate = useCallback((id: string, data: EquipmentData) => {
  updateEquipment.mutate({ id, data });
}, [updateEquipment]);
```

### Security Considerations

#### Input Validation
- Validate all user inputs with Zod schemas
- Sanitize data before processing
- Implement proper form validation
- Use TypeScript for compile-time safety

#### Access Control
- Implement role-based access control
- Validate permissions before UI actions
- Secure API endpoints with proper authentication
- Use HTTPS for all communications

## API Integration Patterns

### Data Fetching
```typescript
// Standardized API service
class EquipmentService {
  static async getAll(): Promise<Equipment[]> {
    const response = await fetch('/api/equipment');
    if (!response.ok) {
      throw new Error('Failed to fetch equipment');
    }
    return response.json();
  }

  static async create(data: CreateEquipmentData): Promise<Equipment> {
    const response = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create equipment');
    }
    
    return response.json();
  }
}
```

### Mutation Handling
```typescript
// Optimistic updates with TanStack Query
const updateEquipment = useMutation({
  mutationFn: EquipmentService.update,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['equipment'] });
    const previousData = queryClient.getQueryData(['equipment']);
    
    queryClient.setQueryData(['equipment'], (old: Equipment[]) =>
      old.map(item => item.id === newData.id ? { ...item, ...newData } : item)
    );
    
    return { previousData };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['equipment'], context?.previousData);
    toast.error('Failed to update equipment');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  },
});
```

## Deployment Guidelines

### Build Optimization
```bash
# Production build
npm run build

# Analyze bundle size
npm run build -- --analyze
```

### Environment Configuration
```typescript
// Environment variables
const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  environment: import.meta.env.VITE_ENVIRONMENT,
  enableDevTools: import.meta.env.DEV,
};
```

### Performance Monitoring
- Implement error tracking with proper logging
- Monitor Core Web Vitals
- Track user interactions and performance metrics
- Set up automated performance budgets

This technical guide provides the foundation for maintaining and extending the EquipQR platform while ensuring code quality, performance, and maintainability.
