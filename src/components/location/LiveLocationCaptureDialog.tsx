import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { CenterPinMapPicker } from '@/components/location/CenterPinMapPicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  buildLiveLocationPlaceData,
  DeviceGeolocationError,
  requestCurrentDevicePosition,
  type LatLng,
} from '@/components/location/liveLocationCapture';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';

type LiveLocationCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: PlaceLocationData) => Promise<void>;
  isSaving?: boolean;
  title?: string;
  confirmLabel?: string;
  initialPosition?: LatLng | null;
};

export function LiveLocationCaptureDialog({
  open,
  onOpenChange,
  onConfirm,
  isSaving = false,
  title = 'Set equipment location',
  confirmLabel = 'Set equipment location',
  initialPosition = null,
}: LiveLocationCaptureDialogProps) {
  const isDark = useIsDarkTheme();
  const {
    googleMapsKey,
    mapId,
    isLoading: isKeyLoading,
    error: keyError,
  } = useGoogleMapsKey();

  const [pendingPosition, setPendingPosition] = useState<LatLng | null>(initialPosition);
  const [recenterTarget, setRecenterTarget] = useState<LatLng | null>(initialPosition);
  const [recenterKey, setRecenterKey] = useState(initialPosition ? 1 : 0);
  const [wasAdjusted, setWasAdjusted] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'detected' | 'error'>(
    initialPosition ? 'detected' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setPendingPosition(initialPosition);
    setRecenterTarget(initialPosition);
    setRecenterKey(initialPosition ? 1 : 0);
    setWasAdjusted(false);
    setGeoStatus(initialPosition ? 'detected' : 'idle');
    setErrorMessage(null);
  }, [initialPosition]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleRequestLocation = useCallback(async () => {
    setGeoStatus('loading');
    setErrorMessage(null);

    try {
      const position = await requestCurrentDevicePosition();
      setPendingPosition(position);
      setRecenterTarget(position);
      setRecenterKey((current) => current + 1);
      setWasAdjusted(false);
      setGeoStatus('detected');
    } catch (error) {
      setGeoStatus('error');
      if (error instanceof DeviceGeolocationError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to read your device location.');
      }
    }
  }, []);

  const handleMapCenterChange = useCallback((center: LatLng) => {
    setPendingPosition(center);
    setWasAdjusted(true);
    setGeoStatus('detected');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pendingPosition) {
      return;
    }

    await onConfirm(buildLiveLocationPlaceData(pendingPosition, { wasAdjusted }));
    onOpenChange(false);
  }, [onConfirm, onOpenChange, pendingPosition, wasAdjusted]);

  const canConfirm = geoStatus === 'detected' && pendingPosition != null && !isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Stand next to the equipment, use your device location once, then pan the map so the
            centered pin sits on the equipment. The pin lifts while you move the map; the shadow
            shows where it will land.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {geoStatus !== 'detected' ? (
            <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center">
              <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                We only request your location after you click the button below.
              </p>
              <Button
                type="button"
                className="mt-3 gap-2"
                onClick={() => void handleRequestLocation()}
                disabled={geoStatus === 'loading' || isSaving}
              >
                {geoStatus === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                Use my current location
              </Button>
              {errorMessage ? (
                <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
              ) : null}
            </div>
          ) : null}

          {geoStatus === 'detected' && pendingPosition ? (
            <div className="space-y-2">
              {isKeyLoading ? (
                <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              ) : keyError || !googleMapsKey ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center">
                  <p className="text-sm text-muted-foreground">Map preview unavailable.</p>
                </div>
              ) : (
                <CenterPinMapPicker
                  center={pendingPosition}
                  recenterTarget={recenterTarget}
                  recenterKey={recenterKey}
                  onCenterChange={handleMapCenterChange}
                  googleMapsKey={googleMapsKey}
                  mapId={mapId}
                  isDark={isDark}
                  className="rounded-lg border"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Selected location: {pendingPosition.lat.toFixed(5)}, {pendingPosition.lng.toFixed(5)}
                {wasAdjusted ? ' (adjusted on map)' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Confirm only if the shadow is where the equipment is right now.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm}
          >
            {isSaving ? 'Saving...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
