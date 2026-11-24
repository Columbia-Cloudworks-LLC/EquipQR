import { useCallback, useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import type { TeamWithMembers } from '@/features/teams/types/team';
import { offlineSavedKeys, useSavedCopy } from '@/features/offline-queue/utils/offlineSavedData';
import type { TeamLookup } from '@/features/offline-queue/utils/queuedEquipment';
import type { OfflineQueueItem } from '@/services/offlineQueueService';

const NO_ITEMS: readonly OfflineQueueItem[] = [];

/** Items waiting in the offline queue (empty outside the dashboard). */
export function useQueuedItems(): readonly OfflineQueueItem[] {
  return useOfflineQueueOptional()?.queuedItems ?? NO_ITEMS;
}

/**
 * Team names by id, from the teams saved on this device plus teams created
 * offline. A queued equipment change only carries the team's id.
 */
export function useQueuedTeamLookup(): TeamLookup {
  // Read without requiring the provider: equipment hooks also run on pages
  // that have no organization context (the QR scan page), where nothing is queued.
  const organizationId = useSimpleOrganizationSafe()?.currentOrganization?.id;
  const queuedItems = useQueuedItems();
  const savedTeams = useSavedCopy<TeamWithMembers[]>(
    organizationId ? offlineSavedKeys.teamList(organizationId) : undefined,
  );

  const teams = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    for (const team of savedTeams ?? []) byId.set(team.id, { id: team.id, name: team.name });
    for (const item of queuedItems) {
      if (item.type === 'team_create') {
        byId.set(item.payload.team.id, { id: item.payload.team.id, name: item.payload.team.name });
      }
    }
    return byId;
  }, [savedTeams, queuedItems]);

  return useCallback((teamId: string) => teams.get(teamId), [teams]);
}

