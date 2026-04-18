import { describe, expect, it } from 'vitest';
import { expandDemoMacro, listDemoMacros } from '../../../scripts/lib/demoStepMacros.mjs';

describe('demo step macros', () => {
  it('lists known macro names', () => {
    const names = listDemoMacros();
    expect(names).toContain('openNav');
    expect(names).toContain('returnDashboard');
    expect(names).toContain('createEquipment');
    expect(names).toContain('addCustomAttribute');
    expect(names).toContain('addEquipmentNote');
    expect(names).toContain('createTeam');
    expect(names).toContain('addTeamMember');
    expect(names).toContain('assignTeamToEquipment');
    expect(names).toContain('setPmTemplate');
    expect(names).toContain('createPmWorkOrder');
  });

  it('expands openNav into action steps', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'openNav',
      args: { label: 'Inventory' }
    });
    expect(expanded.length).toBeGreaterThan(0);
    expect(expanded[0].type).toBe('action');
  });

  it('throws for unknown macros', () => {
    expect(() =>
      expandDemoMacro({
        type: 'macro',
        name: 'unknownMacro'
      })
    ).toThrow(/Unknown demo macro/i);
  });

  it('openDetails uses clickByLabel when name is supplied', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'openDetails',
      args: { name: 'Komatsu PC210LC-11 Excavator' }
    });
    const click = expanded.find((step) => step.action === 'clickByLabel');
    expect(click).toBeDefined();
    expect(click?.label).toBe('Open details for Komatsu PC210LC-11 Excavator');
  });

  it('createEquipment threads form values through to fillRole + clickRole steps', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'createEquipment',
      args: {
        manufacturer: 'Komatsu',
        model: 'PC210LC-11',
        name: 'Excavator A',
        serial: 'KMTPC-001',
        location: 'South Yard'
      }
    });
    const fills = expanded.filter((step) => step.action === 'fillRole');
    const fillNames = fills.map((step) => `${step.name}=${step.value}`);
    expect(fillNames).toEqual(
      expect.arrayContaining([
        'Manufacturer=Komatsu',
        'Model=PC210LC-11',
        'Equipment Name=Excavator A',
        'Serial Number=KMTPC-001',
        'Location Description=South Yard'
      ])
    );
    expect(expanded.find((step) => step.action === 'clickRole' && step.name === 'Create Equipment')).toBeDefined();
  });

  it('addCustomAttribute keeps the form open when andSave is false', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'addCustomAttribute',
      args: { name: 'Year', value: '2022', andSave: false }
    });
    expect(expanded.find((step) => step.action === 'clickRole' && step.name === 'Save')).toBeUndefined();
    expect(expanded.find((step) => step.action === 'clickHiddenButton' && step.label === 'Edit custom attributes')).toBeDefined();
  });

  it('addCustomAttribute saves when andSave is true (default)', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'addCustomAttribute',
      args: { name: 'EPA Tier', value: 'Tier 4 Final' }
    });
    expect(expanded.find((step) => step.action === 'clickRole' && step.name === 'Save')).toBeDefined();
  });

  it('addEquipmentNote includes machineHours fillNumberInput when provided', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'addEquipmentNote',
      args: { content: 'Walkaround complete', machineHours: 1240 }
    });
    const machineHoursStep = expanded.find(
      (step) => step.action === 'fillNumberInput' && step.name === 'Machine Hours'
    );
    expect(machineHoursStep).toBeDefined();
    expect(machineHoursStep?.value).toBe('1240');
  });

  it('addEquipmentNote omits machineHours when not supplied', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'addEquipmentNote',
      args: { content: 'No hours captured' }
    });
    expect(
      expanded.find((step) => step.action === 'fillNumberInput' && step.name === 'Machine Hours')
    ).toBeUndefined();
  });

  it('assignTeamToEquipment opens the assigned-team editor by aria-label', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'assignTeamToEquipment',
      args: { teamName: 'Excavator Crew' }
    });
    expect(expanded[0].action).toBe('clickByLabel');
    expect(expanded[0].label).toBe('Edit assigned team');
  });

  it('setPmTemplate opens the PM template editor by aria-label', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'setPmTemplate',
      args: { templateName: '250-Hour PM' }
    });
    expect(expanded[0].action).toBe('clickByLabel');
    expect(expanded[0].label).toBe('Edit PM template');
  });

  it('createPmWorkOrder includes machineHours when provided', () => {
    const expanded = expandDemoMacro({
      type: 'macro',
      name: 'createPmWorkOrder',
      args: { title: 'PM 250h', templateName: '250-Hour PM', machineHours: 1290 }
    });
    expect(
      expanded.find((step) => step.action === 'fillNumberInput' && step.name === 'Machine Hours' && step.value === '1290')
    ).toBeDefined();
    expect(expanded.find((step) => step.action === 'clickRole' && step.name === 'Create Work Order')).toBeDefined();
  });
});
