/**
 * Export Utilities
 *
 * Shared helpers for generating and triggering CSV/JSON file downloads.
 */

import { format } from 'date-fns';

/**
 * Neutralize spreadsheet formula injection when a cell begins with =, +, -, or @.
 * Prefixing with an apostrophe forces spreadsheet clients to treat the value as text.
 */
export function sanitizeSpreadsheetCell(value: string): string {
  if (/^[=+\-@]/.test(value.trimStart())) {
    return `'${value}`;
  }
  return value;
}

/**
 * Generate a CSV string from an array of header names and 2-D row data.
 * Cell values are quoted and internal quotes are escaped.
 */
export function arrayToCsv(headers: string[], rows: string[][]): string {
  const escapeCell = (value: string) =>
    `"${sanitizeSpreadsheetCell(value).replace(/"/g, '""')}"`;
  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) => row.map(escapeCell).join(','));
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Trigger a JSON file download in the browser.
 */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  downloadBlob(blob, filename);
}

/**
 * Build a datestamped filename.
 * e.g. filenameWithDate('equipment', 'csv') → 'equipment-2026-03-22.csv'
 */
export function filenameWithDate(base: string, extension: string): string {
  return `${base}-${format(new Date(), 'yyyy-MM-dd')}.${extension}`;
}

/** Trigger a browser file download from a Blob (revokes object URL after click). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
