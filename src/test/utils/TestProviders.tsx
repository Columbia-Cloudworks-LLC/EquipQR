/* eslint-disable react-refresh/only-export-components */
// Test utility file - Fast Refresh is not applicable here

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  MockAuthProvider, 
  MockSessionProvider, 
  MockUserProvider, 
  MockSimpleOrganizationProvider,
  MockSessionProvider2 
} from './mock-providers';
import type { UserPersona } from '@/test/fixtures/personas';
import {
  createMockSessionForPersona,
  createMockAuthForPersona,
  createMockSimpleOrgForPersona
} from './mock-provider-values';

export interface TestProvidersProps {
  children: React.ReactNode;
  initialEntries?: string[];
  /** 
   * Optional persona for persona-based testing.
   * When provided, all mock providers will be configured for this persona's
   * role, permissions, and team memberships.
   */
  persona?: UserPersona;
}

// Test providers wrapper component
export const TestProviders = ({ 
  children, 
  initialEntries,
  persona 
}: TestProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // Create persona-aware mock values if persona is provided
  const sessionValue = persona ? createMockSessionForPersona(persona) : undefined;
  const authValue = persona ? createMockAuthForPersona(persona) : undefined;
  const orgValue = persona ? createMockSimpleOrgForPersona(persona) : undefined;

  return (
    <MemoryRouter initialEntries={initialEntries || ['/']}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MockAuthProvider value={authValue}>
            <MockSessionProvider value={sessionValue}>
              <MockSessionProvider2>
                <MockUserProvider>
                  <MockSimpleOrganizationProvider value={orgValue}>
                    {children}
                  </MockSimpleOrganizationProvider>
                </MockUserProvider>
              </MockSessionProvider2>
            </MockSessionProvider>
          </MockAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

/**
 * Create a wrapper component pre-configured for a specific persona.
 * Useful for renderHook and other testing scenarios.
 */
export const createPersonaWrapper = (persona: UserPersona, initialEntries?: string[]) => {
  return ({ children }: { children: React.ReactNode }) => (
    <TestProviders persona={persona} initialEntries={initialEntries}>
      {children}
    </TestProviders>
  );
};