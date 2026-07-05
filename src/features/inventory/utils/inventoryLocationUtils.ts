import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import type { InventoryItemRow } from '@/features/inventory/types/inventory';

export type InventoryStructuredLocationFields = Pick<
  InventoryItemRow,
  | 'location_address'
  | 'location_city'
  | 'location_state'
  | 'location_country'
  | 'location_lat'
  | 'location_lng'
>;

export type OrganizationInventoryDefaultLocationFields = {
  inventory_default_location_name?: string | null;
  inventory_default_location_address?: string | null;
  inventory_default_location_city?: string | null;
  inventory_default_location_state?: string | null;
  inventory_default_location_country?: string | null;
  inventory_default_location_lat?: number | null;
  inventory_default_location_lng?: number | null;
};

export type InventoryLocationSource = 'part' | 'organization_default';

export type EffectiveInventoryLocation = {
  source: InventoryLocationSource;
  locationName: string | null;
  formattedAddress: string;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
};

export function buildInventoryAddress(
  location: InventoryStructuredLocationFields,
): string {
  return [
    location.location_address,
    location.location_city,
    location.location_state,
    location.location_country,
  ]
    .filter(Boolean)
    .join(', ');
}

export function buildOrganizationInventoryDefaultAddress(
  org: OrganizationInventoryDefaultLocationFields,
): string {
  return [
    org.inventory_default_location_address,
    org.inventory_default_location_city,
    org.inventory_default_location_state,
    org.inventory_default_location_country,
  ]
    .filter(Boolean)
    .join(', ');
}

export function hasInventoryStructuredLocation(
  location: InventoryStructuredLocationFields,
): boolean {
  const hasCoords =
    location.location_lat != null && location.location_lng != null;
  return hasCoords || buildInventoryAddress(location).length > 0;
}

export function hasOrganizationInventoryDefaultLocation(
  org: OrganizationInventoryDefaultLocationFields,
): boolean {
  const hasCoords =
    org.inventory_default_location_lat != null &&
    org.inventory_default_location_lng != null;
  return hasCoords || buildOrganizationInventoryDefaultAddress(org).length > 0;
}

export function inventoryLocationToPlaceData(
  location: InventoryStructuredLocationFields,
): PlaceLocationData | null {
  const formattedAddress = buildInventoryAddress(location);
  const hasCoords =
    location.location_lat != null && location.location_lng != null;

  if (!hasCoords && !formattedAddress) {
    return null;
  }

  return {
    formatted_address: formattedAddress || 'Storage location',
    street: location.location_address ?? '',
    city: location.location_city ?? '',
    state: location.location_state ?? '',
    country: location.location_country ?? '',
    lat: location.location_lat ?? undefined,
    lng: location.location_lng ?? undefined,
  };
}

export function organizationInventoryDefaultToPlaceData(
  org: OrganizationInventoryDefaultLocationFields,
): PlaceLocationData | null {
  const formattedAddress = buildOrganizationInventoryDefaultAddress(org);
  const hasCoords =
    org.inventory_default_location_lat != null &&
    org.inventory_default_location_lng != null;

  if (!hasCoords && !formattedAddress) {
    return null;
  }

  return {
    formatted_address: formattedAddress || 'Organization default location',
    street: org.inventory_default_location_address ?? '',
    city: org.inventory_default_location_city ?? '',
    state: org.inventory_default_location_state ?? '',
    country: org.inventory_default_location_country ?? '',
    lat: org.inventory_default_location_lat ?? undefined,
    lng: org.inventory_default_location_lng ?? undefined,
  };
}

export function placeDataToInventoryStructuredLocation(
  data: PlaceLocationData | null,
): InventoryStructuredLocationFields {
  if (!data) {
    return {
      location_address: null,
      location_city: null,
      location_state: null,
      location_country: null,
      location_lat: null,
      location_lng: null,
    };
  }

  return {
    location_address: data.street || null,
    location_city: data.city || null,
    location_state: data.state || null,
    location_country: data.country || null,
    location_lat: data.lat ?? null,
    location_lng: data.lng ?? null,
  };
}

export function placeDataToOrganizationInventoryDefaultLocation(
  data: PlaceLocationData | null,
): Omit<
  OrganizationInventoryDefaultLocationFields,
  'inventory_default_location_name'
> {
  if (!data) {
    return {
      inventory_default_location_address: null,
      inventory_default_location_city: null,
      inventory_default_location_state: null,
      inventory_default_location_country: null,
      inventory_default_location_lat: null,
      inventory_default_location_lng: null,
    };
  }

  return {
    inventory_default_location_address: data.street || null,
    inventory_default_location_city: data.city || null,
    inventory_default_location_state: data.state || null,
    inventory_default_location_country: data.country || null,
    inventory_default_location_lat: data.lat ?? null,
    inventory_default_location_lng: data.lng ?? null,
  };
}

export function resolveEffectiveInventoryLocation(
  item: InventoryStructuredLocationFields & { location?: string | null },
  orgDefault?: OrganizationInventoryDefaultLocationFields | null,
): EffectiveInventoryLocation | null {
  if (hasInventoryStructuredLocation(item)) {
    return {
      source: 'part',
      locationName: item.location ?? null,
      formattedAddress: buildInventoryAddress(item),
      street: item.location_address,
      city: item.location_city,
      state: item.location_state,
      country: item.location_country,
      lat: item.location_lat,
      lng: item.location_lng,
    };
  }

  if (orgDefault && hasOrganizationInventoryDefaultLocation(orgDefault)) {
    return {
      source: 'organization_default',
      locationName:
        item.location?.trim() ||
        orgDefault.inventory_default_location_name?.trim() ||
        null,
      formattedAddress: buildOrganizationInventoryDefaultAddress(orgDefault),
      street: orgDefault.inventory_default_location_address ?? null,
      city: orgDefault.inventory_default_location_city ?? null,
      state: orgDefault.inventory_default_location_state ?? null,
      country: orgDefault.inventory_default_location_country ?? null,
      lat: orgDefault.inventory_default_location_lat ?? null,
      lng: orgDefault.inventory_default_location_lng ?? null,
    };
  }

  return null;
}

export function getInventoryLocationSourceLabel(
  source: InventoryLocationSource,
): string {
  switch (source) {
    case 'part':
      return 'Part location';
    case 'organization_default':
      return 'Organization default';
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
}
