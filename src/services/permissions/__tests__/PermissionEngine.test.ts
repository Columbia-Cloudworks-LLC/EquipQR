/**
 * PermissionEngine Service Tests
 * 
 * Tests the core permission engine that determines user access
 * based on roles, team memberships, and entity context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionEngine } from '../PermissionEngine';
import { personas } from '@/test/fixtures/personas';
import { teams } from '@/test/fixtures/entities';
import type { UserContext, Role, TeamRole } from '@/types/permissions';

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

// Helper to create user context from persona
const createUserContext = (personaKey: keyof typeof personas): UserContext => {
  const persona = personas[personaKey];
  return {
    userId: persona.id,
    organizationId: 'org-acme',
    userRole: persona.organizationRole as Role,
    teamMemberships: persona.teamMemberships.map(tm => ({
      teamId: tm.teamId,
      role: tm.role as TeamRole
    }))
  };
};

describe('PermissionEngine', () => {
  let engine: PermissionEngine;

  beforeEach(() => {
    engine = new PermissionEngine();
    vi.clearAllMocks();
  });

  describe('Organization Permissions', () => {
    describe('organization.manage', () => {
      it('allows owner to manage organization', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('organization.manage', context)).toBe(true);
      });

      it('allows admin to manage organization', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('organization.manage', context)).toBe(true);
      });

      it('denies team manager from managing organization', () => {
        const context = createUserContext('teamManager');
        expect(engine.hasPermission('organization.manage', context)).toBe(false);
      });

      it('denies technician from managing organization', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('organization.manage', context)).toBe(false);
      });
    });

    describe('organization.invite', () => {
      it('allows owner to invite members', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('organization.invite', context)).toBe(true);
      });

      it('allows admin to invite members', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('organization.invite', context)).toBe(true);
      });

      it('denies member from inviting', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('organization.invite', context)).toBe(false);
      });
    });
  });

  describe('Equipment Permissions', () => {
    describe('equipment.view', () => {
      it('allows owner to view any equipment', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('equipment.view', context)).toBe(true);
      });

      it('allows admin to view any equipment', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('equipment.view', context)).toBe(true);
      });

      it('allows member to view equipment', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('equipment.view', context)).toBe(true);
      });

      it('allows team member to view team equipment', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('equipment.view', context, entityContext)).toBe(true);
      });

      it('still allows member to view even without team context', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('equipment.view', context)).toBe(true);
      });
    });

    describe('equipment.edit', () => {
      it('allows owner to edit any equipment', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('equipment.edit', context)).toBe(true);
      });

      it('allows admin to edit any equipment', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('equipment.edit', context)).toBe(true);
      });

      it('allows team manager to edit their team equipment', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('equipment.edit', context, entityContext)).toBe(true);
      });

      it('denies team manager from editing other team equipment', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.field.id }; // Different team
        expect(engine.hasPermission('equipment.edit', context, entityContext)).toBe(false);
      });

      it('denies technician from editing equipment', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('equipment.edit', context, entityContext)).toBe(false);
      });
    });
  });

  describe('Work Order Permissions', () => {
    describe('workorder.view', () => {
      it('allows owner to view any work order', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('workorder.view', context)).toBe(true);
      });

      it('allows admin to view any work order', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('workorder.view', context)).toBe(true);
      });

      it('allows team member to view team work orders', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('workorder.view', context, entityContext)).toBe(true);
      });

      it('allows member role to view work orders (general access)', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('workorder.view', context)).toBe(true);
      });
    });

    describe('workorder.edit', () => {
      it('allows owner to edit any work order', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('workorder.edit', context)).toBe(true);
      });

      it('allows admin to edit any work order', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('workorder.edit', context)).toBe(true);
      });

      it('allows team manager to edit their team work orders', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('workorder.edit', context, entityContext)).toBe(true);
      });

      it('denies team manager from editing other team work orders', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.field.id };
        expect(engine.hasPermission('workorder.edit', context, entityContext)).toBe(false);
      });

      it('denies technician from editing work orders (without being manager)', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('workorder.edit', context, entityContext)).toBe(false);
      });
    });

    describe('workorder.assign', () => {
      it('allows owner to assign any work order', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('workorder.assign', context)).toBe(true);
      });

      it('allows admin to assign any work order', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('workorder.assign', context)).toBe(true);
      });

      it('allows team manager to assign within their team', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('workorder.assign', context, entityContext)).toBe(true);
      });

      it('denies team manager from assigning to other teams', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.field.id };
        expect(engine.hasPermission('workorder.assign', context, entityContext)).toBe(false);
      });

      it('denies technician from assigning work orders', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('workorder.assign', context, entityContext)).toBe(false);
      });
    });

    describe('workorder.changestatus', () => {
      it('allows owner to change any work order status', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('workorder.changestatus', context)).toBe(true);
      });

      it('allows admin to change any work order status', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('workorder.changestatus', context)).toBe(true);
      });

      it('allows team member to change status on team work orders', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('workorder.changestatus', context, entityContext)).toBe(true);
      });

      it('allows assignee to change status on their assigned work orders', () => {
        const context = createUserContext('technician');
        const entityContext = { 
          teamId: teams.field.id, // Different team
          assigneeId: personas.technician.id // But assigned to them
        };
        expect(engine.hasPermission('workorder.changestatus', context, entityContext)).toBe(true);
      });

      it('denies non-team member from changing status', () => {
        const context = createUserContext('readOnlyMember'); // No team membership
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('workorder.changestatus', context, entityContext)).toBe(false);
      });
    });
  });

  describe('Team Permissions', () => {
    describe('team.view', () => {
      it('allows owner to view any team', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('team.view', context)).toBe(true);
      });

      it('allows admin to view any team', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('team.view', context)).toBe(true);
      });

      it('allows team member to view their team', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('team.view', context, entityContext)).toBe(true);
      });

      it('denies non-member from viewing team', () => {
        const context = createUserContext('readOnlyMember');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('team.view', context, entityContext)).toBe(false);
      });
    });

    describe('team.manage', () => {
      it('allows owner to manage any team', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('team.manage', context)).toBe(true);
      });

      it('allows admin to manage any team', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('team.manage', context)).toBe(true);
      });

      it('allows team manager to manage their team', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('team.manage', context, entityContext)).toBe(true);
      });

      it('denies team manager from managing other teams', () => {
        const context = createUserContext('teamManager');
        const entityContext = { teamId: teams.field.id };
        expect(engine.hasPermission('team.manage', context, entityContext)).toBe(false);
      });

      it('denies technician from managing team', () => {
        const context = createUserContext('technician');
        const entityContext = { teamId: teams.maintenance.id };
        expect(engine.hasPermission('team.manage', context, entityContext)).toBe(false);
      });
    });
  });

  describe('Caching', () => {
    it('caches permission results', () => {
      const context = createUserContext('owner');
      
      // First call
      const result1 = engine.hasPermission('organization.manage', context);
      
      // Second call (should use cache)
      const result2 = engine.hasPermission('organization.manage', context);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('clears cache on request', () => {
      const context = createUserContext('owner');
      
      // Populate cache
      engine.hasPermission('organization.manage', context);
      
      // Clear cache
      engine.clearCache();
      
      // This should work - cache is cleared but rules still work
      const result = engine.hasPermission('organization.manage', context);
      expect(result).toBe(true);
    });

    it('creates different cache keys for different entity contexts', () => {
      const context = createUserContext('teamManager');
      
      // Check permission for different teams
      const result1 = engine.hasPermission('equipment.edit', context, { teamId: teams.maintenance.id });
      const result2 = engine.hasPermission('equipment.edit', context, { teamId: teams.field.id });
      
      // Manager can edit maintenance team equipment, but not field team
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('Batch Check', () => {
    it('checks multiple permissions at once', () => {
      const context = createUserContext('owner');
      
      const results = engine.batchCheck(
        ['organization.manage', 'organization.invite', 'equipment.edit'],
        context
      );

      expect(results['organization.manage']).toBe(true);
      expect(results['organization.invite']).toBe(true);
      expect(results['equipment.edit']).toBe(true);
    });

    it('returns correct mixed results for member', () => {
      const context = createUserContext('technician');
      const entityContext = { teamId: teams.maintenance.id };
      
      const results = engine.batchCheck(
        ['organization.manage', 'workorder.view', 'workorder.changestatus'],
        context,
        entityContext
      );

      expect(results['organization.manage']).toBe(false);
      expect(results['workorder.view']).toBe(true);
      expect(results['workorder.changestatus']).toBe(true);
    });
  });

  describe('Rule Priority', () => {
    it('admin rule takes priority over team rules', () => {
      const context = createUserContext('admin');
      const entityContext = { teamId: 'non-existent-team' };
      
      // Admin can edit even for non-existent team because admin rule has higher priority
      expect(engine.hasPermission('equipment.edit', context, entityContext)).toBe(true);
    });

    it('assignee rule allows status change even outside their team', () => {
      const context = createUserContext('technician');
      const entityContext = { 
        teamId: teams.field.id, // Not their team
        assigneeId: personas.technician.id // But they are assignee
      };
      
      expect(engine.hasPermission('workorder.changestatus', context, entityContext)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined permission gracefully', () => {
      const context = createUserContext('owner');
      
      // Unknown permission should return false
      const result = engine.hasPermission('unknown.permission', context);
      expect(result).toBe(false);
    });

    it('handles missing entity context for team-specific rules', () => {
      const context = createUserContext('teamManager');
      
      // Without entity context, team-specific rules can't match
      // but admin/owner rules still work for higher priority
      const result = engine.hasPermission('equipment.edit', context);
      expect(result).toBe(false); // Team manager without context can't edit
    });

    it('handles empty team memberships', () => {
      const context = createUserContext('readOnlyMember');
      const entityContext = { teamId: teams.maintenance.id };
      
      expect(engine.hasPermission('equipment.edit', context, entityContext)).toBe(false);
      expect(engine.hasPermission('team.manage', context, entityContext)).toBe(false);
    });

    it('handles multi-team membership', () => {
      const context = createUserContext('multiTeamTechnician');
      
      // Should have access to both maintenance and field teams
      expect(engine.hasPermission('workorder.changestatus', context, { teamId: teams.maintenance.id })).toBe(true);
      expect(engine.hasPermission('workorder.changestatus', context, { teamId: teams.field.id })).toBe(true);
      
      // But not warehouse team
      expect(engine.hasPermission('workorder.changestatus', context, { teamId: teams.warehouse.id })).toBe(false);
    });
  });
});
