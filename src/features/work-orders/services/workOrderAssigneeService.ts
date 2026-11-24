import { supabase } from '@/integrations/supabase/client';

export interface AssignmentOption {
  id: string;
  name: string;
  type: 'user';
  email?: string | null;
  role?: string;
}

/** Organization owners and admins: they can be assigned any work order. */
export async function fetchOrgAdminAssignees(organizationId: string): Promise<AssignmentOption[]> {
  const { data: orgAdmins, error: orgAdminsError } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        name,
        email
      )
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  if (orgAdminsError) {
    console.error('[useWorkOrderAssignmentOptions] Error fetching org admins:', orgAdminsError);
    throw orgAdminsError;
  }

  return (orgAdmins ?? []).map(member => ({
    id: member.user_id,
    name: member.profiles?.name ?? 'Unknown',
    email: member.profiles?.email ?? '',
    role: member.role,
    type: 'user' as const,
  }));
}
