import { describe, expect, it } from 'vitest';
import type { EquipmentOperatorCheckinAssignment } from '@/features/operator-check-ins/services/operatorCheckinSettingsService';
import {
  buildEquipmentScopeLabel,
  buildLedgerSubmissionFilters,
  createDefaultLedgerDateRange,
  createLedgerShortcutDate,
  createRelativeLedgerDateRange,
  formatLedgerDateRangeFilenamePart,
  formatLedgerDateRangeLabel,
  getAssignedEquipmentForTemplate,
  getReportTemplatesForEquipment,
  isEquipmentAssignedToTemplate,
  isLedgerQueryEnabled,
  normalizeLedgerDateRange,
} from '@/features/operator-check-ins/utils/operatorCheckinLedgerScope';

function makeAssignment(
  overrides: Partial<EquipmentOperatorCheckinAssignment>,
): EquipmentOperatorCheckinAssignment {
  return {
    id: overrides.id ?? 'assignment-1',
    organization_id: 'org-1',
    equipment_id: overrides.equipment_id ?? 'eq-1',
    template_id: overrides.template_id ?? 'template-1',
    enabled: overrides.enabled ?? true,
    public_token_hash: 'hash',
    token_rotated_at: '2026-07-04T00:00:00.000Z',
    token_rotated_by: null,
    created_at: '2026-07-04T00:00:00.000Z',
    updated_at: '2026-07-04T00:00:00.000Z',
    equipment: overrides.equipment ?? { id: overrides.equipment_id ?? 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
  };
}

describe('operatorCheckinLedgerScope', () => {
  it('returns assigned equipment for the selected template only', () => {
    const assignments = [
      makeAssignment({ equipment_id: 'eq-1', template_id: 'template-odo', equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' } }),
      makeAssignment({ id: 'assignment-2', equipment_id: 'eq-2', template_id: 'template-safety', equipment: { id: 'eq-2', name: 'Truck 202', serial_number: 'SN-2' } }),
    ];

    const options = getAssignedEquipmentForTemplate(assignments, 'template-odo');
    expect(options).toHaveLength(1);
    expect(options[0].name).toBe('Truck 101');
  });

  it('includes disabled assignments when reviewing deleted templates', () => {
    const assignments = [
      makeAssignment({
        equipment_id: 'eq-1',
        template_id: 'template-deleted',
        enabled: false,
        equipment: { id: 'eq-1', name: 'Truck 101', serial_number: 'SN-1' },
      }),
    ];

    expect(getAssignedEquipmentForTemplate(assignments, 'template-deleted')).toHaveLength(0);
    const historical = getAssignedEquipmentForTemplate(assignments, 'template-deleted', {
      includeDisabledAssignments: true,
    });
    expect(historical).toHaveLength(1);
    expect(historical[0].name).toBe('Truck 101');
  });

  it('defaults the date range to the same local calendar day', () => {
    const range = createDefaultLedgerDateRange(new Date(2026, 6, 4, 15, 30, 0));
    expect(range).toEqual({ startDate: '2026-07-04', endDate: '2026-07-04' });
  });

  it('builds relative ranges with inclusive day counts ending on the reference day', () => {
    const referenceDate = new Date(2026, 6, 4, 15, 30, 0);
    expect(createRelativeLedgerDateRange(7, referenceDate)).toEqual({
      startDate: '2026-06-28',
      endDate: '2026-07-04',
    });
    expect(createRelativeLedgerDateRange(30, referenceDate)).toEqual({
      startDate: '2026-06-05',
      endDate: '2026-07-04',
    });
  });

  it('builds single-date shortcuts from today', () => {
    const referenceDate = new Date(2026, 6, 4, 15, 30, 0);
    expect(createLedgerShortcutDate(0, referenceDate)).toBe('2026-07-04');
    expect(createLedgerShortcutDate(7, referenceDate)).toBe('2026-06-27');
  });

  it('normalizes inverted date ranges to a contiguous span', () => {
    expect(normalizeLedgerDateRange('2026-07-10', '2026-07-04')).toEqual({
      startDate: '2026-07-04',
      endDate: '2026-07-10',
    });
  });

  it('builds submission filters with template, equipment, and contiguous date range', () => {
    const filters = buildLedgerSubmissionFilters(
      '2026-07-01',
      '2026-07-04',
      'template-odo',
      ['eq-1', 'eq-2'],
    );
    expect(filters).toMatchObject({
      templateId: 'template-odo',
      equipmentIds: ['eq-1', 'eq-2'],
    });
    expect(filters?.from).toBeTruthy();
    expect(filters?.to).toBeTruthy();
    expect(new Date(filters!.from!).getTime()).toBeLessThan(new Date(filters!.to!).getTime());
  });

  it('formats date range labels and filename parts', () => {
    expect(formatLedgerDateRangeLabel('2026-07-04', '2026-07-04')).toBe('2026-07-04');
    expect(formatLedgerDateRangeLabel('2026-07-01', '2026-07-04')).toBe('2026-07-01 – 2026-07-04');
    expect(formatLedgerDateRangeFilenamePart('2026-07-01', '2026-07-04')).toBe(
      '2026-07-01_to_2026-07-04',
    );
  });

  it('returns null filters when template or equipment scope is missing', () => {
    expect(buildLedgerSubmissionFilters('2026-07-04', '2026-07-04', undefined, ['eq-1'])).toBeNull();
    expect(buildLedgerSubmissionFilters('2026-07-04', '2026-07-04', 'template-odo', [])).toBeNull();
  });

  it('describes equipment scope labels for all, one, and many selections', () => {
    const options = [
      { equipmentId: 'eq-1', name: 'Truck 101', serialNumber: 'SN-1' },
      { equipmentId: 'eq-2', name: 'Truck 202', serialNumber: 'SN-2' },
    ];
    expect(buildEquipmentScopeLabel(options, ['eq-1', 'eq-2'])).toBe('All assigned equipment (2)');
    expect(buildEquipmentScopeLabel(options, ['eq-1'])).toBe('Truck 101');
    expect(buildEquipmentScopeLabel(options, [])).toBe('No equipment selected');
  });

  it('enables ledger query only when scoped filters are complete', () => {
    expect(
      isLedgerQueryEnabled(
        buildLedgerSubmissionFilters('2026-07-04', '2026-07-04', 'template-odo', ['eq-1']),
      ),
    ).toBe(true);
    expect(isLedgerQueryEnabled(null)).toBe(false);
  });

  it('returns report templates assigned to a specific equipment record', () => {
    const assignments = [
      makeAssignment({ equipment_id: 'eq-1', template_id: 'template-odo' }),
      makeAssignment({ id: 'assignment-2', equipment_id: 'eq-2', template_id: 'template-safety' }),
      makeAssignment({ id: 'assignment-3', equipment_id: 'eq-1', template_id: 'template-safety', enabled: false }),
    ];
    const templates = [
      { id: 'template-odo', is_active: true, name: 'Odometer Log' },
      { id: 'template-safety', is_active: true, name: 'Daily Safety' },
      { id: 'template-unused', is_active: true, name: 'Unused' },
    ];

    expect(getReportTemplatesForEquipment(templates, assignments, 'eq-1').map((template) => template.id)).toEqual([
      'template-odo',
      'template-safety',
    ]);
  });

  it('checks whether an equipment record is assigned to a template', () => {
    const assignments = [
      makeAssignment({ equipment_id: 'eq-1', template_id: 'template-odo', enabled: true }),
      makeAssignment({ id: 'assignment-2', equipment_id: 'eq-1', template_id: 'template-retired', enabled: false }),
    ];

    expect(isEquipmentAssignedToTemplate(assignments, 'eq-1', 'template-odo')).toBe(true);
    expect(isEquipmentAssignedToTemplate(assignments, 'eq-1', 'template-retired')).toBe(false);
    expect(
      isEquipmentAssignedToTemplate(assignments, 'eq-1', 'template-retired', true),
    ).toBe(true);
  });
});
