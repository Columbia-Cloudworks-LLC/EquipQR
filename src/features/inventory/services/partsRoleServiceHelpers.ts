import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export type PartsRoleTable = 'parts_managers' | 'parts_consumers';

export interface PartsRoleRecord {
  organization_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  userName?: string;
  userEmail?: string;
  assignedByName?: string;
}

export async function fetchPartsRoleAssignees(
  table: PartsRoleTable,
  organizationId: string,
): Promise<PartsRoleRecord[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('organization_id', organizationId)
    .order('assigned_at', { ascending: false });

  if (error) {
    logger.error(`Error fetching ${table}:`, error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const userIds = data.map((row) => row.user_id);
  const assignerIds = data
    .filter((row) => row.assigned_by)
    .map((row) => row.assigned_by as string);
  const allUserIds = [...new Set([...userIds, ...assignerIds])];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', allUserIds);

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.id, { name: profile.name, email: profile.email }]),
  );

  return data.map((row) => ({
    ...row,
    userName: profileMap.get(row.user_id)?.name || 'Unknown',
    userEmail: profileMap.get(row.user_id)?.email || '',
    assignedByName: row.assigned_by
      ? profileMap.get(row.assigned_by)?.name || 'Unknown'
      : undefined,
  }));
}

export async function isUserInPartsRole(
  table: PartsRoleTable,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error(`Error checking ${table} status:`, error);
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error(`Error in isUserInPartsRole (${table}):`, error);
    return false;
  }
}

export async function addPartsRoleAssignee(
  table: PartsRoleTable,
  organizationId: string,
  userId: string,
  assignedBy: string,
): Promise<PartsRoleRecord> {
  const { data, error } = await supabase
    .from(table)
    .insert({
      organization_id: organizationId,
      user_id: userId,
      assigned_by: assignedBy,
    })
    .select()
    .single();

  if (error) {
    logger.error(`Error adding ${table} assignee:`, error);
    throw new Error(error.message);
  }

  return data;
}

export async function removePartsRoleAssignee(
  table: PartsRoleTable,
  organizationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId);

  if (error) {
    logger.error(`Error removing ${table} assignee:`, error);
    throw new Error(error.message);
  }
}
