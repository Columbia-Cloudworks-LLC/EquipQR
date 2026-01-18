# Testing Guidelines

EquipQR follows a **journey-first** testing strategy that prioritizes user confidence over implementation-detail coverage.

## Philosophy

### Why Journey Tests Over Unit Tests?

As a fast-moving codebase with a solo/small team:

1. **Refactor resilience**: Journey tests survive internal refactors (hook renames, service splits) because they test user-visible behavior.
2. **Higher confidence per test**: A single journey test covers the full integration: routing, providers, data fetching, and UI rendering.
3. **Lower maintenance burden**: Fewer mocks to update when implementation changes.
4. **Real user perspective**: Tests answer "does the feature work?" not "does this function return the right shape?"

### Testing Pyramid (EquipQR Style)

```
         /\
        /  \      ← Rare: Smoke E2E (future Playwright, if needed)
       /----\
      /      \    ← Default: Journey tests (RTL + user-event + Vitest)
     /--------\
    /          \  ← Selective: Unit tests (pure utils, complex business rules)
   --------------
```

## Test Categories

### Journey Tests (Primary)

**Location**: `src/tests/journeys/`

Journey tests render real pages/components through the router and exercise them with user interactions.

**Characteristics**:
- Render actual page components (not test stubs)
- Use `userEvent` to simulate real user behavior
- Assert on user-visible outcomes (text, navigation, button states, toasts)
- Mock only at external boundaries (Supabase client), not hooks

**Example**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderJourney } from '@/test/journey/render-journey';
import { seedSupabaseMock } from '@/test/mocks/supabase-scenario';
import { equipment, workOrders } from '@/test/fixtures/entities';

