import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  QuickFormSubmission,
  QuickFormSubmissionCursor,
  QuickFormSubmissionFilters,
  QuickFormSubmissionPage,
} from '@/features/quick-forms/services/quickFormSubmissionsService';

interface QueryState {
  head: boolean;
  filters: Array<['eq' | 'gte' | 'lt', string, string]>;
  keyset: string | null;
  orders: Array<{ column: string; ascending: boolean }>;
  limit: number | null;
}

const store = vi.hoisted(() => ({
  rows: [] as QuickFormSubmission[],
}));

function matchesKeyset(row: QuickFormSubmission, clause: string): boolean {
  const olderThan = /submitted_at\.lt\."((?:[^"]|"")*)"/.exec(clause);
  const sameTime = /submitted_at\.eq\."((?:[^"]|"")*)"/.exec(clause);
  const smallerId = /id\.lt\.([^,)]+)/.exec(clause);
  if (!olderThan || !sameTime || !smallerId) {
    throw new Error(`Unrecognized keyset filter: ${clause}`);
  }
  const submittedAt = olderThan[1]!.replace(/""/g, '"');
  const equalSubmittedAt = sameTime[1]!.replace(/""/g, '"');
  return row.submitted_at < submittedAt
    || (row.submitted_at === equalSubmittedAt && row.id < smallerId[1]!);
}

function execute(state: QueryState): QuickFormSubmission[] {
  let rows = store.rows.filter((row) => {
    for (const [op, column, value] of state.filters) {
      const cell = row[column as keyof QuickFormSubmission];
      if (op === 'eq' && cell !== value) return false;
      if (op === 'gte' && String(cell) < value) return false;
      if (op === 'lt' && String(cell) >= value) return false;
    }
    if (state.keyset && !matchesKeyset(row, state.keyset)) return false;
    return true;
  });

  const submittedOrder = state.orders.find((order) => order.column === 'submitted_at');
  const idOrder = state.orders.find((order) => order.column === 'id');
  if (!state.head && (submittedOrder?.ascending !== false || idOrder?.ascending !== false)) {
    throw new Error('Ledger queries must order by submitted_at desc, id desc');
  }

  rows = [...rows].sort((left, right) => {
    if (left.submitted_at !== right.submitted_at) {
      return left.submitted_at < right.submitted_at ? 1 : -1;
    }
    return left.id < right.id ? 1 : -1;
  });

  if (state.limit !== null) rows = rows.slice(0, state.limit);
  return rows;
}

function createQuery() {
  const state: QueryState = {
    head: false,
    filters: [],
    keyset: null,
    orders: [],
    limit: null,
  };

  const builder = {
    ...state,
    select(_columns: string, options?: { count?: 'exact'; head?: boolean }) {
      state.head = options?.head === true;
      return builder;
    },
    eq(column: string, value: string) {
      state.filters.push(['eq', column, value]);
      return builder;
    },
    gte(column: string, value: string) {
      state.filters.push(['gte', column, value]);
      return builder;
    },
    lt(column: string, value: string) {
      state.filters.push(['lt', column, value]);
      return builder;
    },
    or(filters: string) {
      state.keyset = filters;
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      state.orders.push({ column, ascending: options.ascending });
      return builder;
    },
    limit(count: number) {
      state.limit = count;
      return builder;
    },
    then<TResult>(
      onfulfilled: (value: { data: QuickFormSubmission[] | null; error: null; count: number | null }) => TResult,
    ) {
      const matched = execute({ ...state, limit: state.head ? null : state.limit });
      const total = execute({ ...state, keyset: null, limit: null, head: true }).length;
      return Promise.resolve({
        data: state.head ? null : matched,
        error: null,
        count: total,
      }).then(onfulfilled);
    },
  };

  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'quick_form_submissions') throw new Error(`Unexpected table ${table}`);
      return createQuery();
    },
  },
}));

const {
  listAllQuickFormSubmissions,
  listQuickFormSubmissionPage,
  QUICK_FORM_EXPORT_PAGE_SIZE,
  QUICK_FORM_LEDGER_PAGE_SIZE,
} = await import('@/features/quick-forms/services/quickFormSubmissionsService');

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const FORM_A = 'form-a';
const FORM_B = 'form-b';

function submission(overrides: Partial<QuickFormSubmission> & Pick<QuickFormSubmission, 'id' | 'submitted_at'>): QuickFormSubmission {
  return {
    organization_id: ORG_A,
    quick_form_id: FORM_A,
    form_snapshot: { name: 'Time sheet', fields: [] },
    field_values: [{ field_id: 'name', label: 'Name', input_type: 'text', value: overrides.id }],
    client_context: null,
    request_fingerprint: null,
    created_at: overrides.submitted_at,
    ...overrides,
  };
}

function seeded(count: number, options?: {
  submittedAt?: string | ((index: number) => string);
  organizationId?: string;
  quickFormId?: string;
  idPrefix?: string;
}): QuickFormSubmission[] {
  return Array.from({ length: count }, (_, index) => {
    const submittedAt = typeof options?.submittedAt === 'function'
      ? options.submittedAt(index)
      : options?.submittedAt ?? `2026-03-${String((index % 28) + 1).padStart(2, '0')}T12:00:${String(index % 60).padStart(2, '0')}.000Z`;
    return submission({
      id: `${options?.idPrefix ?? 'sub'}-${String(index).padStart(4, '0')}`,
      submitted_at: submittedAt,
      organization_id: options?.organizationId ?? ORG_A,
      quick_form_id: options?.quickFormId ?? FORM_A,
    });
  });
}

