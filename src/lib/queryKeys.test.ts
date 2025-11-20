import { describe, it, expect } from 'vitest';
import { organization, team, teams, equipment, workOrders, pmTemplates, queryKeys } from './queryKeys';

describe('queryKeys', () => {
  describe('organization', () => {
    it('should create organization keys', () => {
      const orgKeys = organization('org-123');
      expect(orgKeys.root).toEqual(['organization', 'org-123']);
      expect(orgKeys.members()).toEqual(['organization', 'org-123', 'members']);
      expect(orgKeys.membersOptimized()).toEqual(['organization', 'org-123', 'members-optimized']);
      expect(orgKeys.slots()).toEqual(['organization', 'org-123', 'slots']);
      expect(orgKeys.slotAvailability()).toEqual(['organization', 'org-123', 'slot-availability']);
      expect(orgKeys.slotPurchases()).toEqual(['organization', 'org-123', 'slot-purchases']);
      expect(orgKeys.invitations()).toEqual(['organization', 'org-123', 'invitations']);
      expect(orgKeys.dashboardStats()).toEqual(['organization', 'org-123', 'dashboard-stats']);
    });
  });

  describe('team', () => {
    it('should create team keys', () => {
      const teamKeys = team('team-123');
      expect(teamKeys.root).toEqual(['team', 'team-123']);
      expect(teamKeys.members()).toEqual(['team', 'team-123', 'members']);
      expect(teamKeys.managerCheck('user-456')).toEqual(['team', 'team-123', 'manager', 'user-456']);
    });
  });

  describe('teams', () => {
    it('should create teams keys', () => {
      const teamsKeys = teams('org-123');
      expect(teamsKeys.root).toEqual(['teams', 'org-123']);
      expect(teamsKeys.optimized()).toEqual(['teams', 'org-123', 'optimized']);
      expect(teamsKeys.availableUsers('team-456')).toEqual(['teams', 'org-123', 'available-users', 'team-456']);
    });
  });

  describe('equipment', () => {
    it('should create equipment root key', () => {
      expect(equipment.root).toEqual(['equipment']);
    });

    it('should create equipment list key without filters', () => {
      const key = equipment.list('org-123');
      expect(key).toEqual(['equipment', 'org-123']);
    });

    it('should create equipment list key with filters', () => {
      const filters = { status: 'active' };
      const key = equipment.list('org-123', filters);
      expect(key).toEqual(['equipment', 'org-123', 'filtered', filters]);
    });

    it('should create equipment listOptimized key', () => {
      const key = equipment.listOptimized('org-123');
      expect(key).toEqual(['equipment', 'org-123', 'optimized']);
    });

    it('should create equipment byId key', () => {
      const key = equipment.byId('org-123', 'equipment-456');
      expect(key).toEqual(['equipment', 'org-123', 'equipment-456']);
    });

    it('should create equipment notes key without orgId', () => {
      const key = equipment.notes('equipment-456');
      expect(key).toEqual(['equipment', 'equipment-456', 'notes']);
    });

    it('should create equipment notes key with orgId', () => {
      const key = equipment.notes('equipment-456', 'org-123');
      expect(key).toEqual(['equipment', 'equipment-456', 'notes', 'org-123']);
    });

    it('should create equipment notesOptimized key', () => {
      const key = equipment.notesOptimized('equipment-456');
      expect(key).toEqual(['equipment', 'equipment-456', 'notes-optimized']);
    });

    it('should create equipment workingHours key without page/pageSize', () => {
      const key = equipment.workingHours('equipment-456');
      expect(key).toEqual(['equipment', 'equipment-456', 'working-hours']);
    });

    it('should create equipment workingHours key with page and pageSize', () => {
      const key = equipment.workingHours('equipment-456', 1, 10);
      expect(key).toEqual(['equipment', 'equipment-456', 'working-hours', 1, 10]);
    });

    it('should create equipment teamBased key', () => {
      const key = equipment.teamBased('org-123', ['team-1', 'team-2'], true);
      expect(key).toEqual(['equipment', 'org-123', 'team-based', ['team-1', 'team-2'], true]);
    });
  });

  describe('workOrders', () => {
    it('should create workOrders root key', () => {
      expect(workOrders.root).toEqual(['work-orders']);
    });

    it('should create workOrders list key without filters', () => {
      const key = workOrders.list('org-123');
      expect(key).toEqual(['work-orders', 'org-123']);
    });

    it('should create workOrders list key with filters', () => {
      const filters = { status: 'pending' };
      const key = workOrders.list('org-123', filters);
      expect(key).toEqual(['work-orders', 'org-123', 'filtered', filters]);
    });

    it('should create workOrders enhanced key', () => {
      const key = workOrders.enhanced('org-123');
      expect(key).toEqual(['work-orders', 'org-123', 'enhanced']);
    });

    it('should create workOrders optimized key', () => {
      const key = workOrders.optimized('org-123');
      expect(key).toEqual(['work-orders', 'org-123', 'optimized']);
    });

    it('should create workOrders byId key', () => {
      const key = workOrders.byId('org-123', 'workorder-456');
      expect(key).toEqual(['work-orders', 'org-123', 'workorder-456']);
    });

    it('should create workOrders teamBased key without filters', () => {
      const key = workOrders.teamBased('org-123', ['team-1'], false);
      // filters parameter is optional and included in array even if undefined
      expect(key).toEqual(['work-orders', 'org-123', 'team-based', ['team-1'], false, undefined]);
    });

    it('should create workOrders teamBased key with filters', () => {
      const filters = { status: 'active' };
      const key = workOrders.teamBased('org-123', ['team-1'], false, filters);
      expect(key).toEqual(['work-orders', 'org-123', 'team-based', ['team-1'], false, filters]);
    });

    it('should create workOrders myWorkOrders key', () => {
      const key = workOrders.myWorkOrders('org-123', 'user-456');
      expect(key).toEqual(['work-orders', 'org-123', 'my', 'user-456']);
    });

    it('should create workOrders equipmentWorkOrders key without status', () => {
      const key = workOrders.equipmentWorkOrders('org-123', 'equipment-456');
      expect(key).toEqual(['work-orders', 'org-123', 'equipment', 'equipment-456']);
    });

    it('should create workOrders equipmentWorkOrders key with status', () => {
      const key = workOrders.equipmentWorkOrders('org-123', 'equipment-456', 'active');
      expect(key).toEqual(['work-orders', 'org-123', 'equipment', 'equipment-456', 'active']);
    });
  });

  describe('pmTemplates', () => {
    it('should create pmTemplates root key', () => {
      expect(pmTemplates.root).toEqual(['pm-templates']);
    });

    it('should create pmTemplates list key', () => {
      const key = pmTemplates.list('org-123');
      expect(key).toEqual(['pm-templates', 'org-123']);
    });

    it('should create pmTemplates byId key', () => {
      const key = pmTemplates.byId('template-456');
      expect(key).toEqual(['pm-templates', 'template-456']);
    });
  });

  describe('queryKeys (legacy)', () => {
    it('should export all query key factories', () => {
      expect(queryKeys.organization).toBe(organization);
      expect(queryKeys.team).toBe(team);
      expect(queryKeys.teams).toBe(teams);
      expect(queryKeys.equipment).toBe(equipment);
      expect(queryKeys.workOrders).toBe(workOrders);
      expect(queryKeys.pmTemplates).toBe(pmTemplates);
    });
  });
});

