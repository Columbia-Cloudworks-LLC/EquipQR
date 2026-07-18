import { afterAll, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from './utils/mock-supabase';
import { clearRegisteredTestQueryClients } from './query-client-registry';

/**
 * Install in-memory Web Storage when Node's global storage is missing or broken.
 * Safe in both node and jsdom projects.
 */
export function installTestWebStorage(): void {
  const createMemoryStorage = (): Storage => {
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear(): void {
        data.clear();
      },
      getItem(key: string): string | null {
        const k = String(key);
        return data.has(k) ? data.get(k)! : null;
      },
      key(index: number): string | null {
        const keys = [...data.keys()];
        return index >= 0 && index < keys.length ? keys[index]! : null;
      },
      removeItem(key: string): void {
        data.delete(String(key));
      },
      setItem(key: string, value: string): void {
        data.set(String(key), String(value));
      },
    };
  };

  const broken = (s: unknown): boolean => {
    if (s == null || typeof s !== 'object') return true;
    const o = s as Pick<Storage, 'getItem' | 'setItem' | 'clear' | 'removeItem'>;
    return (
      typeof o.getItem !== 'function' ||
      typeof o.setItem !== 'function' ||
      typeof o.clear !== 'function' ||
      typeof o.removeItem !== 'function'
    );
  };

  const local = createMemoryStorage();
  const session = createMemoryStorage();

  const bind = (target: object & { localStorage?: unknown; sessionStorage?: unknown }): void => {
    if (broken(target.localStorage)) {
      Object.defineProperty(target, 'localStorage', {
        configurable: true,
        enumerable: true,
        value: local,
        writable: false,
      });
    }
    if (broken(target.sessionStorage)) {
      Object.defineProperty(target, 'sessionStorage', {
        configurable: true,
        enumerable: true,
        value: session,
        writable: false,
      });
    }
  };

  bind(globalThis as object & { localStorage?: unknown; sessionStorage?: unknown });
  if (typeof global !== 'undefined' && global !== globalThis) {
    bind(global as object & { localStorage?: unknown; sessionStorage?: unknown });
  }
  if (typeof window !== 'undefined') {
    bind(window as Window & { localStorage?: unknown; sessionStorage?: unknown });
  }
}

installTestWebStorage();

// Mock Supabase client globally to prevent real client initialization.
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

globalThis.vi = vi;

const TEST_APP_VERSION = 'test-harness-v0.0.0-test';
vi.stubGlobal('__APP_VERSION__', TEST_APP_VERSION);

const TEST_SUPABASE_URL = 'https://test-project.supabase.test';
vi.stubEnv('VITE_SUPABASE_URL', TEST_SUPABASE_URL);

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', TEST_SUPABASE_URL);
  try {
    globalThis.localStorage?.clear();
    globalThis.sessionStorage?.clear();
  } catch {
    // ignore — storage may be missing in non-browser test environments
  }
});

afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  clearRegisteredTestQueryClients();
});
