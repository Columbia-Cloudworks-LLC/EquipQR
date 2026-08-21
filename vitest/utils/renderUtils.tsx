import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TestProviders } from './TestProviders';
import { personas, type PersonaKey } from '@vitest-harness/fixtures/personas';

/**
 * Custom render that wraps components in all necessary providers.
 * Use this for standard component testing.
 */
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestProviders, ...options });

/**
 * Render options for persona-based rendering
 */
export interface RenderAsPersonaOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route entries for MemoryRouter */
  initialEntries?: string[];
}

/**
 * Render a component as a specific user persona.
 * This configures all providers with the persona's role, permissions, and team memberships.
 * 
 * @example
 * ```tsx
 * import { renderAsPersona } from '@vitest-harness/utils/test-utils';
 * 
 * describe('WorkOrderCard', () => {
 *   describe('as a Technician', () => {
 *     it('shows only assigned work orders', () => {
 *       const { getByText } = renderAsPersona(
 *         <WorkOrderCard workOrder={mockWorkOrder} />,
 *         'technician'
 *       );
 *       // assertions...
 *     });
 *   });
 * });
 * ```
 */
export const renderAsPersona = (
  ui: ReactElement,
  personaKey: PersonaKey,
  options?: RenderAsPersonaOptions
) => {
  const { initialEntries, ...renderOptions } = options || {};
  const persona = personas[personaKey];
  
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders persona={persona} initialEntries={initialEntries}>
        {children}
      </TestProviders>
    ),
    ...renderOptions
  });
};