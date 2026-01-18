/**
 * Scenario-Driven Supabase Mock
 * 
 * This module provides a configurable mock for Supabase that supports:
 * - Per-test seeding with fixture data
 * - Realistic query behavior (select, eq, in, order, etc.)
 * - Mutations that update the in-memory dataset
 * - Auth aligned with persona
 * 
 * Usage:
 * ```typescript
 * import { seedSupabaseMock, resetSupabaseMock, setSupabaseError } from '@/test/mocks/supabase-scenario';
 * import { equipment, workOrders } from '@/test/fixtures/entities';
 * 
 * beforeEach(() => {
 *   resetSupabaseMock();
 *   seedSupabaseMock({
 *     equipment: Object.values(equipment),
 *     work_orders: Object.values(workOrders),
 *   });
 * });
 * ```
 */

import { vi } from 'vitest';
import type { UserPersona } from '@/test/fixtures/personas';

// ============================================
// Types
// ============================================

export type TableName = 
  | 'equipment'
  | 'work_orders'
  | 'teams'
  | 'organizations'
  | 'organization_members'
  | 'team_members'
  | 'pm_templates'
  | 'pm_template_sections'
  | 'pm_template_items'
  | 'work_order_pm_items'
  | 'equipment_notes'
  | 'work_order_notes'
  | 'work_order_costs'
  | 'inventory_items'
  | 'inventory_transactions'
  | 'part_compatibility_rules'
  | 'part_alternate_groups'
  | 'part_identifiers'
  | 'notifications'
  | 'profiles';

export type SeedData = Partial<Record<TableName, unknown[]>>;

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
}

// ============================================
// In-Memory Data Store
// ============================================

class SupabaseScenarioStore {
  private data: Map<TableName, unknown[]> = new Map();
  private errors: Map<TableName, SupabaseError | null> = new Map();
  private currentPersona: UserPersona | null = null;
  private authUser: { id: string; email: string } | null = null;

  /**
   * Reset all data and errors
   */
  reset(): void {
    this.data.clear();
    this.errors.clear();
    this.currentPersona = null;
    this.authUser = null;
  }

  /**
   * Seed data for one or more tables
   */
  seed(seedData: SeedData): void {
    for (const [table, rows] of Object.entries(seedData)) {
      const tableName = table as TableName;
      const existing = this.data.get(tableName) ?? [];
      this.data.set(tableName, [...existing, ...rows]);
    }
  }

  /**
   * Get all data for a table
   */
  getData(table: TableName): unknown[] {
    return this.data.get(table) ?? [];
  }

  /**
   * Set data for a table (replaces existing)
   */
  setData(table: TableName, rows: unknown[]): void {
    this.data.set(table, rows);
  }

  /**
   * Configure an error to be thrown for a table
   */
  setError(table: TableName, error: SupabaseError | null): void {
    this.errors.set(table, error);
  }

  /**
   * Get configured error for a table
   */
  getError(table: TableName): SupabaseError | null {
    return this.errors.get(table) ?? null;
  }

  /**
   * Set the current persona for auth
   */
  setPersona(persona: UserPersona): void {
    this.currentPersona = persona;
    this.authUser = { id: persona.id, email: persona.email };
  }

  /**
   * Get current auth user
   */
  getAuthUser(): { id: string; email: string } | null {
    return this.authUser;
  }

  /**
   * Insert a row into a table
   */
  insert(table: TableName, row: unknown): unknown {
    const existing = this.data.get(table) ?? [];
    // Generate ID if not present
    const rowWithId = {
      id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(row as object),
    };
    this.data.set(table, [...existing, rowWithId]);
    return rowWithId;
  }

  /**
   * Update rows matching a filter
   */
  update(table: TableName, updates: object, filter: { column: string; value: unknown }): unknown[] {
    const existing = this.data.get(table) ?? [];
    const updated: unknown[] = [];
    
    const newData = existing.map((row) => {
      const rowObj = row as Record<string, unknown>;
      if (rowObj[filter.column] === filter.value) {
        const updatedRow = { ...rowObj, ...updates, updated_at: new Date().toISOString() };
        updated.push(updatedRow);
        return updatedRow;
      }
      return row;
    });
    
    this.data.set(table, newData);
    return updated;
  }

