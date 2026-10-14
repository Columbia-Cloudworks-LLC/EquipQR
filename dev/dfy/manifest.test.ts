import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCATION,
  DEFAULT_TEAM_NAME,
  buildLabelsCsv,
  equipmentQrUrl,
  isIsoCalendarDate,
  normalizeEmail,
  parseEquipmentCsv,
  resolveManifest,
  slugify,
} from './manifest.mjs';

const baseManifest = {
  organization: { name: 'Acme Heavy Repair' },
  staff: [
    { email: '  Owner@Acme.TEST ', role: 'owner' },
    { email: 'mech@acme.test', role: 'mechanic' },
  ],
  equipment: [{ name: 'Excavator 1', manufacturer: 'Deere', model: '310SL', serialNumber: 'SN-1' }],
};

describe('resolveManifest', () => {
  it('normalizes staff emails and maps mechanics to members on the yard team', () => {
    const plan = resolveManifest(baseManifest, { today: '2026-10-14' });

    expect(plan.staff).toEqual([
      { email: 'owner@acme.test', role: 'owner', teamRole: null },
      { email: 'mech@acme.test', role: 'member', teamRole: 'technician' },
    ]);
    expect(plan.teamName).toBe(DEFAULT_TEAM_NAME);
  });

  it('fills required equipment columns with safe defaults', () => {
    const plan = resolveManifest(
      { ...baseManifest, equipment: [{ name: 'Loader' }] },
      { today: '2026-10-14' },
    );

    expect(plan.equipment[0]).toEqual({
      name: 'Loader',
      manufacturer: '',
      model: '',
      serial_number: '',
      location: DEFAULT_LOCATION,
      installation_date: '2026-10-14',
      status: 'active',
      notes: null,
      import_id: null,
    });
  });

  it('never sets max members below the staff count or the free-plan floor', () => {
    const staff = Array.from({ length: 8 }, (_, i) => ({
      email: `m${i}@acme.test`,
      role: i === 0 ? 'owner' : 'mechanic',
    }));
    expect(resolveManifest({ ...baseManifest, staff }).organization.maxMembers).toBe(8);
    expect(resolveManifest(baseManifest).organization.maxMembers).toBe(5);
    expect(
      resolveManifest({ ...baseManifest, organization: { name: 'Acme', maxMembers: 30 } }).organization
        .maxMembers,
    ).toBe(30);
  });

  it('requires exactly one owner', () => {
    expect(() =>
      resolveManifest({ ...baseManifest, staff: [{ email: 'a@acme.test', role: 'mechanic' }] }),
    ).toThrow(/exactly one owner/);
    expect(() =>
      resolveManifest({
        ...baseManifest,
        staff: [
          { email: 'a@acme.test', role: 'owner' },
          { email: 'b@acme.test', role: 'owner' },
        ],
      }),
    ).toThrow(/found more than one/);
  });

  it('collects every validation problem in one error', () => {
    try {
      resolveManifest({
        organization: {},
        staff: [
          { email: 'not-an-email', role: 'owner' },
          { email: 'x@acme.test', role: 'boss' },
          { email: 'X@acme.test', role: 'mechanic', teamRole: 'wizard' },
        ],
        equipment: [
          { name: '', serialNumber: 'dup' },
          { name: 'B', serialNumber: 'DUP', installationDate: '10/14/2026', status: 'broken' },
        ],
      });
      expect.unreachable('resolveManifest should throw');
    } catch (error) {
      const problems = (error as { validationErrors: string[] }).validationErrors;
      expect(problems).toEqual(
        expect.arrayContaining([
          'organization.name is required',
          'equipment[0]: name is required',
          'equipment[1]: duplicate serial number "DUP"',
          expect.stringMatching(/equipment\[1\]: installationDate must be a valid YYYY-MM-DD date/),
          expect.stringMatching(/equipment\[1\]: status must be one of/),
          'staff[0]: a valid email is required',
          expect.stringMatching(/staff\[1\]: role must be one of/),
          'staff[2]: duplicate email "x@acme.test"',
          expect.stringMatching(/staff\[2\]: teamRole must be one of/),
        ]),
      );
    }
  });
});

describe('isIsoCalendarDate', () => {
  it('accepts real dates and rejects impossible or malformed ones', () => {
    expect(isIsoCalendarDate('2024-02-29')).toBe(true);
    expect(isIsoCalendarDate('2026-02-31')).toBe(false);
    expect(isIsoCalendarDate('2026-13-01')).toBe(false);
    expect(isIsoCalendarDate('10/14/2026')).toBe(false);
  });

  it('makes dry-run reject impossible installation dates', () => {
    expect(() =>
      resolveManifest({ ...baseManifest, equipment: [{ name: 'Loader', installationDate: '2026-02-31' }] }),
    ).toThrow(/installationDate must be a valid YYYY-MM-DD date/);
  });
});

describe('parseEquipmentCsv', () => {
  it('maps common spreadsheet headers onto equipment fields', () => {
    const rows = parseEquipmentCsv(
      'Unit,Make,Model,VIN,Location,In Service Date,Ignored\n' +
        'Dozer 4,CAT,D6,VIN-4,North lot,2019-05-01,x\n' +
        '\n',
    );

    expect(rows).toEqual([
      {
        name: 'Dozer 4',
        manufacturer: 'CAT',
        model: 'D6',
        serialNumber: 'VIN-4',
        location: 'North lot',
        installationDate: '2019-05-01',
      },
    ]);
  });

  it('merges CSV rows with manifest equipment', () => {
    const plan = resolveManifest(baseManifest, {
      equipmentFromCsv: parseEquipmentCsv('name,serial\nTruck,SN-2\n'),
    });
    expect(plan.equipment.map((e) => e.serial_number)).toEqual(['SN-1', 'SN-2']);
  });
});

describe('labels', () => {
  it('builds org-scoped QR URLs that match the app scan route', () => {
    expect(equipmentQrUrl('https://equipqr.app/', 'eq-1', 'org-1')).toBe(
      'https://equipqr.app/qr/equipment/eq-1?org=org-1',
    );
  });

  it('writes a printable labels CSV', () => {
    const csv = buildLabelsCsv(
      [{ id: 'eq-1', name: 'Dozer, big', manufacturer: 'CAT', model: 'D6', serial_number: 'VIN-4' }],
      { appUrl: 'https://equipqr.app', organizationId: 'org-1' },
    );
    expect(csv.split(/\r?\n/)).toEqual([
      'equipment_id,name,manufacturer,model,serial_number,qr_url,qr_svg',
      'eq-1,"Dozer, big",CAT,D6,VIN-4,https://equipqr.app/qr/equipment/eq-1?org=org-1,qr/eq-1.svg',
    ]);
  });
});

describe('labels formula safety', () => {
  it('neutralizes spreadsheet formulas from customer-supplied fields', () => {
    const csv = buildLabelsCsv(
      [{ id: 'eq-1', name: '=HYPERLINK("x")', manufacturer: ' +CAT', model: '-D6', serial_number: '@SUM(A1)' }],
      { appUrl: 'https://equipqr.app', organizationId: 'org-1' },
    );
    const row = csv.split(/\r?\n/)[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain("' +CAT");
    expect(row).toContain("'-D6");
    expect(row).toContain("'@SUM(A1)");
  });
});

describe('helpers', () => {
  it('normalizes emails and slugs', () => {
    expect(normalizeEmail('  A@B.Test ')).toBe('a@b.test');
    expect(slugify('  Acme Heavy & Repair, LLC ')).toBe('acme-heavy-repair-llc');
    expect(slugify('!!!')).toBe('yard');
  });
});
