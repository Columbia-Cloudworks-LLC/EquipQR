/* eslint-disable no-console */
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearRegisteredTestQueryClients } from './query-client-registry';

declare global {
  let startA11yChecks: () => void;
  let stopA11yChecks: () => void;
}

afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});

afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  clearRegisteredTestQueryClients();
  if (typeof globalThis.stopA11yChecks === 'function') {
    globalThis.stopA11yChecks();
  }
});

beforeAll(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
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

  Object.defineProperty(global, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });

  // Mock DocumentFragment.getElementById for Radix UI accessibility checks
  if (typeof DocumentFragment.prototype.getElementById === 'undefined') {
    DocumentFragment.prototype.getElementById = function (id: string): HTMLElement | null {
      return this.querySelector(`#${id}`) as HTMLElement | null;
    };
  }

  // Mock Element.scrollIntoView for Radix Select components
  Element.prototype.scrollIntoView = vi.fn();

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
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
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    writable: true,
    configurable: true,
  });

  // Suppress specific warnings to reduce noise in test output
  const originalWarn = console.warn;
  const originalError = console.error;
  let reportingConsoleError = false;

  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (message.includes('React Router Future Flag Warning')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    if (reportingConsoleError) {
      return;
    }
    const message = args[0]?.toString() || '';
    if (message.includes('Maximum call stack size exceeded')) {
      return;
    }
    if (
      message.includes('Warning: An update to') ||
      message.includes('not wrapped in act(...)') ||
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
      message.includes('Permission denied')
    ) {
      return;
    }
    try {
      reportingConsoleError = true;
      originalError.apply(console, args);
    } finally {
      reportingConsoleError = false;
    }
  };

  const checkDialogA11y = () => {
    const dialogContents = document.querySelectorAll(
      '[data-equipqr-dialog-content="true"][data-state="open"]',
    );
    dialogContents.forEach((dialog) => {
      const describedBy = dialog.getAttribute('aria-describedby');
      const hasDescription =
        (describedBy != null && describedBy.length > 0) ||
        dialog.querySelector('[id][data-radix-dialog-description], [id][data-slot="dialog-description"]') !=
          null;
      if (!hasDescription) {
        throw new Error(
          'DialogContent is missing DialogDescription. All open dialogs must include a description for accessibility.',
        );
      }
    });
  };

  let a11yCheckInterval: ReturnType<typeof setInterval>;

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

  // Opt-in only — auto-polling every 100ms slowed large component suites.

  if (typeof global.structuredClone === 'undefined') {
    Object.defineProperty(global, 'structuredClone', {
      value: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)),
      writable: true,
      configurable: true,
    });
  }
});
