import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ExternalLink, Clock, Wrench, Users, Navigation, Star, Maximize2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { DATE_DISPLAY_FORMAT } from '@/config/date-formats';
import { buildGoogleMapsUrlFromCoords } from '@/utils/effectiveLocation';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { cn } from '@/lib/utils';
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
  /**
   * Cloud-managed Map ID required for vector maps + Advanced Markers.
   * `null` triggers a one-time console warning and renders a degraded
   * experience (raster tiles, fallback marker rendering by Google).
   */
  mapId?: string | null;
  equipmentLocations: EquipmentLocation[];
  filteredLocations: EquipmentLocation[];
  /** Team HQ locations to display with star markers */
  teamHQLocations?: TeamHQLocation[];
  /**
   * Ignored — kept for API compatibility with the prior implementation.
   * The vis.gl `<APIProvider>` handles loading internally.
   */
  isMapsLoaded?: boolean;
  /** Ignored — kept for API compatibility. */
  mapsLoadError?: Error;
  /** When set, the map centers on this equipment and opens its info window */
  focusEquipmentId?: string | null;
  onMarkerClick?: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────

/**
 * Inner map content. Lives inside <APIProvider> so it can use `useMap()` and
 * the marker / info window components which require the provider context.
 */
const MapContent: React.FC<{
  filteredLocations: EquipmentLocation[];
  teamHQLocations: TeamHQLocation[];
  focusEquipmentId?: string | null;
  onMarkerClick?: (id: string) => void;
}> = ({
  filteredLocations,
  teamHQLocations,
  focusEquipmentId,
  onMarkerClick,
}) => {
  const map = useMap();
  const navigate = useNavigate();
  const [selectedMarker, setSelectedMarker] = useState<EquipmentLocation | null>(null);
  const [selectedHQ, setSelectedHQ] = useState<TeamHQLocation | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);
  const hasAutoFitted = useRef(false);

  // Watch for theme changes (light/dark) so token-derived colors refresh.
  useEffect(() => {
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
    // themeVersion is intentionally a dep so we re-resolve on theme switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeVersion]);

  const teamHQColor = useMemo<MarkerColor>(() => {
    const fill = resolveTokenHex(TEAM_HQ_TOKEN.token, TEAM_HQ_TOKEN.fallback);
    return {
      fill,
      stroke: darkenHex(fill, 0.3),
      label: TEAM_HQ_TOKEN.label,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeVersion]);

  // Compute the bounding box of all visible markers and fit the map to it.
  const fitAllMarkers = useCallback(() => {
    if (!map || typeof window === 'undefined' || !window.google?.maps) return;

    const allPoints: { lat: number; lng: number }[] = [
      ...filteredLocations.map((l) => ({ lat: l.lat, lng: l.lng })),
      ...teamHQLocations.map((h) => ({ lat: h.lat, lng: h.lng })),
    ];

    if (allPoints.length === 0) return;

    if (allPoints.length === 1) {
      map.panTo(allPoints[0]);
      map.setZoom(14);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    allPoints.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });

    // Cap zoom at 15 to prevent over-zooming on tightly-clustered markers.
    window.google.maps.event.addListenerOnce(map, 'idle', () => {
      const z = map.getZoom();
      if (z !== undefined && z > 15) map.setZoom(15);
    });
  }, [map, filteredLocations, teamHQLocations]);

  // Build a stable signature of the visible marker identities so we can
  // detect a meaningful dataset change (e.g. user switched the team filter)
  // and re-fit. Comparing by id keeps us from refitting on every re-render
  // even when the underlying data is the same.
  const markerSignature = useMemo(
    () =>
      [
        ...filteredLocations.map((l) => `e:${l.id}`),
        ...teamHQLocations.map((h) => `t:${h.teamId}`),
      ]
        .sort()
        .join('|'),
    [filteredLocations, teamHQLocations],
  );
  const lastFitSignature = useRef<string | null>(null);

  // Auto-fit when the map and data are both available, AND when the visible
  // marker set changes identity (e.g. team filter switched). The signature
  // check ensures we don't refit on cosmetic re-renders or after the user
  // manually pans away.
  useEffect(() => {
    if (!map) return;
    if (filteredLocations.length === 0 && teamHQLocations.length === 0) return;
    if (lastFitSignature.current === markerSignature) return;
    fitAllMarkers();
    hasAutoFitted.current = true;
    lastFitSignature.current = markerSignature;
  }, [map, markerSignature, filteredLocations, teamHQLocations, fitAllMarkers]);

  // Auto-focus on a specific equipment when focusEquipmentId changes
  useEffect(() => {
    if (!focusEquipmentId || !map) return;
    const target = filteredLocations.find((l) => l.id === focusEquipmentId);
    if (target) {
      map.panTo({ lat: target.lat, lng: target.lng });
      map.setZoom(15);
      setSelectedMarker(target);
    }
  }, [focusEquipmentId, filteredLocations, map]);

  const sourceConfig = selectedMarker ? sourceColors[selectedMarker.source] || sourceColors.equipment : null;
  const selectedSourceType: SourceType = selectedMarker?.source ?? 'equipment';
  const selectedSourceClasses = SOURCE_TOKEN_CLASSES[selectedSourceType];

  return (
    <>
      {filteredLocations.map((location) => {
        const colors = sourceColors[location.source];
        return (
          <AdvancedMarker
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
            onClick={() => {
              setSelectedHQ(null);
              setSelectedMarker(location);
              onMarkerClick?.(location.id);
            }}
            title={location.name}
          >
            {/* Inline SVG glyph; the vis.gl AdvancedMarker accepts arbitrary
                children that are rendered as the marker content. */}
            <div
              style={{ transform: 'translateY(-18px)', pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: buildMarkerSvg(colors.fill, colors.stroke) }}
            />
          </AdvancedMarker>
        );
      })}

      {/* Team HQ star markers */}
      {teamHQLocations.map((hq) => (
        <AdvancedMarker
          key={`hq-${hq.id}`}
          position={{ lat: hq.lat, lng: hq.lng }}
          onClick={() => {
            setSelectedMarker(null);
            setSelectedHQ(hq);
          }}
          title={hq.name}
          zIndex={1000}
        >
          <div
            style={{ transform: 'translateY(-20px)', pointerEvents: 'none' }}
            dangerouslySetInnerHTML={{ __html: buildStarMarkerSvg(teamHQColor.fill, teamHQColor.stroke) }}
          />
        </AdvancedMarker>
      ))}

      {/* Team HQ info window */}
      {selectedHQ && (
        <InfoWindow
          position={{ lat: selectedHQ.lat, lng: selectedHQ.lng }}
          onClose={() => setSelectedHQ(null)}
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
        </InfoWindow>
      )}

      {selectedMarker && (
        <InfoWindow
          position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
          onClose={() => setSelectedMarker(null)}
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
        </InfoWindow>
      )}

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

    </>
  );
};

let warnedNoMapId = false;

// Google Maps invokes `window.gm_authFailure` when the API key is rejected
// at runtime — most commonly `RefererNotAllowedMapError` when the page URL is
// not in the key's HTTP-referrer allowlist. Declared globally so the
// installer below can read/restore any prior handler safely.
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

/**
 * Inline diagnostic rendered when Google Maps fires `gm_authFailure`. Surfaces
 * the exact wildcard referrer entry the operator must add to the API key's
 * HTTP-referrer allowlist (plus the current page URL for cross-reference with
 * Google's own console message) and links to the runbook. A simple page
 * reload is the only reliable retry — the bad key has already been baked
 * into the cached Maps JS bundle. See issue #617 follow-up.
 */
const MAPS_REFERRER_RUNBOOK_URL =
  'https://github.com/Columbia-Cloudworks-LLC/EquipQR/blob/main/docs/ops/supabase-branch-secrets.md#google-maps-api-key--http-referrer-allowlist';

interface MapsAuthFailure {
  /** Full page URL (origin + pathname) — matches Google's own console error. */
  currentUrl: string;
  /** Wildcard referrer pattern to paste into the API key allowlist. */
  allowlistEntry: string;
}

const MapsAuthFailureCard: React.FC<{ failure: MapsAuthFailure }> = ({ failure }) => (
  <div
    className="flex items-center justify-center min-h-[400px] p-4"
    role="alert"
    aria-live="assertive"
    data-testid="maps-auth-failure-card"
  >
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <CardTitle className="text-xl">Map could not load</CardTitle>
        <CardDescription>
          The Google Maps API key returned by the server is not authorized for this URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
          <div>
            <p className="text-sm text-destructive font-medium">Referrer allowlist entry to add:</p>
            <p
              className="text-sm font-mono break-all text-muted-foreground mt-1"
              data-testid="maps-auth-failure-allowlist-entry"
            >
              {failure.allowlistEntry}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Current page URL (for correlation):</p>
            <p
              className="text-xs font-mono break-all text-muted-foreground mt-1"
              data-testid="maps-auth-failure-current-url"
            >
              {failure.currentUrl}
            </p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">How to fix:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Open Google Cloud Console -&gt; APIs &amp; Services -&gt; Credentials.</li>
            <li>
              Edit the API key currently set as <code className="font-mono text-xs">GOOGLE_MAPS_BROWSER_KEY</code>
              {' '}on the relevant Supabase project.
            </li>
            <li>
              Under Application restrictions -&gt; HTTP referrers, add the
              {' '}<strong>allowlist entry</strong> above (the
              {' '}<code className="font-mono text-xs">/*</code> wildcard pattern, not the route-specific URL)
              and Save.
            </li>
            <li>Wait ~1 minute for Google to propagate, then click Try Again.</li>
          </ol>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1"
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.open(MAPS_REFERRER_RUNBOOK_URL, '_blank', 'noopener,noreferrer')}
            className="flex-1"
            variant="ghost"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Runbook
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const MapView: React.FC<MapViewProps> = ({
  googleMapsKey,
  mapId,
  equipmentLocations,
  filteredLocations,
  teamHQLocations = [],
  focusEquipmentId,
  onMarkerClick,
}) => {
  const totalMarkerCount = filteredLocations.length + teamHQLocations.length;
  const [mapsAuthError, setMapsAuthError] = useState<MapsAuthFailure | null>(null);

  // Install Google Maps' documented auth-failure hook so we can swap in a
  // friendly diagnostic instead of letting the downstream `marker.js`
  // TypeError bubble to the global ErrorBoundary. See issue #617.
  //
  // Safety: we capture any prior `gm_authFailure` and chain to it so we don't
  // silently suppress another feature's installer; on cleanup we only restore
  // if our installed handler is still the active one (defensive against a
  // later installer overwriting us during our lifetime), and we use `delete`
  // when there was no prior handler so we don't leave an `undefined` field on
  // `window`.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousHandler = window.gm_authFailure;
    const installed = (): void => {
      const currentUrl = `${window.location.origin}${window.location.pathname}`;
      const allowlistEntry = `${window.location.origin}/*`;
      logger.error(
        '[FleetMap] Google Maps gm_authFailure fired — the API key returned by ' +
          'public-google-maps-key is not authorized for this URL. Add the wildcard ' +
          'referrer entry to the key\'s HTTP-referrer allowlist in Google Cloud Console.',
        { currentUrl, allowlistEntry },
      );
      setMapsAuthError({ currentUrl, allowlistEntry });
      previousHandler?.();
    };
    window.gm_authFailure = installed;
    return () => {
      if (window.gm_authFailure !== installed) return;
      if (previousHandler === undefined) {
        delete window.gm_authFailure;
      } else {
        window.gm_authFailure = previousHandler;
      }
    };
  }, []);

  // Subscribe to <html> class mutations so the basemap colorScheme actually
  // updates when the user toggles light/dark. Without this, isDark is a
  // one-shot read at mount and the basemap can stay stuck in the wrong
  // palette until an unrelated re-render happens.
  const [themeVersion, setThemeVersion] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => setThemeVersion((value) => value + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    return () => observer.disconnect();
  }, []);
  const isDark = useMemo(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
    // themeVersion is intentionally part of the deps so this re-evaluates on toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeVersion],
  );

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

  // One-time warning when the Map ID is missing — Advanced Markers are not
  // available without it and Google will silently render legacy markers.
  useEffect(() => {
    if (!mapId && !warnedNoMapId) {
      warnedNoMapId = true;
      logger.warn(
        'Fleet Map: GOOGLE_MAPS_MAP_ID is not configured. Vector maps and Advanced Markers are disabled. ' +
          'Set the GOOGLE_MAPS_MAP_ID secret on the public-google-maps-key edge function.',
      );
    }
  }, [mapId]);

  if (mapsAuthError) {
    return <MapsAuthFailureCard failure={mapsAuthError} />;
  }

  return (
    <div className="relative h-full w-full">
      <APIProvider
        apiKey={googleMapsKey}
        libraries={['places', 'marker']}
        solutionChannel="GMP_visgl_rgmlibrary_v1_default"
      >
        <Map
          // mapId is required for Advanced Markers; when null the markers fall
          // back to legacy red pins (with a deprecation warning) but the rest
          // of the component still works.
          mapId={mapId ?? undefined}
          defaultCenter={mapCenter}
          defaultZoom={totalMarkerCount === 1 ? 14 : totalMarkerCount > 0 ? 6 : 4}
          // colorScheme follows the app theme; with a Cloud-bound style on the
          // Map ID, the basemap can render an EquipQR-branded dark palette.
          colorScheme={isDark ? 'DARK' : 'LIGHT'}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          streetViewControl={false}
          mapTypeControl={true}
          fullscreenControl={true}
          style={{ width: '100%', height: '100%' }}
        >
          <MapContent
            filteredLocations={filteredLocations}
            teamHQLocations={teamHQLocations}
            focusEquipmentId={focusEquipmentId}
            onMarkerClick={onMarkerClick}
          />
        </Map>
      </APIProvider>
    </div>
  );
};
