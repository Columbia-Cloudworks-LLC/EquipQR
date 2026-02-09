import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

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

/**
 * Format address components into a single string
 */
function formatAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | null {
  const components = [parts.street, parts.city, parts.state, parts.country]
    .filter(Boolean);
  return components.length > 0 ? components.join(', ') : null;
}

/**
 * Log an equipment location change to the history table.
 * This is a non-blocking operation - errors are logged but don't throw.
 */
export async function logEquipmentLocationChange(params: LocationChangeParams): Promise<void> {
  try {
    // Construct formatted address if not provided but address components are available
    let formattedAddress = params.formattedAddress;
    if (!formattedAddress && (params.addressStreet || params.addressCity || params.addressState || params.addressCountry)) {
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
    // Non-blocking - don't fail the main operation if history logging fails
    logger.error('Error logging equipment location change', error);
  }
}
