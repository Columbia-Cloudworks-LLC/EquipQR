import { describe, expect, it } from 'vitest';
import { parseStaffLines, resolveEquipmentCsv, resolveStaffLine, resolveYardForm } from './yardForm';

const TODAY = '2026-10-14';

describe('parseStaffLines', () => {
  it('reads email, role, optional team role and skips blanks and comments', () => {
    expect(parseStaffLines('owner@a.co, owner\n\n# note\nmike@a.co,mechanic,manager\n')).toEqual([
      { email: 'owner@a.co', role: 'owner' },
      { email: 'mike@a.co', role: 'mechanic', teamRole: 'manager' },
    ]);
  });
});

describe('resolveYardForm', () => {
  it('maps manifest roles and equipment CSV into a provisioning request', () => {
    const result = resolveYardForm(
      {
        name: ' Acme Heavy ',
        teamName: '',
        staffText: 'Owner@Acme.co, owner\nmike@acme.co, mechanic',
        equipmentCsv: 'unit,make,serial\nExcavator 7,Deere,SN1\n',
      },
      TODAY,
    );
    expect(result).toEqual({
      ok: true,
      yard: {
        name: 'Acme Heavy',
        teamName: 'Main Yard',
        staff: [
          { email: 'owner@acme.co', role: 'owner', teamRole: null },
          { email: 'mike@acme.co', role: 'member', teamRole: 'technician' },
        ],
        equipment: [
          {
            name: 'Excavator 7',
            manufacturer: 'Deere',
            model: undefined,
            serialNumber: 'SN1',
            location: 'Yard',
            installationDate: TODAY,
            status: 'active',
            notes: undefined,
            importId: undefined,
          },
        ],
      },
    });
  });

  it('reports every manifest error', () => {
    const result = resolveYardForm({ name: '', teamName: '', staffText: 'bad, mechanic', equipmentCsv: '' }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'organization.name is required',
          'staff[0]: a valid email is required',
          'staff must include exactly one owner',
        ]),
      );
    }
  });
});

describe('resolveStaffLine', () => {
  it('accepts one non-owner person', () => {
    expect(resolveStaffLine('lead@acme.co, mechanic, manager')).toEqual({
      ok: true,
      person: { email: 'lead@acme.co', role: 'member', teamRole: 'manager' },
    });
  });

  it('accepts a replacement owner (the database refuses a second live owner)', () => {
    expect(resolveStaffLine('boss@acme.co, owner')).toEqual({
      ok: true,
      person: { email: 'boss@acme.co', role: 'owner', teamRole: null },
    });
  });

  it('refuses an unknown role', () => {
    expect(resolveStaffLine('x@acme.co, wizard').ok).toBe(false);
  });
});

describe('resolveEquipmentCsv', () => {
  it('validates rows on their own', () => {
    expect(resolveEquipmentCsv('name,serial\nLoader,L1\n', TODAY)).toMatchObject({
      ok: true,
      equipment: [{ name: 'Loader', serialNumber: 'L1' }],
    });
  });

  it('rejects an empty CSV and bad dates', () => {
    expect(resolveEquipmentCsv('name\n', TODAY).ok).toBe(false);
    expect(resolveEquipmentCsv('name,installation_date\nLoader,2026-02-31\n', TODAY).ok).toBe(false);
  });
});
