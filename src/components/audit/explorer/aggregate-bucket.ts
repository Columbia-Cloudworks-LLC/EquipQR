/**
 * Densified bucket aggregation for AuditTimelineHistogram.
 *
 * Mirrors `date_trunc(p_bucket, ...)` in the get_audit_log_timeline RPC and
 * pre-seeds zero buckets across the active range so the explorer histogram
 * renders one bar per unit (issue #641): 30 day-bars for `last_30d`,
 * 24 hour-bars for `last_24h`, 60 minute-bars for `last_1h`, etc — empty
 * bars where no activity occurred.
 *
 * Lives in its own module so the component file can stay
 * `react-refresh/only-export-components` clean.
 */

import { format as formatDate } from 'date-fns';
import {
  AuditAction,
  AuditLogTimelineBucket,
  AuditLogTimelineRow,
} from '@/types/audit';

export const BUCKET_LABEL_FORMAT: Record<AuditLogTimelineBucket, string> = {
  minute: 'HH:mm',
  hour: 'MMM d HH:mm',
  day: 'MMM d',
};

export const BUCKET_MS: Record<AuditLogTimelineBucket, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

/**
 * Hard cap on the number of pre-seeded zero buckets we'll generate. Above
 * this, fall back to data-driven sparse aggregation so we don't try to
 * render thousands of bars (e.g. the `'all'` preset spans 1970 -> now).
 * 366 covers a full year of daily bars, comfortably wider than any rolling
 * preset and most custom ranges.
 */
export const MAX_DENSE_BUCKETS = 366;

export interface ChartRow {
  bucket: string;
  bucketLabel: string;
  total: number;
  INSERT: number;
  UPDATE: number;
  DELETE: number;
}

/**
 * Truncate a timestamp to the start of its UTC bucket — matches PostgreSQL
 * `date_trunc(p_bucket, timestamptz)` running in the default UTC session
 * timezone. Local-time helpers from date-fns would skew bucket boundaries
 * for non-UTC clients.
 */
export function startOfBucketUtc(
  bucket: AuditLogTimelineBucket,
  when: Date
): Date {
  const d = new Date(when.getTime());
  switch (bucket) {
    case 'minute':
      d.setUTCSeconds(0, 0);
      break;
    case 'hour':
      d.setUTCMinutes(0, 0, 0);
      break;
    case 'day':
      d.setUTCHours(0, 0, 0, 0);
      break;
  }
  return d;
}

function makeBlankRow(
  bucketIso: string,
  when: Date,
  bucket: AuditLogTimelineBucket
): ChartRow {
  return {
    bucket: bucketIso,
    bucketLabel: formatDate(when, BUCKET_LABEL_FORMAT[bucket]),
    total: 0,
    INSERT: 0,
    UPDATE: 0,
    DELETE: 0,
  };
}

/**
 * Build the chart's ordered row list. When `dateFrom` / `dateTo` are
 * provided, pre-seed every bucket in the range with zero counts. Falls back
 * to data-driven sparse aggregation for ranges that exceed the safety cap.
 */
export function aggregateByBucket(
  rows: AuditLogTimelineRow[],
  bucket: AuditLogTimelineBucket,
  dateFrom?: string,
  dateTo?: string
): ChartRow[] {
  const map = new Map<string, ChartRow>();

  if (dateFrom && dateTo) {
    const fromMs = startOfBucketUtc(bucket, new Date(dateFrom)).getTime();
    const toMs = startOfBucketUtc(bucket, new Date(dateTo)).getTime();
    const span = BUCKET_MS[bucket];
    if (Number.isFinite(fromMs) && Number.isFinite(toMs) && toMs > fromMs) {
      // dateTo is an exclusive upper bound (created_at < dateTo in the RPC),
      // so toMs marks the start of the first bucket NOT included. Bucket count
      // is the integer number of spans that fit, with no +1 offset.
      const expectedCount = Math.floor((toMs - fromMs) / span);
      if (expectedCount > 0 && expectedCount <= MAX_DENSE_BUCKETS) {
        for (let ms = fromMs; ms < toMs; ms += span) {
          const when = new Date(ms);
          const iso = when.toISOString();
          map.set(iso, makeBlankRow(iso, when, bucket));
        }
      }
    }
  }

  // Overlay actual counts. Normalize the row's bucket key via toISOString()
  // so PostgREST `+00:00` values match our pre-seeded `Z` keys.
  for (const row of rows) {
    const when = new Date(row.bucket);
    const validWhen = !Number.isNaN(when.getTime());
    const key = validWhen ? when.toISOString() : row.bucket;
    const existing =
      map.get(key) ?? makeBlankRow(key, validWhen ? when : new Date(), bucket);
    const action = row.action as AuditAction;
    existing[action] = (existing[action] ?? 0) + row.count;
    existing.total += row.count;
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.bucket.localeCompare(b.bucket)
  );
}
