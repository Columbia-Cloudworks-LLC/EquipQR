import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readPdfBlobPages, readPdfTextRuns } from '@vitest-harness/utils/pdf-text';
import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import {
  DEFAULT_COMPACT_EXPORT_OPTIONS,
  FULL_AUDIT_EXPORT_OPTIONS,
} from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import { buildSubmissionPdfLines } from '@/features/operator-check-ins/services/operatorCheckinReportExportHelpers';

const downloads = vi.hoisted(() => [] as { blob: Blob; filename: string }[]);

vi.mock('@/utils/exportUtils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exportUtils')>()),
  downloadBlob: (blob: Blob, filename: string) => {
    downloads.push({ blob, filename });
  },
}));

const { downloadOperatorCheckinDailyPdf } = await import('./operatorCheckinReportPdfService');

const DISCLAIMER =
  'This report supports safety and audit documentation. It does not certify legal or regulatory compliance.';

function makeSubmission(overrides: Partial<OperatorCheckinSubmission> = {}): OperatorCheckinSubmission {
  return {
    id: 'sub-1',
    organization_id: 'org-1',
    equipment_id: 'eq-1',
    template_id: 'template-1',
    settings_id: 'settings-1',
    submitted_at: '2026-07-04T14:30:00.000Z',
    template_snapshot: {
      name: 'Daily Walkaround',
      checklistItems: [
        { id: 'brakes', title: 'Brakes functional', required: true, section: 'Safety' },
        { id: 'lights', title: 'Lights working', required: true, section: 'Safety' },
      ],
      dataFields: [],
    },
    operator_field_values: [
      { field_id: 'odometer', label: 'Odometer reading', source: 'operator_input', value: 45210 },
    ],
    client_field_values: [],
    equipment_field_values: [],
    checklist_answers: [
      { item_id: 'brakes', passed: true },
      { item_id: 'lights', passed: false, notes: 'Left turn signal out' },
    ],
    is_complete: false,
    required_item_count: 2,
    answered_required_count: 2,
    equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-101' },
    ...overrides,
  };
}

const RANGE = { startDate: '2026-07-01', endDate: '2026-07-04' };

async function lastDownload() {
  expect(downloads).toHaveLength(1);
  const { blob, filename } = downloads[0]!;
  const raw = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  return { filename, pages: await readPdfBlobPages(blob), runs: readPdfTextRuns(raw) };
}

describe('operatorCheckinReportPdfService', () => {
  beforeEach(() => {
    downloads.length = 0;
  });

  it('writes a compact report by default, with a header block and one block per submission', async () => {
    const first = makeSubmission();
    const second = makeSubmission({
      id: 'sub-2',
      equipment_id: 'eq-2',
      equipment: { id: 'eq-2', name: 'Loader 7', serial_number: null },
      is_complete: true,
      checklist_answers: [{ item_id: 'brakes', passed: true }, { item_id: 'lights', passed: true }],
    });

    await downloadOperatorCheckinDailyPdf([first, second], RANGE, 'Daily Walkaround', 'All equipment');

    const { filename, pages, runs } = await lastDownload();
    expect(filename).toBe('fleet_2026-07-01_to_2026-07-04_operator-checkins.pdf');
    expect(pages).toEqual([
      [
        'Daily Operator Check-In Report',
        'Report period: 2026-07-01 – 2026-07-04',
        'Report template: Daily Walkaround',
        'Equipment: All equipment',
        'Submissions: 2',
        ...buildSubmissionPdfLines(first, DEFAULT_COMPACT_EXPORT_OPTIONS),
        ...buildSubmissionPdfLines(second, DEFAULT_COMPACT_EXPORT_OPTIONS),
      ],
    ]);
    expect(pages[0]).toContain('  • Safety / Lights working: Fail — Left turn signal out');
    // Compact mode keeps every submission line at body size.
    expect(runs[0]!.slice(5).every((run) => run.size === 10)).toBe(true);
    expect(runs[0]![0]).toMatchObject({ size: 16 });
  });

  it('adds the audit disclaimer and bold equipment headings in full detail', async () => {
    const submission = makeSubmission();

    await downloadOperatorCheckinDailyPdf([submission], { startDate: '2026-07-04', endDate: '2026-07-04' },
      'Daily Walkaround', 'Truck 101', FULL_AUDIT_EXPORT_OPTIONS);

    const { filename, pages, runs } = await lastDownload();
    expect(filename).toBe('Truck-101_2026-07-04_operator-checkins.pdf');
    const lines = buildSubmissionPdfLines(submission, FULL_AUDIT_EXPORT_OPTIONS);
    expect(pages[0]).toEqual([
      'Daily Operator Check-In Report',
      'Report period: 2026-07-04',
      'Report template: Daily Walkaround',
      'Equipment: Truck 101',
      'Submissions: 1',
      DISCLAIMER,
      ...lines,
    ]);
    const heading = runs[0]!.find((run) => run.text === 'Truck 101')!;
    const body = runs[0]!.find((run) => run.text === lines[1])!;
    expect(heading.size).toBe(12);
    expect(body.size).toBe(10);
    expect(heading.font).not.toBe(body.font);
  });

  it('uses the equipment id as the heading when the equipment record is missing', async () => {
    const submission = makeSubmission({ equipment: null, equipment_id: 'eq-orphan' });

    await downloadOperatorCheckinDailyPdf([submission], RANGE, 'Daily Walkaround', 'eq-orphan', FULL_AUDIT_EXPORT_OPTIONS);

    const { filename, runs } = await lastDownload();
    expect(filename).toBe('unit_2026-07-01_to_2026-07-04_operator-checkins.pdf');
    expect(runs[0]!.find((run) => run.text === 'eq-orphan' )).toMatchObject({ size: 12 });
  });

  it('continues on new pages once a page is full', async () => {
    const submissions = Array.from({ length: 30 }, (_, i) =>
      makeSubmission({ id: `sub-${i}`, equipment: { id: `eq-${i}`, name: `Truck ${i}`, serial_number: null } }),
    );

    await downloadOperatorCheckinDailyPdf(submissions, RANGE, 'Daily Walkaround', 'All equipment');

    const { pages } = await lastDownload();
    expect(pages.length).toBeGreaterThan(1);
    const expected = submissions.flatMap((s) => buildSubmissionPdfLines(s, DEFAULT_COMPACT_EXPORT_OPTIONS));
    expect(pages.flat().slice(5)).toEqual(expected);
  });
});
