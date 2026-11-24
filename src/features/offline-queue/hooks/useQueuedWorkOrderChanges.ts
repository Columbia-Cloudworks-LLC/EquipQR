import { useCallback, useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { AssignmentOption } from '@/features/work-orders/hooks/useWorkOrderAssignment';
import type { TeamWithMembers } from '@/features/teams/types/team';
import { offlineSavedKeys, useSavedCopy } from '@/features/offline-queue/utils/offlineSavedData';
import {
  applyQueuedWorkOrderChanges,
  type AssigneeNameLookup,
} from '@/features/offline-queue/utils/queuedWorkOrderChanges';
import type { OfflineQueueItem } from '@/services/offlineQueueService';

const NO_ITEMS: readonly OfflineQueueItem[] = [];

/**
 * Names for assignee ids, from the people saved on this device (team members,
 * organization admins and the signed-in user). A queued assignment only
 * carries the id.
 */
export function useAssigneeNameLookup(): AssigneeNameLookup {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const organizationId = currentOrganization?.id;
  const teams = useSavedCopy<TeamWithMembers[]>(
    organizationId ? offlineSavedKeys.teamList(organizationId) : undefined,
  );
  const admins = useSavedCopy<AssignmentOption[]>(
    organizationId ? offlineSavedKeys.orgAdmins(organizationId) : undefined,
  );
  const ownName: string | undefined = user?.user_metadata?.full_name ?? undefined;
  const ownId = user?.id;

  const names = useMemo(() => {
    const byId = new Map<string, string>();
    for (const team of teams ?? []) {
      for (const member of team.members) {
        if (member.profiles?.name) byId.set(member.user_id, member.profiles.name);
      }
    }
    for (const admin of admins ?? []) byId.set(admin.id, admin.name);
    if (ownId && ownName) byId.set(ownId, ownName);
    return byId;
  }, [teams, admins, ownId, ownName]);

  return useCallback((userId: string) => names.get(userId), [names]);
}

/**
 * Applies queued offline changes to work orders about to be shown. The
 * returned function keeps a work order's identity when nothing is queued for it.
 */
export function useApplyQueuedWorkOrderChanges(): <T extends WorkOrder>(workOrder: T) => T {
  const offlineCtx = useOfflineQueueOptional();
  const assigneeNameFor = useAssigneeNameLookup();
  const queuedItems = offlineCtx?.queuedItems ?? NO_ITEMS;

  return useCallback(
    <T extends WorkOrder>(workOrder: T): T =>
      queuedItems.length === 0
        ? workOrder
        : applyQueuedWorkOrderChanges(workOrder, queuedItems, assigneeNameFor),
    [queuedItems, assigneeNameFor],
  );
}
