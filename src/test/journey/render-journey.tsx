/**
 * Journey Test Harness
 * 
 * Provides a standardized way to render pages/components for journey tests.
 * This helper sets up all necessary providers, routing, and persona context.
 * 
 * Usage:
 * ```typescript
 * import { renderJourney } from '@/test/journey/render-journey';
 * 
 * it('allows admin to view equipment', async () => {
 *   const user = userEvent.setup();
 *   const { history } = renderJourney({
 *     persona: 'admin',
 *     route: '/dashboard/equipment',
 *   });
 * 
 *   // Test interactions...
 * });
 * ```
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { personas, type PersonaKey, type UserPersona } from '@/test/fixtures/personas';
import { setSupabasePersona } from '@/test/mocks/supabase-scenario';
import { JourneyProviders } from '@/test/journey/journey-providers';

// ============================================
// Types
// ============================================

export interface RenderJourneyOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * User persona for RBAC testing.
   * Use persona key ('admin', 'technician', etc.) or a custom UserPersona object.
   */
  persona: PersonaKey | UserPersona;
  
  /**
   * Initial route to render.
   * Should match a real app route (e.g., '/dashboard/equipment').
   */
  route: string;
  
  /**
   * Optional custom element to render at the route.
   * If not provided, you must wrap App or the relevant page component.
   */
  element?: ReactElement;
  
  /**
   * Additional route entries for navigation history.
   * Defaults to just the initial route.
   */
  historyEntries?: string[];
}

export interface RenderJourneyResult extends ReturnType<typeof render> {
  /**
   * Access to navigation history for assertions.
   */
  history: {
    location: { pathname: string; search: string; hash: string };
    entries: string[];
  };
  
  /**
   * The resolved persona used in the test.
   */
  persona: UserPersona;
}

// ============================================
// Location Tracker State
// ============================================

interface LocationSnapshot {
  pathname: string;
  search: string;
  hash: string;
}

// Stores current location for history access
let currentLocation: LocationSnapshot = { pathname: '/', search: '', hash: '' };

// ============================================
// Main Render Function
// ============================================

/**
 * Render a journey test with all necessary providers and routing.
 * 
 * @example Basic usage with page element
 * ```typescript
 * import { renderJourney } from '@/test/journey/render-journey';
 * import Equipment from '@/features/equipment/pages/Equipment';
 * 
 * renderJourney({
 *   persona: 'admin',
 *   route: '/dashboard/equipment',
 *   element: <Equipment />,
 * });
 * ```
 * 
 * @example With App component for full routing
 * ```typescript
 * import App from '@/App';
 * 
 * renderJourney({
 *   persona: 'technician',
 *   route: '/dashboard/work-orders/wo-123',
 *   element: <App />,
 * });
 * ```
 */
export function renderJourney(options: RenderJourneyOptions): RenderJourneyResult {
  const { persona: personaInput, route, element, historyEntries, ...renderOptions } = options;

  // Resolve persona (can be key or object)
  const persona: UserPersona =
    typeof personaInput === 'string' ? personas[personaInput] : personaInput;

  // Configure the Supabase scenario mock to use this persona for auth
  setSupabasePersona(persona);

  // Build history entries
  const entries = historyEntries ?? [route];
  
  // Reset location tracker
  currentLocation = { pathname: route, search: '', hash: '' };

  // Determine what to render
  const content = element ? (
    <Routes>
      <Route path="*" element={element} />
    </Routes>
  ) : (
    // If no element provided, just render children (caller must wrap their own routes)
    <div data-testid="journey-no-element">No element provided to renderJourney</div>
  );

  const result = render(content, {
    wrapper: ({ children }) => (
      <JourneyProviders
        persona={persona}
        initialEntries={entries}
        onLocationChange={(location) => {
          currentLocation = location;
        }}
      >
        {children}
      </JourneyProviders>
    ),
    ...renderOptions,
  });

  return {
    ...result,
    history: {
      get location() {
        return currentLocation;
      },
      entries,
    },
    persona,
  };
}

// ============================================
// Helper: Query idle utilities (intentionally simplified)
// ============================================

/**
 * @deprecated This helper is intentionally deprecated and no longer usable.
 * Journey tests should use React Testing Library's `waitFor()` with explicit
 * assertions instead of relying on a global "query idle" helper.
 * 
 * Example of preferred approach:
 * ```typescript
 * await waitFor(() => {
 *   expect(screen.getByText('Data loaded')).toBeInTheDocument();
 * });
 * ```
 * 
 * This function throws an error to make usage fail loudly so tests are updated.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function waitForQueryIdle(_timeoutMs = 5000): Promise<void> {
  throw new Error(
    '[renderJourney.waitForQueryIdle] is deprecated and no longer supported. ' +
      'Use React Testing Library\'s waitFor() with explicit assertions instead.',
  );
}

// ============================================
// Re-export common testing utilities
// ============================================

export { personas } from '@/test/fixtures/personas';
export type { PersonaKey, UserPersona } from '@/test/fixtures/personas';
