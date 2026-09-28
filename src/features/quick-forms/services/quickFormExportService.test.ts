import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuickFormSubmission } from '@/features/quick-forms/services/quickFormSubmissionsService';

const captured = vi.hoisted(() => ({
  csv: [] as string[],
  blobs: [] as Blob[],
  pdfLines: [] as string[],
}));

vi.mock('@/utils/exportUtils', async () => {
  const actual = await vi.importActual<typeof import('@/utils/exportUtils')>('@/utils/exportUtils');
  return {
    ...actual,
    downloadCsv: (csv: string) => {
      captured.csv.push(csv);
    },
    downloadBlob: (blob: Blob) => {
      captured.blobs.push(blob);
    },
    createLetterPdfWriter: async () => ({
      writeLine: (text: string) => {
        captured.pdfLines.push(text);
      },
      addGap: () => undefined,
      doc: { output: () => new Blob(['pdf']) },
    }),
  };
});

const {
  downloadQuickFormSubmissionsCsv,
  downloadQuickFormSubmissionsExcel,
  downloadQuickFormSubmissionsPdf,
} = await import('@/features/quick-forms/services/quickFormExportService');

function submission(index: number): QuickFormSubmission {
  return {
    id: `sub-${String(index).padStart(4, '0')}`,
    organization_id: 'org-a',
    quick_form_id: 'form-a',
    submitted_at: '2026-09-21T15:04:05.000Z',
    form_snapshot: { name: 'Time sheet', fields: [] },
    field_values: [{
      field_id: 'name',
      label: 'Name',
      input_type: 'text',
      value: `Worker ${index}`,
    }],
    client_context: null,
    request_fingerprint: null,
    created_at: '2026-09-21T15:04:05.000Z',
  };
}

function idsIn(text: string): string[] {
  return text.match(/sub-\d{4}/g) ?? [];
}

describe('quick form full-scope exports', () => {
  beforeEach(() => {
    captured.csv = [];
    captured.blobs = [];
    captured.pdfLines = [];
  });

  it('writes every matching submission once in CSV, Excel, and PDF when timestamps match', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => submission(index));

    downloadQuickFormSubmissionsCsv(rows);
    await downloadQuickFormSubmissionsExcel(rows);
    await downloadQuickFormSubmissionsPdf(rows);

    const csvIds = idsIn(captured.csv.join('\n'));
    expect(csvIds).toHaveLength(501);
    expect(new Set(csvIds).size).toBe(501);

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await captured.blobs[0]!.arrayBuffer(), { type: 'array' });
    const sheet = XLSX.utils.sheet_to_csv(workbook.Sheets.Submissions!);
    const excelIds = idsIn(sheet);
    expect(excelIds).toHaveLength(501);
    expect(new Set(excelIds).size).toBe(501);
    expect(idsIn(XLSX.utils.sheet_to_csv(workbook.Sheets['Field Values']!))).toHaveLength(501);

    const pdfText = captured.pdfLines.join('\n');
    expect(pdfText).toContain('501 submissions');
    for (let index = 0; index < rows.length; index += 1) {
      expect(pdfText).toContain(`Name: Worker ${index}`);
    }
  });
});
