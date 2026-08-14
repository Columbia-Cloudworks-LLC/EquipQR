import { describe, expect, it } from 'vitest';
import { isWorkOrderAcceptanceAssigneeScopeReady } from './workOrderAcceptanceAssigneeScope';

describe('isWorkOrderAcceptanceAssigneeScopeReady', () => {
  it('is not ready while team membership is loading', () => {
    expect(
      isWorkOrderAcceptanceAssigneeScopeReady({
        teamsReady: false,
        equipmentId: 'eq-1',
        isSuccess: false,
        isPending: true,
      }),
    ).toBe(false);
  });

  it('is ready with no equipment id once teams are ready', () => {
    expect(
      isWorkOrderAcceptanceAssigneeScopeReady({
        teamsReady: true,
        equipmentId: undefined,
        isSuccess: false,
        isPending: true,
      }),
    ).toBe(true);
  });

  it('is not ready while the equipment query is pending', () => {
    expect(
      isWorkOrderAcceptanceAssigneeScopeReady({
        teamsReady: true,
        equipmentId: 'eq-1',
        isSuccess: false,
        isPending: true,
      }),
    ).toBe(false);
  });

  it('is ready after a successful equipment fetch', () => {
    expect(
      isWorkOrderAcceptanceAssigneeScopeReady({
        teamsReady: true,
        equipmentId: 'eq-1',
        isSuccess: true,
        isPending: false,
      }),
    ).toBe(true);
  });
});
