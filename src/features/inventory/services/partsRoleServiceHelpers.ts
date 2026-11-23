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

/**
 * A check that could not reach the server is not an answer. It is thrown so
 * the caller keeps what it knew before (a saved "yes" must survive having no
 * signal) instead of being told the user has no parts role.
 */
const CONNECTION_LOST_PATTERN = /Failed to fetch|Load failed|NetworkError|ERR_INTERNET|ERR_NETWORK|net::/i;

function couldNotReachServer(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  return CONNECTION_LOST_PATTERN.test(message);
}

export async function isUserInPartsRole(
  table: PartsRoleTable,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  let result;
  try {
    result = await supabase
      .from(table)
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();
  } catch (error) {
    if (couldNotReachServer(error)) throw error;
    logger.error(`Error in isUserInPartsRole (${table}):`, error);
    return false;
  }

  if (result.error) {
    if (couldNotReachServer(result.error)) throw new Error(result.error.message);
    logger.error(`Error checking ${table} status:`, result.error);
    return false;
  }

  return !!result.data;
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
