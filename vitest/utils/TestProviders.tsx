/* eslint-disable react-refresh/only-export-components */
// Test utility file - Fast Refresh is not applicable here

import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient } from '@vitest-harness/utils/query-client-wrapper';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  MockAuthProvider, 
  MockSessionProvider, 
  MockUserProvider, 
  MockSimpleOrganizationProvider,
  MockSessionProvider2 
} from './mock-providers';
import type { UserPersona } from '@vitest-harness/fixtures/personas';
import {
  createMockSessionForPersona,
  createMockAuthForPersona,
  createMockSimpleOrgForPersona
} from './mock-provider-values';
import { SettingsContext } from '@/contexts/settings-context';
import type { SettingsContextType } from '@/contexts/settings-context';
import type { UserSettings } from '@/types/settings';

/** Non-system timezone for timezone migration tests (#647 / #767). */
export const testUserSettingsSydney: UserSettings = {
  timezone: 'Australia/Sydney',
  dateFormat: 'MM/dd/yyyy',
};

const defaultTestSettingsContext: SettingsContextType = {
  settings: testUserSettingsSydney,
  updateSetting: () => {},
  resetSettings: () => {},
  isLoading: false,
};


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
  // Fresh QueryClient per wrapper instance (test isolation). useState keeps the
  // same client across re-renders so cache is not reset mid-test (#1314).
  const [queryClient] = useState(() => createTestQueryClient());

  // Create persona-aware mock values if persona is provided
  const sessionValue = persona ? createMockSessionForPersona(persona) : undefined;
  const authValue = persona ? createMockAuthForPersona(persona) : undefined;
  const orgValue = persona ? createMockSimpleOrgForPersona(persona) : undefined;

  return (
    <MemoryRouter initialEntries={initialEntries || ['/']}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SettingsContext.Provider value={defaultTestSettingsContext}>
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
          </SettingsContext.Provider>
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