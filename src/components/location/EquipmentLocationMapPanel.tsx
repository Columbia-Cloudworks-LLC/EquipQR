import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Check, Edit2, MapPin, Navigation, RefreshCw, X } from 'lucide-react';
import ClickableAddress from '@/components/ui/ClickableAddress';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { Button } from '@/components/ui/button';
import { LocationSourceBadge } from '@/components/location/LocationSourceBadge';
import { LocationSourceSelector } from '@/components/location/LocationSourceSelector';
import { LiveLocationCaptureDialog } from '@/components/location/LiveLocationCaptureDialog';
import { useLatestScanCoordinateFromHistory } from '@/features/equipment/hooks/useEquipmentLocationHistory';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';
import { buildAddressString } from '@/features/equipment/components/EquipmentLocationField';
import {
  buildEquipmentLocationOptions,
  parseLastKnownLocation,
  resolveLocationByMode,
  type LocationDisplayMode,
} from '@/utils/effectiveLocation';

type EquipmentLike = {
  id: string;
  organization_id?: string;
  team_id?: string | null;
  use_team_location?: boolean | null;
  assigned_location_lat?: number | null;
  assigned_location_lng?: number | null;
  assigned_location_street?: string | null;
  assigned_location_city?: string | null;
  assigned_location_state?: string | null;
  assigned_location_country?: string | null;
  location?: string | null;
  last_known_location?: unknown;
  updated_at?: string | null;
};

type EquipmentLocationMapPanelProps = {
  equipment: EquipmentLike;
  assignedTeam: EquipmentTeamSummary | null;
  organizationId: string;
  scanLocationCollectionEnabled?: boolean;
  mapHeight?: string;
  canEditLocation?: boolean;
  isEditingAddress?: boolean;
  isSavingAddress?: boolean;
  isPlacesLoaded?: boolean;
  onStartAddressEdit?: () => void;
  onCancelAddressEdit?: () => void;
  onSaveAddress?: (data: PlaceLocationData) => Promise<void>;
};

function MiniMapMarker({ position }: { position: { lat: number; lng: number } }) {
  return (
    <AdvancedMarker position={position}>
      <div className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-primary shadow-md" />
    </AdvancedMarker>
  );
}

function MiniMapCanvas({
  center,
  mapId,
  isDark,
  mapHeight,
}: {
  center: { lat: number; lng: number };
  mapId: string | null;
  isDark: boolean;
  mapHeight: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden border" style={{ height: mapHeight }}>
      <Map
        mapId={mapId ?? undefined}
        defaultCenter={center}
        defaultZoom={14}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl={false}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        colorScheme={isDark ? 'DARK' : 'LIGHT'}
        style={{ width: '100%', height: '100%' }}
      >
        <MiniMapMarker position={center} />
      </Map>
    </div>
  );
}

