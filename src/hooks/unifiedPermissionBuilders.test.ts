import { describe, expect, it } from 'vitest';

import type { WorkOrderData } from '@/features/work-orders/types/workOrder';
import type { UserContext } from '@/types/permissions';
import {
  createMemberContextWithTeamRole,
  createUserContext,
} from '@/services/permissions/permissionEngineTestHelpers';

import { buildWorkOrderPermissions } from './unifiedPermissionBuilders';

const baseWorkOrder = {
  id: 'wo-1',
  title: 'Hydraulic repair',
  description: 'Repair a leaking hydraulic line',
  equipmentId: 'eq-1',
  organizationId: 'org-acme',
  priority: 'high',
  status: 'in_progress',
  assigneeId: 'tech-user-id',
  teamId: 'team-maintenance',
  createdDate: '2026-01-01T00:00:00Z',
  created_date: '2026-01-01T00:00:00Z',
  createdBy: 'requestor-user-id',
  hasPM: true,
} satisfies WorkOrderData;

function createDetailedPermissions(userContext: UserContext, workOrder: WorkOrderData = baseWorkOrder) {
  const hasRole = (roles: string | string[]) => {
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(userContext.userRole);
  };

  const isTeamMember = (teamId: string) =>
    userContext.teamMemberships.some((membership) => membership.teamId === teamId);

  const isTeamManager = (teamId: string) =>
    userContext.teamMemberships.some(
      (membership) => membership.teamId === teamId && membership.role === 'manager',
    );

  const hasPermission = (
    permission: string,
    entityContext?: { teamId?: string; assigneeId?: string },
  ) => {
    const teamId = entityContext?.teamId;
    const isOperationalMember = userContext.teamMemberships.some(
      (membership) =>
        membership.teamId === teamId &&
        (membership.role === 'owner' ||
          membership.role === 'manager' ||
          membership.role === 'technician'),
    );

    switch (permission) {
      case 'workorder.view':
        return hasRole(['owner', 'admin']) || Boolean(teamId && isTeamMember(teamId));
      case 'workorder.edit':
      case 'workorder.assign':
        return hasRole(['owner', 'admin']) || Boolean(teamId && isTeamManager(teamId));
      case 'workorder.changestatus':
        return (
          hasRole(['owner', 'admin']) ||
          isOperationalMember ||
          entityContext?.assigneeId === userContext.userId
        );
      default:
        return false;
    }
  };

  return buildWorkOrderPermissions(
    hasPermission,
    hasRole,
    isTeamMember,
    isTeamManager,
    userContext,
  ).getDetailedPermissions(workOrder);
}

describe('buildWorkOrderPermissions', () => {
  describe('getDetailedPermissions', () => {
    it('denies PM edit to viewer team members while keeping PM view access', () => {
      const permissions = createDetailedPermissions(createMemberContextWithTeamRole('viewer'));

      expect(permissions.canViewPM).toBe(true);
      expect(permissions.canEditPM).toBe(false);
    });

    it('denies PM edit to requestor team members while keeping PM view access', () => {
      const permissions = createDetailedPermissions(createMemberContextWithTeamRole('requestor'));

      expect(permissions.canViewPM).toBe(true);
      expect(permissions.canEditPM).toBe(false);
    });

    it('allows PM edit to technicians on unlocked work orders', () => {
      const permissions = createDetailedPermissions(createUserContext('technician'));

      expect(permissions.canEditPM).toBe(true);
    });

    it('allows PM edit to org owners and admins on unlocked work orders', () => {
      expect(createDetailedPermissions(createUserContext('owner')).canEditPM).toBe(true);
      expect(createDetailedPermissions(createUserContext('admin')).canEditPM).toBe(true);
    });

    it('locks PM edit even for technicians once the work order is completed', () => {
      const permissions = createDetailedPermissions(createUserContext('technician'), {
        ...baseWorkOrder,
        status: 'completed',
      });

      expect(permissions.canEditPM).toBe(false);
    });
  });
});
