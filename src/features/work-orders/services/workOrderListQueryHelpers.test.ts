import { describe, it, expect } from 'vitest';
import {
  buildWorkOrderListSelect,
  requiresContractEquipmentInnerJoin,
  requiresEquipmentInnerJoin,
  resolveWorkOrderTeamScope,
  withWorkOrderEquipmentInnerJoin,
} from './workOrderListQueryHelpers';
import { WORK_ORDER_LIST_SELECT } from './workOrderRowMapper';
import { parseWorkOrderListContract } from '@/features/work-orders/utils/workOrderListContract';
import { parseInput } from '@/features/work-orders/utils/workOrderListContract.fixtures';

describe('workOrderListQueryHelpers', () => {
  it('keeps the default list select when no team scope is required', () => {
    expect(buildWorkOrderListSelect(false)).toBe(WORK_ORDER_LIST_SELECT);
    expect(requiresEquipmentInnerJoin({})).toBe(false);
  });

  it('uses an inner equipment join when team scope is required', () => {
    const select = buildWorkOrderListSelect(true);

    expect(select).toContain('equipment!work_orders_equipment_id_fkey!inner');
    expect(requiresEquipmentInnerJoin({ userTeams: ['team-1'] })).toBe(true);
    expect(requiresEquipmentInnerJoin({ teamFilter: 'team-1' })).toBe(true);
    expect(withWorkOrderEquipmentInnerJoin(WORK_ORDER_LIST_SELECT)).toBe(select);
  });

  it('inner-joins equipment for contract access, TopBar team, or unassigned', () => {
    const base = parseWorkOrderListContract(parseInput());
    expect(requiresContractEquipmentInnerJoin(base)).toBe(false);
    expect(
      requiresContractEquipmentInnerJoin({ ...base, access: { kind: 'teams', teamIds: ['t1'] } }),
    ).toBe(true);
    expect(
      requiresContractEquipmentInnerJoin({ ...base, team: { kind: 'team', teamId: 't1' } }),
    ).toBe(true);
    expect(
      requiresContractEquipmentInnerJoin({ ...base, assignee: { kind: 'unassigned' } }),
    ).toBe(true);
    expect(requiresContractEquipmentInnerJoin({ ...base, search: 'pump' })).toBe(false);
  });

  it('resolves team scope from filters', () => {
    expect(resolveWorkOrderTeamScope({ userTeamIds: [], isOrgAdmin: false })).toEqual({
      userTeams: [],
    });
    expect(
      resolveWorkOrderTeamScope({ userTeamIds: ['team-1'], isOrgAdmin: false }),
    ).toEqual({
      userTeams: ['team-1'],
    });
    expect(resolveWorkOrderTeamScope({ teamId: 'team-2', isOrgAdmin: true })).toEqual({
      teamFilter: 'team-2',
    });
    expect(
      resolveWorkOrderTeamScope({
        userTeamIds: ['team-1', 'team-2'],
        isOrgAdmin: false,
        teamId: 'team-1',
      }),
    ).toEqual({
      userTeams: ['team-1', 'team-2'],
      teamFilter: 'team-1',
    });
  });
});
