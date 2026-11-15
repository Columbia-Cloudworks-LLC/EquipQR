/**
 * Test-only PostgREST stub: a real `SupabaseClient` whose `fetch` answers
 * `/rest/v1/<table>` GETs from in-memory rows. Each request's own `eq.` / `in.`
 * filters are applied to the rows, so a production query that drops a filter
 * gets back rows it should not. Filters on columns a row does not carry (for
 * example joined columns such as `teams.organization_id`) are recorded but not
 * applied.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

type Row = Record<string, unknown>;

export type RecordedRestQuery = {
  table: string;
  /** Filter params as sent, e.g. `{ status: "eq.active", role: "in.(owner,admin)" }`. */
  filters: Record<string, string>;
};

function parseInList(value: string): string[] {
  return value.replace(/^\(/, "").replace(/\)$/, "").split(",").map((item) => item.replace(/^"|"$/g, ""));
}

function rowMatches(row: Row, filters: Record<string, string>): boolean {
  return Object.entries(filters).every(([column, filter]) => {
    if (!(column in row)) return true;
    const actual = String(row[column]);
    if (filter.startsWith("eq.")) return actual === filter.slice(3);
    if (filter.startsWith("in.")) return parseInList(filter.slice(3)).includes(actual);
    throw new Error(`postgrest-test-stub: unsupported filter ${column}=${filter}`);
  });
}

export function createPostgrestStub(
  tables: Record<string, Row[]>,
  options: { failTables?: string[] } = {},
): { client: SupabaseClient; queries: RecordedRestQuery[] } {
  const queries: RecordedRestQuery[] = [];

  const stubFetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const table = url.pathname.replace(/^\/rest\/v1\//, "");
    const filters: Record<string, string> = {};
    for (const [key, value] of url.searchParams) {
      if (key !== "select") filters[key] = value;
    }
    queries.push({ table, filters });

    if (request.method !== "GET") {
      return Promise.reject(new Error(`postgrest-test-stub: unexpected ${request.method} ${table}`));
    }
    if (options.failTables?.includes(table)) {
      return Promise.resolve(Response.json({ code: "XX000", message: "db error" }, { status: 500 }));
    }
    return Promise.resolve(Response.json((tables[table] ?? []).filter((row) => rowMatches(row, filters))));
  };

  const client = createClient("http://postgrest-stub.local", "stub-anon-key", {
    global: { fetch: stubFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { client, queries };
}
