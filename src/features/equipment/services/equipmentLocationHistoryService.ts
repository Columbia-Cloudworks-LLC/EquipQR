import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export type EquipmentLocationHistorySource = 'scan' | 'manual' | 'team_sync' | 'quickbooks';

export interface EquipmentLocationHistoryRow {
  id: string;
  equipment_id: string;
  source: EquipmentLocationHistorySource;
  latitude: number | null;
  longitude: number | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  formatted_address: string | null;
  created_at: string;
}

export const LOCATION_HISTORY_SOURCE_LABELS: Record<EquipmentLocationHistorySource, string> = {
  scan: 'Scan GPS',
  manual: 'Manual address',
  team_sync: 'Team sync',
  quickbooks: 'QuickBooks',
};

export interface LocationChangeParams {
  equipmentId: string;
  source: 'manual' | 'team_sync' | 'quickbooks';
  latitude?: number | null;
  longitude?: number | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  formattedAddress?: string | null;
  metadata?: Record<string, unknown>;
}

function formatAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | null {
  const components = [parts.street, parts.city, parts.state, parts.country].filter(Boolean);
  return components.length > 0 ? components.join(', ') : null;
}

/**
 * Log an equipment location change to the history table.
 * Non-blocking — errors are logged but do not throw.
 */
export async function logEquipmentLocationChange(params: LocationChangeParams): Promise<void> {
  try {
    let formattedAddress = params.formattedAddress;
    if (
      !formattedAddress &&
      (params.addressStreet || params.addressCity || params.addressState || params.addressCountry)
    ) {
      formattedAddress = formatAddress({
        street: params.addressStreet,
        city: params.addressCity,
        state: params.addressState,
        country: params.addressCountry,
      });
    }

    const { error } = await supabase.rpc('log_equipment_location_change', {
      p_equipment_id: params.equipmentId,
      p_source: params.source,
      p_latitude: params.latitude ?? null,
      p_longitude: params.longitude ?? null,
      p_address_street: params.addressStreet ?? null,
      p_address_city: params.addressCity ?? null,
      p_address_state: params.addressState ?? null,
      p_address_country: params.addressCountry ?? null,
      p_formatted_address: formattedAddress ?? null,
      p_metadata: params.metadata ?? {},
    });

    if (error) {
      logger.error('Failed to log equipment location change', error);
    }
  } catch (error) {
    logger.error('Error logging equipment location change', error);
  }
}

const DEFAULT_LIMIT = 50;

export async function getEquipmentLocationHistory(
  equipmentId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<EquipmentLocationHistoryRow[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_location_history')
      .select(
        'id, equipment_id, source, latitude, longitude, address_street, address_city, address_state, address_country, formatted_address, created_at',
      )
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch equipment location history', error);
      return [];
    }

    return (data ?? []) as EquipmentLocationHistoryRow[];
  } catch (error) {
    logger.error('Unexpected error fetching equipment location history', error);
    return [];
  }
}

export function getLatestScanCoordinateFromHistory(
  rows: EquipmentLocationHistoryRow[],
): { lat: number; lng: number; updatedAt: string; formattedAddress?: string } | undefined {
  const latestScan = rows.find(
    (row) =>
      row.source === 'scan' &&
      row.latitude != null &&
      row.longitude != null &&
      !Number.isNaN(row.latitude) &&
      !Number.isNaN(row.longitude),
  );

  if (!latestScan || latestScan.latitude == null || latestScan.longitude == null) {
    return undefined;
  }

  return {
    lat: latestScan.latitude,
    lng: latestScan.longitude,
    updatedAt: latestScan.created_at,
    formattedAddress: latestScan.formatted_address ?? undefined,
  };
}

export function getCoordinateHistoryRows(rows: EquipmentLocationHistoryRow[]): EquipmentLocationHistoryRow[] {
  return rows.filter(
    (row) =>
      row.latitude != null &&
      row.longitude != null &&
      !Number.isNaN(row.latitude) &&
      !Number.isNaN(row.longitude),
  );
}
