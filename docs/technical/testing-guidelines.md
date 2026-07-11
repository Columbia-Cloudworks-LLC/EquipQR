# Testing Guidelines

EquipQR follows a **testing trophy** strategy: fast unit and component tests carry most coverage; Playwright journey tests guard critical user flows.

## Philosophy

### Why the Testing Trophy?

As the product and test suite scale:

1. **Velocity**: Pure logic tests in Node run in milliseconds; only React surfaces pay the jsdom cost.
2. **Refactor resilience**: Component tests verify user-visible behavior; unit tests lock down pure business rules.
3. **Reliable teardown**: Vitest runs natively with a forks pool (no log-watching wrapper); React Query caches and Supabase handles are cleared in global teardown.
4. **Network isolation**: Vitest never hits real Supabase — the global client mock and scenario helpers intercept at the service boundary.

### Testing Trophy (EquipQR Style)

```
         /\
        /  \       ← Playwright user regression (~10%) — auth, WO lifecycle, offline sync
       /----\
      /      \     ← Component tests (~20%) — RTL + jsdom for complex UI
     /--------\
    /          \   ← Unit tests (~70%) — pure utils, mappers, services, hook logic (mocked)
   --------------
```

## Test Infrastructure

### Vitest projects (environment isolation)

`vitest.config.ts` defines two Vitest 4 projects:

| Project | Environment | Scope |
| --- | --- | --- |
| `unit` | `node` | Pure-logic `*.test.ts` / `*.spec.ts` (feature utils, services, script tests) |
| `component` | `jsdom` | `*.test.tsx` and browser-dependent co-located `*.test.ts` |

On Windows, `npm test` and `npm run test:component` run component tests in **four sequential shards** (~80 files each) so you get a summary between chunks instead of a long silent stretch. Linux/macOS CI uses the same shard count via GitHub Actions.

Run a single project (streams file results immediately):

```bash
npm run test:unit
npm run test:component
```

Single shard or verbose per-test output:

```bash
vitest run --project component --shard=1/4
vitest run --project component --reporter=verbose
```

### Network mocking (no real Supabase in Vitest)

- `@/integrations/supabase/client` is mocked globally in `src/test/setup-shared.ts`.
- Journey and component tests seed data via `seedSupabaseMock()` from `@/test/mocks/supabase-scenario`.
- Do **not** point Vitest at local Docker Supabase — reserve real DB access for Playwright and pgTAP.

### Teardown

- `createTestQueryClient()` registers clients for `afterAll` cache clearing.
- Supabase auth timers and WebSocket handles are never created thanks to the global mock.

## Test Categories

### Unit Tests (Primary — ~70%)

**Location**: Co-located with source (`*.test.ts`) or `src/test/unit/`

Appropriate for:

- Pure utility functions, formatters, mappers
- Service functions with mocked Supabase responses
- Validation schemas (Zod)
- Script and build-tool regression tests under `src/tests/scripts/`

**Example**:

```typescript
import { describe, it, expect } from 'vitest';
import { formatWorkingHours } from '@/utils/formatting';

describe('formatWorkingHours', () => {
  it('formats large numbers with commas', () => {
    expect(formatWorkingHours(1500)).toBe('1,500');
  });
});
```

### Component Tests (~20%)

**Location**: Co-located `*.test.tsx` or journey-style tests in `src/tests/journeys/`

Mount UI with React Testing Library and jsdom. Mock only at external boundaries (Supabase), not internal hooks.

**Characteristics**:

- Use `userEvent` for interactions
- Assert on visible text, ARIA roles, navigation, toasts
- Seed data via `seedSupabaseMock()`

**Example**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderJourney } from '@/test/journey/render-journey';
import { seedSupabaseMock } from '@/test/mocks/supabase-scenario';
import { equipment } from '@/test/fixtures/entities';

