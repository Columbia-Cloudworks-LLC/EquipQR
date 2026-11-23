/**
 * Background download of work orders and inventory for offline use. Called
 * together with the equipment download (useOfflineEquipmentDownload).
 *
 * Everything is fetched through the same services the screens use, with the
 * signed-in user's own access (RLS and the team scope), and written to the
 * query cache; the offline read cache then saves it per user and
 * organization. Nothing here reaches data the user could not open online.
 */
import type { QueryClient } from '@tanstack/react-query';
import { getFilteredList } from '@/features/work-orders/services/workOrderListService';
import { WorkOrderService } from '@/features/work-orders/services/workOrderService';
import { DEFAULT_WORK_ORDER_FILTERS } from '@/features/work-orders/hooks/workOrderFilterUtils';
import {
  parseWorkOrderListContract,
  type TeamBasedWorkOrder,
} from '@/features/work-orders/utils/workOrderListContract';
import { MAX_LIST_PAGE_SIZE } from '@/features/work-orders/utils/workOrderListPagination';
import { workOrders as workOrderKeys, inventory as inventoryKeys, queryKeys } from '@/lib/queryKeys';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { supabase } from '@/integrations/supabase/client';
import {
  getInventoryItems,
  getInventoryListMetadata,
} from '@/features/inventory/services/inventoryService';
import { isUserPartsManager } from '@/features/inventory/services/partsManagersService';
import { isUserPartsConsumer } from '@/features/inventory/services/partsConsumersService';
import { partsRoles } from '@/lib/queryKeys/misc';
import { teamAccessQueryScope } from '@/features/teams/utils/teamAccessScope';
import { offlineSavedKeys } from '@/features/offline-queue/utils/offlineSavedData';
import { logger } from '@/utils/logger';

