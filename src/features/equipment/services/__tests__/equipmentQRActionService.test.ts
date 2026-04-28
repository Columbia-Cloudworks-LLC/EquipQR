import { describe, expect, it } from 'vitest';
import {
  canRunQRAction,
  type QRActionPermissionContext,
  type QRActionType,
} from '@/features/equipment/services/equipmentQRPermissions';

const TEAM_ID = 'team-1';

function context(overrides: Partial<QRActionPermissionContext> = {}): QRActionPermissionContext {
  return {
    userId: 'user-1',
    organizationId: 'org-1',
    userRole: 'member',
    teamMemberships: [],
    ...overrides,
  };
}

describe('equipment QR action permissions', () => {
  const actions: QRActionType[] = ['pm-work-order', 'generic-work-order', 'update-hours', 'note-image'];

  it('allows organization owners and admins to run every QR action', () => {
    for (const action of actions) {
      expect(canRunQRAction(action, context({ userRole: 'owner' }), TEAM_ID)).toBe(true);
      expect(canRunQRAction(action, context({ userRole: 'admin' }), TEAM_ID)).toBe(true);
    }
  });

  it('allows team technicians to create work orders and notes, but denies hour updates', () => {
    const technicianContext = context({
      teamMemberships: [{ teamId: TEAM_ID, role: 'technician' }],
    });

    expect(canRunQRAction('pm-work-order', technicianContext, TEAM_ID)).toBe(true);
    expect(canRunQRAction('generic-work-order', technicianContext, TEAM_ID)).toBe(true);
    expect(canRunQRAction('note-image', technicianContext, TEAM_ID)).toBe(true);
    expect(canRunQRAction('update-hours', technicianContext, TEAM_ID)).toBe(false);
  });

  it('allows team managers to run all team-scoped QR actions', () => {
    const managerContext = context({
      teamMemberships: [{ teamId: TEAM_ID, role: 'manager' }],
    });

    for (const action of actions) {
      expect(canRunQRAction(action, managerContext, TEAM_ID)).toBe(true);
    }
  });

  it('denies members without equipment team access for every team-scoped action', () => {
    const unrelatedTeamContext = context({
      teamMemberships: [{ teamId: 'other-team', role: 'manager' }],
    });

    for (const action of actions) {
      expect(canRunQRAction(action, unrelatedTeamContext, TEAM_ID)).toBe(false);
    }
  });
});