  /**
   * Delete rows matching a filter
   */
  delete(table: TableName, filter: { column: string; value: unknown }): unknown[] {
    const existing = this.data.get(table) ?? [];
    const deleted: unknown[] = [];
    
    const newData = existing.filter((row) => {
      const rowObj = row as Record<string, unknown>;
      if (rowObj[filter.column] === filter.value) {
        deleted.push(row);
        return false;
      }
      return true;
    });
    
    this.data.set(table, newData);
    return deleted;
  }
}

// Singleton store instance
const store = new SupabaseScenarioStore();

// ============================================
// Query Builder Mock
// ============================================

interface QueryState {
  table: TableName;
  filters: Array<{ column: string; op: string; value: unknown }>;
  orderBy: Array<{ column: string; ascending: boolean }>;
  limitCount: number | null;
  offsetCount: number | null;
  selectColumns: string | null;
  isSingle: boolean;
  isMaybeSingle: boolean;
}

function createQueryBuilder(table: TableName, initialState?: Partial<QueryState>) {
  const state: QueryState = {
    table,
    filters: [],
    orderBy: [],
    limitCount: null,
    offsetCount: null,
    selectColumns: null,
    isSingle: false,
    isMaybeSingle: false,
    ...initialState,
  };

  const applyFilters = (data: unknown[]): unknown[] => {
    return data.filter((row) => {
      const rowObj = row as Record<string, unknown>;
      return state.filters.every(({ column, op, value }) => {
        const rowValue = rowObj[column];
        switch (op) {
          case 'eq':
            return rowValue === value;
          case 'neq':
            return rowValue !== value;
          case 'gt':
            return (rowValue as number) > (value as number);
          case 'gte':
            return (rowValue as number) >= (value as number);
          case 'lt':
            return (rowValue as number) < (value as number);
          case 'lte':
            return (rowValue as number) <= (value as number);
          case 'in':
            return Array.isArray(value) && value.includes(rowValue);
          case 'is':
            return rowValue === value;
          case 'like':
          case 'ilike': {
            if (typeof rowValue !== 'string' || typeof value !== 'string') return false;
            const pattern = value.replace(/%/g, '.*');
            const regex = new RegExp(`^${pattern}$`, op === 'ilike' ? 'i' : '');
            return regex.test(rowValue);
          }
          case 'contains':
            return Array.isArray(rowValue) && rowValue.includes(value);
          default:
            return true;
        }
      });
    });
  };

  const applyOrdering = (data: unknown[]): unknown[] => {
    if (state.orderBy.length === 0) return data;
    
    return [...data].sort((a, b) => {
      for (const { column, ascending } of state.orderBy) {
        const aVal = (a as Record<string, unknown>)[column];
        const bVal = (b as Record<string, unknown>)[column];
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
      }
      return 0;
    });
  };

  const applyPagination = (data: unknown[]): unknown[] => {
    let result = data;
    if (state.offsetCount !== null) {
      result = result.slice(state.offsetCount);
    }
    if (state.limitCount !== null) {
      result = result.slice(0, state.limitCount);
    }
    return result;
  };

  const execute = async () => {
    // Check for configured error
    const error = store.getError(state.table);
    if (error) {
      return { data: null, error };
    }

    let data = store.getData(state.table);
    data = applyFilters(data);
    data = applyOrdering(data);
    data = applyPagination(data);

    if (state.isSingle) {
      if (data.length === 0) {
        return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
      }
      if (data.length > 1) {
        return { data: null, error: { message: 'More than one row found', code: 'PGRST116' } };
      }
      return { data: data[0], error: null };
    }

    if (state.isMaybeSingle) {
      if (data.length === 0) {
        return { data: null, error: null };
      }
      if (data.length > 1) {
        return { data: null, error: { message: 'More than one row found', code: 'PGRST116' } };
      }
      return { data: data[0], error: null };
    }

    return { data, error: null };
  };

  const builder = {
    select: (columns?: string) => {
      state.selectColumns = columns ?? '*';
      return builder;
    },
    eq: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'eq', value });
      return builder;
    },
    neq: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'neq', value });
      return builder;
    },
    gt: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'gt', value });
      return builder;
    },
    gte: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'gte', value });
      return builder;
    },
    lt: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'lt', value });
      return builder;
    },
    lte: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'lte', value });
      return builder;
    },
    in: (column: string, values: unknown[]) => {
      state.filters.push({ column, op: 'in', value: values });
      return builder;
    },
    is: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'is', value });
      return builder;
    },
    like: (column: string, pattern: string) => {
      state.filters.push({ column, op: 'like', value: pattern });
      return builder;
    },
    ilike: (column: string, pattern: string) => {
      state.filters.push({ column, op: 'ilike', value: pattern });
      return builder;
    },
    contains: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'contains', value });
      return builder;
    },
    containedBy: (column: string, value: unknown) => {
      state.filters.push({ column, op: 'containedBy', value });
      return builder;
    },
    or: () => {
      // Simplified: doesn't parse OR queries, just returns all data
      return builder;
    },
    and: () => {
      // Simplified: doesn't parse AND queries
      return builder;
    },
    not: (column: string, op: string, value: unknown) => {
      // Simplified: invert the filter
      state.filters.push({ column, op: `not_${op}`, value });
      return builder;
    },
    filter: (column: string, op: string, value: unknown) => {
      state.filters.push({ column, op, value });
      return builder;
    },
    match: (query: Record<string, unknown>) => {
      for (const [column, value] of Object.entries(query)) {
        state.filters.push({ column, op: 'eq', value });
      }
      return builder;
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      state.orderBy.push({ column, ascending: options?.ascending ?? true });
      return builder;
    },
    limit: (count: number) => {
      state.limitCount = count;
      return builder;
    },
    range: (from: number, to: number) => {
      state.offsetCount = from;
      state.limitCount = to - from + 1;
      return builder;
    },
    offset: (count: number) => {
      state.offsetCount = count;
      return builder;
    },
    nullsFirst: () => builder,
    single: () => {
      state.isSingle = true;
      return execute();
    },
    maybeSingle: () => {
      state.isMaybeSingle = true;
      return execute();
    },
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      return execute().then(resolve);
    },
    // Make it thenable
    [Symbol.toStringTag]: 'Promise',
  };

  return builder;
}

