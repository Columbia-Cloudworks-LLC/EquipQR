import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export async function resolveInvitationInviterMaps(
  organizationId: string,
  invitationIds: string[],
): Promise<{ inviterIdMap: Record<string, string>; inviterNameMap: Record<string, string> }> {
  const inviterNameMap: Record<string, string> = {};
  const inviterIdMap: Record<string, string> = {};

  if (invitationIds.length === 0) {
    return { inviterIdMap, inviterNameMap };
  }

  const { data: invitationRows, error: invitationRowsError } = await supabase
    .from('organization_invitations')
    .select('id, invited_by')
    .in('id', invitationIds)
    .eq('organization_id', organizationId);

  if (invitationRowsError) {
    logger.error('Error fetching invitation inviter ids', invitationRowsError);
    return { inviterIdMap, inviterNameMap };
  }

  if (!invitationRows?.length) {
    return { inviterIdMap, inviterNameMap };
  }

  const uniqueInviterIds = [...new Set(invitationRows.map((r) => r.invited_by).filter(Boolean))];
  const { data: profileRows, error: profileRowsError } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', uniqueInviterIds);

  if (profileRowsError) {
    logger.error('Error fetching inviter profiles', profileRowsError);
  }

  const profileMap: Record<string, string> = {};
  for (const profile of profileRows || []) {
    profileMap[profile.id] = profile.name || 'Unknown';
  }

  for (const row of invitationRows) {
    inviterIdMap[row.id] = row.invited_by;
    inviterNameMap[row.id] = profileRowsError ? 'Unknown' : profileMap[row.invited_by] || 'Unknown';
  }

  return { inviterIdMap, inviterNameMap };
}
