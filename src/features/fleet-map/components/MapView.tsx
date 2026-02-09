import React, { useState, useMemo, useCallback } from 'react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, Wrench, Users, Navigation, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { DATE_DISPLAY_FORMAT } from '@/config/date-formats';
import { buildGoogleMapsUrlFromCoords } from '@/utils/effectiveLocation';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { logger } from '@/utils/logger';

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

// ── Source color mapping ──────────────────────────────────────

const SOURCE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  team:      { fill: '#3B82F6', stroke: '#1E40AF', label: 'Team Override' },
  equipment: { fill: '#7C3AED', stroke: '#5B21B6', label: 'Manual Address' },
  scan:      { fill: '#16A34A', stroke: '#15803D', label: 'QR Scan GPS' },
  geocoded:  { fill: '#F59E0B', stroke: '#D97706', label: 'Geocoded' },
};

function buildMarkerSvg(fillColor: string, strokeColor: string): string {
  return `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
  </svg>`;
}

// ── Team HQ star marker ───────────────────────────────────────

const TEAM_HQ_COLOR = { fill: '#D97706', stroke: '#92400E', label: 'Team HQ' };

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

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

// ── Component ─────────────────────────────────────────────────

export const MapView: React.FC<MapViewProps> = ({
  googleMapsKey,
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

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

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

  // Build marker icons (memoized by source)
  const markerIcons = useMemo(() => {
    if (!isMapsLoaded || !window.google?.maps) return {};
    const icons: Record<string, google.maps.Icon> = {};
    for (const [source, colors] of Object.entries(SOURCE_COLORS)) {
      icons[source] = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(buildMarkerSvg(colors.fill, colors.stroke)),
        scaledSize: new window.google.maps.Size(28, 36),
        anchor: new window.google.maps.Point(14, 36),
      };
    }
    return icons;
  }, [isMapsLoaded]);

  // Build team HQ star marker icon
  const hqMarkerIcon = useMemo(() => {
    if (!isMapsLoaded || !window.google?.maps) return undefined;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(buildStarMarkerSvg(TEAM_HQ_COLOR.fill, TEAM_HQ_COLOR.stroke)),
      scaledSize: new window.google.maps.Size(32, 40),
      anchor: new window.google.maps.Point(16, 40),
    };
  }, [isMapsLoaded]);

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

  const sourceConfig = selectedMarker ? SOURCE_COLORS[selectedMarker.source] || SOURCE_COLORS.equipment : null;

  const totalMarkerCount = filteredLocations.length + teamHQLocations.length;

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={mapCenter}
        zoom={totalMarkerCount === 1 ? 14 : totalMarkerCount > 0 ? 6 : 4}
        options={MAP_OPTIONS}
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
            <div className="p-3 min-w-[220px] max-w-[300px]">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="p-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TEAM_HQ_COLOR.fill + '20' }}
                >
                  <Star className="h-4 w-4" style={{ color: TEAM_HQ_COLOR.fill }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{selectedHQ.name}</h3>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: TEAM_HQ_COLOR.fill }}
                  >
                    Team HQ
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => navigate(`/dashboard/teams/${selectedHQ.id}`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Team
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
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
            <div className="p-3 min-w-[280px] max-w-[350px]">
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
                  <p className="text-xs text-muted-foreground">{selectedMarker.manufacturer} {selectedMarker.model}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: sourceConfig?.fill }}
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
                  <span className="font-mono truncate ml-2">{selectedMarker.serial_number}</span>
                </div>
                {selectedMarker.working_hours != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Hours:</span>
                    <span>{selectedMarker.working_hours.toLocaleString()}</span>
                  </div>
                )}
                {selectedMarker.last_maintenance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" />Maintenance:</span>
                    <span>{formatDate(selectedMarker.last_maintenance)}</span>
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => navigate(`/dashboard/equipment/${selectedMarker.id}`)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
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

      {/* Map Legend */}
      <div className="absolute bottom-6 right-2 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-md">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Location Source</p>
        <div className="space-y-1">
          {Object.entries(SOURCE_COLORS).map(([key, { fill, label }]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fill }} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
          {teamHQLocations.length > 0 && (
            <div className="flex items-center gap-2 pt-0.5 border-t border-border/50 mt-0.5">
              <Star className="w-2.5 h-2.5 flex-shrink-0" style={{ color: TEAM_HQ_COLOR.fill, fill: TEAM_HQ_COLOR.fill }} />
              <span className="text-[10px] text-muted-foreground">{TEAM_HQ_COLOR.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
