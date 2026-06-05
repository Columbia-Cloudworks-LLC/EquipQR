import { supabase } from '@/integrations/supabase/client';
import type { OrganizationMemberRecord } from '@/features/organization/types/organization';
import { mapOrganizationMemberRows } from '@/features/organization/services/organizationMemberMappers';
import { logger } from '@/utils/logger';

const ORGANIZATION_MEMBER_SELECT = `
  *,
  profiles!organization_members_user_id_fkey (
    name,
    email
  )
`;

export async function fetchOrganizationMembersByRole(
  organizationId: string,
  options?: { adminRolesOnly?: boolean },
): Promise<OrganizationMemberRecord[]> {
  try {
    let query = supabase
      .from('organization_members')
      .select(ORGANIZATION_MEMBER_SELECT)
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (options?.adminRolesOnly) {
      query = query.in('role', ['owner', 'admin']).order('role', { ascending: true });
    } else {
      query = query.order('joined_date', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;
    return mapOrganizationMemberRows(data);
  } catch (error) {
    logger.error('Error fetching organization members:', error);
    return [];
  }
}
