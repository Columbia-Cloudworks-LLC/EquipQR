import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readPdfBlobPages } from '@vitest-harness/utils/pdf-text';
import type { QuickFormSubmission } from '@/features/quick-forms/services/quickFormSubmissionsService';

const captured = vi.hoisted(() => ({
  csv: [] as { csv: string; filename: string }[],
  blobs: [] as { blob: Blob; filename: string }[],
}));

vi.mock('@/utils/exportUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exportUtils')>()),
  downloadCsv: (csv: string, filename: string) => {
    captured.csv.push({ csv, filename });
  },
  downloadBlob: (blob: Blob, filename: string) => {
    captured.blobs.push({ blob, filename });
  },
}));

const {
  downloadQuickFormSubmissionsCsv,
  downloadQuickFormSubmissionsExcel,
  downloadQuickFormSubmissionsPdf,
} = await import('./quickFormExportService');

const located: QuickFormSubmission = {
  id: 'sub-1',
  organization_id: 'org-a',
  quick_form_id: 'form-a',
  submitted_at: '2026-09-21T15:04:05.000Z',
  form_snapshot: { name: 'Time sheet', fields: [] },
  field_values: [
    { field_id: 'name', label: 'Name', input_type: 'text', value: '=HYPERLINK("x")' },
    { field_id: 'ok', label: 'Safe to operate', input_type: 'checkbox', value: true },
    { field_id: 'note', label: 'Note', input_type: 'textarea', value: '' },
  ],
  client_context: { browser_timezone: 'America/Chicago', gps: { latitude: 41.88, longitude: -87.63 } },
  request_fingerprint: null,
  created_at: '2026-09-21T15:04:05.000Z',
};

/** A row as stored before snapshots were captured: no form name, context, or values. */
const legacy: QuickFormSubmission = {
  ...located,
  id: 'sub-2',
  form_snapshot: null,
  client_context: { browser_timezone: null, gps: null },
  // field_values is a JSON column; legacy rows hold JSON null.
  ...JSON.parse('{"field_values": null}'),
};

describe('quick form export content', () => {
  beforeEach(() => {
    captured.csv = [];
    captured.blobs = [];
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 22, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CSV lists one row per field value, neutralizing spreadsheet formulas', () => {
    downloadQuickFormSubmissionsCsv([located, legacy]);

    expect(captured.csv).toEqual([
      {
        filename: 'quick-form-submissions-2026-09-22.csv',
        csv: [
          '"Form","Submitted at","Field","Value","Submission ID"',
          '"Time sheet","2026-09-21T15:04:05.000Z","Name","\'=HYPERLINK(""x"")","sub-1"',
          '"Time sheet","2026-09-21T15:04:05.000Z","Safe to operate","Yes","sub-1"',
          '"Time sheet","2026-09-21T15:04:05.000Z","Note","—","sub-1"',
        ].join('\n'),
      },
    ]);
  });

  it('Excel summarizes each submission with timezone and GPS, and lists field values', async () => {
    await downloadQuickFormSubmissionsExcel([located, legacy]);

    const XLSX = await import('xlsx');
    const { blob, filename } = captured.blobs[0]!;
    expect(filename).toBe('quick-form-submissions-2026-09-22.xlsx');
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
    const rows = (name: string) => XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name]!, { header: 1, defval: '' });
    expect(rows('Submissions')).toEqual([
      ['Form', 'Submitted at', 'Timezone', 'GPS', 'Submission ID'],
      ['Time sheet', '2026-09-21T15:04:05.000Z', 'America/Chicago', '41.88, -87.63', 'sub-1'],
      ['Quick form', '2026-09-21T15:04:05.000Z', '', '', 'sub-2'],
    ]);
    expect(rows('Field Values')).toHaveLength(4);
  });

  it('PDF writes a block per submission with optional timezone and location lines', async () => {
    await downloadQuickFormSubmissionsPdf([located, legacy]);

    const { blob, filename } = captured.blobs[0]!;
    expect(filename).toBe('quick-form-submissions-2026-09-22.pdf');
    expect(await readPdfBlobPages(blob)).toEqual([
      [
        'Quick Form Submissions',
        '2 submissions',
        'Time sheet — 2026-09-21T15:04:05.000Z',
        'Timezone: America/Chicago',
        'Location: 41.88, -87.63',
        '• Name: =HYPERLINK("x")',
        '• Safe to operate: Yes',
        '• Note: —',
        'Quick form — 2026-09-21T15:04:05.000Z',
      ],
    ]);
  });

  it('PDF uses the singular for one submission', async () => {
    await downloadQuickFormSubmissionsPdf([legacy]);

    expect((await readPdfBlobPages(captured.blobs[0]!.blob))[0]?.[1]).toBe('1 submission');
  });
});
