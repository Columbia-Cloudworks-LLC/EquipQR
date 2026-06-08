import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export type EquipmentIdResolution = string[] | 'empty';

/**
 * Resolves equipment IDs for the user's teams. Returns 'empty' when the user has
 * no team memberships or no equipment is assigned to their teams.
 */
export async function resolveEquipmentIdsForUserTeams(
  organizationId: string,
  userTeamIds: string[],
): Promise<EquipmentIdResolution> {
  if (userTeamIds.length === 0) {
    return 'empty';
  }

  const { data: equipmentIds, error: equipmentError } = await supabase
    .from('equipment')
    .select('id')
    .eq('organization_id', organizationId)
    .in('team_id', userTeamIds);

  if (equipmentError) {
    logger.error('Error fetching equipment for team access control:', equipmentError);
    throw equipmentError;
  }

  const ids = equipmentIds?.map((e) => e.id) || [];
  return ids.length > 0 ? ids : 'empty';
}

/**
 * Resolves equipment IDs for a specific team filter.
 */
export async function resolveEquipmentIdsForTeamFilter(
  organizationId: string,
  teamId: string,
): Promise<EquipmentIdResolution> {
  const { data: equipmentIds, error: teamEquipmentError } = await supabase
    .from('equipment')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('team_id', teamId);

  if (teamEquipmentError) {
    logger.error('Error fetching equipment for team filter:', teamEquipmentError);
    throw teamEquipmentError;
  }

  const ids = equipmentIds?.map((e) => e.id) || [];
  return ids.length > 0 ? ids : 'empty';
}
