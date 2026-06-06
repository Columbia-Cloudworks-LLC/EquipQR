import { vi, type Mock } from 'vitest';

export function createMockEquipmentQuery<T>(data: T[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data, error: null }),
    or: vi.fn().mockResolvedValue({ data, error: null }),
    is: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

export function createMockScansQueryEmpty() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
}

export function createMockScansQueryWithData<T>(data: T[]) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

export function createMockTeamsQuery<T>(data: T[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

type FleetTableMocks = {
  teams?: ReturnType<typeof createMockTeamsQuery>;
  equipment: ReturnType<typeof createMockEquipmentQuery>;
  scans: ReturnType<typeof createMockScansQueryEmpty> | ReturnType<typeof createMockScansQueryWithData>;
};

export function mockSupabaseFromTables(supabaseFrom: Mock, tables: FleetTableMocks) {
  supabaseFrom.mockImplementation((table: string) => {
    if (table === 'teams' && tables.teams) {
      return tables.teams;
    }
    if (table === 'equipment') {
      return tables.equipment;
    }
    if (table === 'scans') {
      return tables.scans;
    }
    return tables.teams ?? tables.equipment;
  });
}
