import { describe, expect, it } from 'vitest';
import type { OperatorCheckinSubmission } from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import {
  buildLedgerTableRows,
  DEFAULT_LEDGER_PAGE_SIZE,
  DEFAULT_LEDGER_SORT_BY,
  DEFAULT_LEDGER_SORT_ORDER,
  getLedgerDisplayDataFields,
  getLedgerPageCount,
  paginateLedgerRows,
  resolveLedgerTableTemplateData,
  sortLedgerTableRows,
} from '@/features/operator-check-ins/utils/operatorCheckinLedgerTable';

function makeSubmission(overrides: Partial<OperatorCheckinSubmission> = {}): OperatorCheckinSubmission {
  return {
    id: 'sub-1',
    organization_id: 'org-1',
    equipment_id: 'eq-1',
    template_id: 'template-odo',
    settings_id: 'settings-1',
    submitted_at: '2026-07-04T14:30:00.000Z',
    template_snapshot: {
      name: 'Odometer Log',
      checklistItems: [],
      dataFields: [
        { id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' },
      ],
    },
    operator_field_values: [
      { field_id: 'field-odo', label: 'Odometer reading', source: 'operator_input', value: 45210 },
    ],
    client_field_values: [],
    equipment_field_values: [],
    checklist_answers: [],
    is_complete: true,
    required_item_count: 0,
    answered_required_count: 0,
    equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
    ...overrides,
  };
}

describe('operatorCheckinLedgerTable', () => {
  it('uses selected template data fields for table columns', () => {
    const templateData = resolveLedgerTableTemplateData(
      {
        template_data: {
          checklistItems: [],
          dataFields: [{ id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' }],
        },
      },
      [],
    );

    const rows = buildLedgerTableRows(
      [makeSubmission()],
      templateData,
      () => 'Jul 4, 2026 2:30 PM',
    );

    expect(rows[0]['field_field-odo']).toBe('45210');
    expect(rows[0].equipmentName).toBe('Truck 101');
  });

  it('falls back to submission snapshot when template definition is empty', () => {
    const submission = makeSubmission();
    const templateData = resolveLedgerTableTemplateData(
      { template_data: { checklistItems: [], dataFields: [] } },
      [submission],
    );

    expect(templateData.dataFields).toHaveLength(1);
    expect(templateData.dataFields[0].label).toBe('Odometer reading');
  });

  it('maps checklist answers to pass and fail values', () => {
    const templateData = {
      checklistItems: [{ id: 'item-brakes', title: 'Brakes', required: true, section: 'Safety' }],
      dataFields: [],
    };
    const rows = buildLedgerTableRows(
      [
        makeSubmission({
          checklist_answers: [{ item_id: 'item-brakes', passed: false, notes: 'Worn pads' }],
        }),
      ],
      templateData,
      () => 'Jul 4, 2026 2:30 PM',
    );

    expect(rows[0]['checklist_item-brakes']).toBe('fail');
    expect(rows[0]['checklist_item-brakes_notes']).toBe('Worn pads');
  });

  it('omits submitted_timestamp client context from display columns', () => {
    const templateData = {
      checklistItems: [],
      dataFields: [
        { id: 'field-name', label: 'Your name', source: 'operator_input', inputType: 'text' },
        {
          id: 'field-ts',
          label: 'Submitted at',
          source: 'client_context',
          clientKey: 'submitted_timestamp',
        },
      ],
    };

    const displayFields = getLedgerDisplayDataFields(templateData);
    expect(displayFields).toHaveLength(1);
    expect(displayFields[0].label).toBe('Your name');

    const rows = buildLedgerTableRows(
      [
        makeSubmission({
          operator_field_values: [
            { field_id: 'field-name', label: 'Your name', source: 'operator_input', value: 'Alex' },
          ],
          client_field_values: [
            {
              field_id: 'field-ts',
              label: 'Submitted at',
              source: 'client_context',
              value: '2026-07-04T14:30:00.000Z',
            },
          ],
        }),
      ],
      templateData,
      () => 'Jul 4, 2026 2:30 PM',
    );

    expect(rows[0]['field_field-name']).toBe('Alex');
    expect(rows[0]['field_field-ts']).toBeUndefined();
  });

  it('sorts by submitted timestamp descending by default', () => {
    const templateData = {
      checklistItems: [],
      dataFields: [],
    };
    const rows = buildLedgerTableRows(
      [
        makeSubmission({
          id: 'sub-early',
          submitted_at: '2026-07-04T06:19:35.027Z',
        }),
        makeSubmission({
          id: 'sub-late',
          submitted_at: '2026-07-04T06:20:03.892Z',
        }),
      ],
      templateData,
      () => 'formatted',
    );

    const sorted = sortLedgerTableRows(
      rows,
      DEFAULT_LEDGER_SORT_BY,
      DEFAULT_LEDGER_SORT_ORDER,
      templateData,
    );

    expect(sorted.map((row) => row.id)).toEqual(['sub-late', 'sub-early']);
  });

  it('sorts numeric data fields numerically', () => {
    const templateData = {
      checklistItems: [],
      dataFields: [
        { id: 'field-odo', label: 'Odometer reading', source: 'operator_input', inputType: 'number' },
      ],
    };
    const rows = buildLedgerTableRows(
      [
        makeSubmission({
          id: 'sub-high',
          operator_field_values: [
            { field_id: 'field-odo', label: 'Odometer reading', source: 'operator_input', value: 1001 },
          ],
        }),
        makeSubmission({
          id: 'sub-low',
          operator_field_values: [
            { field_id: 'field-odo', label: 'Odometer reading', source: 'operator_input', value: 1000 },
          ],
        }),
      ],
      templateData,
      () => 'formatted',
    );

    const sorted = sortLedgerTableRows(rows, 'field_field-odo', 'asc', templateData);
    expect(sorted.map((row) => row.id)).toEqual(['sub-low', 'sub-high']);
  });

  it('paginates ledger rows by page size', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      id: `sub-${index}`,
    })) as Array<{ id: string }>;

    expect(getLedgerPageCount(rows.length, DEFAULT_LEDGER_PAGE_SIZE)).toBe(2);
    expect(paginateLedgerRows(rows, 1, DEFAULT_LEDGER_PAGE_SIZE)).toHaveLength(DEFAULT_LEDGER_PAGE_SIZE);
    expect(paginateLedgerRows(rows, 2, DEFAULT_LEDGER_PAGE_SIZE)).toHaveLength(5);
    expect(paginateLedgerRows(rows, 2, DEFAULT_LEDGER_PAGE_SIZE)[0]?.id).toBe('sub-25');
  });
});
