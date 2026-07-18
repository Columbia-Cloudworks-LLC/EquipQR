import { describe, expect, it } from 'vitest';
import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import {
  DEFAULT_COMPACT_EXPORT_OPTIONS,
  FULL_AUDIT_EXPORT_OPTIONS,
} from '@/features/operator-check-ins/services/operatorCheckinReportExportOptions';
import { __operatorCheckinReportExportTestables } from '@/features/operator-check-ins/services/operatorCheckinReportExportHelpers';

const {
  sanitizeFilenamePart,
  buildChecklistExportRows,
  buildChecklistSummaryLine,
  buildCapturedFieldExportRows,
  buildCompactSubmissionPdfLines,
  buildSubmissionPdfLines,
  buildSummarySheetRows,
} = __operatorCheckinReportExportTestables;

function makeSubmission(overrides: Partial<OperatorCheckinSubmission> = {}): OperatorCheckinSubmission {
  return {
    id: overrides.id ?? 'sub-1',
    organization_id: 'org-1',
    equipment_id: overrides.equipment_id ?? 'eq-1',
    template_id: 'template-1',
    settings_id: 'settings-1',
    submitted_at: overrides.submitted_at ?? '2026-07-04T14:30:00.000Z',
    template_snapshot: overrides.template_snapshot ?? {
      name: 'Odometer Log',
      checklistItems: [
        { id: 'item-brakes', title: 'Brakes functional', required: true, section: 'Safety' },
        { id: 'item-lights', title: 'Lights working', required: true, section: 'Safety' },
      ],
      dataFields: [],
    },
    operator_field_values: overrides.operator_field_values ?? [
      { field_id: 'odometer', label: 'Odometer reading', source: 'operator_input', value: 45210 },
    ],
    client_field_values: overrides.client_field_values ?? [
      { field_id: 'ts', label: 'Submission timestamp', source: 'client_context', value: '2026-07-04T14:30:00.000Z' },
    ],
    equipment_field_values: overrides.equipment_field_values ?? [
      { field_id: 'serial', label: 'Serial number', source: 'equipment_snapshot', value: 'SN-101' },
    ],
    checklist_answers: overrides.checklist_answers ?? [
      { item_id: 'item-brakes', passed: true },
      { item_id: 'item-lights', passed: false, notes: 'Left turn signal out' },
    ],
    is_complete: overrides.is_complete ?? false,
    required_item_count: overrides.required_item_count ?? 2,
    answered_required_count: overrides.answered_required_count ?? 2,
    equipment: overrides.equipment ?? { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-101' },
  };
}

describe('operatorCheckinReportExportHelpers', () => {
  it('sanitizes filename parts', () => {
    expect(sanitizeFilenamePart('Truck #101')).toBe('Truck-101');
  });

  it('maps checklist item_id to human titles from template_snapshot', () => {
    const rows = buildChecklistExportRows(makeSubmission(), FULL_AUDIT_EXPORT_OPTIONS);
    expect(rows.some((row) => row.itemTitle === 'Brakes functional')).toBe(true);
    expect(rows.some((row) => row.itemTitle === 'Lights working')).toBe(true);
    expect(rows.every((row) => !row.itemTitle.startsWith('item-'))).toBe(true);
  });

  it('returns null checklist summary when template has no checklist items', () => {
    const submission = makeSubmission({
      checklist_answers: [],
      required_item_count: 0,
      answered_required_count: 0,
      template_snapshot: {
        name: 'Odometer Log',
        checklistItems: [],
        dataFields: [{ id: 'odo', label: 'Odometer', source: 'operator_input', inputType: 'number' }],
      },
    });
    expect(buildChecklistSummaryLine(submission)).toBeNull();
  });

  it('omits checklist summary from compact PDF when there are no checklist items', () => {
    const submission = makeSubmission({
      checklist_answers: [],
      required_item_count: 0,
      answered_required_count: 0,
      template_snapshot: {
        name: 'Odometer Log',
        checklistItems: [],
        dataFields: [],
      },
    });
    const lines = buildCompactSubmissionPdfLines(submission, DEFAULT_COMPACT_EXPORT_OPTIONS);
    const joined = lines.join('\n');
    expect(joined).not.toContain('0/0');
    expect(joined).not.toContain('required answered');
  });

  it('summarizes checklist pass/fail counts', () => {
    const summary = buildChecklistSummaryLine(makeSubmission());
    expect(summary).toContain('2/2 required answered');
    expect(summary).toContain('1 pass');
    expect(summary).toContain('1 fail');
  });

  it('omits passing checklist rows in exceptions mode', () => {
    const rows = buildChecklistExportRows(makeSubmission(), DEFAULT_COMPACT_EXPORT_OPTIONS);
    expect(rows).toHaveLength(1);
    expect(rows[0].itemTitle).toBe('Lights working');
    expect(rows[0].passed).toBe(false);
  });

  it('includes all checklist rows in full mode', () => {
    const rows = buildChecklistExportRows(makeSubmission(), FULL_AUDIT_EXPORT_OPTIONS);
    expect(rows).toHaveLength(2);
  });

  it('filters captured fields by section options', () => {
    const compactFields = buildCapturedFieldExportRows(makeSubmission(), DEFAULT_COMPACT_EXPORT_OPTIONS);
    expect(compactFields).toHaveLength(1);
    expect(compactFields[0].label).toBe('Odometer reading');

    const fullFields = buildCapturedFieldExportRows(makeSubmission(), FULL_AUDIT_EXPORT_OPTIONS);
    expect(fullFields.length).toBeGreaterThanOrEqual(3);
  });

  it('builds compact PDF lines without listing every passing checklist item', () => {
    const lines = buildCompactSubmissionPdfLines(makeSubmission(), DEFAULT_COMPACT_EXPORT_OPTIONS);
    const joined = lines.join('\n');
    expect(joined).toContain('Truck 101');
    expect(joined).toContain('Odometer reading: 45210');
    expect(joined).toContain('1 pass, 1 fail');
    expect(joined).toContain('Lights working');
    expect(joined).not.toContain('Brakes functional');
    expect(joined).not.toContain('Template:');
  });

  it('builds full PDF lines with section labels for all checklist items', () => {
    const lines = buildSubmissionPdfLines(makeSubmission(), FULL_AUDIT_EXPORT_OPTIONS);
    const joined = lines.join('\n');
    expect(joined).toContain('[Safety] Brakes functional');
    expect(joined).toContain('[Safety] Lights working');
    expect(joined).toContain('Serial number');
    expect(joined).not.toContain('Checklist: Odometer Log');
  });

  it('builds summary sheet rows for Excel export', () => {
    const rows = buildSummarySheetRows('2026-07-04', 'Odometer Log', 'All assigned equipment (2)', [makeSubmission()]);
    expect(rows).toContainEqual(['Report period', '2026-07-04']);
    expect(rows).toContainEqual(['Report template', 'Odometer Log']);
    expect(rows).toContainEqual(['Equipment', 'All assigned equipment (2)']);
    expect(rows).toContainEqual(['Submissions', '1']);
    expect(rows).toContainEqual(['Complete', '0']);
  });
});
