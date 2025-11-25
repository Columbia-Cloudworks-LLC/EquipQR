import { describe, it, expect } from 'vitest';
import { createEquipmentValidationSchema, equipmentFormSchema } from './equipment';
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
        expect(teamIdError?.message).toContain('You must assign equipment to a team you manage');
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

    it('should reject team assignment if user does not manage the team', () => {
      const context: EquipmentValidationContext = {
        userRole: 'member',
        isOrgAdmin: false,
        teamMemberships: [
          { teamId: 'team-123', role: 'member' }, // Not a manager/admin
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
        expect(teamIdError?.message).toContain('You must assign equipment to a team you manage');
      }
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

