import { describe, expect, it } from 'vitest';
import {
  countActiveTemplateAssignmentFilters,
  deriveTemplateAssignmentFilterOptions,
  filterEquipmentForTemplateAssignment,
  initialTemplateAssignmentFilters,
} from '@/features/pm-templates/utils/templateAssignmentFilters';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

const baseEquipment = {
  id: 'eq-1',
  name: 'Forklift A',
  model: 'FL-100',
  serial_number: 'SN-001',
  manufacturer: 'Caterpillar',
  location: 'Bay 1',
  status: 'active',
  default_pm_template_id: null,
} as EquipmentRecord;

const assignedEquipment = {
  ...baseEquipment,
  id: 'eq-2',
  name: 'Compressor B',
  model: 'CP-200',
  serial_number: 'SN-002',
  manufacturer: 'Ingersoll',
  location: 'Bay 2',
  status: 'maintenance',
  default_pm_template_id: 'tpl-1',
} as EquipmentRecord;

describe('templateAssignmentFilters', () => {
  it('filters by search, status, location, manufacturer, and PM template state', () => {
    const equipment = [baseEquipment, assignedEquipment];
    const filtered = filterEquipmentForTemplateAssignment(equipment, {
      ...initialTemplateAssignmentFilters,
      search: 'compressor',
      status: 'maintenance',
      manufacturer: 'Ingersoll',
      location: 'Bay 2',
      pmTemplate: 'assigned',
    });

    expect(filtered).toEqual([assignedEquipment]);
  });

  it('returns unassigned equipment when pmTemplate is unassigned', () => {
    const filtered = filterEquipmentForTemplateAssignment(
      [baseEquipment, assignedEquipment],
      {
        ...initialTemplateAssignmentFilters,
        pmTemplate: 'unassigned',
      },
    );

    expect(filtered).toEqual([baseEquipment]);
  });

  it('derives sorted unique filter options', () => {
    const options = deriveTemplateAssignmentFilterOptions([
      baseEquipment,
      assignedEquipment,
      { ...baseEquipment, id: 'eq-3', manufacturer: 'Bobcat', location: 'Yard' } as EquipmentRecord,
    ]);

    expect(options.manufacturers).toEqual(['Bobcat', 'Caterpillar', 'Ingersoll']);
    expect(options.locations).toEqual(['Bay 1', 'Bay 2', 'Yard']);
  });

  it('counts active non-default filters', () => {
    expect(countActiveTemplateAssignmentFilters(initialTemplateAssignmentFilters)).toBe(0);
    expect(
      countActiveTemplateAssignmentFilters({
        ...initialTemplateAssignmentFilters,
        status: 'active',
        pmTemplate: 'unassigned',
      }),
    ).toBe(2);
  });
});
