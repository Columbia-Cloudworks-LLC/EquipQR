import { describe, expect, it } from 'vitest';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import {
  canAddWorkOrderNotes,
  canUsePrivateWorkOrderNotes,
  isWorkOrderCancelled,
  isWorkOrderEditLocked,
} from './workOrderNotePermissions';

const baseInput = {
  status: 'in_progress' as WorkOrderStatus,
  teamId: 'team-1',
  createdBy: 'creator-1',
  userId: 'user-1',
  isOrgAdmin: false,
  teamMemberships: [{ teamId: 'team-1', role: 'requestor' }],
};

describe('workOrderNotePermissions', () => {
  it('blocks note creation on cancelled work orders', () => {
    expect(
      canAddWorkOrderNotes({
        ...baseInput,
        status: 'cancelled',
        userId: 'creator-1',
        createdBy: 'creator-1',
      }),
    ).toBe(false);
  });

  it('allows completed work orders to receive notes', () => {
    expect(
      canAddWorkOrderNotes({
        ...baseInput,
        status: 'completed',
        userId: 'creator-1',
        createdBy: 'creator-1',
      }),
    ).toBe(true);
  });

  it('allows team requestors when memberships use team_id', () => {
    expect(
      canAddWorkOrderNotes({
        ...baseInput,
        teamMemberships: [{ team_id: 'team-1', role: 'requestor' }],
      }),
    ).toBe(true);
  });

  it('allows team requestors on the work order team', () => {
    expect(canAddWorkOrderNotes(baseInput)).toBe(true);
  });

  it('allows work order creators even without a team role', () => {
    expect(
      canAddWorkOrderNotes({
        ...baseInput,
        userId: 'creator-1',
        createdBy: 'creator-1',
        teamMemberships: [],
      }),
    ).toBe(true);
  });

  it('denies team viewers and unrelated members', () => {
    expect(
      canAddWorkOrderNotes({
        ...baseInput,
        teamMemberships: [{ teamId: 'team-1', role: 'viewer' }],
      }),
    ).toBe(false);

    expect(
      canAddWorkOrderNotes({
        ...baseInput,
        userId: 'other-user',
        createdBy: 'creator-1',
        teamMemberships: [{ teamId: 'team-2', role: 'requestor' }],
      }),
    ).toBe(false);
  });

  it('allows team owners to add and use private notes', () => {
    expect(
      canAddWorkOrderNotes({
        ...baseInput,
        teamMemberships: [{ teamId: 'team-1', role: 'owner' }],
      }),
    ).toBe(true);
    expect(
      canUsePrivateWorkOrderNotes({
        ...baseInput,
        teamMemberships: [{ teamId: 'team-1', role: 'owner' }],
      }),
    ).toBe(true);
  });

  it('allows org admins and field roles to use private notes', () => {
    expect(canUsePrivateWorkOrderNotes({ ...baseInput, isOrgAdmin: true })).toBe(true);
    expect(
      canUsePrivateWorkOrderNotes({
        ...baseInput,
        teamMemberships: [{ teamId: 'team-1', role: 'technician' }],
      }),
    ).toBe(true);
    expect(canUsePrivateWorkOrderNotes(baseInput)).toBe(false);
  });

  it('tracks edit lock separately from cancelled note lock', () => {
    expect(isWorkOrderEditLocked('completed')).toBe(true);
    expect(isWorkOrderEditLocked('cancelled')).toBe(true);
    expect(isWorkOrderCancelled('completed')).toBe(false);
    expect(isWorkOrderCancelled('cancelled')).toBe(true);
  });
});
