import React, { useCallback } from 'react';
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';
import { cn } from '@/lib/utils';

type LocationDirectionsMiniMapProps = {
  lat: number;
  lng: number;
  address?: string;
  mapHeight?: string;
  className?: string;
  directionsUrl: string;
  ariaLabel?: string;
};

function MiniMapPin() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md">
      <MapPin className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}

function LocationDirectionsMiniMapCanvas({
  center,
  mapId,
  isDark,
  mapHeight,
  directionsUrl,
  ariaLabel,
}: {
  center: { lat: number; lng: number };
  mapId: string | null;
  isDark: boolean;
  mapHeight: string;
  directionsUrl: string;
  ariaLabel: string;
}) {
  const openDirections = useCallback(() => {
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  }, [directionsUrl]);

  return (
    <button
      type="button"
      onClick={openDirections}
      aria-label={ariaLabel}
      className="group relative block w-full overflow-hidden rounded-lg border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{ height: mapHeight }}
    >
      <Map
        mapId={mapId ?? undefined}
        defaultCenter={center}
        defaultZoom={15}
        gestureHandling="none"
        disableDefaultUI
        zoomControl={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        clickableIcons={false}
        colorScheme={isDark ? 'DARK' : 'LIGHT'}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <AdvancedMarker position={center}>
          <MiniMapPin />
        </AdvancedMarker>
      </Map>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <p className="text-xs font-medium text-white">Tap for directions in Google Maps</p>
      </div>
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5 group-active:bg-black/10" />
    </button>
  );
}

export function LocationDirectionsMiniMap({
  lat,
  lng,
  address,
  mapHeight = '180px',
  className,
  directionsUrl,
  ariaLabel,
}: LocationDirectionsMiniMapProps) {
  const isDark = useIsDarkTheme();
  const {
    googleMapsKey,
    mapId,
    isLoading: isKeyLoading,
    error: keyError,
    retry: retryMapsKey,
  } = useGoogleMapsKey();

  const center = { lat, lng };
  const label =
    ariaLabel ??
    (address
      ? `Open directions to ${address} in Google Maps`
      : `Open directions to ${lat.toFixed(5)}, ${lng.toFixed(5)} in Google Maps`);

  if (isKeyLoading) {
    return (
      <div
        className={cn(
          'rounded-lg bg-muted/50 border flex items-center justify-center',
          className,
        )}
        style={{ height: mapHeight }}
      >
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  if (keyError || !googleMapsKey) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center gap-2 px-4 text-center',
          className,
        )}
        style={{ height: mapHeight }}
      >
        <MapPin className="h-6 w-6 text-destructive/70" />
        <p className="text-xs text-muted-foreground">Map unavailable</p>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={retryMapsKey}>
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <APIProvider apiKey={googleMapsKey} libraries={['places', 'marker']}>
        <LocationDirectionsMiniMapCanvas
          center={center}
          mapId={mapId}
          isDark={isDark}
          mapHeight={mapHeight}
          directionsUrl={directionsUrl}
          ariaLabel={label}
        />
      </APIProvider>
    </div>
  );
}
