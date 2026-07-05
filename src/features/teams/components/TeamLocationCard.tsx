/**
 * TeamLocationCard -- displays the team's location on a mini Google Map
 * with a clickable address and focused location editor.
 */

import React, { useMemo, useState } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Edit, Navigation } from 'lucide-react';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { TeamLocationEditorDialog } from '@/features/teams/components/TeamLocationEditorDialog';
import { buildTeamAddress } from '@/features/teams/utils/teamLocationUtils';
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import type { TeamWithMembers } from '@/features/teams/services/teamService';

interface TeamLocationCardProps {
  team: TeamWithMembers;
  canEdit: boolean;
}

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '180px',
  borderRadius: '0.5rem',
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

const TeamLocationCard: React.FC<TeamLocationCardProps> = ({ team, canEdit }) => {
  const { isLoaded } = useGoogleMapsLoader();
  const [editorOpen, setEditorOpen] = useState(false);

  const hasCoords = team.location_lat != null && team.location_lng != null;
  const addressText = buildTeamAddress(team);
  const hasAddress = addressText.length > 0;

  const center = useMemo(
    () =>
      hasCoords
        ? { lat: team.location_lat as number, lng: team.location_lng as number }
        : undefined,
    [hasCoords, team.location_lat, team.location_lng],
  );

  const openEditor = () => setEditorOpen(true);

  if (!hasCoords && !hasAddress) {
    return (
      <>
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
              <Button variant="outline" size="sm" onClick={openEditor} className="mt-1 gap-1.5">
                <Navigation className="h-3.5 w-3.5" />
                Set Location
              </Button>
            )}
          </CardContent>
        </Card>

        {canEdit ? (
          <TeamLocationEditorDialog open={editorOpen} onOpenChange={setEditorOpen} team={team} />
        ) : null}
      </>
    );
  }

  return (
    <>
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
                onClick={openEditor}
                className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
                aria-label="Edit team location"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
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
            <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto animate-pulse" />
                <p className="text-xs text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : (
            <div className="h-[120px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
              <div className="text-center space-y-2 px-4">
                <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Coordinates unavailable. Set a new address or use your current location.
                </p>
              </div>
            </div>
          )}

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
        </CardContent>
      </Card>

      {canEdit ? (
        <TeamLocationEditorDialog open={editorOpen} onOpenChange={setEditorOpen} team={team} />
      ) : null}
    </>
  );
};

export default TeamLocationCard;
