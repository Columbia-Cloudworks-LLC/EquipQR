import { ReactElement } from 'react';
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react';
import { TestProviders, createPersonaWrapper } from './TestProviders';
import { personas, type PersonaKey, type UserPersona } from '@/test/fixtures/personas';

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
 * import { renderAsPersona } from '@/test/utils/test-utils';
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

/**
 * Render a component with a custom persona object.
 * Use this for edge cases where the predefined personas don't fit.
 */
export const renderWithCustomPersona = (
  ui: ReactElement,
  persona: UserPersona,
  options?: RenderAsPersonaOptions
) => {
  const { initialEntries, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders persona={persona} initialEntries={initialEntries}>
        {children}
      </TestProviders>
    ),
    ...renderOptions
  });
};

/**
 * Hook render options for persona-based hook testing
 */
export interface RenderHookAsPersonaOptions<TProps> extends Omit<RenderHookOptions<TProps>, 'wrapper'> {
  /** Initial route entries for MemoryRouter */
  initialEntries?: string[];
}

/**
 * Render a hook as a specific user persona.
 * This is useful for testing hooks that depend on user context/permissions.
 * 
 * @example
 * ```tsx
 * import { renderHookAsPersona } from '@/test/utils/test-utils';
 * 
 * describe('useWorkOrders', () => {
 *   describe('as an Admin', () => {
 *     it('returns all work orders', async () => {
 *       const { result } = renderHookAsPersona(
 *         () => useWorkOrders(),
 *         'admin'
 *       );
 *       // assertions...
 *     });
 *   });
 * });
 * ```
 */
export const renderHookAsPersona = <TResult, TProps>(
  hook: (props: TProps) => TResult,
  personaKey: PersonaKey,
  options?: RenderHookAsPersonaOptions<TProps>
) => {
  const { initialEntries, ...hookOptions } = options || {};
  const persona = personas[personaKey];
  
  return renderHook(hook, {
    wrapper: createPersonaWrapper(persona, initialEntries),
    ...hookOptions
  });
};

/**
 * Render a hook with a custom persona object.
 */
export const renderHookWithCustomPersona = <TResult, TProps>(
  hook: (props: TProps) => TResult,
  persona: UserPersona,
  options?: RenderHookAsPersonaOptions<TProps>
) => {
  const { initialEntries, ...hookOptions } = options || {};
  
  return renderHook(hook, {
    wrapper: createPersonaWrapper(persona, initialEntries),
    ...hookOptions
  });
};