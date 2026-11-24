import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  getFilteredList: vi.fn(),
  getById: vi.fn(),
  getPM: vi.fn(),
  getInventoryItems: vi.fn(),
  getInventoryListMetadata: vi.fn(),
  isManager: vi.fn(),
  isConsumer: vi.fn(),
  getTeamsByOrgStrict: vi.fn(),
  getCostsByWorkOrder: vi.fn(),
  fetchOrgAdmins: vi.fn(),
}));

vi.mock('@/features/teams/services/repositories/TeamRepository', () => ({
  default: { getTeamsByOrgStrict: mocks.getTeamsByOrgStrict },
}));

vi.mock('@/features/work-orders/services/workOrderAssigneeService', () => ({
  fetchOrgAdminAssignees: mocks.fetchOrgAdmins,
}));

vi.mock('@/features/work-orders/services/workOrderListService', () => ({
  getFilteredList: mocks.getFilteredList,
}));

vi.mock('@/features/work-orders/services/workOrderService', () => ({
  WorkOrderService: class {
    getById(...args: unknown[]) {
      return mocks.getById(...args);
    }
  },
}));

// The checklist is read directly so a failed request is not mistaken for
// "no checklist". `getPM` receives the work order id and returns { data, error }.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const filters: Record<string, string> = {};
      const chain = {
        select: () => chain,
        eq: (column: string, value: string) => {
          filters[column] = value;
          return chain;
        },
        limit: () => mocks.getPM(filters.work_order_id),
      };
      return chain;
    },
  },
}));

vi.mock('@/features/work-orders/services/workOrderCostsService', () => ({
  getWorkOrderCostsByWorkOrder: mocks.getCostsByWorkOrder,
}));

vi.mock('@/features/inventory/services/inventoryService', () => ({
  getInventoryItems: mocks.getInventoryItems,
  getInventoryListMetadata: mocks.getInventoryListMetadata,
}));

vi.mock('@/features/inventory/services/partsManagersService', () => ({
  isUserPartsManager: mocks.isManager,
}));

vi.mock('@/features/inventory/services/partsConsumersService', () => ({
  isUserPartsConsumer: mocks.isConsumer,
}));

import {
  downloadInventoryForOffline,
  downloadTeamsForOffline,
  downloadWorkOrdersForOffline,
} from './offlineWorkDataDownload';
import { offlineSavedKeys } from '@/features/offline-queue/utils/offlineSavedData';
import { workOrders as workOrderKeys, inventory as inventoryKeys, queryKeys } from '@/lib/queryKeys';
import { partsRoles } from '@/lib/queryKeys/misc';

const ORG_ID = 'org-1';
const USER_ID = 'user-1';

const listRow = (id: string, status: string, hasPm = false) => ({
  id,
  status,
  has_pm: hasPm,
  equipment_id: `eq-for-${id}`,
  title: `Work order ${id}`,
});

