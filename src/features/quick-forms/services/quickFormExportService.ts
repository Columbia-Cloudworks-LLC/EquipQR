/**
 * Quick form ledger exports (#1184) — CSV, Excel, and PDF downloads of
 * selected submissions. Heavy libraries (xlsx / jspdf) load on demand.
 */

import { arrayToCsv, downloadBlob, downloadCsv, filenameWithDate, sanitizeSpreadsheetCell, createLetterPdfWriter } from '@/utils/exportUtils';
import { formatQuickFormValue } from '@/features/quick-forms/types/quickForm';
import type { QuickFormSubmission } from '@/features/quick-forms/services/quickFormSubmissionsService';

const SUBMISSION_HEADERS = ['Form', 'Submitted at', 'Timezone', 'GPS', 'Submission ID'] as const;
const FIELD_HEADERS = ['Form', 'Submitted at', 'Field', 'Value', 'Submission ID'] as const;

function formName(submission: QuickFormSubmission): string {
  return submission.form_snapshot?.name ?? 'Quick form';
}

function gpsLabel(submission: QuickFormSubmission): string {
  const gps = submission.client_context?.gps;
  if (!gps) return '';
  return `${gps.latitude}, ${gps.longitude}`;
}

function sanitizeRow(values: string[]): string[] {
  return values.map((value) => sanitizeSpreadsheetCell(value));
}

function submissionRow(submission: QuickFormSubmission): string[] {
  return sanitizeRow([
    formName(submission),
    submission.submitted_at,
    submission.client_context?.browser_timezone ?? '',
    gpsLabel(submission),
    submission.id,
  ]);
}

function fieldRows(submission: QuickFormSubmission): string[][] {
  return (submission.field_values ?? []).map((field) =>
    sanitizeRow([
      formName(submission),
      submission.submitted_at,
      field.label,
      formatQuickFormValue(field.value),
      submission.id,
    ]),
  );
}

export function downloadQuickFormSubmissionsCsv(submissions: QuickFormSubmission[]): void {
  const rows = submissions.flatMap((submission) => fieldRows(submission));
  const csv = arrayToCsv([...FIELD_HEADERS], rows);
  downloadCsv(csv, filenameWithDate('quick-form-submissions', 'csv'));
}

export async function downloadQuickFormSubmissionsExcel(
  submissions: QuickFormSubmission[],
): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  const submissionsSheet = XLSX.utils.aoa_to_sheet([
    [...SUBMISSION_HEADERS],
    ...submissions.map(submissionRow),
  ]);
  XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Submissions');

  const valuesSheet = XLSX.utils.aoa_to_sheet([
    [...FIELD_HEADERS],
    ...submissions.flatMap(fieldRows),
  ]);
  XLSX.utils.book_append_sheet(workbook, valuesSheet, 'Field Values');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filenameWithDate('quick-form-submissions', 'xlsx'));
}

export async function downloadQuickFormSubmissionsPdf(
  submissions: QuickFormSubmission[],
): Promise<void> {
  const { writeLine, addGap, doc } = await createLetterPdfWriter();

  writeLine('Quick Form Submissions', { bold: true, size: 16 });
  addGap(4);
  writeLine(`${submissions.length} submission${submissions.length === 1 ? '' : 's'}`);
  addGap(10);

  for (const submission of submissions) {
    writeLine(`${formName(submission)} — ${submission.submitted_at}`, { bold: true, size: 12 });
    const timezone = submission.client_context?.browser_timezone;
    if (timezone) writeLine(`Timezone: ${timezone}`);
    const gps = gpsLabel(submission);
    if (gps) writeLine(`Location: ${gps}`);
    for (const field of submission.field_values ?? []) {
      writeLine(`• ${field.label}: ${formatQuickFormValue(field.value)}`);
    }
    addGap(10);
  }

  downloadBlob(doc.output('blob'), filenameWithDate('quick-form-submissions', 'pdf'));
}
