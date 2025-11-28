# Developer Onboarding Guide

## Welcome to EquipQR™ Development!

This guide will help you get up and running with the EquipQR™ codebase quickly and efficiently.

## Prerequisites

Before you begin, ensure you have the following installed on your development machine:

### Required Software

- **Node.js** (v18.x or v20.x) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) - We use npm exclusively (no yarn/pnpm/bun)
- **Git** - [Download here](https://git-scm.com/)
- **Modern Code Editor** - We recommend [VS Code](https://code.visualstudio.com/)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-todo-highlight"
  ]
}
```

### Account Requirements

- **Supabase Account** - [Sign up here](https://supabase.com/)
- **GitHub Account** - For version control and collaboration

## Quick Start (5-Minute Setup)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd equipqr
```

### 2. Install Dependencies

```bash
npm ci
```

> **Note**: We use `npm ci` for consistent, reproducible installs. Never use other package managers.

### 3. Environment Setup

```bash
# Copy the environment template
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:8080` to see the application running!

## Detailed Setup Guide

### Setting Up Supabase

1. **Create a Supabase Project**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose your organization and set project details

2. **Get Your Credentials**
   - Navigate to Settings > API
   - Copy your Project URL and anon/public key
   - Add these to your `.env` file

3. **Set Up Database (Optional for Development)**
   ```bash
   # If you want to run migrations locally
   npx supabase login
   npx supabase link --project-ref your-project-ref
   npx supabase db pull
   ```

### Development Workflow

#### Daily Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Type checking
npm run type-check

# Build for production
npm run build
```

#### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

3. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Project Structure Deep Dive

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   ├── equipment/      # Equipment-specific components
│   ├── work-orders/    # Work order components
│   ├── teams/          # Team management components
│   ├── auth/           # Authentication components
│   └── layout/         # Layout components (sidebar, nav, etc.)
├── pages/              # Route-level page components
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── contexts/           # React Context providers
├── integrations/       # Third-party integrations (Supabase)
└── test/               # Test utilities and setup
```

### Key Architectural Patterns

#### 1. Component Organization
- **Pages**: Route-level components in `src/pages/`
- **Feature Components**: Domain-specific components in `src/components/[feature]/`
- **UI Components**: Reusable primitives in `src/components/ui/`

#### 2. Data Fetching
- **TanStack Query** for server state management
- **Custom Hooks** for data operations
- **Supabase Client** for database operations

#### 3. State Management
- **Server State**: TanStack Query
- **Global State**: React Context
- **Local State**: useState/useReducer

#### 4. Styling
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for component primitives
- **CSS Variables** for theming

## Development Guidelines

### Code Style

#### TypeScript Usage
```typescript
// ✅ Good: Proper typing
interface EquipmentProps {
  equipment: Equipment;
  onEdit: (id: string) => void;
}

const EquipmentCard: React.FC<EquipmentProps> = ({ equipment, onEdit }) => {
  // Implementation
};

// ❌ Bad: Using any
const EquipmentCard = ({ equipment }: any) => {
  // Implementation
};
```

#### Component Patterns
```typescript
// ✅ Good: Focused component with single responsibility
const EquipmentStatus = ({ status }: { status: Equipment['status'] }) => {
  const statusConfig = {
    active: { color: 'green', label: 'Active' },
    maintenance: { color: 'yellow', label: 'Maintenance' },
    inactive: { color: 'gray', label: 'Inactive' }
  };
  
  return (
    <Badge className={`bg-${statusConfig[status].color}-100`}>
      {statusConfig[status].label}
    </Badge>
  );
};
```

#### Error Handling
```typescript
// ✅ Good: Proper error handling
const useEquipment = (orgId: string) => {
  return useQuery({
    queryKey: ['equipment', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', orgId);
      
      if (error) {
        console.error('Failed to fetch equipment:', error);
        throw new Error(`Failed to load equipment: ${error.message}`);
      }
      
      return data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};
```

### Testing Guidelines

