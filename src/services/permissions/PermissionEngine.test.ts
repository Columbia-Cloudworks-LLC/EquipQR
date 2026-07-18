/**
 * PermissionEngine Service Tests
 *
 * Tests the core permission engine that determines user access
 * based on roles, team memberships, and entity context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionEngine } from './PermissionEngine';
import { personas } from '@vitest-harness/fixtures/personas';
import { teams } from '@vitest-harness/fixtures/entities';
import {
  createUserContext,
  createMemberContextWithTeamRole,
  maintenanceTeamContext,
  fieldTeamContext,
} from './permissionEngineTestHelpers';

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

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
        expect(engine.hasPermission('equipment.view', context, maintenanceTeamContext())).toBe(true);
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
        expect(engine.hasPermission('equipment.edit', context, maintenanceTeamContext())).toBe(true);
      });

      it('denies team manager from editing other team equipment', () => {
        const context = createUserContext('teamManager');
        expect(engine.hasPermission('equipment.edit', context, fieldTeamContext())).toBe(false);
      });

      it('denies technician from editing equipment', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('equipment.edit', context, maintenanceTeamContext())).toBe(false);
      });
    });

    describe('equipment.create', () => {
      it('allows owner to create equipment without a team context', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('equipment.create', context)).toBe(true);
      });

      it('allows admin to create equipment without a team context', () => {
        const context = createUserContext('admin');
        expect(engine.hasPermission('equipment.create', context)).toBe(true);
      });

      it('allows owner to create equipment for any team', () => {
        const context = createUserContext('owner');
        expect(engine.hasPermission('equipment.create', context, fieldTeamContext())).toBe(true);
      });

      it('allows team manager to create equipment for their own team', () => {
        const context = createUserContext('teamManager');
        expect(engine.hasPermission('equipment.create', context, maintenanceTeamContext())).toBe(true);
      });

      it('denies team manager from creating equipment for another team', () => {
        const context = createUserContext('teamManager');
        expect(engine.hasPermission('equipment.create', context, fieldTeamContext())).toBe(false);
      });

      it('allows team technician to create equipment for their own team', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('equipment.create', context, maintenanceTeamContext())).toBe(true);
      });

      it('denies team technician from creating equipment without a team context', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('equipment.create', context)).toBe(false);
      });

      it('denies team technician from creating equipment for another team', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('equipment.create', context, fieldTeamContext())).toBe(false);
      });

      it('denies requestor team role from creating equipment for that team', () => {
        const context = createMemberContextWithTeamRole('requestor');
        expect(engine.hasPermission('equipment.create', context, maintenanceTeamContext())).toBe(false);
      });

      it('denies viewer team role from creating equipment for that team', () => {
        const context = createMemberContextWithTeamRole('viewer');
        expect(engine.hasPermission('equipment.create', context, maintenanceTeamContext())).toBe(false);
      });

      it('denies read-only member without team membership', () => {
        const context = createUserContext('readOnlyMember');
        expect(engine.hasPermission('equipment.create', context, maintenanceTeamContext())).toBe(false);
      });

      it('denies viewer org persona without team membership', () => {
        const context = createUserContext('viewer');
        expect(engine.hasPermission('equipment.create', context, maintenanceTeamContext())).toBe(false);
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
        expect(engine.hasPermission('workorder.view', context, maintenanceTeamContext())).toBe(true);
      });

      it('allows member role to view work orders (general access)', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('workorder.view', context)).toBe(true);
      });

      it('allows requestor team members to view team work orders', () => {
        const context = createMemberContextWithTeamRole('requestor');
        expect(engine.hasPermission('workorder.view', context, maintenanceTeamContext())).toBe(true);
      });

      it('allows viewer team members to view team work orders', () => {
        const context = createMemberContextWithTeamRole('viewer');
        expect(engine.hasPermission('workorder.view', context, maintenanceTeamContext())).toBe(true);
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
        expect(engine.hasPermission('workorder.edit', context, maintenanceTeamContext())).toBe(true);
      });

      it('denies team manager from editing other team work orders', () => {
        const context = createUserContext('teamManager');
        expect(engine.hasPermission('workorder.edit', context, fieldTeamContext())).toBe(false);
      });

      it('denies technician from editing work orders (without being manager)', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('workorder.edit', context, maintenanceTeamContext())).toBe(false);
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
        expect(engine.hasPermission('workorder.assign', context, maintenanceTeamContext())).toBe(true);
      });

      it('denies team manager from assigning to other teams', () => {
        const context = createUserContext('teamManager');
        expect(engine.hasPermission('workorder.assign', context, fieldTeamContext())).toBe(false);
      });

      it('denies technician from assigning work orders', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('workorder.assign', context, maintenanceTeamContext())).toBe(false);
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
        expect(engine.hasPermission('workorder.changestatus', context, maintenanceTeamContext())).toBe(true);
      });

      it('allows assignee to change status on their assigned work orders', () => {
        const context = createUserContext('technician');
        const entityContext = {
          teamId: teams.field.id,
          assigneeId: personas.technician.id,
        };
        expect(engine.hasPermission('workorder.changestatus', context, entityContext)).toBe(true);
      });

      it('denies non-team member from changing status', () => {
        const context = createUserContext('readOnlyMember');
        expect(engine.hasPermission('workorder.changestatus', context, maintenanceTeamContext())).toBe(false);
      });

      it('denies requestor team members from changing status', () => {
        const context = createMemberContextWithTeamRole('requestor');
        expect(engine.hasPermission('workorder.changestatus', context, maintenanceTeamContext())).toBe(false);
      });

      it('denies viewer team members from changing status', () => {
        const context = createMemberContextWithTeamRole('viewer');
        expect(engine.hasPermission('workorder.changestatus', context, maintenanceTeamContext())).toBe(false);
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
        expect(engine.hasPermission('team.view', context, maintenanceTeamContext())).toBe(true);
      });

      it('denies non-member from viewing team', () => {
        const context = createUserContext('readOnlyMember');
        expect(engine.hasPermission('team.view', context, maintenanceTeamContext())).toBe(false);
      });

      it('allows requestor team members to view their team', () => {
        const context = createMemberContextWithTeamRole('requestor');
        expect(engine.hasPermission('team.view', context, maintenanceTeamContext())).toBe(true);
      });

      it('allows viewer team members to view their team', () => {
        const context = createMemberContextWithTeamRole('viewer');
        expect(engine.hasPermission('team.view', context, maintenanceTeamContext())).toBe(true);
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
        expect(engine.hasPermission('team.manage', context, maintenanceTeamContext())).toBe(true);
      });

      it('denies team manager from managing other teams', () => {
        const context = createUserContext('teamManager');
        expect(engine.hasPermission('team.manage', context, fieldTeamContext())).toBe(false);
      });

      it('denies technician from managing team', () => {
        const context = createUserContext('technician');
        expect(engine.hasPermission('team.manage', context, maintenanceTeamContext())).toBe(false);
      });
    });
  });

  describe('Caching', () => {
    it('caches permission results', () => {
      const context = createUserContext('owner');

      const result1 = engine.hasPermission('organization.manage', context);
      const result2 = engine.hasPermission('organization.manage', context);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('clears cache on request', () => {
      const context = createUserContext('owner');

      engine.hasPermission('organization.manage', context);
      engine.clearCache();

      const result = engine.hasPermission('organization.manage', context);
      expect(result).toBe(true);
    });

    it('creates different cache keys for different entity contexts', () => {
      const context = createUserContext('teamManager');

      const result1 = engine.hasPermission('equipment.edit', context, maintenanceTeamContext());
      const result2 = engine.hasPermission('equipment.edit', context, fieldTeamContext());

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('Batch Check', () => {
    it('checks multiple permissions at once', () => {
      const context = createUserContext('owner');

      const results = engine.batchCheck(
        ['organization.manage', 'organization.invite', 'equipment.edit'],
        context,
      );

      expect(results['organization.manage']).toBe(true);
      expect(results['organization.invite']).toBe(true);
      expect(results['equipment.edit']).toBe(true);
    });

    it('returns correct mixed results for member', () => {
      const context = createUserContext('technician');

      const results = engine.batchCheck(
        ['organization.manage', 'workorder.view', 'workorder.changestatus'],
        context,
        maintenanceTeamContext(),
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

      expect(engine.hasPermission('equipment.edit', context, entityContext)).toBe(true);
    });

    it('assignee rule allows status change even outside their team', () => {
      const context = createUserContext('technician');
      const entityContext = {
        teamId: teams.field.id,
        assigneeId: personas.technician.id,
      };

      expect(engine.hasPermission('workorder.changestatus', context, entityContext)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined permission gracefully', () => {
      const context = createUserContext('owner');
      const result = engine.hasPermission('unknown.permission', context);
      expect(result).toBe(false);
    });

    it('handles missing entity context for team-specific rules', () => {
      const context = createUserContext('teamManager');
      const result = engine.hasPermission('equipment.edit', context);
      expect(result).toBe(false);
    });

    it('handles empty team memberships', () => {
      const context = createUserContext('readOnlyMember');

      expect(engine.hasPermission('equipment.edit', context, maintenanceTeamContext())).toBe(false);
      expect(engine.hasPermission('team.manage', context, maintenanceTeamContext())).toBe(false);
    });

    it('handles multi-team membership', () => {
      const context = createUserContext('multiTeamTechnician');

      expect(engine.hasPermission('workorder.changestatus', context, maintenanceTeamContext())).toBe(true);
      expect(engine.hasPermission('workorder.changestatus', context, fieldTeamContext())).toBe(true);
      expect(engine.hasPermission('workorder.changestatus', context, { teamId: teams.warehouse.id })).toBe(
        false,
      );
    });
  });
});
