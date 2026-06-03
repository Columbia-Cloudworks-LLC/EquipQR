import type { Database } from '@/integrations/supabase/types';
import type { SessionOrganization } from '@/types/session';

type OrganizationRow = Database['public']['Tables']['organizations']['Row'];

export type OrganizationMembershipSlice = {
  organization_id: string;
  role: string;
  status: string;
};

function mapOrganizationRowToSessionOrganization(
  org: OrganizationRow,
  membership: OrganizationMembershipSlice | undefined
): SessionOrganization {
  return {
    id: org.id,
    name: org.name,
    plan: org.plan as SessionOrganization['plan'],
    memberCount: org.member_count,
    maxMembers: org.max_members,
    features: org.features,
    billingCycle: org.billing_cycle as SessionOrganization['billingCycle'],
    nextBillingDate: org.next_billing_date || undefined,
    logo: org.logo || undefined,
    backgroundColor: org.background_color || undefined,
    scanLocationCollectionEnabled: org.scan_location_collection_enabled ?? true,
    userRole: (membership?.role as SessionOrganization['userRole']) || 'member',
    userStatus: (membership?.status as SessionOrganization['userStatus']) || 'active',
  };
}

export function mapOrganizationRowsToSessionOrganizations(
  orgRows: OrganizationRow[],
  memberships: OrganizationMembershipSlice[]
): SessionOrganization[] {
  return orgRows.map(org => {
    const membership = memberships.find(m => m.organization_id === org.id);
    return mapOrganizationRowToSessionOrganization(org, membership);
  });
}
