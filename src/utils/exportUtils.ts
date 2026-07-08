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

export interface LetterPdfWriter {
  writeLine: (text: string, options?: { bold?: boolean; size?: number }) => void;
  addGap: (points: number) => void;
  doc: import('jspdf').jsPDF;
}

/** Letter-size jsPDF writer with wrapped lines and automatic page breaks. */
export async function createLetterPdfWriter(): Promise<LetterPdfWriter> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const maxWidth = 520;
  let y = margin;

  const writeLine = (text: string, options?: { bold?: boolean; size?: number }) => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(options?.size ?? 10);
    const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of wrapped) {
      if (y > 720) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += (options?.size ?? 10) + 4;
    }
  };

  return {
    writeLine,
    addGap: (points: number) => {
      y += points;
    },
    doc,
  };
}