#### Writing Tests
```typescript
// Example test structure
describe('EquipmentCard', () => {
  const mockEquipment: Equipment = {
    id: '1',
    name: 'Test Equipment',
    status: 'active',
    // ... other required fields
  };

  it('renders equipment name correctly', () => {
    render(<EquipmentCard equipment={mockEquipment} onEdit={vi.fn()} />);
    expect(screen.getByText('Test Equipment')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<EquipmentCard equipment={mockEquipment} onEdit={onEdit} />);
    
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

## Common Development Tasks

### Adding a New Feature

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Create Components**
   ```bash
   # Create component files
   mkdir src/components/new-feature
   touch src/components/new-feature/NewFeature.tsx
   touch src/components/new-feature/NewFeatureForm.tsx
   ```

3. **Add Types**
   ```typescript
   // src/types/newFeature.ts
   export interface NewFeature {
     id: string;
     name: string;
     // ... other fields
   }
   ```

4. **Create API Service**
   ```typescript
   // src/services/newFeatureService.ts
   export const newFeatureService = {
     async getAll(orgId: string) {
       const { data, error } = await supabase
         .from('new_features')
         .select('*')
         .eq('organization_id', orgId);
       
       if (error) throw error;
       return data;
     }
   };
   ```

5. **Add Tests**
   ```typescript
   // src/components/new-feature/NewFeature.test.tsx
   import { render, screen } from '@testing-library/react';
   import { NewFeature } from './NewFeature';
   
   describe('NewFeature', () => {
     it('renders correctly', () => {
       render(<NewFeature />);
       // Test assertions
     });
   });
   ```

### Database Changes

1. **Create Migration** (if needed)
   ```bash
   npx supabase migration new add_new_feature_table
   ```

2. **Write Migration SQL**
   ```sql
   -- supabase/migrations/timestamp_add_new_feature_table.sql
   CREATE TABLE new_features (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE new_features ENABLE ROW LEVEL SECURITY;
   
   -- Add policies
   CREATE POLICY "Users can view org features" ON new_features
     FOR SELECT USING (organization_id IN (
       SELECT organization_id FROM organization_members 
       WHERE user_id = auth.uid() AND status = 'active'
     ));
   ```

3. **Apply Migration**
   ```bash
   npx supabase db push
   ```

4. **Update Types**
   ```bash
   npx supabase gen types typescript --local > src/integrations/supabase/types.ts
   ```

## Troubleshooting Common Issues

### Environment Issues

**Problem**: "Missing required Supabase environment variables"
```bash
# Solution: Check your .env file
cat .env

# Ensure you have:
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Problem**: Development server won't start
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database Issues

**Problem**: Database connection errors
```bash
# Check Supabase project status
npx supabase status

# Reset local database
npx supabase db reset
```

**Problem**: RLS policy errors
```sql
-- Check your policies in Supabase dashboard
-- Ensure user has proper organization membership
```

### Build Issues

**Problem**: TypeScript errors
```bash
# Run type checking
npm run type-check

# Fix common issues:
# 1. Missing imports
# 2. Incorrect types
# 3. Unused variables
```

**Problem**: Bundle size too large
```bash
# Analyze bundle
npm run analyze

# Common solutions:
# 1. Lazy load components
# 2. Remove unused dependencies
# 3. Optimize imports
```

## Getting Help

### Resources

- **Documentation**: Check the `docs/` folder
- **API Reference**: `docs/api-reference.md`
- **Architecture Guide**: `docs/architecture.md`
- **Agents Guide**: `../../.cursor/agents.md` (development workflow)

### Team Communication

- **Code Reviews**: All changes require PR review
- **Questions**: Create GitHub issues for technical questions
- **Discussions**: Use GitHub Discussions for broader topics

### Development Tools

```bash
# Useful development commands
npm run lint          # Check code style
npm run type-check    # Check TypeScript
npm run test:coverage # Run tests with coverage
npm run size-check    # Check bundle size
```

## Next Steps

1. **Explore the Codebase**: Start with `src/App.tsx` and follow the component tree
2. **Read the Documentation**: Review `docs/features.md` and `docs/technical-guide.md`
3. **Run Tests**: Execute `npm run test` to understand the testing patterns
4. **Make a Small Change**: Try updating a component or adding a new feature
5. **Join the Team**: Participate in code reviews and team discussions

Welcome to the EquipQR™ development team! 🎉
