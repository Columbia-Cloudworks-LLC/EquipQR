import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AppProviders as AppProvidersComponent } from './AppProviders';

function renderWithRouter(ui: React.ReactElement, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      {ui}
    </MemoryRouter>,
  );
}

// Mock all the provider components
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(function QueryClientMock() {
    return {};
  }),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-client-provider">{children}</div>
  ),
}));

vi.mock('next-themes', () => ({
  ThemeProvider: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  )),
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

vi.mock('@/contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-provider">{children}</div>
  ),
}));

vi.mock('@/contexts/SessionContext', async () => {
  const actual = await vi.importActual('@/contexts/SessionContext');
  return {
    ...actual,
    SessionContext: React.createContext(undefined),
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="session-provider">{children}</div>
    ),
  };
});

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="sonner-toaster" />,
}));

vi.mock('@/contexts/CookieConsentContext', () => ({
  CookieConsentProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="cookie-consent-provider">{children}</div>
  ),
}));

vi.mock('@/components/privacy/CookieConsentBanner', () => ({
  CookieConsentBanner: () => <div data-testid="cookie-consent-banner" />,
}));

vi.mock('@/components/privacy/ClarityTelemetry', () => ({
  ClarityTelemetry: () => null,
}));

vi.mock('@/components/privacy/GoogleAnalyticsTelemetry', () => ({
  GoogleAnalyticsTelemetry: () => null,
}));

describe('AppProviders', () => {
  let AppProviders: typeof AppProvidersComponent;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('./AppProviders');
    AppProviders = module.AppProviders;
  });

  describe('Provider Hierarchy', () => {
    it('renders all providers in correct order', () => {
      renderWithRouter(
        <AppProviders>
          <div data-testid="test-child">Test Content</div>
        </AppProviders>,
      );

      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('user-provider')).toBeInTheDocument();
      expect(screen.getByTestId('session-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('uses the lightweight provider chain for QR entry routes', async () => {
      vi.resetModules();
      const module = await import('./AppProviders');
      const QRAppProviders = module.AppProviders;

      renderWithRouter(
        <QRAppProviders>
          <div data-testid="test-child">Test Content</div>
        </QRAppProviders>,
        '/qr/equipment/test-equipment',
      );

      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('session-provider')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.queryByTestId('user-provider')).not.toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });
  });

  describe('QueryClient Configuration', () => {
    it('creates QueryClient with correct configuration', async () => {
      const { QueryClient } = await import('@tanstack/react-query');

      renderWithRouter(
        <AppProviders>
          <div>Test</div>
        </AppProviders>,
      );

      expect(QueryClient).toHaveBeenCalledTimes(1);
      const call = (QueryClient as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as {
        defaultOptions: {
          queries: {
            staleTime: number;
            retry: unknown;
            retryDelay: unknown;
          };
          mutations: { networkMode: string };
        };
      };

      expect(call.defaultOptions.queries.staleTime).toBe(5 * 60 * 1000);
      // The retry predicate is a function (not a number) — it skips auth
      // errors and caps at 2 attempts. Just assert it's callable.
      expect(typeof call.defaultOptions.queries.retry).toBe('function');
      // Exponential backoff retry delay function.
      expect(typeof call.defaultOptions.queries.retryDelay).toBe('function');
      // NOTE: persister is intentionally NOT set globally; experimental_createQueryPersister
      // stalls org queries when used as a default option (it intercepts the restore
      // phase of every query before the IDB open resolves).
      expect(call.defaultOptions.queries).not.toHaveProperty('persister');
      expect(call.defaultOptions.mutations.networkMode).toBe('always'); // Let OfflineAwareService handle offline
    });
  });

  describe('ThemeProvider Configuration', () => {
    it('configures ThemeProvider with correct attributes', async () => {
      const { ThemeProvider } = await import('next-themes');

      renderWithRouter(
        <AppProviders>
          <div>Test</div>
        </AppProviders>,
      );

      expect(ThemeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          attribute: 'class',
          forcedTheme: 'dark',
        }),
        undefined,
      );
    });
  });

  describe('Toaster Integration', () => {
    it('mounts the Sonner toaster so sonner toast() calls render (#1081)', () => {
      renderWithRouter(
        <AppProviders>
          <div>Test</div>
        </AppProviders>,
      );

      expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument();
    });

    it('mounts the Sonner toaster on QR entry routes too', () => {
      renderWithRouter(
        <AppProviders>
          <div>Test</div>
        </AppProviders>,
        '/qr/equipment/test-equipment',
      );

      expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument();
    });
  });
});