async function readAll(
  organizationId: string,
  filters: QuickFormSubmissionFilters = {},
  pageSize = QUICK_FORM_LEDGER_PAGE_SIZE,
): Promise<QuickFormSubmission[]> {
  const collected: QuickFormSubmission[] = [];
  let cursor: QuickFormSubmissionCursor | null = null;
  let guard = 0;
  let total: number;
  do {
    const page = await listQuickFormSubmissionPage(organizationId, filters, cursor, pageSize);
    total = page.totalCount;
    collected.push(...page.submissions);
    cursor = page.nextCursor;
    guard += 1;
    if (!cursor) break;
  } while (guard < 20);
  expect(collected).toHaveLength(total);
  return collected;
}

function expectExactIds(rows: QuickFormSubmission[], expected: QuickFormSubmission[]) {
  expect(rows.map((row) => row.id)).toEqual(expected.map((row) => row.id));
  expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
}

describe('quick form submission ledger paging', () => {
  beforeEach(() => {
    store.rows = [];
  });

  it('returns an empty page and a zero count when nothing matches', async () => {
    store.rows = seeded(3, { organizationId: ORG_B });
    const page = await listQuickFormSubmissionPage(ORG_A, {}, null, QUICK_FORM_LEDGER_PAGE_SIZE);
    expect(page).toEqual({ submissions: [], totalCount: 0, nextCursor: null });
  });

  it('returns the single matching submission', async () => {
    const rows = seeded(1);
    store.rows = [...rows, ...seeded(2, { organizationId: ORG_B, idPrefix: 'other' })];
    const page = await listQuickFormSubmissionPage(ORG_A);
    expect(page.totalCount).toBe(1);
    expectExactIds(page.submissions, rows);
    expect(page.nextCursor).toBeNull();
  });

  it.each([500, 501])('reads %i submissions across pages without skipping or duplicating', async (count) => {
    const rows = seeded(count);
    store.rows = rows;
    const loaded = await readAll(ORG_A, {}, 100);
    const expected = [...rows].sort((left, right) => {
      if (left.submitted_at !== right.submitted_at) return left.submitted_at < right.submitted_at ? 1 : -1;
      return left.id < right.id ? 1 : -1;
    });
    expectExactIds(loaded, expected);
    expect(loaded.length).toBe(count);
  });

  it('keeps every row when many submissions share one timestamp', async () => {
    const rows = seeded(501, { submittedAt: '2026-09-21T15:04:05.000Z' });
    store.rows = rows;
    const loaded = await readAll(ORG_A, {}, 100);
    expect(loaded).toHaveLength(501);
    expect(new Set(loaded.map((row) => row.id)).size).toBe(501);
    for (let index = 1; index < loaded.length; index += 1) {
      expect(loaded[index - 1]!.submitted_at).toBe(loaded[index]!.submitted_at);
      expect(loaded[index - 1]!.id > loaded[index]!.id).toBe(true);
    }
  });

  it('applies form and date filters and keeps other organizations out', async () => {
    const inRange = seeded(3, {
      idPrefix: 'in',
      submittedAt: (index) => `2026-06-0${index + 1}T00:00:00.000Z`,
    });
    store.rows = [
      ...inRange,
      submission({ id: 'too-early', submitted_at: '2026-05-01T00:00:00.000Z' }),
      submission({ id: 'too-late', submitted_at: '2026-07-01T00:00:00.000Z' }),
      submission({ id: 'other-form', submitted_at: '2026-06-02T00:00:00.000Z', quick_form_id: FORM_B }),
      submission({ id: 'other-org', submitted_at: '2026-06-02T00:00:00.000Z', organization_id: ORG_B }),
    ];

    const loaded = await readAll(ORG_A, {
      quickFormId: FORM_A,
      dateFrom: '2026-06-01T00:00:00.000Z',
      dateTo: '2026-07-01T00:00:00.000Z',
    }, 2);

    expect(loaded.map((row) => row.id)).toEqual(['in-0002', 'in-0001', 'in-0000']);
  });

  it('exports every match, including past the first 500 and past a single 1000-row server page', async () => {
    store.rows = seeded(QUICK_FORM_EXPORT_PAGE_SIZE + 1, {
      submittedAt: '2026-01-15T00:00:00.000Z',
    });
    const exported = await listAllQuickFormSubmissions(ORG_A, { quickFormId: FORM_A });
    expect(exported).toHaveLength(QUICK_FORM_EXPORT_PAGE_SIZE + 1);
    expect(new Set(exported.map((row) => row.id)).size).toBe(exported.length);
    expect(exported.some((row) => row.organization_id !== ORG_A)).toBe(false);
  });

  it('refuses an export that cannot account for the counted total', async () => {
    const loadPage = vi.fn(async (): Promise<QuickFormSubmissionPage> => ({
      submissions: seeded(1),
      totalCount: 2,
      nextCursor: null,
    }));

    await expect(listAllQuickFormSubmissions(ORG_A, {}, loadPage)).rejects.toThrow(
      /did not include every matching submission/,
    );
  });

  it('refuses an export that repeats a submission', async () => {
    const row = seeded(1)[0]!;
    let calls = 0;
    const loadPage = vi.fn(async (): Promise<QuickFormSubmissionPage> => {
      calls += 1;
      return {
        submissions: [row],
        totalCount: 1,
        nextCursor: calls === 1 ? { submittedAt: row.submitted_at, id: row.id } : null,
      };
    });

    await expect(listAllQuickFormSubmissions(ORG_A, {}, loadPage)).rejects.toThrow(/duplicate submission/);
  });
});
