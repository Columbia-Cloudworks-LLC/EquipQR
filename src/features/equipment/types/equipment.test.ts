import { describe, it, expect } from 'vitest';
import {
  createEquipmentValidationSchema,
  equipmentFormSchema,
  generateEquipmentName,
  quickEquipmentSchema,
} from './equipment';
import type { EquipmentValidationContext } from './equipment';

describe('equipment types', () => {
  const validEquipmentData = {
    name: 'Test Equipment',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    serial_number: 'SN123456',
    status: 'active' as const,
    location: 'Test Location',
    installation_date: '2023-01-01',
    notes: 'Test notes',
  };

  describe('equipmentFormSchema', () => {
    it('should validate valid equipment data', () => {
      const result = equipmentFormSchema.safeParse(validEquipmentData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid equipment data', () => {
      const invalidData = {
        name: '', // Empty name should fail
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        serial_number: 'SN123456',
        status: 'active' as const,
        location: 'Test Location',
        installation_date: '2023-01-01',
        notes: 'Test notes',
      };
      
      const result = equipmentFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should accept optional fields', () => {
      const dataWithOptional = {
        ...validEquipmentData,
        warranty_expiration: '2025-01-01',
        last_maintenance: '2023-12-01',
        image_url: 'https://example.com/image.jpg',
        custom_attributes: { key: 'value' },
      };
      
      const result = equipmentFormSchema.safeParse(dataWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('createEquipmentValidationSchema', () => {
    it('should create schema without context (backward compatibility)', () => {
      const schema = createEquipmentValidationSchema();
      const result = schema.safeParse(validEquipmentData);
      expect(result.success).toBe(true);
    });

    it('should allow org admins to create equipment without team', () => {
      const context: EquipmentValidationContext = {
        userRole: 'admin',
        isOrgAdmin: true,
        teamMemberships: [],
      };
      
      const schema = createEquipmentValidationSchema(context);
      const dataWithoutTeam = {
        ...validEquipmentData,
        team_id: undefined,
      };
      
      const result = schema.safeParse(dataWithoutTeam);
      expect(result.success).toBe(true);
    });

    it('should allow owners to create equipment without team', () => {
      const context: EquipmentValidationContext = {
        userRole: 'owner',
        isOrgAdmin: false,
        teamMemberships: [],
      };
      
      const schema = createEquipmentValidationSchema(context);
      const dataWithoutTeam = {
        ...validEquipmentData,
        team_id: undefined,
      };
      
      const result = schema.safeParse(dataWithoutTeam);
      expect(result.success).toBe(true);
    });

    it('should require team assignment for non-admin users', () => {
      const context: EquipmentValidationContext = {
        userRole: 'member',
        isOrgAdmin: false,
        teamMemberships: [],
      };
      
      const schema = createEquipmentValidationSchema(context);
      const dataWithoutTeam = {
        ...validEquipmentData,
        team_id: undefined,
      };
      
      const result = schema.safeParse(dataWithoutTeam);
      expect(result.success).toBe(false);
      if (!result.success) {
        const teamIdError = result.error.issues.find(issue => issue.path.includes('team_id'));
        expect(teamIdError).toBeDefined();
        expect(teamIdError?.message).toContain('manager or technician');
      }
    });

    it('should allow team assignment if user manages the team', () => {
      const context: EquipmentValidationContext = {
        userRole: 'member',
        isOrgAdmin: false,
        teamMemberships: [
          { teamId: 'team-123', role: 'manager' },
          { teamId: 'team-456', role: 'admin' },
        ],
      };
      
      const schema = createEquipmentValidationSchema(context);
      const dataWithManagedTeam = {
        ...validEquipmentData,
        team_id: 'team-123',
      };
      
      const result = schema.safeParse(dataWithManagedTeam);
      expect(result.success).toBe(true);
    });

    it('should reject team assignment if user has no create-capable role on the team', () => {
      const context: EquipmentValidationContext = {
        userRole: 'member',
        isOrgAdmin: false,
        teamMemberships: [
          { teamId: 'team-123', role: 'member' }, // Not a manager/technician/admin
        ],
      };

      const schema = createEquipmentValidationSchema(context);
      const dataWithUnmanagedTeam = {
        ...validEquipmentData,
        team_id: 'team-123',
      };

      const result = schema.safeParse(dataWithUnmanagedTeam);
      expect(result.success).toBe(false);
      if (!result.success) {
        const teamIdError = result.error.issues.find(issue => issue.path.includes('team_id'));
        expect(teamIdError).toBeDefined();
        expect(teamIdError?.message).toContain('manager or technician');
      }
    });

    // #650: technicians on the team can now create equipment for it.
    it('should allow team assignment if user is a technician on the team', () => {
      const context: EquipmentValidationContext = {
        userRole: 'member',
        isOrgAdmin: false,
        teamMemberships: [
          { teamId: 'team-123', role: 'technician' },
        ],
      };

      const schema = createEquipmentValidationSchema(context);
      const dataWithTechnicianTeam = {
        ...validEquipmentData,
        team_id: 'team-123',
      };

      const result = schema.safeParse(dataWithTechnicianTeam);
      expect(result.success).toBe(true);
    });

    it('should allow admin role in team membership', () => {
      const context: EquipmentValidationContext = {
        userRole: 'member',
        isOrgAdmin: false,
        teamMemberships: [
          { teamId: 'team-123', role: 'admin' },
        ],
      };
      
      const schema = createEquipmentValidationSchema(context);
      const dataWithAdminTeam = {
        ...validEquipmentData,
        team_id: 'team-123',
      };
      
      const result = schema.safeParse(dataWithAdminTeam);
      expect(result.success).toBe(true);
    });

    it('should reject team assignment to team user is not a member of', () => {
      const context: EquipmentValidationContext = {
        userRole: 'member',
        isOrgAdmin: false,
        teamMemberships: [
          { teamId: 'team-123', role: 'manager' },
        ],
      };
      
      const schema = createEquipmentValidationSchema(context);
      const dataWithDifferentTeam = {
        ...validEquipmentData,
        team_id: 'team-999', // Not in teamMemberships
      };
      
      const result = schema.safeParse(dataWithDifferentTeam);
      expect(result.success).toBe(false);
      if (!result.success) {
        const teamIdError = result.error.issues.find(issue => issue.path.includes('team_id'));
        expect(teamIdError).toBeDefined();
      }
    });
  });
});


describe('equipmentFormSchema field rules', () => {
  const valid = {
    name: 'Loader 7',
    manufacturer: 'Cat',
    model: '950M',
    serial_number: 'SN-1',
    status: 'active' as const,
    location: 'Yard B',
    installation_date: '2023-01-01',
    notes: '',
  };

  function issues(input: Record<string, unknown>) {
    const result = equipmentFormSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  }

  it.each([
    ['name', 'Equipment name is required'],
    ['manufacturer', 'Manufacturer is required'],
    ['model', 'Model is required'],
    ['serial_number', 'Serial number is required'],
    ['location', 'Location is required'],
  ])('rejects an empty %s with "%s"', (field, message) => {
    expect(issues({ ...valid, [field]: '' })).toEqual([`${field}: ${message}`]);
  });

  it('rejects statuses outside active/maintenance/inactive', () => {
    expect(issues({ ...valid, status: 'retired' })).toHaveLength(1);
    expect(issues({ ...valid, status: 'retired' })[0]).toMatch(/^status: /);
  });

  it('rejects negative working hours but accepts zero and null', () => {
    expect(issues({ ...valid, working_hours: -1 })).toEqual(['working_hours: Working hours cannot be negative']);
    expect(issues({ ...valid, working_hours: 0 })).toEqual([]);
    expect(issues({ ...valid, working_hours: null })).toEqual([]);
  });

  it('accepts custom attributes of string, number, boolean or null, and rejects nested objects', () => {
    expect(issues({ ...valid, custom_attributes: { a: 'x', b: 1, c: true, d: null } })).toEqual([]);
    expect(issues({ ...valid, custom_attributes: { a: { nested: true } } })).toHaveLength(1);
  });

  it('requires latitude and longitude on a last known location', () => {
    expect(issues({ ...valid, last_known_location: { latitude: 41.9, longitude: -87.6 } })).toEqual([]);
    expect(issues({ ...valid, last_known_location: { latitude: 41.9 } })).toHaveLength(1);
  });

  it('partial() still enforces the working hours floor for bulk edits', () => {
    const result = equipmentFormSchema.partial().safeParse({ working_hours: -5 });
    expect(result.success).toBe(false);
  });
});

describe('quickEquipmentSchema', () => {
  const valid = { manufacturer: 'Cat', model: '950M', serial_number: 'SN-1', team_id: 'team-1', name: 'Cat 950M' };

  it('accepts the minimal inline-creation fields', () => {
    expect(quickEquipmentSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['team_id', 'Team is required'],
    ['name', 'Name is required'],
    ['manufacturer', 'Manufacturer is required'],
  ])('requires %s', (field, message) => {
    const result = quickEquipmentSchema.safeParse({ ...valid, [field]: '' });
    expect(result.success ? [] : result.error.issues.map((i) => i.message)).toEqual([message]);
  });

  it('limits the name to 100 characters', () => {
    const result = quickEquipmentSchema.safeParse({ ...valid, name: 'x'.repeat(101) });
    expect(result.success ? [] : result.error.issues.map((i) => i.message)).toEqual([
      'Name must be less than 100 characters',
    ]);
    expect(quickEquipmentSchema.safeParse({ ...valid, name: 'x'.repeat(100) }).success).toBe(true);
  });
});

describe('generateEquipmentName', () => {
  it.each([
    ['Cat', '950M', 'Cat 950M'],
    ['  Cat ', ' 950M  ', 'Cat 950M'],
    ['', '950M', '950M'],
    ['Cat', '   ', 'Cat'],
    [' ', '', ''],
  ])('(%j, %j) -> %j', (manufacturer, model, expected) => {
    expect(generateEquipmentName(manufacturer, model)).toBe(expected);
  });
});
