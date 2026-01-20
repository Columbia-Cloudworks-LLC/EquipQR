# Journey Tests

This folder contains **journey tests** - high-value tests that exercise complete user workflows from start to finish.

> **Note**: The journey test harness (`@/test/journey`) is fully implemented and available for use. 
> See `src/test/journey/` for the implementation and `example.test.tsx` for a working example.

## Philosophy

Journey tests validate that features work from a user's perspective:

- ✅ Render real page components
- ✅ Use `userEvent` for interactions
- ✅ Assert on visible outcomes (text, buttons, navigation)
- ✅ Mock only at external boundaries (Supabase client)
- ❌ Don't mock internal hooks
- ❌ Don't use `renderHook` or `renderHookAsPersona`
- ❌ Don't assert on hook return shapes or internal state

## Writing a New Journey Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderJourney, resetSupabaseMock, seedSupabaseMock, equipment } from '@/test/journey';

describe('Feature Name Journey', () => {
  beforeEach(() => {
    // Reset mock state for isolation
    resetSupabaseMock();
    
    // Seed with test data
    seedSupabaseMock({
      equipment: Object.values(equipment),
    });
  });

  it('allows admin to perform action', async () => {
    const user = userEvent.setup();
    
    // Render page at route
    renderJourney({
      persona: 'admin',
      route: '/dashboard/feature',
      element: <MyPage />,
    });

    // Wait for data to load
    expect(await screen.findByText('Expected Content')).toBeInTheDocument();

    // Interact
    await user.click(screen.getByRole('button', { name: /action/i }));

    // Assert on visible outcome
    expect(await screen.findByText(/success/i)).toBeInTheDocument();
  });
});
```

## Available Utilities

### `renderJourney(options)`

Renders a component with all necessary providers and routing.

```typescript
const { history, persona } = renderJourney({
  persona: 'admin',        // or 'owner', 'technician', 'viewer', etc.
  route: '/dashboard/equipment',
  element: <EquipmentPage />,
});
```

### `seedSupabaseMock(data)`

Seeds the in-memory Supabase mock with test data:

```typescript
seedSupabaseMock({
  equipment: [equipment.forklift1, equipment.forklift2],
  work_orders: Object.values(workOrders),
  teams: Object.values(teams),
});
```

### `setSupabaseError(table, error)`

Forces the mock to return an error for a specific table:

```typescript
import { setSupabaseError } from '@/test/journey';

it('shows error when fetch fails', async () => {
  setSupabaseError('equipment', { message: 'Network error' });
  
  renderJourney({ persona: 'admin', route: '/dashboard/equipment' });
  
  expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
});
```

## When to Write Journey Tests

- **New features**: Test the main happy path + one error case
- **Bug fixes**: If the bug was user-visible, add a journey test
- **Refactors**: Existing journey tests should pass without modification

## When NOT to Write Journey Tests

- Pure utility functions → use unit tests
- Complex business logic unreachable via UI → use unit tests
- Testing external libraries → trust their tests

## Running Journey Tests

```bash
# Run only journey tests
npm run test:journeys

# Run all tests
npm test
```

## See Also

- [Testing Guidelines](../../../docs/technical/testing-guidelines.md)
- [Test Fixtures](../../test/fixtures/)
- [Journey Harness](../../test/journey/)