describe('Work Order Creation Journey', () => {
  beforeEach(() => {
    seedSupabaseMock({
      equipment: [equipment.forklift1],
      work_orders: [],
    });
  });

  it('allows admin to create a work order from equipment details', async () => {
    const user = userEvent.setup();

    renderJourney({
      persona: 'admin',
      route: `/dashboard/equipment/${equipment.forklift1.id}`,
    });

    await waitFor(() => {
      expect(screen.getByText(equipment.forklift1.name)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create work order/i }));
    await user.type(screen.getByLabelText(/title/i), 'Oil change required');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/work order created/i)).toBeInTheDocument();
    });
  });
});
```

**Do's**:

- ✅ Use `renderJourney({ persona, route })` for full-page flows
- ✅ Use `userEvent.setup()` for interactions
- ✅ Assert on visible outcomes
- ✅ Seed test data via `seedSupabaseMock()`

**Don'ts**:

- ❌ Mock internal hooks with `vi.mock('@/features/.../hooks/useXyz')` unless testing the hook itself
- ❌ Assert on implementation details unrelated to user-visible behavior
- ❌ Hit real Supabase from Vitest

### E2E Journey Tests (~10%)

**Location**: `e2e/user/` (Playwright)

Reserve for critical flows that need a real local stack: auth lifecycle, work order creation, offline sync, OAuth integrations. See [e2e-user-regression.md](./e2e-user-regression.md).

### Integration Tests

**Location**: `src/tests/integration/`

Cross-cutting routing, providers, or RPC contract tests without full user interaction.

## Test Harness

### Persona-Based Rendering

```typescript
import { renderJourney } from '@/test/journey/render-journey';

renderJourney({
  persona: 'technician',
  route: '/dashboard/work-orders',
});
```

Available personas: `owner`, `admin`, `teamManager`, `technician`, `viewer`.

### Supabase Scenario Mock

```typescript
import { seedSupabaseMock, resetSupabaseMock } from '@/test/mocks/supabase-scenario';

beforeEach(() => {
  resetSupabaseMock();
  seedSupabaseMock({
    equipment: Object.values(equipment),
    work_orders: Object.values(workOrders),
  });
});
```

## Playwright User Regression

Local browser tests against `http://localhost:8080` with seeded Dev Quick Login users.

```powershell
.\dev-test.bat              # headless critical (default)
npm run test:e2e:critical     # headless critical
npm run test:e2e:full         # headless full suite
```

## Running Tests

```bash
# Full Vitest suite (unit, then component — phased progress)
npm test

# Journey component tests only
npm run test:journeys

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Database tests (pgTAP) — requires local Supabase
npm run db:start
npm run test:db
```

## Database Tests (pgTAP)

**Location**: `supabase/tests/`

Validates RLS policies, triggers, and schema constraints. Requires local Supabase — not run inside Vitest.

## Coverage Expectations

- **Unit + component**: Broad happy paths and critical error states
- **Global threshold**: Enforced by CI ratchet on merged shard coverage
- **Don't chase 100%**: Avoid brittle edge-case tests with low product value

## File Organization

```
src/
├── test/                         # Test utilities & harness
│   ├── setup-shared.ts           # Supabase mock, env stubs (all projects)
│   ├── setup.ts                  # jsdom DOM mocks + RTL cleanup (component project)
│   ├── query-client-registry.ts  # React Query teardown registry
│   ├── fixtures/
│   ├── journey/
│   └── mocks/
│       └── supabase-scenario.ts  # Scenario-driven Supabase mock
├── tests/
│   ├── journeys/                 # Component journey tests
│   └── integration/
└── features/
    └── equipment/
        └── utils/
            └── formatters.test.ts  # Co-located unit test
```

## Migration from Old Patterns

If you encounter tests that:

- Mock hooks directly for feature behavior → rewrite as a component/journey test or unit test the pure logic
- Use `renderHookAsPersona` for feature logic → prefer `createTestQueryClient()` wrapper or journey test
- Depend on `scripts/test-runner.mjs` → removed; use `vitest run` directly

## DSR Cockpit Required Coverage

- `supabase/functions/manage-dsr-request/manage-dsr-request.deno.test.ts`
- `supabase/tests/07_dsr_cockpit_behavior.sql`
- `src/tests/e2e/dsr-cockpit.spec.ts`

Before promoting cockpit changes:

```bash
npm run test -- src/tests/integration/AppRoutes.test.tsx
npm run test -- src/tests/e2e/dsr-cockpit.spec.ts
deno test --allow-env --allow-net supabase/functions/manage-dsr-request/manage-dsr-request.deno.test.ts
npm run test:db
```
