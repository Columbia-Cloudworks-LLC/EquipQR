// fallow-ignore-file code-duplication
// Duplication rationale: Location helper intentionally mirrors fleet-specific resolution variant
/**
 * Effective Location Resolution
 *
 * Canonical hierarchy for equipment map display:
 * 1. Team override — equipment.use_team_location AND team.override_equipment_location
 * 2. Assigned equipment address coordinates
 * 3. Latest scan GPS (last_known_location or explicit scan input)
 * 4. Legacy equipment.location text parsed as lat,lng
 */

import { parseLatLng } from '@/utils/geoUtils';

export type LocationSource = 'team' | 'manual' | 'scan' | 'legacy';

export type LocationDisplayMode = 'effective' | LocationSource;

/** Fleet map marker source — extends canonical sources with geocoded fallback. */
export type FleetMapSource = LocationSource | 'geocoded';

export const LOCATION_SOURCE_LABELS: Record<LocationSource, string> = {
  team: 'Team location',
  manual: 'Equipment location',
  scan: 'Last known scan location',
  legacy: 'Legacy coordinates',
};

export const FLEET_MAP_SOURCE_LABELS: Record<FleetMapSource, string> = {
  team: 'Team Override',
  manual: 'Assigned Address',
  scan: 'QR Scan GPS',
  legacy: 'Legacy Coordinates',
  geocoded: 'Geocoded',
};

export interface EffectiveLocation {
  lat: number;
  lng: number;
  formattedAddress?: string;
  source: LocationSource;
  sourceLabel: string;
  updatedAt?: string;
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
  updatedAt?: string;
  formattedAddress?: string;
}

export interface LastKnownLocationInput {
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  name?: string | null;
  updated_at?: string | null;
}

export interface EquipmentLocationOption {
  mode: LocationDisplayMode;
  source: LocationSource;
  sourceLabel: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
  updatedAt?: string;
  available: boolean;
}

function formatAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | undefined {
  const components = [parts.street, parts.city, parts.state, parts.country].filter(Boolean);
  return components.length > 0 ? components.join(', ') : undefined;
}

export function getLocationSourceLabel(source: LocationSource): string {
  return LOCATION_SOURCE_LABELS[source];
}

export function getFleetMapSourceLabel(source: FleetMapSource): string {
  return FLEET_MAP_SOURCE_LABELS[source];
}

/** Parse equipment.last_known_location JSON into scan coordinates. */
export function parseLastKnownLocation(
  lastKnown: LastKnownLocationInput | Record<string, unknown> | null | undefined,
): ScanLocationInput | undefined {
  if (!lastKnown || typeof lastKnown !== 'object') {
    return undefined;
  }

  const record = lastKnown as Record<string, unknown>;
  const lat = Number(record.latitude ?? record.lat);
  const lng = Number(record.longitude ?? record.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return undefined;
  }

  const name = typeof record.name === 'string' ? record.name : undefined;
  const updatedAt =
    typeof record.updated_at === 'string'
      ? record.updated_at
      : typeof record.updatedAt === 'string'
        ? record.updatedAt
        : undefined;

  return {
    lat,
    lng,
    updatedAt,
    formattedAddress: name,
  };
}

function withSourceMetadata(
  location: Omit<EffectiveLocation, 'sourceLabel'>,
): EffectiveLocation {
  return {
    ...location,
    sourceLabel: getLocationSourceLabel(location.source),
  };
}

/**
 * Resolve coordinates for one equipment row before optional scan fallback.
 */
export function resolveEquipmentCoordinates(params: {
  team?: TeamLocationInput;
  equipment: EquipmentLocationInput & { locationText?: string | null; updatedAt?: string };
  lastScan?: ScanLocationInput;
  parseLegacy?: (text: string) => { lat: number; lng: number } | null;
}): {
  coords: { lat: number; lng: number };
  source: LocationSource;
  formattedAddress?: string;
  updatedAt?: string;
} | null {
  const { team, equipment, lastScan } = params;
  const parseLegacy = params.parseLegacy ?? parseLatLng;

  if (
    equipment.use_team_location &&
    team?.override_equipment_location &&
    team.location_lat != null &&
    team.location_lng != null
  ) {
    return {
      coords: { lat: team.location_lat, lng: team.location_lng },
      source: 'team',
      formattedAddress: formatAddress({
        street: team.location_address,
        city: team.location_city,
        state: team.location_state,
        country: team.location_country,
      }),
      updatedAt: equipment.updatedAt,
    };
  }

  if (equipment.assigned_location_lat != null && equipment.assigned_location_lng != null) {
    return {
      coords: {
        lat: equipment.assigned_location_lat,
        lng: equipment.assigned_location_lng,
      },
      source: 'manual',
      formattedAddress: formatAddress({
        street: equipment.assigned_location_street,
        city: equipment.assigned_location_city,
        state: equipment.assigned_location_state,
        country: equipment.assigned_location_country,
      }),
      updatedAt: equipment.updatedAt,
    };
  }

  if (equipment.locationText) {
    const legacyCoords = parseLegacy(equipment.locationText);
    if (legacyCoords) {
      return {
        coords: legacyCoords,
        source: 'legacy',
        formattedAddress: equipment.locationText,
        updatedAt: equipment.updatedAt,
      };
    }
  }

  if (lastScan) {
    return {
      coords: { lat: lastScan.lat, lng: lastScan.lng },
      source: 'scan',
      formattedAddress: lastScan.formattedAddress,
      updatedAt: lastScan.updatedAt,
    };
  }

  return null;
}

