import React, { useCallback, useMemo } from 'react';
import { StructuredLocationEditorControls } from '@/components/location/StructuredLocationEditorControls';
import {
  mergeMapCenterIntoPlaceData,
  useStructuredLocationEditorState,
} from '@/components/location/structuredLocationEditorState';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import {
  buildInventoryAddress,
  inventoryLocationToPlaceData,
  placeDataToInventoryStructuredLocation,
} from '@/features/inventory/utils/inventoryLocationUtils';
import type { InventoryStructuredLocationFields } from '@/features/inventory/utils/inventoryLocationUtils';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';

type InventoryStorageLocationFieldsProps = {
  structuredLocation: InventoryStructuredLocationFields;
  onStructuredLocationChange: (location: InventoryStructuredLocationFields) => void;
  locationLabel?: string;
  description?: string;
};

export function InventoryStorageLocationFields({
  structuredLocation,
  onStructuredLocationChange,
  locationLabel = 'Storage Address',
  description = 'Search for the physical address where this part is stored.',
}: InventoryStorageLocationFieldsProps) {
  const { isLoaded: isPlacesLoaded } = useGoogleMapsLoader();
  const isDark = useIsDarkTheme();
  const { googleMapsKey, mapId } = useGoogleMapsKey();

  const initialPlace = useMemo(
    () => inventoryLocationToPlaceData(structuredLocation),
    [
      structuredLocation.location_address,
      structuredLocation.location_city,
      structuredLocation.location_state,
      structuredLocation.location_country,
      structuredLocation.location_lat,
      structuredLocation.location_lng,
    ],
  );

  const editor = useStructuredLocationEditorState({
    initialPlace,
    fallbackAddress: buildInventoryAddress(structuredLocation),
  });

  const applyPlace = useCallback(
    (data: PlaceLocationData | null) => {
      onStructuredLocationChange(placeDataToInventoryStructuredLocation(data));
    },
    [onStructuredLocationChange],
  );

  const handlePlaceSelect = useCallback(
    (data: PlaceLocationData) => {
      editor.handlePlaceSelect(data);
      applyPlace(data);
    },
    [applyPlace, editor],
  );

  const handleClear = useCallback(() => {
    editor.handleClear();
    applyPlace(null);
  }, [applyPlace, editor]);

  const handleMapCenterChange = useCallback(
    (center: { lat: number; lng: number }) => {
      const next = mergeMapCenterIntoPlaceData(editor.pendingPlace, center);
      editor.handleMapCenterChange(center);
      applyPlace(next);
    },
    [applyPlace, editor],
  );

  const handleSaveLiveLocation = useCallback(
    async (data: PlaceLocationData) => {
      await editor.handleSaveLiveLocation(data);
      applyPlace(data);
    },
    [applyPlace, editor],
  );

  return (
    <StructuredLocationEditorControls
      className="space-y-3"
      locationLabel={locationLabel}
      locationAddress={editor.addressValue}
      onPlaceSelect={handlePlaceSelect}
      onClear={handleClear}
      isPlacesLoaded={isPlacesLoaded}
      previewCenter={editor.previewCenter}
      recenterKey={editor.recenterKey}
      onCenterChange={handleMapCenterChange}
      googleMapsKey={googleMapsKey}
      mapId={mapId}
      isDark={isDark}
      isLiveCaptureOpen={editor.isLiveCaptureOpen}
      onLiveCaptureOpenChange={editor.setIsLiveCaptureOpen}
      onConfirmLiveLocation={handleSaveLiveLocation}
      liveCaptureTitle="Set storage location from this device"
      liveCaptureConfirmLabel="Use this location"
      description={description}
      showMapPreviewLabel
    />
  );
}