// ============================================
// Mutation Builders
// ============================================

function createInsertBuilder(table: TableName) {
  let insertData: unknown[] = [];
  let shouldSelect = false;
  let isSingle = false;

  const execute = async () => {
    const error = store.getError(table);
    if (error) {
      return { data: null, error };
    }

    const inserted = insertData.map((row) => store.insert(table, row));
    
    if (isSingle) {
      return { data: inserted[0] ?? null, error: null };
    }
    return { data: shouldSelect ? inserted : null, error: null };
  };

  const builder = {
    select: () => {
      shouldSelect = true;
      return builder;
    },
    single: () => {
      isSingle = true;
      return execute();
    },
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      return execute().then(resolve);
    },
  };

  return (data: unknown | unknown[]) => {
    insertData = Array.isArray(data) ? data : [data];
    return builder;
  };
}

function createUpdateBuilder(table: TableName) {
  let updateData: object = {};
  let filter: { column: string; value: unknown } | null = null;
  let shouldSelect = false;

  const execute = async () => {
    const error = store.getError(table);
    if (error) {
      return { data: null, error };
    }

    if (!filter) {
      return { data: null, error: { message: 'Update requires a filter' } };
    }

    const updated = store.update(table, updateData, filter);
    return { data: shouldSelect ? updated : null, error: null };
  };

  const builder = {
    eq: (column: string, value: unknown) => {
      filter = { column, value };
      return builder;
    },
    select: () => {
      shouldSelect = true;
      return builder;
    },
    single: () => execute(),
    maybeSingle: () => execute(),
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      return execute().then(resolve);
    },
  };

  return (data: object) => {
    updateData = data;
    return builder;
  };
}

