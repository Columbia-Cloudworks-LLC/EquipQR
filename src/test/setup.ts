/* eslint-disable no-console */
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { createMockSupabaseClient } from './utils/mock-supabase';

declare global {
  // Expose A11y control functions for tests
  let startA11yChecks: () => void;
  let stopA11yChecks: () => void;
}

// Mock Supabase client globally to prevent real client initialization
// The real client has autoRefreshToken and WebSocket connections that keep
// timers alive and prevent the test process from exiting
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

// Mock react-router-dom with proper MemoryRouter export
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Make vi globally available for tests
globalThis.vi = vi;

// Test-specific version constant
// Using a dedicated test-harness version to distinguish test environments from production.
// This ensures deterministic test behavior and allows for versioning of the test infrastructure itself if needed.
const TEST_APP_VERSION = 'test-harness-v1';

// Ensure Vite define constants exist in tests
// Using a dedicated test-harness version to distinguish test environments from production.
// This is intentional - tests don't need the real application version.
vi.stubGlobal('__APP_VERSION__', TEST_APP_VERSION);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Global cleanup to ensure no dangling intervals/timers
afterAll(() => {
  // Clear any pending timers from vitest's fake timer system
  vi.clearAllTimers();
  // Restore real timers in case fake timers were used
  vi.useRealTimers();
  // Stop a11y checks if they were started
  if (typeof globalThis.stopA11yChecks === 'function') {
    globalThis.stopA11yChecks();
  }
});

// Mock IntersectionObserver
beforeAll(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver as a proper class that matches browser behavior
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    private callback: ResizeObserverCallback;
    
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
  }
  
  // Use Object.defineProperty to avoid TypeScript any issues
  Object.defineProperty(global, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true
  });
  
  Object.defineProperty(window, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true
  });
  
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true
  });

  // Mock DocumentFragment.getElementById for Radix UI accessibility checks
  if (typeof DocumentFragment.prototype.getElementById === 'undefined') {
    DocumentFragment.prototype.getElementById = function(id: string): HTMLElement | null {
      return this.querySelector(`#${id}`) as HTMLElement | null;
    };
  }

  // Mock Element.scrollIntoView for Radix Select components
  Element.prototype.scrollIntoView = vi.fn();

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
    configurable: true,
  });

  // Mock navigator.clipboard globally
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined)
    },
    writable: true,
    configurable: true
  });

  // Suppress specific warnings to reduce noise in test output
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    // Suppress React Router Future Flag warnings during tests
    const message = args[0]?.toString() || '';
    if (message.includes('React Router Future Flag Warning')) {
      return;
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    // Suppress specific warnings and expected error messages during tests
    const message = args[0]?.toString() || '';
    if (message.includes('Warning: An update to') ||
        message.includes('not wrapped in act(...)') ||
        // Suppress expected error messages from tests
        message.includes('Error creating template:') ||
        message.includes('Error updating template:') ||
        message.includes('Error deleting template:') ||
        message.includes('Error cloning template:') ||
        message.includes('Error fetching equipment:') ||
        message.includes('Error in getEquipmentByOrganization:') ||
        message.includes('Error fetching equipment by ID:') ||
        message.includes('Error in getEquipmentById:') ||
        message.includes('Error fetching teams:') ||
        message.includes('Error generating QR code:') ||
        message.includes('Failed to copy URL:') ||
        message.includes('Error downloading QR code:') ||
        message.includes('Service error:') ||
        message.includes('Failed to parse template data for template:') ||
        message.includes('Error fetching organization') ||
        message.includes('invalid input syntax for type uuid:') ||
        message.includes('Error creating work order:') ||
        message.includes('Error updating work order:') ||
        message.includes('Error deleting work order:') ||
        message.includes('Error fetching work orders:') ||
        message.includes('Network request failed') ||
        message.includes('Authentication error') ||
        message.includes('Permission denied')) {
      return;
    }
    originalError.apply(console, args);
  };

  // A11y checks for Dialog components
  const checkDialogA11y = () => {
    const dialogContents = document.querySelectorAll('[role="dialog"]');
    dialogContents.forEach((dialog) => {
      if (dialog.getAttribute('data-state') === 'open') {
        const hasDescription = dialog.querySelector('[data-description], [aria-describedby]') ||
                              dialog.hasAttribute('aria-describedby');
        if (!hasDescription) {
          console.error(`A11y Error: DialogContent is missing DialogDescription. All open dialogs must include a description for accessibility.`);
        }
      }
    });
  };

  // Run a11y checks periodically during tests
  let a11yCheckInterval: NodeJS.Timeout;
  
  type A11yGlobal = typeof globalThis & {
    startA11yChecks?: () => void;
    stopA11yChecks?: () => void;
  };

  const globalWithA11y = globalThis as A11yGlobal;

  globalWithA11y.startA11yChecks = () => {
    a11yCheckInterval = setInterval(checkDialogA11y, 100);
  };

  globalWithA11y.stopA11yChecks = () => {
    if (a11yCheckInterval) {
      clearInterval(a11yCheckInterval);
    }
  };

  // Ensure consistent global objects across Node versions
  if (typeof global.structuredClone === 'undefined') {
    Object.defineProperty(global, 'structuredClone', {
      value: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)),
      writable: true,
      configurable: true
    });
  }
});
