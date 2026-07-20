import React from 'react';
import { useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { MFAProvider } from '@/contexts/MFAContext';
import { UserProvider } from '@/contexts/UserContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Sonner toasts are used across the app (`import { toast } from 'sonner'`),
 * but no Sonner <Toaster /> was mounted, so those toasts never rendered
 * (#1081). Mounted above modals via the shared z-toast token so feedback
 * stays visible while dialogs are open.
 */
const AppSonnerToaster: React.FC = () => (
  <SonnerToaster
    theme="dark"
    position="bottom-right"
    closeButton
    style={{ zIndex: 'var(--z-toast)' } as React.CSSProperties}
  />
);

/** TanStack Query retries should stop on hard auth/RBAC failures (not only numeric 401/403 strings). */
function isNonRetryableQueryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('401') || message.includes('403')) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes('jwt') ||
    lower.includes('permission denied') ||
    lower.includes('not authorized') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid refresh token') ||
    lower.includes('session expired')
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Auth/permission errors should not retry; on cellular, give a real
      // error a fast first retry and exponential backoff thereafter so
      // failures pile up sensibly instead of hammering the network.
      retry: (failureCount, error) => {
        if (isNonRetryableQueryError(error)) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // NOTE: experimental_createQueryPersister from @tanstack/react-query-persist-client
      // is NOT set here as a global default because it intercepts the restore phase
      // of EVERY query and stalls any query whose IDB entry doesn't resolve
      // synchronously, breaking the organization loading. Targeted per-query
      // persistence can be wired on individual hooks once the stable v5 API is
      // confirmed. The PWA service worker (src/sw.ts) already covers app-shell
      // caching for offline/cellular scenarios.
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
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" forcedTheme="dark">
          <CookieConsentProvider>
            <TooltipProvider>
              <AuthProvider>
                <SessionProvider>{children}</SessionProvider>
              </AuthProvider>
            </TooltipProvider>
            <CookieConsentBanner />
            <Toaster />
            <AppSonnerToaster />
          </CookieConsentProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" forcedTheme="dark">
        <CookieConsentProvider>
          <TooltipProvider>
            <AuthProvider>
              <MFAProvider>
                <UserProvider>
                  <SessionProvider>{children}</SessionProvider>
                </UserProvider>
              </MFAProvider>
            </AuthProvider>
          </TooltipProvider>
          <CookieConsentBanner />
          <Toaster />
          <AppSonnerToaster />
        </CookieConsentProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};