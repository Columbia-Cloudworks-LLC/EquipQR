import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { equipment as equipmentKeys, queryKeys } from '@/lib/queryKeys';
import { teamAccessQueryScope } from '@/features/teams/utils/teamAccessScope';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { OFFLINE_CACHE_VERSION } from '@/lib/queryPersistence';
import { logger } from '@/utils/logger';

/** How often the saved copy is refreshed while the app is in use and connected. */
export const OFFLINE_EQUIPMENT_DOWNLOAD_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Wait for the screen the user asked for to load before starting the download. */
const DOWNLOAD_START_DELAY_MS = 4000;

interface DownloadScope {
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

// The app version is part of the key: a new deploy discards the saved copy
// (see queryPersistence), so the download must run again straight away.
const lastDownloadKey = (userId: string, organizationId: string, scope: string) =>
  `equipqr_offline_equipment_download_${OFFLINE_CACHE_VERSION}_${userId}_${organizationId}_${scope}`;

const teamScopeKey = (userId: string, organizationId: string) =>
  `equipqr_offline_team_scope_${userId}_${organizationId}`;

/**
 * The session only holds team memberships for the organization that is open.
 * Remember them per organization so a QR code for another organization can
 * still find that organization's saved equipment with no signal.
 */
function rememberTeamIds(userId: string, organizationId: string, teamIds: string[]): void {
  try {
    localStorage.setItem(teamScopeKey(userId, organizationId), JSON.stringify(teamIds));
  } catch {
    // Without storage only the open organization works offline.
  }
}

/** Team ids last seen for this user in this organization, or null if never saved. */
export function readRememberedTeamIds(userId: string, organizationId: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(teamScopeKey(userId, organizationId)) ?? 'null');
    return Array.isArray(parsed) && parsed.every((id): id is string => typeof id === 'string')
      ? parsed
      : null;
  } catch {
    return null;
  }
}

const LAST_DOWNLOAD_KEY_PREFIX = 'equipqr_offline_equipment_download_';

/** Drop markers left by other app versions so they do not pile up. */
function removeOtherVersionMarkers(): void {
  try {
    const current = `${LAST_DOWNLOAD_KEY_PREFIX}${OFFLINE_CACHE_VERSION}_`;
    const stale: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(LAST_DOWNLOAD_KEY_PREFIX) && !key.startsWith(current)) stale.push(key);
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable: nothing to tidy.
  }
}

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
  // Team ids arrive as a new array on every render; key the effect on their
  // content. Their order is kept: it is part of the equipment list's cache key.
  const teamIdsKey = options.userTeamIds ? options.userTeamIds.join(',') : null;

  useEffect(() => {
    if (!enabled || !userId || !organizationId) return;

    const userTeamIds = teamIdsKey === null ? undefined : teamIdsKey.split(',').filter(Boolean);
    if (!isOrgAdmin && userTeamIds) rememberTeamIds(userId, organizationId, userTeamIds);
    if (!isOnline) return;
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
            removeOtherVersionMarkers();
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
