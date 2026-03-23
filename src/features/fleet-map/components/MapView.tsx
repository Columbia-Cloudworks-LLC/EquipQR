import React, { useState, useMemo, useCallback } from 'react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, Wrench, Users, Navigation, Star, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { DATE_DISPLAY_FORMAT } from '@/config/date-formats';
import { buildGoogleMapsUrlFromCoords } from '@/utils/effectiveLocation';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { cn } from '@/lib/utils';

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';
    return format(date, DATE_DISPLAY_FORMAT);
  } catch {
    return 'Invalid date';
  }
}

function getRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Invalid date';
    const diffInMinutes = Math.abs(Date.now() - date.getTime()) / (1000 * 60);
    if (diffInMinutes < 1) return 'just now';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

type SourceType = 'team' | 'equipment' | 'scan' | 'geocoded';

type MarkerColor = {
  fill: string;
  stroke: string;
  label: string;
};

const SOURCE_TOKEN_CONFIG: Record<SourceType, { token: 'info' | 'primary' | 'success' | 'warning'; label: string }> = {
  team: { token: 'info', label: 'Team Override' },
  equipment: { token: 'primary', label: 'Manual Address' },
  scan: { token: 'success', label: 'QR Scan GPS' },
  geocoded: { token: 'warning', label: 'Geocoded' },
};

const SOURCE_TOKEN_CLASSES: Record<
  SourceType,
  { badge: string; dot: string }
> = {
  team: {
    badge: 'bg-info text-info-foreground',
    dot: 'bg-info',
  },
  equipment: {
    badge: 'bg-primary text-primary-foreground',
    dot: 'bg-primary',
  },
  scan: {
    badge: 'bg-success text-success-foreground',
    dot: 'bg-success',
  },
  geocoded: {
    badge: 'bg-warning text-warning-foreground',
    dot: 'bg-warning',
  },
};

const TEAM_HQ_CLASSES = {
  subtle: 'bg-warning/20',
  icon: 'text-warning',
  badge: 'bg-warning text-warning-foreground',
  dot: 'text-warning',
};

const SOURCE_TOKEN_FALLBACKS: Record<SourceType, string> = {
  team: '#3B82F6',
  equipment: '#7C3AED',
  scan: '#16A34A',
  geocoded: '#F59E0B',
};

const TEAM_HQ_TOKEN = { token: 'warning' as const, label: 'Team HQ', fallback: '#D97706' };

