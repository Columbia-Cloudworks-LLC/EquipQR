import { describe, expect, it } from 'vitest';
import { resolveWorkOrderAcceptanceAssigneeGate } from './workOrderAcceptanceAssigneeScope';

describe('resolveWorkOrderAcceptanceAssigneeGate', () => {
  it('blocks submit and scoped lists while team membership is loading', () => {
    expect(
      resolveWorkOrderAcceptanceAssigneeGate({
        teamsReady: false,
        equipmentId: 'eq-1',
        isSuccess: false,
        isPending: true,
        isError: false,
      }),
    ).toEqual({ showScopedAssigneeList: false, canSubmit: false });
  });

  it('allows scoped lists with no equipment id once teams are ready', () => {
    expect(
      resolveWorkOrderAcceptanceAssigneeGate({
        teamsReady: true,
        equipmentId: undefined,
        isSuccess: false,
        isPending: true,
        isError: false,
      }),
    ).toEqual({ showScopedAssigneeList: true, canSubmit: true });
  });

  it('blocks submit while the equipment query is pending', () => {
    expect(
      resolveWorkOrderAcceptanceAssigneeGate({
        teamsReady: true,
        equipmentId: 'eq-1',
        isSuccess: false,
        isPending: true,
        isError: false,
      }),
    ).toEqual({ showScopedAssigneeList: false, canSubmit: false });
  });

  it('allows scoped lists after a successful equipment fetch', () => {
    expect(
      resolveWorkOrderAcceptanceAssigneeGate({
        teamsReady: true,
        equipmentId: 'eq-1',
        isSuccess: true,
        isPending: false,
        isError: false,
      }),
    ).toEqual({ showScopedAssigneeList: true, canSubmit: true });
  });

  it('allows submit with the safe subset when equipment fetch errors', () => {
    expect(
      resolveWorkOrderAcceptanceAssigneeGate({
        teamsReady: true,
        equipmentId: 'eq-1',
        isSuccess: false,
        isPending: false,
        isError: true,
      }),
    ).toEqual({ showScopedAssigneeList: false, canSubmit: true });
  });
});
