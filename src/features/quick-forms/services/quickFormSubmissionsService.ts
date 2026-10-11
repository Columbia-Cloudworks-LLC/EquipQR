import { supabase } from '@/integrations/supabase/client';
import type {
  QuickFormClientContext,
  QuickFormData,
  QuickFormFieldValue,
} from '@/features/quick-forms/types/quickForm';

import type { Tables } from '@/integrations/supabase/types';

export type QuickFormSubmission = Omit<
  Tables<'quick_form_submissions'>,
  'form_snapshot' | 'field_values' | 'client_context'
> & {
  form_snapshot: (QuickFormData & { id?: string; name?: string; description?: string | null }) | null;
  field_values: QuickFormFieldValue[];
  client_context: QuickFormClientContext | null;
};

function mapQuickFormSubmissionRow(
  row: Tables<'quick_form_submissions'>,
): QuickFormSubmission {
  return {
    id: row.id,
    organization_id: row.organization_id,
    quick_form_id: row.quick_form_id,
    submitted_at: row.submitted_at,
    form_snapshot: (row.form_snapshot as QuickFormSubmission['form_snapshot']) ?? null,
    field_values: (Array.isArray(row.field_values) ? row.field_values : []) as QuickFormFieldValue[],
    client_context: (row.client_context as QuickFormClientContext | null) ?? null,
    request_fingerprint: row.request_fingerprint,
    created_at: row.created_at,
  };
}

export interface QuickFormSubmissionFilters {
  quickFormId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Stable keyset position. `submitted_at` alone is not unique. */
export interface QuickFormSubmissionCursor {
  submittedAt: string;
  id: string;
}

export interface QuickFormSubmissionPage {
  submissions: QuickFormSubmission[];
  totalCount: number;
  nextCursor: QuickFormSubmissionCursor | null;
}

/** Visible ledger page. Export uses a larger page so it is not tied to this size. */
export const QUICK_FORM_LEDGER_PAGE_SIZE = 100;

/**
 * PostgREST `max_rows` is 1000. Full-scope exports walk this page size until
 * the counted total is in hand.
 */
export const QUICK_FORM_EXPORT_PAGE_SIZE = 1000;

const MAX_EXPORT_PAGES = 10000;

interface FilterableQuery {
  eq(column: string, value: string): FilterableQuery;
  gte(column: string, value: string): FilterableQuery;
  lt(column: string, value: string): FilterableQuery;
  or(filters: string): FilterableQuery;
  order(column: string, options: { ascending: boolean }): FilterableQuery;
  limit(count: number): FilterableQuery;
}

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Rows strictly after the cursor in (submitted_at DESC, id DESC) order.
 * Quoted timestamps keep the extra dots in ISO-8601 values inside one PostgREST operand.
 */
export function buildSubmissionKeysetFilter(cursor: QuickFormSubmissionCursor): string {
  const submittedAt = quotePostgrestValue(cursor.submittedAt);
  return `submitted_at.lt.${submittedAt},and(submitted_at.eq.${submittedAt},id.lt.${cursor.id})`;
}

function applySubmissionFilters<Q>(
  query: Q,
  organizationId: string,
  filters: QuickFormSubmissionFilters,
  cursor: QuickFormSubmissionCursor | null,
): Q {
  let next = query as FilterableQuery;
  next = next.eq('organization_id', organizationId);
  if (filters.quickFormId) {
    next = next.eq('quick_form_id', filters.quickFormId);
  }
  if (filters.dateFrom) {
    next = next.gte('submitted_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    next = next.lt('submitted_at', filters.dateTo);
  }
  if (cursor) {
    next = next.or(buildSubmissionKeysetFilter(cursor));
  }
  return next as Q;
}

function cursorFrom(submission: QuickFormSubmission): QuickFormSubmissionCursor {
  return { submittedAt: submission.submitted_at, id: submission.id };
}

export async function listQuickFormSubmissionPage(
  organizationId: string,
  filters: QuickFormSubmissionFilters = {},
  cursor: QuickFormSubmissionCursor | null = null,
  pageSize: number = QUICK_FORM_LEDGER_PAGE_SIZE,
): Promise<QuickFormSubmissionPage> {
  const countQuery = applySubmissionFilters(
    supabase.from('quick_form_submissions').select('*', { count: 'exact', head: true }),
    organizationId,
    filters,
    null,
  );
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const dataQuery = applySubmissionFilters(
    supabase.from('quick_form_submissions').select('*'),
    organizationId,
    filters,
    cursor,
  )
    .order('submitted_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const submissions = (data ?? []).map(mapQuickFormSubmissionRow);
  const nextCursor = submissions.length === pageSize
    ? cursorFrom(submissions[submissions.length - 1]!)
    : null;

  return {
    submissions,
    totalCount: count ?? 0,
    nextCursor,
  };
}

/**
 * Every submission matching the filters, independent of the ledger page on screen.
 * Throws if the walk cannot account for the counted total.
 */
export async function listAllQuickFormSubmissions(
  organizationId: string,
  filters: QuickFormSubmissionFilters = {},
  loadPage: typeof listQuickFormSubmissionPage = listQuickFormSubmissionPage,
): Promise<QuickFormSubmission[]> {
  const collected: QuickFormSubmission[] = [];
  const seen = new Set<string>();
  let cursor: QuickFormSubmissionCursor | null = null;
  let expectedTotal: number | null = null;

  for (let pageIndex = 0; pageIndex < MAX_EXPORT_PAGES; pageIndex += 1) {
    const page = await loadPage(
      organizationId,
      filters,
      cursor,
      QUICK_FORM_EXPORT_PAGE_SIZE,
    );
    if (expectedTotal === null) {
      expectedTotal = page.totalCount;
    } else if (page.totalCount !== expectedTotal) {
      throw new Error('Quick form ledger changed during export. Try again.');
    }

    for (const row of page.submissions) {
      if (seen.has(row.id)) {
        throw new Error('Quick form ledger export saw a duplicate submission.');
      }
      seen.add(row.id);
      collected.push(row);
    }

    if (!page.nextCursor) break;
    if (page.submissions.length === 0) {
      throw new Error('Quick form ledger export stopped before reading every match.');
    }
    cursor = page.nextCursor;
  }

  if (expectedTotal !== collected.length) {
    throw new Error('Quick form ledger export did not include every matching submission.');
  }

  return collected;
}
