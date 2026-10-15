import { describe, expect, it } from 'vitest';
import type { Database } from '@/integrations/supabase/types';
import { mapOrganizationRowsToSessionOrganizations } from './mapOrganizationToSession';

type OrganizationRow = Database['public']['Tables']['organizations']['Row'];

function orgRow(id: string): OrganizationRow {
  return {
    background_color: null,
    billable_members: null,
    billing_cycle: null,
    claimed_at: null,
    created_at: '',
    customers_feature_enabled: null,
    features: [],
    fleet_map_enabled: null,
    id,
    inventory_default_location_address: null,
    inventory_default_location_city: null,
    inventory_default_location_country: null,
    inventory_default_location_lat: null,
    inventory_default_location_lng: null,
    inventory_default_location_name: null,
    inventory_default_location_state: null,
    last_billing_calculation: null,
    logo: null,
    max_members: 5,
    member_count: 1,
    name: `Org ${id}`,
    next_billing_date: null,
    note_author_edit_window_hours: 0,
    plan: 'free',
    provisioned_at: null,
    provisioned_by: null,
    provisioning_request_id: null,
    scan_location_collection_enabled: false,
    storage_used_mb: null,
    updated_at: '',
  };
}

describe('mapOrganizationRowsToSessionOrganizations', () => {
  it('treats a live support membership as active admin access', () => {
    const [org] = mapOrganizationRowsToSessionOrganizations([orgRow('a')], [
      { organization_id: 'a', role: 'admin', status: 'support' },
    ]);
    expect(org.userRole).toBe('admin');
    expect(org.userStatus).toBe('active');
    expect(org.isSupportAccess).toBe(true);
  });

  it('keeps other statuses as they are', () => {
    const [org] = mapOrganizationRowsToSessionOrganizations([orgRow('b')], [
      { organization_id: 'b', role: 'member', status: 'pending' },
    ]);
    expect(org.userStatus).toBe('pending');
  });
});