/**
 * Resolve the effective location for an equipment asset.
 */
export function resolveEffectiveLocation(params: {
  team?: TeamLocationInput;
  equipment: EquipmentLocationInput & { locationText?: string | null; updatedAt?: string };
  lastScan?: ScanLocationInput;
  parseLegacy?: (text: string) => { lat: number; lng: number } | null;
}): EffectiveLocation | null {
  const resolved = resolveEquipmentCoordinates(params);
  if (!resolved) {
    return null;
  }

  return withSourceMetadata({
    lat: resolved.coords.lat,
    lng: resolved.coords.lng,
    formattedAddress: resolved.formattedAddress,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
  });
}

/** Build selectable location options for asset maps (excludes unavailable sources). */
export function buildEquipmentLocationOptions(params: {
  team?: TeamLocationInput;
  equipment: EquipmentLocationInput & { locationText?: string | null; updatedAt?: string };
  lastScan?: ScanLocationInput;
  parseLegacy?: (text: string) => { lat: number; lng: number } | null;
}): EquipmentLocationOption[] {
  const options: EquipmentLocationOption[] = [];
  const { team, equipment, lastScan } = params;
  const parseLegacy = params.parseLegacy ?? parseLatLng;

  if (
    equipment.use_team_location &&
    team?.override_equipment_location &&
    team.location_lat != null &&
    team.location_lng != null
  ) {
    options.push({
      mode: 'team',
      source: 'team',
      sourceLabel: getLocationSourceLabel('team'),
      lat: team.location_lat,
      lng: team.location_lng,
      formattedAddress: formatAddress({
        street: team.location_address,
        city: team.location_city,
        state: team.location_state,
        country: team.location_country,
      }),
      updatedAt: equipment.updatedAt,
      available: true,
    });
  }

  if (equipment.assigned_location_lat != null && equipment.assigned_location_lng != null) {
    options.push({
      mode: 'manual',
      source: 'manual',
      sourceLabel: getLocationSourceLabel('manual'),
      lat: equipment.assigned_location_lat,
      lng: equipment.assigned_location_lng,
      formattedAddress: formatAddress({
        street: equipment.assigned_location_street,
        city: equipment.assigned_location_city,
        state: equipment.assigned_location_state,
        country: equipment.assigned_location_country,
      }),
      updatedAt: equipment.updatedAt,
      available: true,
    });
  }

  if (lastScan) {
    options.push({
      mode: 'scan',
      source: 'scan',
      sourceLabel: getLocationSourceLabel('scan'),
      lat: lastScan.lat,
      lng: lastScan.lng,
      formattedAddress: lastScan.formattedAddress,
      updatedAt: lastScan.updatedAt,
      available: true,
    });
  }

  if (equipment.locationText) {
    const legacyCoords = parseLegacy(equipment.locationText);
    if (legacyCoords) {
      options.push({
        mode: 'legacy',
        source: 'legacy',
        sourceLabel: getLocationSourceLabel('legacy'),
        lat: legacyCoords.lat,
        lng: legacyCoords.lng,
        formattedAddress: equipment.locationText,
        updatedAt: equipment.updatedAt,
        available: true,
      });
    }
  }

  return options;
}

export function resolveLocationByMode(
  mode: LocationDisplayMode,
  options: EquipmentLocationOption[],
  params: {
    team?: TeamLocationInput;
    equipment: EquipmentLocationInput & { locationText?: string | null; updatedAt?: string };
    lastScan?: ScanLocationInput;
    parseLegacy?: (text: string) => { lat: number; lng: number } | null;
  },
): EffectiveLocation | null {
  if (mode === 'effective') {
    return resolveEffectiveLocation(params);
  }

  const match = options.find((option) => option.mode === mode && option.available);
  if (!match) {
    return null;
  }

  return withSourceMetadata({
    lat: match.lat,
    lng: match.lng,
    formattedAddress: match.formattedAddress,
    source: match.source,
    updatedAt: match.updatedAt,
  });
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
