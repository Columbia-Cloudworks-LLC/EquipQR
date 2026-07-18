import { describe, expect, it } from 'vitest';
import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import { DEFAULT_COMPACT_EXPORT_OPTIONS } from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import {
  buildCapturedFieldExportRows,
  buildChecklistExportRows,
  buildSubmissionExportRow,
  buildSummarySheetRows,
  generateReportFilename,
} from '@/features/operator-check-ins/services/operatorCheckinReportExportHelpers';

function makeSubmission(): OperatorCheckinSubmission {
  return {
    id: 'sub-1',
    organization_id: 'org-1',
    equipment_id: 'eq-1',
    template_id: 'template-1',
    settings_id: 'settings-1',
    submitted_at: '2026-07-04T14:30:00.000Z',
    template_snapshot: {
      name: 'Odometer Log',
      checklistItems: [{ id: 'item-a', title: 'Tires OK', required: true, section: 'Walk-around' }],
      dataFields: [],
    },
    operator_field_values: [
      { field_id: 'odo', label: 'Odometer', source: 'operator_input', value: 1000 },
    ],
    client_field_values: [],
    equipment_field_values: [],
    checklist_answers: [{ item_id: 'item-a', passed: true }],
    is_complete: true,
    required_item_count: 1,
    answered_required_count: 1,
    equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
  };
}

describe('operatorCheckinReportExcelService helpers', () => {
  it('generates xlsx filename with sanitized equipment name', () => {
    const filename = generateReportFilename([makeSubmission()], '2026-07-04', 'xlsx');
    expect(filename).toBe('Truck-101_2026-07-04_operator-checkins.xlsx');
  });

  it('generates xlsx filename with a multi-day date range', () => {
    const filename = generateReportFilename(
      [makeSubmission()],
      '2026-07-01_to_2026-07-04',
      'xlsx',
    );
    expect(filename).toBe('Truck-101_2026-07-01_to_2026-07-04_operator-checkins.xlsx');
  });

  it('leaves checklist summary empty for data-field-only submissions', () => {
    const submission = makeSubmission();
    submission.template_snapshot = { name: 'Odometer Log', checklistItems: [], dataFields: [] };
    submission.checklist_answers = [];
    submission.required_item_count = 0;
    submission.answered_required_count = 0;

    const row = buildSubmissionExportRow(submission, DEFAULT_COMPACT_EXPORT_OPTIONS);
    expect(row.checklistSummary).toBeNull();
    expect(row.requiredAnswered).toBe('');
  });

  it('builds submission row with checklist summary when checklist included', () => {
    const row = buildSubmissionExportRow(makeSubmission(), DEFAULT_COMPACT_EXPORT_OPTIONS);
    expect(row.equipmentName).toBe('Truck 101');
    expect(row.checklistSummary).toContain('1/1 required answered');
  });

  it('omits checklist rows when checklist section disabled', () => {
    const options = { ...DEFAULT_COMPACT_EXPORT_OPTIONS, includeChecklist: false };
    const rows = buildChecklistExportRows(makeSubmission(), options);
    expect(rows).toHaveLength(0);
  });

  it('builds summary rows for workbook header sheet', () => {
    const rows = buildSummarySheetRows('2026-07-04', 'Odometer Log', 'Truck 101', [makeSubmission()]);
    expect(rows[0][0]).toBe('Daily Operator Check-In Report');
    expect(rows.some((row) => row[0] === 'Report template' && row[1] === 'Odometer Log')).toBe(true);
    expect(rows.some((row) => row[0] === 'Equipment' && row[1] === 'Truck 101')).toBe(true);
  });

  it('builds captured field rows for detail sheet', () => {
    const rows = buildCapturedFieldExportRows(makeSubmission(), DEFAULT_COMPACT_EXPORT_OPTIONS);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe('1000');
  });
});
