import React from 'react';
import { useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { MFAProvider } from '@/contexts/MFAContext';
import { UserProvider } from '@/contexts/UserContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createScopedQueryPersister } from '@/lib/queryPersistence';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Auth/permission errors should not retry; on cellular, give a real
      // error a fast first retry and exponential backoff thereafter so
      // failures pile up sensibly instead of hammering the network.
      retry: (failureCount, error) => {
        const message = error instanceof Error ? error.message : String(error ?? '');
        if (message.includes('401') || message.includes('403')) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Per-query persistence to IndexedDB, scoped per <user, org>. When the
      // browser is offline (or a cold reload happens on slow cellular), this
      // is what lets a previously-loaded equipment / work-order / PM page
      // hydrate from disk instead of showing a blank skeleton forever.
      persister: createScopedQueryPersister(),
    },
    mutations: {
      networkMode: 'always', // Always fire mutationFn; offline handling is in OfflineAwareService layer
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  const { pathname } = useLocation();
  const isQrEntry = pathname.startsWith('/qr/');

  if (isQrEntry) {
    return (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" forcedTheme="dark">
            <TooltipProvider>
              <AuthProvider>
                <SessionProvider>{children}</SessionProvider>
              </AuthProvider>
            </TooltipProvider>
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" forcedTheme="dark">
          <TooltipProvider>
            <AuthProvider>
              <MFAProvider>
              <UserProvider>
                <SessionProvider>{children}</SessionProvider>
              </UserProvider>
              </MFAProvider>
            </AuthProvider>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};