describe('downloadWorkOrdersForOffline', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getById.mockImplementation((id: string) =>
      Promise.resolve({ success: true, data: { id, title: `Full record ${id}` } }),
    );
    mocks.getPM.mockImplementation((workOrderId: string) =>
      Promise.resolve({ data: [{ id: `pm-${workOrderId}` }], error: null }),
    );
    mocks.getCostsByWorkOrder.mockImplementation((ids: string[]) =>
      Promise.resolve(new Map(ids.map((id) => [id, id === 'wo-open' ? [{ id: 'cost-1', work_order_id: id }] : []]))),
    );
  });

  it('saves the costs of each open work order, including "none", so the cost list opens offline', async () => {
    mocks.getFilteredList.mockResolvedValue({
      data: [listRow('wo-open', 'in_progress'), listRow('wo-plain', 'submitted'), listRow('wo-done', 'completed')],
      count: 3,
    });

    expect(await downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true })).toBe(true);

    expect(mocks.getCostsByWorkOrder).toHaveBeenCalledWith(['wo-open', 'wo-plain']);
    expect(queryClient.getQueryData(['work-order-costs', 'wo-open'])).toEqual([{ id: 'cost-1', work_order_id: 'wo-open' }]);
    expect(queryClient.getQueryData(['work-order-costs', 'wo-plain'])).toEqual([]);
    expect(queryClient.getQueryData(['work-order-costs', 'wo-done'])).toBeUndefined();
  });

  it('reports failure when the costs could not be fetched, so it is tried again', async () => {
    mocks.getFilteredList.mockResolvedValue({ data: [listRow('wo-open', 'in_progress')], count: 1 });
    mocks.getCostsByWorkOrder.mockRejectedValue(new Error('Failed to fetch'));

    expect(await downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true })).toBe(false);
    expect(queryClient.getQueryData(['work-order-costs', 'wo-open'])).toBeUndefined();
  });

  it('saves the list, and the full record and checklist of each open work order', async () => {
    mocks.getFilteredList.mockResolvedValue({
      data: [listRow('wo-open', 'in_progress', true), listRow('wo-plain', 'submitted'), listRow('wo-done', 'completed', true)],
      count: 3,
    });

    const complete = await downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, {
      userTeamIds: ['team-b', 'team-a'],
      isOrgAdmin: false,
    });

    expect(complete).toBe(true);
    // Asked for with the user's own team access, not the whole organization.
    expect(mocks.getFilteredList.mock.calls[0][0]).toMatchObject({
      organizationId: ORG_ID,
      access: { kind: 'teams', teamIds: ['team-b', 'team-a'] },
    });
    expect(queryClient.getQueryData(offlineSavedKeys.workOrderList(ORG_ID, 'team-a,team-b'))).toHaveLength(3);
    // Same key the work order page reads.
    expect(
      queryClient.getQueryData(workOrderKeys.detailScoped(ORG_ID, 'wo-open', 'team-a,team-b')),
    ).toEqual({ id: 'wo-open', title: 'Full record wo-open' });
    expect(
      queryClient.getQueryData(
        queryKeys.preventiveMaintenance.byWorkOrderAndEquipment('wo-open', 'eq-for-wo-open', ORG_ID),
      ),
    ).toEqual({ id: 'pm-wo-open' });
    // Closed work orders stay in the list only.
    expect(mocks.getById).toHaveBeenCalledTimes(2);
    expect(mocks.getPM).toHaveBeenCalledTimes(1);
  });

  it('fetches every page of a long list', async () => {
    const fullPage = Array.from({ length: 200 }, (_, index) => listRow(`wo-${index}`, 'completed'));
    mocks.getFilteredList
      .mockResolvedValueOnce({ data: fullPage, count: 201 })
      .mockResolvedValueOnce({ data: [listRow('wo-last', 'completed')], count: 201 });

    await downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true });

    expect(mocks.getFilteredList).toHaveBeenCalledTimes(2);
    expect(mocks.getFilteredList.mock.calls[1][1]).toMatchObject({ page: 2 });
    expect(queryClient.getQueryData(offlineSavedKeys.workOrderList(ORG_ID, 'org-admin'))).toHaveLength(201);
  });

  it('reports failure when the list cannot be fetched, so it is tried again', async () => {
    mocks.getFilteredList.mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true }),
    ).resolves.toBe(false);
  });

  it('reports failure when an open work order could not be saved', async () => {
    mocks.getFilteredList.mockResolvedValue({ data: [listRow('wo-open', 'assigned')], count: 1 });
    mocks.getById.mockResolvedValue({ success: false, error: 'Failed to fetch' });

    await expect(
      downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true }),
    ).resolves.toBe(false);
  });

  it('reports failure when a checklist could not be read, instead of treating it as no checklist', async () => {
    mocks.getFilteredList.mockResolvedValue({ data: [listRow('wo-open', 'assigned', true)], count: 1 });
    mocks.getPM.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch' } });

    await expect(
      downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true }),
    ).resolves.toBe(false);
  });

  it('is complete when a PM work order simply has no checklist yet', async () => {
    mocks.getFilteredList.mockResolvedValue({ data: [listRow('wo-open', 'assigned', true)], count: 1 });
    mocks.getPM.mockResolvedValue({ data: [], error: null });

    await expect(
      downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true }),
    ).resolves.toBe(true);
  });

  it('saves nothing once the user has moved to another organization', async () => {
    mocks.getFilteredList.mockResolvedValue({ data: [listRow('wo-open', 'assigned')], count: 1 });

    const complete = await downloadWorkOrdersForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true }, () => false);

    expect(complete).toBe(false);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('downloadInventoryForOffline', () => {
  let queryClient: QueryClient;
  const items = [
    { id: 'item-1', name: 'Air filter' },
    { id: 'item-2', name: 'Oil filter' },
  ];

  beforeEach(() => {
    queryClient = new QueryClient();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getInventoryItems.mockResolvedValue(items);
    mocks.getInventoryListMetadata.mockResolvedValue({ totalCount: 2 });
    mocks.isManager.mockResolvedValue(false);
    mocks.isConsumer.mockResolvedValue(false);
  });

  it('saves the list, each item and the access answers for a parts consumer', async () => {
    mocks.isConsumer.mockResolvedValue(true);

    const complete = await downloadInventoryForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: false });

    expect(complete).toBe(true);
    expect(queryClient.getQueryData(offlineSavedKeys.inventoryList(ORG_ID))).toEqual(items);
    expect(queryClient.getQueryData(['inventory-item', ORG_ID, 'item-2'])).toEqual(items[1]);
    expect(queryClient.getQueryData(inventoryKeys.metadata(ORG_ID))).toEqual({ totalCount: 2 });
    // The inventory screens check these before showing anything.
    expect(queryClient.getQueryData(partsRoles.isConsumer(ORG_ID, USER_ID))).toBe(true);
    expect(queryClient.getQueryData(partsRoles.isManager(ORG_ID, USER_ID))).toBe(false);
  });

  it('saves inventory for an admin without a parts role', async () => {
    await downloadInventoryForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true });

    expect(queryClient.getQueryData(offlineSavedKeys.inventoryList(ORG_ID))).toEqual(items);
  });

  it('counts as done without fetching inventory for a user who cannot open it', async () => {
    const complete = await downloadInventoryForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: false });

    expect(complete).toBe(true);
    expect(mocks.getInventoryItems).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(offlineSavedKeys.inventoryList(ORG_ID))).toBeUndefined();
  });

  it('reports failure when the connection drops, so it is tried again', async () => {
    mocks.isManager.mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      downloadInventoryForOffline(queryClient, ORG_ID, USER_ID, { isOrgAdmin: true }),
    ).resolves.toBe(false);
  });
});

