import { supabase } from '@/integrations/supabase/client';

export type OrganizationLookupRow = {
  organizations: { id: string; name: string } | null;
};

export type OrganizationAccessResult = {
  organizationId: string;
  organizationName: string;
  userHasAccess: boolean;
  userRole?: string;
};

export async function resolveOrganizationAccess(
  row: OrganizationLookupRow,
  userId: string,
): Promise<OrganizationAccessResult | null> {
  const organization = row.organizations as { id: string; name: string } | null;
  if (!organization) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', organization.id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const userHasAccess = !membershipError && !!membership;

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    userHasAccess,
    userRole: membership?.role,
  };
}
