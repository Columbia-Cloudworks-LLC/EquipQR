import React, { Suspense, useEffect, useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { UserPersona } from '@/test/fixtures/personas';
import {
  createMockSessionForPersona,
  createMockAuthForPersona,
  createMockSimpleOrgForPersona,
} from '@/test/utils/mock-provider-values';
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
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0, // Clean up cache immediately when inactive to prevent leakage between tests
          },
          mutations: {
            retry: false,
          },
        },
      })
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
