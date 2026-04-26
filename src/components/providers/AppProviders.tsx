import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { MFAProvider } from '@/contexts/MFAContext';
import { UserProvider } from '@/contexts/UserContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
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
  const isQrEntry = typeof window !== 'undefined' && window.location.pathname.startsWith('/qr/');

  if (isQrEntry) {
    return (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" forcedTheme="dark">
            <AuthProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                {children}
              </Router>
            </AuthProvider>
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
                <SessionProvider>
                  <Router
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    {children}
                  </Router>
                </SessionProvider>
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