export interface OfflineDownloadScope {
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

/** Newest work orders kept for the offline list. */
export const OFFLINE_WORK_ORDER_LIST_LIMIT = 1000;

/**
 * Open work orders whose full record (and PM checklist) is saved so they can
 * be opened and worked on offline. Closed ones stay in the list only.
 */
export const OFFLINE_WORK_ORDER_DETAIL_LIMIT = 150;

const DETAIL_REQUESTS_AT_ONCE = 6;

const CLOSED_STATUSES: ReadonlySet<string> = new Set(['completed', 'cancelled']);

/**
 * The PM checklist of a work order, or null when it has none yet. The
 * screens' own fetch answers null for a failed request as well; here a
 * failure must be told apart from "no checklist", or the download would be
 * marked complete with the checklist missing. A failed request throws.
 */
async function fetchPMChecklist(
  workOrderId: string,
  equipmentId: string,
  organizationId: string,
): Promise<PreventativeMaintenance | null> {
  const { data, error } = await supabase
    .from('preventative_maintenance')
    .select('*')
    .eq('work_order_id', workOrderId)
    .eq('equipment_id', equipmentId)
    .eq('organization_id', organizationId)
    .limit(1);
  if (error) throw new Error(error.message);
  return data[0] ?? null;
}

/** Runs `task` over `items`, a few at a time, so a weak connection is not flooded. */
async function inBatches<T>(items: readonly T[], size: number, task: (item: T) => Promise<void>): Promise<void> {
  for (let start = 0; start < items.length; start += size) {
    await Promise.all(items.slice(start, start + size).map(task));
  }
}

/**
 * Saves the work order list, plus the full record and PM checklist of each
 * open work order. Returns false when the list could not be fetched or the
 * results are no longer wanted.
 */
export async function downloadWorkOrdersForOffline(
  queryClient: QueryClient,
  organizationId: string,
  userId: string,
  scope: OfflineDownloadScope,
  isStillWanted: () => boolean = () => true,
): Promise<boolean> {
  const isOrgAdmin = scope.isOrgAdmin === true;
  const userTeamIds = scope.userTeamIds ?? [];
  const contract = parseWorkOrderListContract({
    organizationId,
    filters: DEFAULT_WORK_ORDER_FILTERS,
    selectedTeamId: null,
    currentUserId: userId,
    isOrgAdmin,
    userTeamIds,
  });

  const rows: TeamBasedWorkOrder[] = [];
  try {
    for (let page = 1; rows.length < OFFLINE_WORK_ORDER_LIST_LIMIT; page += 1) {
      const result = await getFilteredList(contract, {
        page,
        pageSize: MAX_LIST_PAGE_SIZE,
        sortField: 'created',
        sortDirection: 'desc',
      });
      rows.push(...result.data);
      if (result.data.length < MAX_LIST_PAGE_SIZE || rows.length >= result.count) break;
    }
  } catch (error) {
    logger.error('Failed to save work orders for offline use', error);
    return false;
  }

  if (!isStillWanted()) return false;

  const teamScope = teamAccessQueryScope(isOrgAdmin, scope.userTeamIds);
  queryClient.setQueryData(
    offlineSavedKeys.workOrderList(organizationId, teamScope),
    rows.slice(0, OFFLINE_WORK_ORDER_LIST_LIMIT),
  );

  const open = rows
    .filter((row) => !CLOSED_STATUSES.has(row.status))
    .slice(0, OFFLINE_WORK_ORDER_DETAIL_LIMIT);
  const service = new WorkOrderService(organizationId);
  let allDetailsSaved = true;

  await inBatches(open, DETAIL_REQUESTS_AT_ONCE, async (row) => {
    try {
      const [detail, pm] = await Promise.all([
        service.getById(row.id, { userTeamIds: scope.userTeamIds, isOrgAdmin }),
        row.has_pm && row.equipment_id
          ? fetchPMChecklist(row.id, row.equipment_id, organizationId)
          : Promise.resolve(null),
      ]);
      if (!isStillWanted()) return;
      if (detail.success && detail.data) {
        queryClient.setQueryData(
          workOrderKeys.detailScoped(organizationId, row.id, teamScope),
          detail.data,
        );
      } else {
        allDetailsSaved = false;
      }
      if (pm && row.equipment_id) {
        queryClient.setQueryData(
          queryKeys.preventiveMaintenance.byWorkOrderAndEquipment(row.id, row.equipment_id, organizationId),
          pm,
        );
      }
    } catch (error) {
      allDetailsSaved = false;
      logger.error('Failed to save a work order for offline use', error);
    }
  });

  return allDetailsSaved && isStillWanted();
}

/**
 * Saves every inventory item (the list and each item's own record) and the
 * list's summary counts, for users who can open inventory. Also saves the
 * user's own parts-role answers the inventory screens check first, so the
 * screens open offline for a Parts Manager or Parts Consumer. Users without
 * inventory access have nothing to save and count as done.
 * Returns false when it could not be fetched.
 */
export async function downloadInventoryForOffline(
  queryClient: QueryClient,
  organizationId: string,
  userId: string,
  scope: OfflineDownloadScope,
  isStillWanted: () => boolean = () => true,
): Promise<boolean> {
  try {
    const [isManager, isConsumer] = await Promise.all([
      isUserPartsManager(organizationId, userId),
      isUserPartsConsumer(organizationId, userId),
    ]);
    if (!isStillWanted()) return false;
    queryClient.setQueryData(partsRoles.isManager(organizationId, userId), isManager);
    queryClient.setQueryData(partsRoles.isConsumer(organizationId, userId), isConsumer);

    if (!scope.isOrgAdmin && !isManager && !isConsumer) return true;

    const [items, metadata] = await Promise.all([
      getInventoryItems(organizationId, {}),
      getInventoryListMetadata(organizationId),
    ]);
    if (!isStillWanted()) return false;

    queryClient.setQueryData(offlineSavedKeys.inventoryList(organizationId), items);
    queryClient.setQueryData(inventoryKeys.metadata(organizationId), metadata);
    for (const item of items) {
      queryClient.setQueryData(['inventory-item', organizationId, item.id], item);
    }
    return true;
  } catch (error) {
    logger.error('Failed to save inventory for offline use', error);
    return false;
  }
}