export function EquipmentLocationMapPanel({
  equipment,
  assignedTeam,
  organizationId,
  scanLocationCollectionEnabled = true,
  mapHeight = '180px',
  canEditLocation = false,
  isEditingAddress = false,
  isSavingAddress = false,
  isPlacesLoaded = false,
  onStartAddressEdit,
  onCancelAddressEdit,
  onSaveAddress,
}: EquipmentLocationMapPanelProps) {
  const [selectedMode, setSelectedMode] = useState<LocationDisplayMode>('effective');
  const [pendingPlace, setPendingPlace] = useState<PlaceLocationData | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [isLiveCaptureOpen, setIsLiveCaptureOpen] = useState(false);
  const isDark = useIsDarkTheme();

  const {
    googleMapsKey,
    mapId,
    isLoading: isKeyLoading,
    error: keyError,
    retry: retryMapsKey,
  } = useGoogleMapsKey();

  const lastKnownScan = useMemo(
    () =>
      parseLastKnownLocation(
        equipment.last_known_location as Record<string, unknown> | null | undefined,
      ),
    [equipment.last_known_location],
  );

  const { latestScan: historyScan } = useLatestScanCoordinateFromHistory(
    organizationId,
    equipment.id,
    { enabled: scanLocationCollectionEnabled && !lastKnownScan },
  );

  const lastScan = useMemo(
    () => lastKnownScan ?? (scanLocationCollectionEnabled ? historyScan : undefined),
    [historyScan, lastKnownScan, scanLocationCollectionEnabled],
  );

  const locationParams = useMemo(
    () => ({
      team: assignedTeam
        ? {
            override_equipment_location: assignedTeam.override_equipment_location,
            location_lat: assignedTeam.location_lat,
            location_lng: assignedTeam.location_lng,
            location_address: assignedTeam.location_address,
            location_city: assignedTeam.location_city,
            location_state: assignedTeam.location_state,
            location_country: assignedTeam.location_country,
          }
        : undefined,
      equipment: {
        use_team_location: equipment.use_team_location ?? undefined,
        assigned_location_lat: equipment.assigned_location_lat,
        assigned_location_lng: equipment.assigned_location_lng,
        assigned_location_street: equipment.assigned_location_street,
        assigned_location_city: equipment.assigned_location_city,
        assigned_location_state: equipment.assigned_location_state,
        assigned_location_country: equipment.assigned_location_country,
        locationText: equipment.location,
        updatedAt: equipment.updated_at ?? undefined,
      },
      lastScan,
    }),
    [assignedTeam, equipment, lastScan],
  );

  const options = useMemo(
    () => buildEquipmentLocationOptions(locationParams),
    [locationParams],
  );

  const resolved = useMemo(
    () => resolveLocationByMode(selectedMode, options, locationParams),
    [selectedMode, options, locationParams],
  );

  const equipmentAddress = buildAddressString({
    street: equipment.assigned_location_street,
    city: equipment.assigned_location_city,
    state: equipment.assigned_location_state,
    country: equipment.assigned_location_country,
  });

  const hasCoords = resolved?.lat != null && resolved?.lng != null;
  const center = hasCoords && resolved ? { lat: resolved.lat, lng: resolved.lng } : null;

  const handleSaveLiveLocation = useCallback(
    async (data: PlaceLocationData) => {
      if (!onSaveAddress) return;
      await onSaveAddress(data);
      setSelectedMode('manual');
    },
    [onSaveAddress],
  );

  const handleSaveAddress = useCallback(async () => {
    if (!onSaveAddress) return;

    if (isCleared) {
      await onSaveAddress({
        formatted_address: '',
        street: '',
        city: '',
        state: '',
        country: '',
        lat: undefined,
        lng: undefined,
      } as PlaceLocationData);
      setPendingPlace(null);
      setIsCleared(false);
      return;
    }

    if (pendingPlace) {
      await onSaveAddress(pendingPlace);
      setPendingPlace(null);
      setSelectedMode('manual');
    }
  }, [isCleared, onSaveAddress, pendingPlace]);

  const renderMapArea = () => {
    if (isKeyLoading) {
      return (
        <div
          className="rounded-lg bg-muted/50 border flex items-center justify-center"
          style={{ height: mapHeight }}
        >
          <p className="text-xs text-muted-foreground">Loading map...</p>
        </div>
      );
    }

    if (keyError || !googleMapsKey) {
      return (
        <div
          className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center gap-2 px-4 text-center"
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

    if (!center) {
      return (
        <div
          className="rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center"
          style={{ height: mapHeight }}
        >
          <div className="text-center px-4 space-y-1">
            <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-medium text-muted-foreground">No map coordinates yet</p>
            <p className="text-[11px] text-muted-foreground">
              {canEditLocation
                ? 'Set an equipment address or use this device\u2019s location.'
                : 'Set an equipment address or current device location on the equipment page.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <APIProvider apiKey={googleMapsKey} libraries={['places', 'marker']}>
        <MiniMapCanvas center={center} mapId={mapId} isDark={isDark} mapHeight={mapHeight} />
      </APIProvider>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {resolved ? (
          <LocationSourceBadge source={resolved.source} />
        ) : (
          <span className="text-xs text-muted-foreground">No location</span>
        )}
        <LocationSourceSelector
          value={selectedMode}
          onChange={setSelectedMode}
          options={options}
          className="min-w-[180px]"
        />
      </div>

      {renderMapArea()}

      {resolved?.formattedAddress && center && (
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <ClickableAddress
            address={resolved.formattedAddress}
            lat={center.lat}
            lng={center.lng}
            className="text-xs"
          />
        </div>
      )}

      {selectedMode === 'team' && assignedTeam && (
        <Link
          to={`/dashboard/teams/${assignedTeam.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Edit team location on team page
        </Link>
      )}

      {canEditLocation && isEditingAddress && onSaveAddress && onCancelAddressEdit && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <GooglePlacesAutocomplete
            value={isCleared ? '' : (pendingPlace?.formatted_address ?? equipmentAddress)}
            onPlaceSelect={(data) => {
              setPendingPlace(data);
              setIsCleared(false);
            }}
            onClear={() => {
              setPendingPlace(null);
              setIsCleared(true);
            }}
            placeholder="Search for an equipment address..."
            isLoaded={isPlacesLoaded}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => void handleSaveAddress()}
              disabled={(!pendingPlace && !isCleared) || isSavingAddress}
              className="gap-1 h-7 text-xs"
            >
              <Check className="h-3 w-3" />
              {isSavingAddress ? 'Saving...' : 'Save equipment location'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelAddressEdit}
              disabled={isSavingAddress}
              className="gap-1 h-7 text-xs"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Saving sets this equipment address as the active location and stops inheriting the team location.
          </p>
        </div>
      )}

      {canEditLocation && !isEditingAddress && onStartAddressEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStartAddressEdit}
            className="h-7 px-2 text-xs text-primary hover:text-primary/80"
          >
            <Edit2 className="mr-1 h-3 w-3" />
            {equipmentAddress ? 'Edit equipment address' : 'Set equipment address'}
          </Button>
          {!center && onSaveAddress ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsLiveCaptureOpen(true)}
              disabled={isSavingAddress}
              className="h-7 px-2 text-xs text-primary hover:text-primary/80"
            >
              <Navigation className="mr-1 h-3 w-3" />
              Use my current location
            </Button>
          ) : null}
        </div>
      )}

      {!canEditLocation && !center && equipment.id ? (
        <Link
          to={`/dashboard/equipment/${equipment.id}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          Set location on equipment page
        </Link>
      ) : null}

      {canEditLocation && onSaveAddress ? (
        <LiveLocationCaptureDialog
          open={isLiveCaptureOpen}
          onOpenChange={setIsLiveCaptureOpen}
          onConfirm={handleSaveLiveLocation}
          isSaving={isSavingAddress}
        />
      ) : null}
    </div>
  );
}
