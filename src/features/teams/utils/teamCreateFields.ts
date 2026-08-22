/**
 * Shared team-create form value helpers.
 *
 * Lives in its own module so `TeamCreateFields.tsx` can stay
 * `react-refresh/only-export-components` clean.
 */

import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

export interface TeamCreateFieldsValue {
  name: string;
  description: string;
  selectedCustomerId: string | null;
  showNewAccount: boolean;
  newAccountName: string;
  locationData: PlaceLocationData | null;
}

export const emptyTeamCreateFieldsValue = (): TeamCreateFieldsValue => ({
  name: '',
  description: '',
  selectedCustomerId: null,
  showNewAccount: false,
  newAccountName: '',
  locationData: null,
});

export async function resolveTeamCreateCustomerId(
  organizationId: string,
  value: TeamCreateFieldsValue,
  createCustomer: (input: {
    organization_id: string;
    name: string;
    status: 'active';
  }) => Promise<{ id: string }>,
): Promise<string | null> {
  if (value.showNewAccount && value.newAccountName.trim()) {
    const created = await createCustomer({
      organization_id: organizationId,
      name: value.newAccountName.trim(),
      status: 'active',
    });
    return created.id;
  }
  return value.selectedCustomerId;
}

export function buildTeamCreatePayload(
  organizationId: string,
  value: TeamCreateFieldsValue,
  customerId: string | null,
) {
  return {
    name: value.name.trim(),
    description: value.description.trim() || null,
    organization_id: organizationId,
    customer_id: customerId,
    ...(value.locationData && {
      location_address: value.locationData.street || null,
      location_city: value.locationData.city || null,
      location_state: value.locationData.state || null,
      location_country: value.locationData.country || null,
      location_lat: value.locationData.lat,
      location_lng: value.locationData.lng,
    }),
  };
}
