import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

export function getStructuredLocationAddressValue(
  isCleared: boolean,
  pendingPlace: PlaceLocationData | null,
  fallbackAddress: string,
): string {
  if (isCleared) {
    return '';
  }

  return pendingPlace?.formatted_address ?? fallbackAddress;
}

export function getStructuredLocationPreviewCenter(
  isCleared: boolean,
  pendingPlace: PlaceLocationData | null,
): { lat: number; lng: number } | null {
  if (isCleared || pendingPlace?.lat == null || pendingPlace?.lng == null) {
    return null;
  }

  return { lat: pendingPlace.lat, lng: pendingPlace.lng };
}

export function mergeMapCenterIntoPlaceData(
  current: PlaceLocationData | null,
  center: { lat: number; lng: number },
): PlaceLocationData {
  return {
    formatted_address: current?.formatted_address || 'Pinned map location',
    street: current?.street ?? '',
    city: current?.city ?? '',
    state: current?.state ?? '',
    country: current?.country ?? '',
    lat: center.lat,
    lng: center.lng,
  };
}

export function canSaveStructuredLocation(
  isCleared: boolean,
  pendingPlace: PlaceLocationData | null,
): boolean {
  return isCleared || (pendingPlace?.lat != null && pendingPlace.lng != null);
}

type UseStructuredLocationEditorStateOptions = {
  active?: boolean;
  initialPlace: PlaceLocationData | null;
  fallbackAddress: string;
};

export function useStructuredLocationEditorState({
  active = true,
  initialPlace,
  fallbackAddress,
}: UseStructuredLocationEditorStateOptions) {
  const [pendingPlace, setPendingPlace] = useState<PlaceLocationData | null>(initialPlace);
  const [recenterKey, setRecenterKey] = useState(0);
  const [isCleared, setIsCleared] = useState(false);
  const [isLiveCaptureOpen, setIsLiveCaptureOpen] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    setPendingPlace(initialPlace);
    setRecenterKey((current) => current + 1);
    setIsCleared(false);
  }, [active, initialPlace]);

  const addressValue = getStructuredLocationAddressValue(isCleared, pendingPlace, fallbackAddress);
  const previewCenter = useMemo(
    () => getStructuredLocationPreviewCenter(isCleared, pendingPlace),
    [isCleared, pendingPlace],
  );

  const handlePlaceSelect = useCallback((data: PlaceLocationData) => {
    setPendingPlace(data);
    setRecenterKey((current) => current + 1);
    setIsCleared(false);
  }, []);

  const handleClear = useCallback(() => {
    setPendingPlace(null);
    setIsCleared(true);
  }, []);

  const handleMapCenterChange = useCallback((center: { lat: number; lng: number }) => {
    setPendingPlace((current) => mergeMapCenterIntoPlaceData(current, center));
    setIsCleared(false);
  }, []);

  const handleSaveLiveLocation = useCallback(async (data: PlaceLocationData) => {
    setPendingPlace(data);
    setRecenterKey((current) => current + 1);
    setIsCleared(false);
  }, []);

  return {
    pendingPlace,
    isCleared,
    recenterKey,
    isLiveCaptureOpen,
    setIsLiveCaptureOpen,
    addressValue,
    previewCenter,
    canSave: canSaveStructuredLocation(isCleared, pendingPlace),
    handlePlaceSelect,
    handleClear,
    handleMapCenterChange,
    handleSaveLiveLocation,
  };
}
