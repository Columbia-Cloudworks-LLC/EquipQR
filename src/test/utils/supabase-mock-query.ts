import { vi } from 'vitest';

type MockQueryTerminal = {
  order?: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
};

export type SupabaseQueryMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order?: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
  in?: ReturnType<typeof vi.fn>;
};

/**
 * Chainable Supabase query mock for table reads in service unit tests.
 */
export function createSupabaseQueryMock(terminal: MockQueryTerminal): SupabaseQueryMock {
  const mockQuery: SupabaseQueryMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };

  if (terminal.order) {
    mockQuery.order = terminal.order;
  }
  if (terminal.single) {
    mockQuery.single = terminal.single;
  }

  return mockQuery;
}

/** Query mock with `.in()` for multi-table team fetches; resolves from `.order()`. */
export function createSupabaseOrderQueryMock(
  data: unknown,
  error: unknown = null,
): SupabaseQueryMock {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
}