describe('downloadTeamsForOffline', () => {
  let queryClient: QueryClient;
  const admins = [{ id: 'owner-1', name: 'Olive Owner', type: 'user', role: 'owner' }];
  const teams = [{ id: 'a', name: 'Team a', member_count: 1, members: [{ user_id: 'tech-1', role: 'technician' }] }];
  const savedTeams = () => queryClient.getQueryData(offlineSavedKeys.teamList(ORG_ID));

  beforeEach(() => {
    queryClient = new QueryClient();
    mocks.getTeamsByOrgStrict.mockReset().mockResolvedValue(teams);
    mocks.fetchOrgAdmins.mockReset().mockResolvedValue(admins);
  });

  it('saves the teams with their members, and the organization admins', async () => {
    expect(await downloadTeamsForOffline(queryClient, ORG_ID)).toBe(true);

    expect(savedTeams()).toEqual(teams);
    expect(queryClient.getQueryData(offlineSavedKeys.orgAdmins(ORG_ID))).toEqual(admins);
  });

  it('keeps the saved teams when they cannot be fetched', async () => {
    queryClient.setQueryData(offlineSavedKeys.teamList(ORG_ID), teams);
    mocks.getTeamsByOrgStrict.mockRejectedValue(new Error('Teams could not be loaded'));

    expect(await downloadTeamsForOffline(queryClient, ORG_ID)).toBe(false);
    expect(savedTeams()).toEqual(teams);
  });

  it('saves nothing once the user has moved to another organization', async () => {
    expect(await downloadTeamsForOffline(queryClient, ORG_ID, () => false)).toBe(false);
    expect(savedTeams()).toBeUndefined();
  });
});
