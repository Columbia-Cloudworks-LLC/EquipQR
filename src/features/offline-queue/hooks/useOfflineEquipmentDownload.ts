import { useEffect, useRef, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { equipment as equipmentKeys, queryKeys } from '@/lib/queryKeys';
import { teamAccessQueryScope } from '@/features/teams/utils/teamAccessScope';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { OFFLINE_CACHE_VERSION } from '@/lib/queryPersistence';
import { logger } from '@/utils/logger';
import type { QRActionTeamMembership } from '@/features/equipment/services/equipmentQRPermissions';
import { offlineSavedKeys } from '@/features/offline-queue/utils/offlineSavedData';
import {
  downloadInventoryForOffline,
  downloadTeamsForOffline,
  downloadWorkOrdersForOffline,
} from '@/features/offline-queue/services/offlineWorkDataDownload';

/** How often the saved copy is refreshed while the app is in use and connected. */
export const OFFLINE_EQUIPMENT_DOWNLOAD_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Wait for the screen the user asked for to load before starting the download. */
const DOWNLOAD_START_DELAY_MS = 4000;

interface DownloadScope {
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

const teamScopeKey = (userId: string, organizationId: string) =>
  `equipqr_offline_team_scope_${userId}_${organizationId}`;

// Every value of the database's team_member_role, typed so a new role cannot be missed silently.
const TEAM_ROLES: readonly string[] = [
  'owner',
  'manager',
  'technician',
  'requestor',
  'viewer',
] satisfies readonly QRActionTeamMembership['role'][];

function isTeamMembership(value: unknown): value is QRActionTeamMembership {
  if (!value || typeof value !== 'object') return false;
  const { teamId, role } = value as Partial<Record<keyof QRActionTeamMembership, unknown>>;
  return typeof teamId === 'string' && typeof role === 'string' && TEAM_ROLES.includes(role);
}

/**
 * Team memberships last seen for this user in this organization, or null if
 * never saved. They only decide what is shown from saved data with no
 * signal; the server checks every change again when it syncs.
 */
export function readRememberedTeamMemberships(
  userId: string,
  organizationId: string,
): QRActionTeamMembership[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(teamScopeKey(userId, organizationId)) ?? 'null');
    return Array.isArray(parsed) && parsed.every(isTeamMembership) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The session only holds team memberships for the organization that is open.
 * Remember them per organization so a QR code for another organization can
 * still find that organization's saved equipment, and allow the same
 * actions, with no signal. Pass `undefined` until the memberships are known
 * to belong to `organizationId`.
 */
export function useRememberTeamMemberships(
  userId: string | undefined,
  organizationId: string | undefined,
  memberships: readonly QRActionTeamMembership[] | undefined,
): void {
  const serialized = memberships
    ? JSON.stringify(memberships.map(({ teamId, role }) => ({ teamId, role })))
    : null;

  useEffect(() => {
    if (!userId || !organizationId || serialized === null) return;
    try {
      localStorage.setItem(teamScopeKey(userId, organizationId), serialized);
    } catch {
      // Without storage only the open organization works offline.
    }
  }, [userId, organizationId, serialized]);
}

/**
 * Marker for "the saved copy is up to date". The app version is part of the
 * key: a new deploy discards the saved copy (see queryPersistence), so the
 * download must run again straight away. The prefix changes whenever
 * more is added to the download (work orders and inventory, then teams), so
 * devices holding an older, smaller copy download the rest instead of
 * waiting out the interval.
 */
const LAST_DOWNLOAD_KEY_PREFIX = 'equipqr_offline_data_v2_download_';
const RETIRED_DOWNLOAD_KEY_PREFIXES = ['equipqr_offline_equipment_download_', 'equipqr_offline_data_download_'];

const lastDownloadKey = (userId: string, organizationId: string, scope: string) =>
  `${LAST_DOWNLOAD_KEY_PREFIX}${OFFLINE_CACHE_VERSION}_${userId}_${organizationId}_${scope}`;

/** Drop markers left by other app versions so they do not pile up. */
function removeOtherVersionMarkers(): void {
  try {
    const current = `${LAST_DOWNLOAD_KEY_PREFIX}${OFFLINE_CACHE_VERSION}_`;
    const stale: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const otherVersion = key.startsWith(LAST_DOWNLOAD_KEY_PREFIX) && !key.startsWith(current);
      if (otherVersion || RETIRED_DOWNLOAD_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) stale.push(key);
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable: nothing to tidy.
  }
}

/** When the saved copy for this user, organization and team scope was last completed, or null. */
export function readLastOfflineDownload(
  userId: string,
  organizationId: string,
  scope: DownloadScope,
): number | null {
  try {
    const key = lastDownloadKey(
      userId,
      organizationId,
      teamAccessQueryScope(scope.isOrgAdmin, scope.userTeamIds),
    );
    const last = Number(localStorage.getItem(key));
    return Number.isFinite(last) && last > 0 ? last : null;
  } catch {
    return null;
  }
}

const OFFLINE_DATA_REFRESH_EVENT = 'equipqr:offline-data-refresh';

/**
 * Ask for the saved copy to be downloaded again now instead of waiting out
 * the interval. Called after offline changes sync: the saved lists were
 * downloaded before those changes existed on the server, so without this a
 * record created offline would vanish the next time the signal drops.
 */
export function requestOfflineDataRefresh(userId: string, organizationId: string): void {
  try {
    const owned = `${LAST_DOWNLOAD_KEY_PREFIX}${OFFLINE_CACHE_VERSION}_${userId}_${organizationId}_`;
    const markers: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(owned)) markers.push(key);
    }
    markers.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Without storage there is no marker to clear; the download runs anyway.
  }
  window.dispatchEvent(new Event(OFFLINE_DATA_REFRESH_EVENT));
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
 *
 * `isStillWanted` is checked once the requests return. The read cache saves
 * to whichever organization is open at that moment, so results that arrive
 * after the user switched organization must be dropped, not saved under the
 * wrong one.
 */
export async function downloadEquipmentForOffline(
  queryClient: QueryClient,
  organizationId: string,
  scope: DownloadScope,
  isStillWanted: () => boolean = () => true,
): Promise<boolean> {
  const [summaries, records, templates, pickerSummaries] = await Promise.all([
    EquipmentService.getSummaries(organizationId, scope),
    EquipmentService.getAllFullRecords(organizationId, scope),
    pmChecklistTemplatesService.listTemplates(organizationId).catch(() => null),
    // The work order form and other pickers ask for the list without a team
    // scope, which is a different cache entry. For an admin it is the same
    // rows, so only other roles need the extra request.
    scope.isOrgAdmin ? null : EquipmentService.getSummaries(organizationId),
  ]);

  if (!isStillWanted()) return false;

  if (summaries.success && summaries.data) {
    queryClient.setQueryData(
      ['equipment', organizationId, 'summaries', scope.userTeamIds, scope.isOrgAdmin],
      summaries.data,
    );
  }

  const pickerRows = scope.isOrgAdmin ? summaries.data : pickerSummaries?.data;
  if (pickerRows) {
    queryClient.setQueryData(['equipment', organizationId, 'summaries', undefined, undefined], pickerRows);
  }

  if (records.success && records.data) {
    const teamScope = teamAccessQueryScope(scope.isOrgAdmin, scope.userTeamIds);
    // The whole list in one entry, for the Equipment screen with no signal.
    queryClient.setQueryData(offlineSavedKeys.equipmentList(organizationId, teamScope), records.data);
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

  return Boolean(summaries.success && records.success && templates && pickerRows);
}

/** Wait this long before trying again after a download that did not finish. */
const RETRY_DELAY_MS = 60 * 1000;
const MAX_RETRIES = 5;
/**
 * How often a screen that stays open looks at whether the saved copy is due
 * for a refresh. A short check instead of one six-hour timer, because phones
 * pause long timers while the app is in the background.
 */
const REFRESH_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * While connected, keep a full copy of what the user works from on the
 * device (equipment, PM templates, work orders, inventory) so any of it can
 * be opened and worked on with no signal, not just what happened to be
 * opened before. Runs at most once every six hours per user, organization
 * and team scope.
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
  const [retry, setRetry] = useState(0);
  const [refreshCheck, setRefreshCheck] = useState(0);
  // Whose data is on screen now, and whose download is in flight. A download
  // is only abandoned when the user or organization changes: a dropped
  // signal or a session refresh part-way through must not throw away what a
  // slow connection has already fetched.
  const wantedRef = useRef<string | null>(null);
  const runningRef = useRef<string | null>(null);
  const ownerRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      wantedRef.current = null;
    },
    [],
  );

  // Nothing else re-runs the download while the app simply stays open, so
  // look again on a timer and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!enabled || !userId || !organizationId) return;
    const check = () => setRefreshCheck((count) => count + 1);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const interval = setInterval(check, REFRESH_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(OFFLINE_DATA_REFRESH_EVENT, check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(OFFLINE_DATA_REFRESH_EVENT, check);
    };
  }, [enabled, userId, organizationId]);

  useEffect(() => {
    if (!userId || !organizationId) {
      wantedRef.current = null;
      return;
    }
    // A download for another user or organization is abandoned even when
    // downloading is switched off for the new one: its results would be
    // saved under the new organization and marked complete for the old one.
    const owner = `${userId}:${organizationId}`;
    if (ownerRef.current !== owner) {
      ownerRef.current = owner;
      wantedRef.current = null;
    }
    if (!enabled) return;

    const userTeamIds = teamIdsKey === null ? undefined : teamIdsKey.split(',').filter(Boolean);
    const storageKey = lastDownloadKey(
      userId,
      organizationId,
      teamAccessQueryScope(isOrgAdmin, userTeamIds),
    );
    wantedRef.current = storageKey;
    if (!isOnline || downloadedRecently(storageKey) || runningRef.current === storageKey) return;

    const isStillWanted = () => wantedRef.current === storageKey;
    const scope = { userTeamIds, isOrgAdmin };
    const timer = setTimeout(() => {
      runningRef.current = storageKey;
      Promise.all([
        downloadEquipmentForOffline(queryClient, organizationId, scope, isStillWanted),
        downloadWorkOrdersForOffline(queryClient, organizationId, userId, scope, isStillWanted),
        downloadInventoryForOffline(queryClient, organizationId, userId, scope, isStillWanted),
        downloadTeamsForOffline(queryClient, organizationId, isStillWanted),
      ])
        .then((results) => {
          if (!isStillWanted()) return;
          if (!results.every(Boolean)) {
            setTimeout(() => setRetry((count) => (count < MAX_RETRIES ? count + 1 : count)), RETRY_DELAY_MS);
            return;
          }
          try {
            removeOtherVersionMarkers();
            localStorage.setItem(storageKey, String(Date.now()));
          } catch {
            // Without storage the download simply runs again next time.
          }
        })
        .catch((error) => logger.error('Failed to save data for offline use', error))
        .finally(() => {
          if (runningRef.current === storageKey) runningRef.current = null;
        });
    }, DOWNLOAD_START_DELAY_MS);

    return () => clearTimeout(timer);
  }, [enabled, isOnline, userId, organizationId, isOrgAdmin, teamIdsKey, queryClient, retry, refreshCheck]);
}
