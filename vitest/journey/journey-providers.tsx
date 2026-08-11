import React, { Suspense, useEffect, useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@vitest-harness/utils/query-client-wrapper';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { UserPersona } from '@vitest-harness/fixtures/personas';
import {
  createMockSessionForPersona,
  createMockAuthForPersona,
  createMockSimpleOrgForPersona,
} from '@vitest-harness/utils/mock-provider-values';
import { SessionContext } from '@/contexts/SessionContext';
import { AuthContext } from '@/contexts/AuthContext';
import { SimpleOrganizationContext } from '@/contexts/SimpleOrganizationContext';

interface LocationSnapshot {
  pathname: string;
  search: string;
  hash: string;
}

interface JourneyProvidersProps {
  children: React.ReactNode;
  persona: UserPersona;
  initialEntries: string[];
  onLocationChange: (location: LocationSnapshot) => void;
}

const LocationTracker: React.FC<{ onLocationChange: (location: LocationSnapshot) => void }> = ({
  onLocationChange,
}) => {
  const location = useLocation();

  useEffect(() => {
    onLocationChange({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location, onLocationChange]);

  return null;
};

export const JourneyProviders: React.FC<JourneyProvidersProps> = ({
  children,
  persona,
  initialEntries,
  onLocationChange,
}) => {
  // Create a fresh QueryClient for each test instance to ensure isolation.
  // Using useState ensures the client is stable across re-renders of the same
  // test instance, preventing unexpected cache resets during the test lifecycle.
  const [queryClient] = useState(() =>
    createTestQueryClient({ gcTime: 0, staleTime: 0 }),
  );

  // Create persona-aware mock context values
  const sessionValue = createMockSessionForPersona(persona);
  const authValue = createMockAuthForPersona(persona);
  const orgValue = createMockSimpleOrgForPersona(persona);

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthContext.Provider value={authValue}>
            <SessionContext.Provider value={sessionValue}>
              <SimpleOrganizationContext.Provider value={orgValue}>
                <LocationTracker onLocationChange={onLocationChange} />
                <Suspense fallback={<div data-testid="journey-loading">Loading...</div>}>
                  {children}
                </Suspense>
              </SimpleOrganizationContext.Provider>
            </SessionContext.Provider>
          </AuthContext.Provider>
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};
