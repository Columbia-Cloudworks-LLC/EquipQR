import React, { useCallback, useEffect, useState } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LatLng } from '@/components/location/liveLocationCapture';

type CenterPinMapPickerProps = {
  center: LatLng;
  onCenterChange: (center: LatLng) => void;
  googleMapsKey: string;
  mapId?: string | null;
  isDark?: boolean;
  className?: string;
  /** Increment to pan the map to `recenterTarget` without treating it as a user adjustment. */
  recenterKey?: number;
  recenterTarget?: LatLng | null;
};

function readMapCenter(map: google.maps.Map): LatLng | null {
  const mapCenter = map.getCenter();
  if (!mapCenter) {
    return null;
  }

  return { lat: mapCenter.lat(), lng: mapCenter.lng() };
}

function MapPanListeners({
  onPanningChange,
  onCenterChange,
}: {
  onPanningChange: (isPanning: boolean) => void;
  onCenterChange: (center: LatLng) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !window.google?.maps) {
      return;
    }

    const dragStartListener = map.addListener('dragstart', () => {
      onPanningChange(true);
    });

    const dragEndListener = map.addListener('dragend', () => {
      onPanningChange(false);
      const nextCenter = readMapCenter(map);
      if (nextCenter) {
        onCenterChange(nextCenter);
      }
    });

    return () => {
      window.google.maps.event.removeListener(dragStartListener);
      window.google.maps.event.removeListener(dragEndListener);
    };
  }, [map, onCenterChange, onPanningChange]);

  return null;
}

function MapRecenterController({
  recenterKey,
  recenterTarget,
}: {
  recenterKey: number;
  recenterTarget: LatLng | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !recenterTarget || recenterKey === 0) {
      return;
    }

    map.panTo(recenterTarget);
  }, [map, recenterKey, recenterTarget]);

  return null;
}

export function CenterPinMapPicker({
  center,
  onCenterChange,
  googleMapsKey,
  mapId,
  isDark = false,
  className,
  recenterKey = 0,
  recenterTarget = null,
}: CenterPinMapPickerProps) {
  const [isPanning, setIsPanning] = useState(false);

  const handlePanningChange = useCallback((panning: boolean) => {
    setIsPanning(panning);
  }, []);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ height: '16rem' }}
      data-testid="center-pin-map-picker"
    >
      <APIProvider apiKey={googleMapsKey} libraries={['marker']}>
        <Map
          mapId={mapId ?? undefined}
          defaultCenter={center}
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
          <MapRecenterController recenterKey={recenterKey} recenterTarget={recenterTarget} />
          <MapPanListeners onPanningChange={handlePanningChange} onCenterChange={onCenterChange} />
        </Map>
      </APIProvider>

      <div
        className="pointer-events-none absolute inset-0 z-10"
        aria-hidden="true"
        data-testid="center-pin-overlay"
        data-panning={isPanning ? 'true' : 'false'}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-px">
          <div
            className={cn(
              'h-1.5 w-6 rounded-[50%] bg-black/35 blur-[1px] transition-all duration-150',
              isPanning ? 'scale-100 opacity-90' : 'scale-90 opacity-55',
            )}
            data-testid="center-pin-shadow"
          />
        </div>

        <div
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 transition-transform duration-150 ease-out',
            isPanning ? '-translate-y-11 scale-105' : '-translate-y-7',
          )}
          data-testid="center-pin-marker"
        >
          <MapPin
            className="h-9 w-9 text-primary drop-shadow-md"
            fill="currentColor"
            strokeWidth={1.5}
          />
        </div>
      </div>
    </div>
  );
}
