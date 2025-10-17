import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { 
  MockAuthProvider, 
  MockSessionProvider, 
  MockUserProvider, 
  MockSimpleOrganizationProvider,
  MockSessionProvider2 
} from './mock-providers';

// Test providers wrapper component
export const TestProviders = ({ children, initialEntries }: { children: React.ReactNode; initialEntries?: string[] }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <MemoryRouter initialEntries={initialEntries || ['/']}>
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>
          <MockSessionProvider>
            <MockSessionProvider2>
              <MockUserProvider>
                <MockSimpleOrganizationProvider>
                  {children}
                </MockSimpleOrganizationProvider>
              </MockUserProvider>
            </MockSessionProvider2>
          </MockSessionProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};