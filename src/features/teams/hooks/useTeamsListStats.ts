import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { teams as teamsKeys } from '@/lib/queryKeys';

export interface TeamListStats {
  equipmentCount: number;
  activeWOs: number;
  overdueWOs: number;
}

const ACTIVE_WO_STATUSES = ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold'];

/**
 * Batch-fetches lightweight stats (equipment count, active WOs, overdue WOs)
 * for all teams visible on the list page. Uses two queries total instead of
 * per-team fetching.
 */
export function useTeamsListStats(
  organizationId: string | undefined,
  teamIds: string[]
) {
  const sortedIds = useMemo(() => [...teamIds].sort(), [teamIds]);

  return useQuery({
    queryKey: [...teamsKeys(organizationId || '').listStats(), sortedIds],
    queryFn: async (): Promise<Record<string, TeamListStats>> => {
      if (!organizationId || sortedIds.length === 0) return {};

      const { data: equipmentRows, error: eqError } = await supabase
        .from('equipment')
        .select('id, team_id')
        .eq('organization_id', organizationId)
        .in('team_id', sortedIds);

      if (eqError) throw eqError;

      const result: Record<string, TeamListStats> = {};
      for (const tid of teamIds) {
        result[tid] = { equipmentCount: 0, activeWOs: 0, overdueWOs: 0 };
      }

      const eqIdToTeam = new Map<string, string>();
      for (const eq of equipmentRows || []) {
        if (!eq.team_id) continue;
        result[eq.team_id].equipmentCount++;
        eqIdToTeam.set(eq.id, eq.team_id);
      }

      const equipmentIds = Array.from(eqIdToTeam.keys());
      if (equipmentIds.length === 0) return result;

      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('equipment_id, status, due_date')
        .eq('organization_id', organizationId)
        .in('equipment_id', equipmentIds);

      if (woError) throw woError;

      const now = new Date();
      for (const wo of workOrders || []) {
        const teamId = eqIdToTeam.get(wo.equipment_id);
        if (!teamId || !result[teamId]) continue;

        if (ACTIVE_WO_STATUSES.includes(wo.status)) {
          result[teamId].activeWOs++;
        }
        if (
          wo.due_date &&
          new Date(wo.due_date) < now &&
          !['completed', 'cancelled'].includes(wo.status)
        ) {
          result[teamId].overdueWOs++;
        }
      }

      return result;
    },
    enabled: !!organizationId && sortedIds.length > 0,
    staleTime: 60 * 1000,
  });
}
