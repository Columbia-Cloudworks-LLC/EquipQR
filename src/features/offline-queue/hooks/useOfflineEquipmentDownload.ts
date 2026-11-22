import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { equipment as equipmentKeys, queryKeys } from '@/lib/queryKeys';
import { teamAccessQueryScope } from '@/features/teams/utils/teamAccessScope';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { logger } from '@/utils/logger';

/** How often the saved copy is refreshed while the app is in use and connected. */
export const OFFLINE_EQUIPMENT_DOWNLOAD_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Wait for the screen the user asked for to load before starting the download. */
const DOWNLOAD_START_DELAY_MS = 4000;

interface DownloadScope {
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

const lastDownloadKey = (userId: string, organizationId: string, scope: string) =>
  `equipqr_offline_equipment_download_${userId}_${organizationId}_${scope}`;

function downloadedRecently(key: string): boolean {
  try {
    const last = Number(localStorage.getItem(key));
    return Number.isFinite(last) && last > 0 && Date.now() - last < OFFLINE_EQUIPMENT_DOWNLOAD_INTERVAL_MS;
  } catch {
    return false;
  }
}

/**
 * Put everything a technician needs to work on any of their machines into
 * the query cache (the offline read cache then saves it to the device):
 * the equipment list, the full record of every machine they can see, and the
 * PM checklist templates. Returns false if any part could not be fetched.
 */
export async function downloadEquipmentForOffline(
  queryClient: QueryClient,
  organizationId: string,
  scope: DownloadScope,
): Promise<boolean> {
  const [summaries, records, templates] = await Promise.all([
    EquipmentService.getSummaries(organizationId, scope),
    EquipmentService.getAllFullRecords(organizationId, scope),
    pmChecklistTemplatesService.listTemplates(organizationId).catch(() => null),
  ]);

  if (summaries.success && summaries.data) {
    queryClient.setQueryData(
      ['equipment', organizationId, 'summaries', scope.userTeamIds, scope.isOrgAdmin],
      summaries.data,
    );
  }

  if (records.success && records.data) {
    const teamScope = teamAccessQueryScope(scope.isOrgAdmin, scope.userTeamIds);
    for (const record of records.data) {
      queryClient.setQueryData(
        equipmentKeys.byIdScoped(organizationId, record.id, teamScope),
        record,
      );
    }
  }

  if (templates) {
    queryClient.setQueryData(queryKeys.pmTemplates.list(organizationId), templates);
  }

  return Boolean(summaries.success && records.success && templates);
}

/**
 * While connected, keep a full copy of the user's equipment on the device so
 * any machine can be opened, scanned and worked on with no signal — not just
 * the ones whose record happened to be opened before. Runs at most once every
 * six hours per user, organization and team scope.
 */
export function useOfflineEquipmentDownload(
  userId: string | undefined,
  organizationId: string | undefined,
  options: DownloadScope & { enabled?: boolean } = {},
): void {
  const queryClient = useQueryClient();
  const isOnline = useBrowserOnline();
  const { isOrgAdmin, enabled = true } = options;
  // Team ids arrive as a new array on every render; key the effect on their content.
  const teamIdsKey = options.userTeamIds ? [...options.userTeamIds].sort().join(',') : null;

  useEffect(() => {
    if (!enabled || !isOnline || !userId || !organizationId) return;

    const userTeamIds = teamIdsKey === null ? undefined : teamIdsKey.split(',').filter(Boolean);
    const storageKey = lastDownloadKey(
      userId,
      organizationId,
      teamAccessQueryScope(isOrgAdmin, userTeamIds),
    );
    if (downloadedRecently(storageKey)) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      downloadEquipmentForOffline(queryClient, organizationId, { userTeamIds, isOrgAdmin })
        .then((complete) => {
          if (cancelled || !complete) return;
          try {
            localStorage.setItem(storageKey, String(Date.now()));
          } catch {
            // Without storage the download simply runs again next time.
          }
        })
        .catch((error) => logger.error('Failed to save equipment for offline use', error));
    }, DOWNLOAD_START_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, isOnline, userId, organizationId, isOrgAdmin, teamIdsKey, queryClient]);
}
