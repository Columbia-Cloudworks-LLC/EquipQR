import React, { useCallback, useEffect, useState } from 'react';
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
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
  const [wasAdjusted, setWasAdjusted] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'detected' | 'error'>(
    initialPosition ? 'detected' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setPendingPosition(initialPosition);
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

  const handleDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();
    if (lat == null || lng == null) {
      return;
    }
    setPendingPosition({ lat, lng });
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
            Stand next to the equipment, use your device location once, then confirm the pin on the
            map. Drag the marker if you need to fine-tune the spot before saving.
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
                <div className="overflow-hidden rounded-lg border" style={{ height: '16rem' }}>
                  <APIProvider apiKey={googleMapsKey} libraries={['marker']}>
                    <Map
                      mapId={mapId ?? undefined}
                      defaultCenter={pendingPosition}
                      center={pendingPosition}
                      defaultZoom={17}
                      gestureHandling="greedy"
                      disableDefaultUI
                      zoomControl
                      streetViewControl={false}
                      mapTypeControl={false}
                      fullscreenControl={false}
                      colorScheme={isDark ? 'DARK' : 'LIGHT'}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <AdvancedMarker
                        position={pendingPosition}
                        draggable
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-primary shadow-md" />
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Detected location: {pendingPosition.lat.toFixed(5)}, {pendingPosition.lng.toFixed(5)}
                {wasAdjusted ? ' (adjusted on map)' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Confirm only if this pin is where the equipment is right now.
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
