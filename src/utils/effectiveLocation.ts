/**
 * Effective Location Resolution
 * 
 * Resolves the display location for an equipment asset using a strict hierarchy:
 * 1. Team Override - equipment.use_team_location AND team.override_equipment_location
 *    are both true, and team has coordinates
 * 2. Manual Assignment - equipment has assigned_location lat/lng
 * 3. Last Known Scan - latest QR scan with GPS coordinates
 */

export type LocationSource = 'team' | 'manual' | 'scan';

export interface EffectiveLocation {
  lat: number;
  lng: number;
  formattedAddress?: string;
  source: LocationSource;
}

export interface TeamLocationInput {
  override_equipment_location?: boolean;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
}

export interface EquipmentLocationInput {
  use_team_location?: boolean;
  assigned_location_lat?: number | null;
  assigned_location_lng?: number | null;
  assigned_location_street?: string | null;
  assigned_location_city?: string | null;
  assigned_location_state?: string | null;
  assigned_location_country?: string | null;
}

export interface ScanLocationInput {
  lat: number;
  lng: number;
}

/**
 * Format address components into a single string
 */
function formatAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | undefined {
  const components = [parts.street, parts.city, parts.state, parts.country]
    .filter(Boolean);
  return components.length > 0 ? components.join(', ') : undefined;
}

/**
 * Resolve the effective location for an equipment asset.
 * 
 * Priority:
 * 1. Team Override — both the team's `override_equipment_location` flag
 *    AND the equipment's `use_team_location` flag must be true, and the
 *    team must have coordinates.
 * 2. Manual Assignment (if equipment has assigned coordinates)
 * 3. Last Known Scan (if a scan has GPS coordinates)
 * 
 * @returns EffectiveLocation or null if no location data available
 */
export function resolveEffectiveLocation(params: {
  team?: TeamLocationInput;
  equipment: EquipmentLocationInput;
  lastScan?: ScanLocationInput;
}): EffectiveLocation | null {
  // 1. Team Override — requires both sides to opt in
  if (
    params.equipment.use_team_location &&
    params.team?.override_equipment_location &&
    params.team.location_lat != null &&
    params.team.location_lng != null
  ) {
    return {
      lat: params.team.location_lat,
      lng: params.team.location_lng,
      formattedAddress: formatAddress({
        street: params.team.location_address,
        city: params.team.location_city,
        state: params.team.location_state,
        country: params.team.location_country,
      }),
      source: 'team',
    };
  }

  // 2. Manual Assignment
  if (
    params.equipment.assigned_location_lat != null &&
    params.equipment.assigned_location_lng != null
  ) {
    return {
      lat: params.equipment.assigned_location_lat,
      lng: params.equipment.assigned_location_lng,
      formattedAddress: formatAddress({
        street: params.equipment.assigned_location_street,
        city: params.equipment.assigned_location_city,
        state: params.equipment.assigned_location_state,
        country: params.equipment.assigned_location_country,
      }),
      source: 'manual',
    };
  }

  // 3. Last Known Scan
  if (params.lastScan) {
    return {
      lat: params.lastScan.lat,
      lng: params.lastScan.lng,
      source: 'scan',
    };
  }

  return null;
}

/**
 * Build a Google Maps directions URL for a given address string.
 */
export function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/**
 * Build a Google Maps URL from coordinates.
 */
export function buildGoogleMapsUrlFromCoords(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
