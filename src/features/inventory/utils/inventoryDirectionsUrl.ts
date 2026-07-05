import {
  buildGoogleMapsUrl,
  buildGoogleMapsUrlFromCoords,
} from '@/utils/effectiveLocation';
import type { EffectiveInventoryLocation } from '@/features/inventory/utils/inventoryLocationUtils';

export function buildInventoryDirectionsUrl(
  location: Pick<EffectiveInventoryLocation, 'formattedAddress' | 'lat' | 'lng'>,
): string | null {
  if (location.lat != null && location.lng != null) {
    return buildGoogleMapsUrlFromCoords(location.lat, location.lng);
  }

  if (location.formattedAddress) {
    return buildGoogleMapsUrl(location.formattedAddress);
  }

  return null;
}