describe('Work Order Creation Journey', () => {
  beforeEach(() => {
    // Seed the mock backend with test data
    seedSupabaseMock({
      equipment: [equipment.forklift1],
      work_orders: [],
    });
  });

  it('allows admin to create a work order from equipment details', async () => {
    const user = userEvent.setup();
    
    // Render real page via route
    renderJourney({
      persona: 'admin',
      route: `/dashboard/equipment/${equipment.forklift1.id}`,
    });

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(equipment.forklift1.name)).toBeInTheDocument();
    });

    // User action: click create work order
    await user.click(screen.getByRole('button', { name: /create work order/i }));

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'Oil change required');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Assert: success feedback
    await waitFor(() => {
      expect(screen.getByText(/work order created/i)).toBeInTheDocument();
    });
  });
});
```

**Do's**:
- ✅ Use `renderJourney({ persona, route })` to set up providers + router
- ✅ Use `userEvent.setup()` for interactions
- ✅ Assert on visible text, ARIA roles, navigation changes
- ✅ Use `waitFor` / `findBy*` for async operations
- ✅ Seed test data via `seedSupabaseMock()`

**Don'ts**:
- ❌ Import hooks directly (`@/hooks/*`, `@/features/**/hooks/*`)
- ❌ Use `renderHook` or `renderHookAsPersona` 
- ❌ Mock internal hooks with `vi.mock('@/features/.../hooks/useXyz')`
- ❌ Assert on hook return values or internal state
- ❌ Test implementation details (e.g., "this hook calls this service")

### Unit Tests (Selective)

**Location**: Co-located with source (`*.test.ts` next to `*.ts`) or `src/test/unit/`

Unit tests are appropriate for:
- Pure utility functions with stable I/O
- Complex business logic that's hard to reach via UI
- Regression tests for specific bugs with minimal surface area
- Validation schemas (Zod)

**Example**:

```typescript
import { describe, it, expect } from 'vitest';
import { formatWorkingHours, calculateCostTotal } from '@/utils/formatting';

describe('formatWorkingHours', () => {
  it('formats large numbers with commas', () => {
    expect(formatWorkingHours(1500)).toBe('1,500');
  });

  it('handles null as zero', () => {
    expect(formatWorkingHours(null)).toBe('0');
  });
});
```

### Integration Tests

**Location**: `src/tests/integration/`

For testing cross-cutting concerns like routing, providers, or Supabase RPC behavior without full user interaction.

## Test Harness

### Persona-Based Rendering

Use personas to test RBAC consistently:

```typescript
import { renderJourney } from '@/test/journey/render-journey';

// Available personas: 'owner', 'admin', 'teamManager', 'technician', 'viewer'
renderJourney({
  persona: 'technician',
  route: '/dashboard/work-orders',
});
```

### Supabase Scenario Mock

The scenario mock provides realistic query behavior without hitting real Supabase:

```typescript
import { seedSupabaseMock, resetSupabaseMock } from '@/test/mocks/supabase-scenario';
import { equipment, workOrders, teams } from '@/test/fixtures/entities';

beforeEach(() => {
  // Start fresh
  resetSupabaseMock();
  
  // Seed with fixture data
  seedSupabaseMock({
    equipment: Object.values(equipment),
    work_orders: Object.values(workOrders),
    teams: Object.values(teams),
  });
});
```

### Common Patterns

**Waiting for data to load**:

```typescript
// Wait for loading state to resolve
await waitFor(() => {
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});

// Or wait for expected content
expect(await screen.findByText('Forklift #1')).toBeInTheDocument();
```

**Testing error states**:

```typescript
import { seedSupabaseMock, setSupabaseError } from '@/test/mocks/supabase-scenario';

it('shows error message when fetch fails', async () => {
  setSupabaseError('equipment', { message: 'Network error' });

  renderJourney({ persona: 'admin', route: '/dashboard/equipment' });

  expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
});
```

**Testing navigation**:

```typescript
import { renderJourney, getRouter } from '@/test/journey/render-journey';

it('navigates to details on row click', async () => {
  const user = userEvent.setup();
  const { history } = renderJourney({ persona: 'admin', route: '/dashboard/equipment' });

  await user.click(await screen.findByText('Forklift #1'));

  expect(history.location.pathname).toBe(`/dashboard/equipment/${equipment.forklift1.id}`);
});
```

## Running Tests

```bash
# Full test suite
npm test

# Journey tests only
npm run test:journeys

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Database tests (pgTAP)
# Requires local Supabase running
npm run db:start
npm run test:db
```

## Database Tests (pgTAP)

Database tests validate RLS policies, triggers, and schema constraints for critical tables.

**Location**: `supabase/tests/`

**Run**:

```bash
# Start local Supabase once per session
npm run db:start

# Run all pgTAP tests
npm run test:db

# Run a single file
supabase test db supabase/tests/03_work_orders_rls_behavior.sql
```

## Coverage Expectations

- **Journeys**: Focus on happy paths + critical error states for core workflows
- **Global threshold**: 70%+ (enforced by CI)
- **Don't chase 100%**: Avoid writing brittle tests for edge cases that rarely matter

## File Organization

```
src/
├── test/                         # Test utilities & harness
│   ├── setup.ts                  # Global test setup
│   ├── fixtures/                 # Test data
│   │   ├── entities.ts           # Equipment, work orders, teams, etc.
│   │   └── personas.ts           # User personas for RBAC testing
│   ├── journey/                  # Journey test helpers
│   │   └── render-journey.tsx    # renderJourney() helper
│   ├── mocks/                    # Mock implementations
│   │   ├── supabase-scenario.ts  # Scenario-driven Supabase mock
│   │   └── testTypes.ts          # Type definitions
│   └── utils/                    # General test utilities
│       ├── TestProviders.tsx     # Provider wrapper
│       └── test-utils.ts         # Re-exports
├── tests/                        # Test files
│   ├── journeys/                 # Journey tests (primary)
│   │   ├── work-order-lifecycle.test.tsx
│   │   ├── equipment-management.test.tsx
│   │   └── ...
│   └── integration/              # Integration tests
└── features/
    └── equipment/
        └── utils/
            └── formatters.test.ts  # Co-located unit test
```

## Migration from Old Patterns

If you encounter old tests that:
- Mock hooks directly
- Use `renderHookAsPersona` for feature logic
- Assert on hook return shapes

Consider whether they provide value. If the behavior is user-facing, rewrite as a journey. If it's a pure utility, keep as a unit test. Otherwise, remove.
