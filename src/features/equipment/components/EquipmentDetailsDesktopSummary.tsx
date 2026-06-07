import { Link } from 'react-router-dom';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Forklift, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { resolveEffectiveLocation } from '@/utils/effectiveLocation';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import type { Equipment } from '@/features/equipment/types/equipment';

type EquipmentDetailsDesktopSummaryProps = {
  equipment: Equipment;
  assignedTeam: EquipmentTeamSummary | null;
  isMapsLoaded: boolean;
};

export function EquipmentDetailsDesktopSummary({
  equipment,
  assignedTeam,
  isMapsLoaded,
}: EquipmentDetailsDesktopSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-0">
          {equipment.image_url ? (
            <img
              src={equipment.image_url}
              alt={equipment.name}
              className="w-full h-64 object-cover rounded-lg"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
              <Forklift className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assigned Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <EquipmentTeamSummaryCard team={assignedTeam} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4 space-y-2">
          <EquipmentLocationCard
            equipment={equipment}
            assignedTeam={assignedTeam}
            isMapsLoaded={isMapsLoaded}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function EquipmentTeamSummaryCard({ team }: { team: EquipmentTeamSummary | null }) {
  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">Unassigned</p>
        <p className="text-xs text-muted-foreground mt-1">Assign a team in the Details tab</p>
      </div>
    );
  }

  const teamAddr = [
    team.location_address,
    team.location_city,
    team.location_state,
    team.location_country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Link
        to={`/dashboard/teams/${team.id}`}
        className="text-lg font-semibold text-primary hover:underline transition-colors"
      >
        {team.name}
      </Link>
      <p className="text-sm text-muted-foreground line-clamp-3">
        {team.description || 'No description'}
      </p>
      {teamAddr && (
        <div className="flex items-start gap-1.5 pt-1">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <ClickableAddress
            address={teamAddr}
            lat={team.location_lat}
            lng={team.location_lng}
            className="text-xs"
          />
        </div>
      )}
    </>
  );
}

function EquipmentLocationCard({
  equipment,
  assignedTeam,
  isMapsLoaded,
}: {
  equipment: Equipment;
  assignedTeam: EquipmentTeamSummary | null;
  isMapsLoaded: boolean;
}) {
  let lastScan: { lat: number; lng: number } | undefined;
  if (equipment.last_known_location && typeof equipment.last_known_location === 'object') {
    const loc = equipment.last_known_location as Record<string, unknown>;
    const lat = Number(loc.latitude ?? loc.lat);
    const lng = Number(loc.longitude ?? loc.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      lastScan = { lat, lng };
    }
  }

  const resolved = resolveEffectiveLocation({
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
    },
    lastScan,
  });

  const effectiveLat = resolved?.lat;
  const effectiveLng = resolved?.lng;
  const effectiveAddr = resolved?.formattedAddress || '';
  const isTeamOverride = resolved?.source === 'team';
  const hasCoords = effectiveLat != null && effectiveLng != null;

  if (hasCoords && isMapsLoaded) {
    const center = { lat: effectiveLat as number, lng: effectiveLng as number };
    return (
      <>
        <div className="rounded-lg overflow-hidden border" style={{ height: '180px' }}>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={14}
            options={{
              disableDefaultUI: true,
              zoomControl: false,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            }}
          >
            <MarkerF position={center} />
          </GoogleMap>
        </div>
        {effectiveAddr && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <ClickableAddress
              address={effectiveAddr}
              lat={effectiveLat as number}
              lng={effectiveLng as number}
              className="text-xs"
            />
          </div>
        )}
        {isTeamOverride && assignedTeam && (
          <p className="text-xs text-muted-foreground">via {assignedTeam.name}</p>
        )}
        {resolved?.source === 'scan' && (
          <p className="text-xs text-muted-foreground">via last scan</p>
        )}
      </>
    );
  }

  if (hasCoords && !isMapsLoaded) {
    return (
      <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
        <div className="text-center px-4">
          <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">
            {effectiveAddr || 'Location coordinates available'}
          </p>
        </div>
      </div>
    );
  }

  if (equipment.location) {
    return (
      <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
        <div className="text-center px-4">
          <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">{equipment.location}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[180px] rounded-lg bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
      <div className="text-center">
        <MapPin className="h-6 w-6 text-muted-foreground/50 mx-auto" />
        <p className="text-xs text-muted-foreground mt-1">No location set</p>
      </div>
    </div>
  );
}
