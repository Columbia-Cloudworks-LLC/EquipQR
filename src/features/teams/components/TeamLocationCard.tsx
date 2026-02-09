/**
 * TeamLocationCard -- displays the team's location on a mini Google Map
 * with a clickable address and edit controls.
 *
 * Three visual states:
 *  1. Has lat/lng  → map + address + optional override badge
 *  2. Has address text but no coords → address link + placeholder
 *  3. No location  → compact empty state with "Set Location" CTA
 */

import React, { useMemo } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit, Navigation } from 'lucide-react';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import type { TeamWithMembers } from '@/features/teams/services/teamService';

interface TeamLocationCardProps {
  team: TeamWithMembers;
  canEdit: boolean;
  onEditClick: () => void;
}

/** Build a formatted address from team location components. */
function buildAddress(team: TeamWithMembers): string {
  return [
    team.location_address,
    team.location_city,
    team.location_state,
    team.location_country,
  ]
    .filter(Boolean)
    .join(', ');
}

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '250px',
  borderRadius: '0.5rem',
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

const TeamLocationCard: React.FC<TeamLocationCardProps> = ({
  team,
  canEdit,
  onEditClick,
}) => {
  const { isLoaded } = useGoogleMapsLoader();

  const hasCoords =
    team.location_lat != null && team.location_lng != null;
  const addressText = buildAddress(team);
  const hasAddress = addressText.length > 0;

  const center = useMemo(
    () =>
      hasCoords
        ? { lat: team.location_lat as number, lng: team.location_lng as number }
        : undefined,
    [hasCoords, team.location_lat, team.location_lng],
  );

  // ── State 3: No location at all ──────────────────────────────
  if (!hasCoords && !hasAddress) {
    return (
      <Card className="shadow-elevation-2">
        <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-full bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No location set</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a location to see this team on the Fleet Map.
            </p>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEditClick} className="mt-1 gap-1.5">
              <Navigation className="h-3.5 w-3.5" />
              Set Location
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── States 1 & 2: has some location data ─────────────────────
  return (
    <Card className="shadow-elevation-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5" />
            Team Location
          </CardTitle>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditClick}
              className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Map or placeholder */}
        {hasCoords && isLoaded && center ? (
          <div className="rounded-lg overflow-hidden border">
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={center}
              zoom={15}
              options={MAP_OPTIONS}
            >
              <MarkerF position={center} />
            </GoogleMap>
          </div>
        ) : hasCoords && !isLoaded ? (
          /* Map is loading */
          <div className="h-[250px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
            <div className="text-center space-y-2">
              <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto animate-pulse" />
              <p className="text-xs text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          /* Has address but no coords */
          <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
            <div className="text-center space-y-2 px-4">
              <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Coordinates unavailable. Select a new address to enable the map.
              </p>
            </div>
          </div>
        )}

        {/* Address link */}
        {hasAddress && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <ClickableAddress
              address={addressText}
              lat={hasCoords ? (team.location_lat as number) : undefined}
              lng={hasCoords ? (team.location_lng as number) : undefined}
              className="text-sm"
            />
          </div>
        )}

        {/* Override badge */}
        {team.override_equipment_location && (
          <Badge
            variant="outline"
            className="bg-info/10 text-info border-info/30 text-xs font-normal"
          >
            <Navigation className="h-3 w-3 mr-1" />
            Location overrides equipment
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamLocationCard;