function createDeleteBuilder(table: TableName) {
  let filter: { column: string; value: unknown } | null = null;
  let shouldSelect = false;

  const execute = async () => {
    const error = store.getError(table);
    if (error) {
      return { data: null, error };
    }

    if (!filter) {
      return { data: null, error: { message: 'Delete requires a filter' } };
    }

    const deleted = store.delete(table, filter);
    return { data: shouldSelect ? deleted : null, error: null };
  };

  const builder = {
    eq: (column: string, value: unknown) => {
      filter = { column, value };
      return builder;
    },
    in: (column: string, values: unknown[]) => {
      // Simplified: only supports single value
      filter = { column, value: values[0] };
      return builder;
    },
    select: () => {
      shouldSelect = true;
      return builder;
    },
    single: () => execute(),
    maybeSingle: () => execute(),
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
      return execute().then(resolve);
    },
  };

  return () => builder;
}

// ============================================
// Main Mock Client Factory
// ============================================

/**
 * Create a scenario-driven Supabase mock client.
 * This should be used by the global test setup.
 */
export function createScenarioSupabaseMock() {
  return {
    auth: {
      getSession: vi.fn().mockImplementation(async () => {
        const user = store.getAuthUser();
        if (!user) {
          return { data: { session: null }, error: null };
        }
        return {
          data: {
            session: {
              user: { id: user.id, email: user.email },
              access_token: 'mock-token',
              expires_at: Date.now() + 3600000,
            },
          },
          error: null,
        };
      }),
      getUser: vi.fn().mockImplementation(async () => {
        const user = store.getAuthUser();
        if (!user) {
          return { data: { user: null }, error: null };
        }
        return { data: { user: { id: user.id, email: user.email } }, error: null };
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockImplementation(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const tableName = table as TableName;
      return {
        select: (columns?: string) => createQueryBuilder(tableName, { selectColumns: columns ?? '*' }),
        insert: createInsertBuilder(tableName),
        update: createUpdateBuilder(tableName),
        upsert: createInsertBuilder(tableName), // Simplified: treat upsert as insert
        delete: createDeleteBuilder(tableName),
      };
    }),
    rpc: vi.fn().mockImplementation(async () => {
      return { data: null, error: null };
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.png' } }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
}

// ============================================
// Public API
// ============================================

/**
 * Reset the Supabase mock store.
 * Call this in beforeEach to ensure test isolation.
 */
export function resetSupabaseMock(): void {
  store.reset();
}

/**
 * Seed the Supabase mock with data.
 * Data is added to existing data (use resetSupabaseMock first for clean state).
 * 
 * @example
 * ```typescript
 * seedSupabaseMock({
 *   equipment: [equipment.forklift1, equipment.forklift2],
 *   work_orders: Object.values(workOrders),
 * });
 * ```
 */
export function seedSupabaseMock(data: SeedData): void {
  store.seed(data);
}

/**
 * Set the current persona for auth.
 * The auth endpoints will return this user.
 */
export function setSupabasePersona(persona: UserPersona): void {
  store.setPersona(persona);
}

/**
 * Configure an error to be returned for a specific table.
 * Useful for testing error states.
 * 
 * @example
 * ```typescript
 * setSupabaseError('equipment', { message: 'Network error' });
 * ```
 */
export function setSupabaseError(table: TableName, error: SupabaseError | null): void {
  store.setError(table, error);
}

/**
 * Get direct access to the store for advanced scenarios.
 * Prefer using the public API functions instead.
 */
export function getSupabaseStore(): SupabaseScenarioStore {
  return store;
}

// ============================================
// Export the mock for global setup
// ============================================

/**
 * The scenario-driven Supabase mock client.
 * Import this in test setup to replace the real client.
 */
export const scenarioSupabaseMock = createScenarioSupabaseMock();
