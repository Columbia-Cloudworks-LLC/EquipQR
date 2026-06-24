import { supabase } from '@/integrations/supabase/client';
import { UNASSIGNED_TEAM_ID, type SelectedTeamId } from '@/contexts/selected-team-context';
import { logger } from '@/utils/logger';

/** How dashboard queries should constrain equipment rows. */
export type DashboardEquipmentIdScope =
  | { type: 'unrestricted' }
  | { type: 'ids'; ids: string[] }
  | { type: 'none' };

export function isAllTeamsScope(selectedTeamId: SelectedTeamId | undefined): boolean {
  return selectedTeamId === null || selectedTeamId === undefined;
}

export function selectedTeamIdToRpcParams(selectedTeamId: SelectedTeamId | undefined): {
  p_team_id: string | null;
  p_unassigned: boolean;
} {
  if (selectedTeamId === UNASSIGNED_TEAM_ID) {
    return { p_team_id: null, p_unassigned: true };
  }
  if (selectedTeamId) {
    return { p_team_id: selectedTeamId, p_unassigned: false };
  }
  return { p_team_id: null, p_unassigned: false };
}

type EquipmentQueryLike = {
  eq: (column: string, value: string) => EquipmentQueryLike;
  is: (column: string, value: null) => EquipmentQueryLike;
  in: (column: string, values: string[]) => EquipmentQueryLike;
};

/**
 * Applies TopBar team scope to an equipment query already scoped to organization_id.
 * Does not apply RBAC — callers combine with userTeamIds / accessible ids as today.
 */
export function applySelectedTeamFilter<T extends EquipmentQueryLike>(
  query: T,
  selectedTeamId: SelectedTeamId | undefined,
): T {
  if (isAllTeamsScope(selectedTeamId)) {
    return query;
  }
  if (selectedTeamId === UNASSIGNED_TEAM_ID) {
    return query.is('team_id', null) as T;
  }
  return query.eq('team_id', selectedTeamId!) as T;
}

/**
 * Resolves equipment ids for work-order / PM / cost widgets when a team filter is active,
 * or when non-admins need RBAC-scoped ids. Returns `unrestricted` for org admins with All teams.
 */
export async function resolveDashboardEquipmentIdScope(
  organizationId: string,
  selectedTeamId: SelectedTeamId | undefined,
  userTeamIds: string[],
  isOrgAdmin: boolean,
): Promise<DashboardEquipmentIdScope> {
  if (isAllTeamsScope(selectedTeamId)) {
    if (isOrgAdmin) {
      return { type: 'unrestricted' };
    }
    if (userTeamIds.length === 0) {
      return { type: 'none' };
    }
    const query = supabase
      .from('equipment')
      .select('id')
      .eq('organization_id', organizationId)
      .in('team_id', userTeamIds);
    const { data, error } = await query;
    if (error) {
      logger.error('resolveDashboardEquipmentIdScope: RBAC equipment fetch failed', error);
      throw error;
    }
    const ids = (data ?? []).map((row) => row.id);
    return ids.length > 0 ? { type: 'ids', ids } : { type: 'none' };
  }

  if (!isOrgAdmin && selectedTeamId !== UNASSIGNED_TEAM_ID && !userTeamIds.includes(selectedTeamId!)) {
    return { type: 'none' };
  }

  let query = applySelectedTeamFilter(
    supabase.from('equipment').select('id').eq('organization_id', organizationId),
    selectedTeamId,
  );

  if (!isOrgAdmin) {
    if (selectedTeamId === UNASSIGNED_TEAM_ID) {
      return { type: 'none' };
    }
    query = query.in('team_id', userTeamIds);
  }

  const { data, error } = await query;
  if (error) {
    logger.error('resolveDashboardEquipmentIdScope: scoped equipment fetch failed', error);
    throw error;
  }
  const ids = (data ?? []).map((row) => row.id);
  return ids.length > 0 ? { type: 'ids', ids } : { type: 'none' };
}
