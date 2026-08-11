import type { CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EquipmentLocationMapPanel } from '@/components/location/EquipmentLocationMapPanel';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';
import { EquipmentPrimaryMediaPanel } from '@/features/equipment/components/media/EquipmentPrimaryMediaPanel';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

type EquipmentDetailsDesktopSummaryProps = {
  equipment: EquipmentRecord;
  assignedTeam: EquipmentTeamSummary | null;
  organizationId: string;
  scanLocationCollectionEnabled?: boolean;
  canEditLocation?: boolean;
  isEditingLocation?: boolean;
  isSavingLocation?: boolean;
  isPlacesLoaded?: boolean;
  mediaStyle?: CSSProperties;
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
  mediaStyle,
  onStartLocationEdit,
  onCancelLocationEdit,
  onSaveLocation,
}: EquipmentDetailsDesktopSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-2 sm:p-3">
          <EquipmentPrimaryMediaPanel
            equipmentId={equipment.id}
            organizationId={organizationId}
            equipmentName={equipment.name}
            currentDisplayImage={equipment.image_url}
            emptyClassName="h-64"
            mediaStyle={mediaStyle}
          />
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
        <EquipmentLocationMapPanel
          layout="card"
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
    </>
  );
}
