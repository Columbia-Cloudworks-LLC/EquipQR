import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EquipmentLocationMapPanel } from '@/components/location/EquipmentLocationMapPanel';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import { Forklift, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import ClickableAddress from '@/components/ui/ClickableAddress';

type EquipmentDetailsDesktopSummaryProps = {
  equipment: EquipmentRecord;
  assignedTeam: EquipmentTeamSummary | null;
  organizationId: string;
  scanLocationCollectionEnabled?: boolean;
  canEditLocation?: boolean;
  isEditingLocation?: boolean;
  isSavingLocation?: boolean;
  isPlacesLoaded?: boolean;
  onStartLocationEdit?: () => void;
  onCancelLocationEdit?: () => void;
  onSaveLocation?: (data: PlaceLocationData) => Promise<void>;
};

export function EquipmentDetailsDesktopSummary({
  equipment,
  assignedTeam,
  organizationId,
  scanLocationCollectionEnabled,
  canEditLocation = false,
  isEditingLocation = false,
  isSavingLocation = false,
  isPlacesLoaded = false,
  onStartLocationEdit,
  onCancelLocationEdit,
  onSaveLocation,
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
        <CardContent className="p-0 px-6 pb-4">
          <EquipmentLocationMapPanel
            equipment={equipment}
            assignedTeam={assignedTeam}
            organizationId={organizationId}
            scanLocationCollectionEnabled={scanLocationCollectionEnabled}
            canEditLocation={canEditLocation}
            isEditingAddress={isEditingLocation}
            isSavingAddress={isSavingLocation}
            isPlacesLoaded={isPlacesLoaded}
            onStartAddressEdit={onStartLocationEdit}
            onCancelAddressEdit={onCancelLocationEdit}
            onSaveAddress={onSaveLocation}
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