function hslToHex(h: number, s: number, l: number): string {
  const normalizedS = s / 100;
  const normalizedL = l / 100;
  const chroma = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;
  if (huePrime >= 0 && huePrime < 1) [r, g, b] = [chroma, x, 0];
  else if (huePrime < 2) [r, g, b] = [x, chroma, 0];
  else if (huePrime < 3) [r, g, b] = [0, chroma, x];
  else if (huePrime < 4) [r, g, b] = [0, x, chroma];
  else if (huePrime < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  const matchLightness = normalizedL - chroma / 2;
  const toHex = (value: number) =>
    Math.round((value + matchLightness) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function darkenHex(hexColor: string, amount = 0.2): string {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return hexColor;

  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const darken = (value: number) => clamp(Math.round(value * (1 - amount)));

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
}

function resolveTokenHex(tokenName: string, fallbackHex: string): string {
  if (typeof window === 'undefined') return fallbackHex;
  const rawTokenValue = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${tokenName}`)
    .trim();
  const hslMatch = rawTokenValue.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!hslMatch) return fallbackHex;

  const [, h, s, l] = hslMatch;
  return hslToHex(Number(h), Number(s), Number(l));
}

function buildMarkerSvg(fillColor: string, strokeColor: string): string {
  return `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
  </svg>`;
}

/**
 * Star-shaped marker SVG for team HQ locations.
 * Uses a map pin outline with a 5-point star center instead of a circle.
 */
function buildStarMarkerSvg(fillColor: string, strokeColor: string): string {
  // 5-point star centered at (14,13) with outer radius ~6, inner radius ~2.5
  return `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C8.268 0 2 6.268 2 14c0 10.5 14 24 14 24s14-13.5 14-24C30 6.268 23.732 0 16 0z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>
    <path d="M16 6.5l1.9 3.8 4.2.6-3 3 .7 4.2L16 16l-3.8 2.1.7-4.2-3-3 4.2-.6z" fill="white" opacity="0.95"/>
  </svg>`;
}

// ── Types ─────────────────────────────────────────────────────

export interface EquipmentLocation {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  lat: number;
  lng: number;
  source: 'equipment' | 'geocoded' | 'scan' | 'team';
  formatted_address?: string;
  working_hours?: number;
  last_maintenance?: string;
  image_url?: string;
  location_updated_at?: string;
  team_id?: string | null;
  team_name?: string;
}

export interface TeamHQLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  formatted_address?: string;
}

interface MapViewProps {
  googleMapsKey: string;
  equipmentLocations: EquipmentLocation[];
  filteredLocations: EquipmentLocation[];
  /** Team HQ locations to display with star markers */
  teamHQLocations?: TeamHQLocation[];
  isMapsLoaded?: boolean;
  mapsLoadError?: Error;
  /** When set, the map centers on this equipment and opens its info window */
  focusEquipmentId?: string | null;
  onMarkerClick?: (id: string) => void;
}

const BASE_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

/**
 * Dark basemap style — deep navy/charcoal palette matching the EquipQR dark shell.
 * Applied automatically when the user's OS/app theme is dark.
 */
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e2533' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8896aa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e2533' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#313d52' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9aa6b8' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#adb9c8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1e2533' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#252e3f' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#252e3f' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8d' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2d22' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3d6b4a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3a52' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2233' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8896aa' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#33415a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d5270' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e2d40' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b8c8d8' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8d' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#283245' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#7888a0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1824' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d5068' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0f1824' }] },
];

// ── Component ─────────────────────────────────────────────────

export const MapView: React.FC<MapViewProps> = ({
  equipmentLocations,
  filteredLocations,
  teamHQLocations = [],
  isMapsLoaded = false,
  mapsLoadError,
  focusEquipmentId,
  onMarkerClick,
}) => {
  const navigate = useNavigate();
  const [selectedMarker, setSelectedMarker] = useState<EquipmentLocation | null>(null);
  const [selectedHQ, setSelectedHQ] = useState<TeamHQLocation | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  // Compute the bounding box of all visible markers and fit the map to it.
  // Called once on initial load and exposed for the "Fit All" button.
  const fitAllMarkers = useCallback(() => {
    if (!mapRef || typeof window === 'undefined' || !window.google?.maps) return;

    const allPoints: { lat: number; lng: number }[] = [
      ...filteredLocations.map((l) => ({ lat: l.lat, lng: l.lng })),
      ...teamHQLocations.map((h) => ({ lat: h.lat, lng: h.lng })),
    ];

    if (allPoints.length === 0) return;

    if (allPoints.length === 1) {
      mapRef.panTo(allPoints[0]);
      mapRef.setZoom(14);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    allPoints.forEach((p) => bounds.extend(p));
    mapRef.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });

    // Cap zoom at 15 to prevent over-zooming on tightly-clustered markers.
    window.google.maps.event.addListenerOnce(mapRef, 'idle', () => {
      const z = mapRef.getZoom();
      if (z !== undefined && z > 15) mapRef.setZoom(15);
    });
  }, [mapRef, filteredLocations, teamHQLocations]);

  // Auto-fit all markers when the map first becomes available.
  React.useEffect(() => {
    if (!mapRef) return;
    fitAllMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef]); // Intentionally only on initial load — filter changes don't auto-refit.

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => setThemeVersion((value) => value + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => observer.disconnect();
  }, []);

  const sourceColors = useMemo<Record<SourceType, MarkerColor>>(() => {
    return (Object.keys(SOURCE_TOKEN_CONFIG) as SourceType[]).reduce((accumulator, sourceType) => {
      const config = SOURCE_TOKEN_CONFIG[sourceType];
      const fill = resolveTokenHex(config.token, SOURCE_TOKEN_FALLBACKS[sourceType]);
      accumulator[sourceType] = {
        fill,
        stroke: darkenHex(fill, 0.22),
        label: config.label,
      };
      return accumulator;
    }, {} as Record<SourceType, MarkerColor>);
  }, [themeVersion]);

  const teamHQColor = useMemo<MarkerColor>(() => {
    const fill = resolveTokenHex(TEAM_HQ_TOKEN.token, TEAM_HQ_TOKEN.fallback);
    return {
      fill,
      stroke: darkenHex(fill, 0.3),
      label: TEAM_HQ_TOKEN.label,
    };
  }, [themeVersion]);

  // Auto-focus on a specific equipment when focusEquipmentId changes
  React.useEffect(() => {
    if (!focusEquipmentId || !mapRef) return;
    const target = filteredLocations.find((l) => l.id === focusEquipmentId);
    if (target) {
      mapRef.panTo({ lat: target.lat, lng: target.lng });
      mapRef.setZoom(15);
      setSelectedMarker(target);
    }
  }, [focusEquipmentId, filteredLocations, mapRef]);

  // Calculate bounds to fit all markers (equipment + team HQs)
  const mapCenter = useMemo(() => {
    const equipLocs = filteredLocations.length > 0 ? filteredLocations : equipmentLocations;
    const allPoints: { lat: number; lng: number }[] = [
      ...equipLocs,
      ...teamHQLocations,
    ];
    if (allPoints.length === 0) return { lat: 39.8283, lng: -98.5795 };
    const avgLat = allPoints.reduce((sum, loc) => sum + loc.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, loc) => sum + loc.lng, 0) / allPoints.length;
    return { lat: avgLat, lng: avgLng };
  }, [filteredLocations, equipmentLocations, teamHQLocations]);

  const mapContainerStyle = useMemo(
    () => ({ width: '100%', height: '100%' }),
    []
  );

  // Recompute map options whenever the theme changes so the basemap switches
  // between light (default Google tiles) and dark (navy/charcoal custom styles).
  const mapOptions = useMemo<google.maps.MapOptions>(() => {
    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');
    return {
      ...BASE_MAP_OPTIONS,
      styles: isDark ? DARK_MAP_STYLES : [],
    };
  }, [themeVersion]);

  // Build marker icons (memoized by source)
  const markerIcons = useMemo(() => {
    if (!isMapsLoaded || !window.google?.maps) return {};
    const icons: Record<SourceType, google.maps.Icon> = {} as Record<SourceType, google.maps.Icon>;
    for (const [source, colors] of Object.entries(sourceColors) as [SourceType, MarkerColor][]) {
      icons[source] = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(buildMarkerSvg(colors.fill, colors.stroke)),
        scaledSize: new window.google.maps.Size(28, 36),
        anchor: new window.google.maps.Point(14, 36),
      };
    }
    return icons;
  }, [isMapsLoaded, sourceColors]);

  // Build team HQ star marker icon
  const hqMarkerIcon = useMemo(() => {
    if (!isMapsLoaded || !window.google?.maps) return undefined;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(buildStarMarkerSvg(teamHQColor.fill, teamHQColor.stroke)),
      scaledSize: new window.google.maps.Size(32, 40),
      anchor: new window.google.maps.Point(16, 40),
    };
  }, [isMapsLoaded, teamHQColor.fill, teamHQColor.stroke]);

  if (!isMapsLoaded) {
    return (
      <div className="h-full w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading Google Maps...</p>
      </div>
    );
  }

  if (mapsLoadError) {
    return (
      <div className="h-full w-full bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load Google Maps</p>
          <p className="text-sm text-muted-foreground mt-1">{mapsLoadError.message}</p>
        </div>
      </div>
    );
  }

  const sourceConfig = selectedMarker ? sourceColors[selectedMarker.source] || sourceColors.equipment : null;
  const selectedSourceType: SourceType = selectedMarker?.source ?? 'equipment';
  const selectedSourceClasses = SOURCE_TOKEN_CLASSES[selectedSourceType];

  const totalMarkerCount = filteredLocations.length + teamHQLocations.length;

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={totalMarkerCount === 1 ? 14 : totalMarkerCount > 0 ? 6 : 4}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {filteredLocations.map((location) => (
          <MarkerF
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
            onClick={() => {
              setSelectedHQ(null);
              setSelectedMarker(location);
              onMarkerClick?.(location.id);
            }}
            icon={markerIcons[location.source]}
          />
        ))}

        {/* Team HQ star markers */}
        {teamHQLocations.map((hq) => (
          <MarkerF
            key={`hq-${hq.id}`}
            position={{ lat: hq.lat, lng: hq.lng }}
            onClick={() => {
              setSelectedMarker(null);
              setSelectedHQ(hq);
            }}
            icon={hqMarkerIcon}
            zIndex={1000}
          />
        ))}

        {/* Team HQ info window */}
        {selectedHQ && (
          <InfoWindowF
            position={{ lat: selectedHQ.lat, lng: selectedHQ.lng }}
            onCloseClick={() => setSelectedHQ(null)}
          >
            <div className="w-[min(88vw,300px)] p-3">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn("p-1.5 rounded-full flex-shrink-0", TEAM_HQ_CLASSES.subtle)}
                >
                  <Star className={cn("h-4 w-4", TEAM_HQ_CLASSES.icon)} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{selectedHQ.name}</h3>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      TEAM_HQ_CLASSES.badge
                    )}
                  >
                    {teamHQColor.label}
                  </span>
                </div>
              </div>

              {/* Address */}
              {selectedHQ.formatted_address && (
                <div className="mb-3">
                  <ClickableAddress
                    address={selectedHQ.formatted_address}
                    lat={selectedHQ.lat}
                    lng={selectedHQ.lng}
                    className="text-xs"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="sm"
                  className="flex-1 min-h-11 text-sm sm:h-8 sm:min-h-0 sm:text-xs"
                  onClick={() => navigate(`/dashboard/teams/${selectedHQ.id}`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Team
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-h-11 text-sm sm:h-8 sm:min-h-0 sm:text-xs"
                  onClick={() => {
                    window.open(buildGoogleMapsUrlFromCoords(selectedHQ.lat, selectedHQ.lng), '_blank');
                  }}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Directions
                </Button>
              </div>
            </div>
          </InfoWindowF>
        )}

        {selectedMarker && (
          <InfoWindowF
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="w-[min(92vw,350px)] p-3">
              {/* Header */}
              <div className="flex gap-3 mb-3">
                {selectedMarker.image_url && (
                  <img
                    src={selectedMarker.image_url}
                    alt={selectedMarker.name}
                    className="w-14 h-14 object-cover rounded-lg border flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{selectedMarker.name}</h3>
                  <p className="truncate text-xs text-muted-foreground" title={`${selectedMarker.manufacturer} ${selectedMarker.model}`}>
                    {selectedMarker.manufacturer} {selectedMarker.model}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        selectedSourceClasses.badge
                      )}
                    >
                      {sourceConfig?.label}
                    </span>
                    {selectedMarker.team_name && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Users className="h-2.5 w-2.5" />
                        {selectedMarker.team_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial:</span>
                  <span className="font-mono truncate ml-2 text-foreground">{selectedMarker.serial_number}</span>
                </div>
                {selectedMarker.working_hours != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Hours:</span>
                    <span className="text-foreground">{selectedMarker.working_hours.toLocaleString()}</span>
                  </div>
                )}
                {selectedMarker.last_maintenance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" />Maintenance:</span>
                    <span className="text-foreground">{formatDate(selectedMarker.last_maintenance)}</span>
                  </div>
                )}
                {selectedMarker.formatted_address && (
                  <div className="pt-1">
                    <ClickableAddress
                      address={selectedMarker.formatted_address}
                      lat={selectedMarker.lat}
                      lng={selectedMarker.lng}
                      className="text-xs"
                    />
                  </div>
                )}
                {selectedMarker.location_updated_at && (
                  <div className="text-[10px] text-muted-foreground">
                    Updated {getRelativeTime(selectedMarker.location_updated_at)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="sm"
                  className="flex-1 min-h-11 text-sm sm:h-8 sm:min-h-0 sm:text-xs"
                  onClick={() => navigate(`/dashboard/equipment/${selectedMarker.id}`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-h-11 text-sm sm:h-8 sm:min-h-0 sm:text-xs"
                  onClick={() => {
                    window.open(buildGoogleMapsUrlFromCoords(selectedMarker.lat, selectedMarker.lng), '_blank');
                  }}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Directions
                </Button>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* Fit All button — bottom-left mirrors the legend on the right.
           Visible when the equipment panel is closed; behind the panel when open (z-20). */}
      <Button
        variant="outline"
        size="sm"
        onClick={fitAllMarkers}
        title="Fit all markers in view"
        aria-label="Fit all markers in view"
        className="absolute bottom-16 left-4 z-10 h-8 w-8 p-0 bg-background/95 backdrop-blur-sm border-border/80 shadow-xl hover:bg-background"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      {/* Map Legend — bottom-right to avoid conflict with Google's top-right controls */}
      <div className="absolute bottom-6 right-4 bg-background/95 backdrop-blur-sm border border-border/80 rounded-xl px-3.5 py-3 shadow-xl z-10">
        <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2">Location Source</p>
        <div className="space-y-1.5">
          {(Object.entries(sourceColors) as [SourceType, MarkerColor][]).map(([key, { label }]) => (
            <div key={key} className="flex items-center gap-2.5">
              <span className={cn("w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/10", SOURCE_TOKEN_CLASSES[key].dot)} />
              <span className="text-[11px] text-muted-foreground leading-none">{label}</span>
            </div>
          ))}
          {teamHQLocations.length > 0 && (
            <div className="flex items-center gap-2.5 pt-1.5 border-t border-border/40 mt-0.5">
              <Star className={cn("w-3 h-3 flex-shrink-0 fill-current", TEAM_HQ_CLASSES.dot)} />
              <span className="text-[11px] text-muted-foreground leading-none">{teamHQColor.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

