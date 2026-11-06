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
    inventoryDefaultLocationName: org.inventory_default_location_name ?? undefined,
    inventoryDefaultLocationAddress: org.inventory_default_location_address ?? undefined,
    inventoryDefaultLocationCity: org.inventory_default_location_city ?? undefined,
    inventoryDefaultLocationState: org.inventory_default_location_state ?? undefined,
    inventoryDefaultLocationCountry: org.inventory_default_location_country ?? undefined,
    inventoryDefaultLocationLat: org.inventory_default_location_lat ?? undefined,
    inventoryDefaultLocationLng: org.inventory_default_location_lng ?? undefined,
    userRole: (membership?.role as SessionOrganization['userRole']) || 'member',
    // A support membership is returned only while its grant is live (RLS), so
    // it is usable exactly like an active one until it expires.
    userStatus:
      membership?.status === 'support'
        ? 'active'
        : (membership?.status as SessionOrganization['userStatus']) || 'active',
    isSupportAccess: membership?.status === 'support',
  };
}

/**
 * Stable display order: by name (case-insensitive), then id. The source queries
 * (`.in('id', orgIds)`) have no ORDER BY, so without this the workspace switcher
 * and the role-tie fallback in getPrioritizedOrganizationId vary between loads.
 */
function compareOrganizations(a: OrganizationRow, b: OrganizationRow): number {
  return (
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

export function mapOrganizationRowsToSessionOrganizations(
  orgRows: OrganizationRow[],
  memberships: OrganizationMembershipSlice[]
): SessionOrganization[] {
  return [...orgRows].sort(compareOrganizations).map(org => {
    const membership = memberships.find(m => m.organization_id === org.id);
    return mapOrganizationRowToSessionOrganization(org, membership);
  });
}
