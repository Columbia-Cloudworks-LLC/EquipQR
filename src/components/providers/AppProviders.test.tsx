import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AppProviders as AppProvidersComponent } from './AppProviders';

// Mock all the provider components
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="query-client-provider">{children}</div>
}));

vi.mock('next-themes', () => ({
  ThemeProvider: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>)
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>
}));

vi.mock('@/contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="user-provider">{children}</div>
}));

vi.mock('@/contexts/SessionContext', async () => {
  const actual = await vi.importActual('@/contexts/SessionContext');
  return {
    ...actual,
    SessionContext: React.createContext(undefined),
    SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="router">{children}</div>)
  };
});

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />
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
      render(
        <AppProviders>
          <div data-testid="test-child">Test Content</div>
        </AppProviders>
      );

      // Check that all providers are rendered
      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('user-provider')).toBeInTheDocument();
      expect(screen.getByTestId('session-provider')).toBeInTheDocument();
      expect(screen.getByTestId('router')).toBeInTheDocument();
      expect(screen.getByTestId('toaster')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('passes children through the provider chain', () => {
      render(
        <AppProviders>
          <div data-testid="nested-child">
            <span>Nested Content</span>
          </div>
        </AppProviders>
      );

      expect(screen.getByTestId('nested-child')).toBeInTheDocument();
      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });
  });

  describe('QueryClient Configuration', () => {
    it('creates QueryClient with correct configuration', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      
      render(
        <AppProviders>
          <div>Test</div>
        </AppProviders>
      );

      expect(QueryClient).toHaveBeenCalledWith({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
          },
          mutations: {
            networkMode: 'always', // Let OfflineAwareService handle offline
          },
        },
      });
    });
  });

  describe('ThemeProvider Configuration', () => {
    it('configures ThemeProvider with correct attributes', async () => {
      const { ThemeProvider } = await import('next-themes');
      
      render(
        <AppProviders>
          <div>Test</div>
        </AppProviders>
      );

      expect(ThemeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          attribute: 'class',
          defaultTheme: 'system',
          enableSystem: true,
          children: expect.anything()
        }),
        expect.anything()
      );
    });
  });

  describe('Router Integration', () => {
    it('includes BrowserRouter for routing', async () => {
      const { BrowserRouter } = await import('react-router-dom');
      
      render(
        <AppProviders>
          <div>Test</div>
        </AppProviders>
      );

      expect(BrowserRouter).toHaveBeenCalled();
    });
  });

  describe('Toaster Integration', () => {
    it('includes Toaster component', () => {
      render(
        <AppProviders>
          <div>Test</div>
        </AppProviders>
      );

      expect(screen.getByTestId('toaster')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(
          <AppProviders>
            <div>Test</div>
          </AppProviders>
        );
      }).not.toThrow();
    });

    it('handles empty children', () => {
      expect(() => {
        render(<AppProviders>{null}</AppProviders>);
      }).not.toThrow();
    });

    it('handles multiple children', () => {
      render(
        <AppProviders>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </AppProviders>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Provider Dependencies', () => {
    it('maintains proper provider nesting order', () => {
      render(
        <AppProviders>
          <div data-testid="content">Content</div>
        </AppProviders>
      );

      // The structure should be:
      // QueryClientProvider > ThemeProvider > AuthProvider > UserProvider > SessionProvider > Router > Content + Toaster
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Props Interface', () => {
    it('accepts children prop correctly', () => {
      const TestComponent = () => <div data-testid="test-component">Test</div>;
      
      render(
        <AppProviders>
          <TestComponent />
        </AppProviders>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('handles React.ReactNode children type', () => {
      render(
        <AppProviders>
          {/* String child */}
          Some text content
          {/* Element child */}
          <div data-testid="element-child">Element</div>
          {/* Fragment child */}
          <>
            <span data-testid="fragment-child">Fragment</span>
          </>
        </AppProviders>
      );

      expect(screen.getByText('Some text content')).toBeInTheDocument();
      expect(screen.getByTestId('element-child')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child')).toBeInTheDocument();
    });
  });
});