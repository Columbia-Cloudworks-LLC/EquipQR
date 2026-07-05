import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Check, Edit2, MapPin, Navigation, RefreshCw, X } from 'lucide-react';
import ClickableAddress from '@/components/ui/ClickableAddress';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader } from '@/components/ui/card';
import { LocationSourceSelector } from '@/components/location/LocationSourceSelector';
import { LiveLocationCaptureDialog } from '@/components/location/LiveLocationCaptureDialog';
import { useLatestScanCoordinateFromHistory } from '@/features/equipment/hooks/useEquipmentLocationHistory';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsDarkTheme } from '@/hooks/useThemeVersion';
import { cn } from '@/lib/utils';
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
  /** When `card`, renders the location source selector as the card header. */
  layout?: 'embedded' | 'card';
};

function buildAddressString(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string {
  return [parts.street, parts.city, parts.state, parts.country]
    .filter(Boolean)
    .join(', ');
}

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
  layout = 'embedded',
}: EquipmentLocationMapPanelProps) {
  const [selectedMode, setSelectedMode] = useState<LocationDisplayMode>('effective');
  const [pendingPlace, setPendingPlace] = useState<PlaceLocationData | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [isLiveCaptureOpen, setIsLiveCaptureOpen] = useState(false);
  const isMobile = useIsMobile();
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

  const handleLiveLocationConfirm = useCallback(
    async (data: PlaceLocationData) => {
      if (isEditingAddress) {
        setPendingPlace(data);
        setIsCleared(false);
        return;
      }

      if (!onSaveAddress) return;
      await onSaveAddress(data);
      setSelectedMode('manual');
    },
    [isEditingAddress, onSaveAddress],
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

  const showInlineLocationActions =
    canEditLocation && !isEditingAddress && onStartAddressEdit && onSaveAddress;

  const inlineLocationActionClassName = cn(
    'h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground',
    !isMobile &&
      'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
  );

  const renderInlineLocationActions = () => {
    if (!showInlineLocationActions) return null;

    const addressActionLabel = equipmentAddress
      ? 'Edit equipment address'
      : 'Set equipment address';

    return (
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onStartAddressEdit}
          disabled={isSavingAddress}
          className={inlineLocationActionClassName}
          aria-label={addressActionLabel}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsLiveCaptureOpen(true)}
          disabled={isSavingAddress}
          className={inlineLocationActionClassName}
          aria-label="Use my current location"
        >
          <Navigation className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  const renderAddressRow = (content: React.ReactNode) => (
    <div className={cn('flex items-start gap-1.5', showInlineLocationActions && 'group')}>
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <div className="min-w-0 flex-1">{content}</div>
        {renderInlineLocationActions()}
      </div>
    </div>
  );

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

  const panelBody = (
    <>
      {renderMapArea()}

      {resolved && center
        ? renderAddressRow(
            <ClickableAddress
              address={resolved.formattedAddress || undefined}
              lat={center.lat}
              lng={center.lng}
              className="text-xs"
            />,
          )
        : null}

      {!center && showInlineLocationActions
        ? renderAddressRow(
            <span className="text-xs text-muted-foreground">No location set</span>,
          )
        : null}

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsLiveCaptureOpen(true)}
            disabled={isSavingAddress}
            className="gap-1.5 h-7 text-xs"
          >
            <Navigation className="h-3 w-3" />
            Use my current location
          </Button>
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
            Saving sets a dedicated equipment address, which takes priority over the team default location.
          </p>
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
          onConfirm={handleLiveLocationConfirm}
          isSaving={isSavingAddress}
          title="Set equipment location from this device"
          confirmLabel="Use this location"
        />
      ) : null}
    </>
  );

  const sourceSelector = (
    <LocationSourceSelector
      value={selectedMode}
      onChange={setSelectedMode}
      options={options}
      variant="header"
    />
  );

  if (layout === 'card') {
    return (
      <>
        <CardHeader className="pb-2 pt-4 sm:pt-5">{sourceSelector}</CardHeader>
        <CardContent className="space-y-2 p-0 px-6 pb-4">{panelBody}</CardContent>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {sourceSelector}
      {panelBody}
    </div>
  );
}
