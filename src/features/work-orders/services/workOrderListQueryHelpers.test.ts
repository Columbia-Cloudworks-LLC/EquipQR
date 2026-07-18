import { describe, it, expect } from 'vitest';
import {
  buildWorkOrderListSelect,
  requiresEquipmentInnerJoin,
  resolveWorkOrderTeamScope,
} from './workOrderListQueryHelpers';
import { WORK_ORDER_LIST_SELECT } from './workOrderRowMapper';

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
