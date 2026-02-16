/**
 * Journey Test Harness
 * 
 * This module provides utilities for writing journey tests that render
 * real pages and exercise user flows.
 * 
 * @example
 * ```typescript
 * import { renderJourney, personas } from '@/test/journey';
 * import userEvent from '@testing-library/user-event';
 * import { screen, waitFor } from '@testing-library/react';
 * 
 * describe('Equipment Management Journey', () => {
 *   it('allows admin to view equipment list', async () => {
 *     const user = userEvent.setup();
 *     
 *     renderJourney({
 *       persona: 'admin',
 *       route: '/dashboard/equipment',
 *       element: <Equipment />,
 *     });
 * 
 *     await waitFor(() => {
 *       expect(screen.getByText('Equipment')).toBeInTheDocument();
 *     });
 *   });
 * });
 * ```
 */

export {
  renderJourney,
  personas,
  type RenderJourneyOptions,
  type RenderJourneyResult,
  type PersonaKey,
  type UserPersona,
} from './render-journey';

// Re-export Supabase scenario mock utilities for convenience
export {
  resetSupabaseMock,
  seedSupabaseMock,
  setSupabaseError,
  type SeedData,
  type TableName,
} from '@/test/mocks/supabase-scenario';

// Re-export fixture entities
export * from '@/test/fixtures/entities';
