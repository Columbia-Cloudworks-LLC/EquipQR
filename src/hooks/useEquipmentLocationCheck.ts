import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseLatLng } from '@/utils/geoUtils';

interface LocationCheckResult {
  hasLocationData: boolean;
  isLoading: boolean;
  error: string | null;
  equipmentCount: number;
  locatedCount: number;
}

/**
 * Hook to check if equipment has any location data before loading Google Maps
 * This prevents unnecessary Google Maps API calls when no equipment can be plotted
 */
export const useEquipmentLocationCheck = (organizationId: string | null): LocationCheckResult => {
  const [result, setResult] = useState<LocationCheckResult>({
    hasLocationData: false,
    isLoading: true,
    error: null,
    equipmentCount: 0,
    locatedCount: 0
  });

  useEffect(() => {
    const checkEquipmentLocations = async () => {
      if (!organizationId) {
        setResult({
          hasLocationData: false,
          isLoading: false,
          error: null,
          equipmentCount: 0,
          locatedCount: 0
        });
        return;
      }

      try {
        setResult(prev => ({ ...prev, isLoading: true, error: null }));

        // Get all equipment for the organization
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('id, location, updated_at')
          .eq('organization_id', organizationId);

        if (equipmentError) {
          throw equipmentError;
        }

        if (!equipment || equipment.length === 0) {
          setResult({
            hasLocationData: false,
            isLoading: false,
            error: null,
            equipmentCount: 0,
            locatedCount: 0
          });
          return;
        }

        let locatedCount = 0;

        // Check each equipment item for location data
        for (const item of equipment) {
          let hasLocation = false;

          // A. Check if equipment.location is parseable as "lat, lng"
          if (item.location) {
            const coords = parseLatLng(item.location);
            if (coords) {
              hasLocation = true;
            }
          }

          // B. If not parseable but non-empty, assume it can be geocoded
          if (!hasLocation && item.location?.trim()) {
            hasLocation = true;
          }

          // C. Check for latest scan with geo-tag
          if (!hasLocation) {
            try {
              const { data: scans, error: scansError } = await supabase
                .from('scans')
                .select('location')
                .eq('equipment_id', item.id)
                .not('location', 'is', null)
                .order('scanned_at', { ascending: false })
                .limit(1);

              if (!scansError && scans && scans.length > 0 && scans[0].location) {
                const coords = parseLatLng(scans[0].location);
                if (coords) {
                  hasLocation = true;
                }
              }
            } catch (error) {
              // Ignore scan errors, continue checking
              console.warn(`Failed to check scans for equipment ${item.id}:`, error);
            }
          }

          if (hasLocation) {
            locatedCount++;
          }
        }

        // Only consider it has location data if we have a meaningful number of equipment items plotted
        // For now, require at least 2 equipment items or at least 20% of total equipment to have location data
        const hasMeaningfulLocationData = locatedCount >= 2 || (equipment.length > 0 && (locatedCount / equipment.length) >= 0.2);

        setResult({
          hasLocationData: hasMeaningfulLocationData,
          isLoading: false,
          error: null,
          equipmentCount: equipment.length,
          locatedCount
        });

        // Location check complete
        setLocationData({
          equipmentCount: equipment.length,
          locatedCount,
          hasLocationData: hasMeaningfulLocationData,
          locationDataRatio: equipment.length > 0 ? (locatedCount / equipment.length).toFixed(2) : 0
        });

      } catch (error) {
        console.error('[useEquipmentLocationCheck] Error checking equipment locations:', error);
        setResult({
          hasLocationData: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          equipmentCount: 0,
          locatedCount: 0
        });
      }
    };

    checkEquipmentLocations();
  }, [organizationId]);

  return result;
};
