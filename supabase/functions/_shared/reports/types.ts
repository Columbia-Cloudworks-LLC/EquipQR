/**
 * Shared types for Fleet Export Console report data access (#1192).
 */

import type { reportTypeSchema } from "../org-scoped-queries.ts";
import type { z } from "https://esm.sh/zod@4.4.3";

/** CSV export report types served by export-report. */
export type FleetReportType = z.infer<typeof reportTypeSchema>;

export interface ReportExportFilters {
  status?: string;
  teamId?: string;
  location?: string;
  priority?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export type ReportRow = Record<string, unknown>;

export interface FetchReportRowsParams {
  reportType: FleetReportType;
  organizationId: string;
  filters: ReportExportFilters;
  columns: string[];
  /** When set, work-order exports are limited to these team IDs. Empty array yields no rows. */
  accessibleTeamIds?: string[];
  limit?: number;
}

/** Minimal PostgREST chain surface for report row queries (stub-friendly). */
export interface ReportQueryBuilder {
  select(columns: string): ReportQueryBuilder;
  eq(column: string, value: unknown): ReportQueryBuilder;
  in(column: string, values: unknown[]): ReportQueryBuilder;
  not(column: string, operator: string, value: unknown): ReportQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): ReportQueryBuilder;
  limit(count: number): ReportQueryBuilder;
  ilike(column: string, pattern: string): ReportQueryBuilder;
  gte(column: string, value: unknown): ReportQueryBuilder;
  lte(column: string, value: unknown): ReportQueryBuilder;
  then: PromiseLike<{
    data: ReportRow[] | null;
    error: { message: string } | null;
  }>["then"];
}

/**
 * Client surface used by shared report fetch helpers.
 * `from` is intentionally loose so real Supabase clients and test stubs both satisfy it.
 */
export interface ReportDataClient {
  from(table: string): unknown;
  rpc?(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/** Cast a user-scoped or admin Supabase client for shared report fetch helpers. */
export function asReportDataClient(client: {
  from: (table: string) => unknown;
  rpc?: ReportDataClient["rpc"];
}): ReportDataClient {
  return client;
}

export interface ReportCsvResult {
  csvContent: string;
  rowCount: number;
}
