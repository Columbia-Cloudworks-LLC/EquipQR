import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MapPin, Edit2, Info, Navigation, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tables } from '@/integrations/supabase/types';
import ClickableAddress from '@/components/ui/ClickableAddress';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import {
  inlineEditIconClassName,
  mobileInlineEditRowExtrasClassName,
  mobileInlineEditValueClassName,
} from './inlineEditStyles';

type Equipment = Tables<'equipment'>;

export interface EquipmentLocationFieldProps {
  equipment: Equipment;
  teams: Array<EquipmentTeamSummary>;
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isMapsLoaded: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: PlaceLocationData) => Promise<void>;
}

export function buildAddressString(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string {
  return [parts.street, parts.city, parts.state, parts.country]
    .filter(Boolean)
    .join(', ');
}

export const EquipmentLocationField: React.FC<EquipmentLocationFieldProps> = ({
  equipment,
  teams,
  canEdit,
  isEditing,
  isSaving,
  isMapsLoaded,
  onStartEdit,
  onCancelEdit,
  onSave,
}) => {
  const isMobile = useIsMobile();
  const [pendingPlace, setPendingPlace] = useState<PlaceLocationData | null>(null);
  const [isCleared, setIsCleared] = useState(false);

  const team = equipment.team_id
    ? teams.find((t) => t.id === equipment.team_id)
    : undefined;
  const isTeamOverride =
    !!equipment.use_team_location &&
    !!team?.override_equipment_location &&
    team.location_lat != null &&
    team.location_lng != null;

  const teamAddress = team
    ? buildAddressString({
        street: team.location_address,
        city: team.location_city,
        state: team.location_state,
        country: team.location_country,
      })
    : '';

  const equipmentAddress = buildAddressString({
    street: equipment.assigned_location_street,
    city: equipment.assigned_location_city,
    state: equipment.assigned_location_state,
    country: equipment.assigned_location_country,
  });

  const handlePlaceSelect = useCallback((data: PlaceLocationData) => {
    setPendingPlace(data);
    setIsCleared(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (isCleared) {
      await onSave({
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
    } else if (pendingPlace) {
      await onSave(pendingPlace);
      setPendingPlace(null);
    }
  }, [pendingPlace, isCleared, onSave]);

  const handleCancel = useCallback(() => {
    setPendingPlace(null);
    setIsCleared(false);
    onCancelEdit();
  }, [onCancelEdit]);

  if (isTeamOverride) {
    return (
      <div>
        <span className="text-sm font-medium text-muted-foreground">Location</span>
        <div className="mt-1 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <ClickableAddress
            address={teamAddress || undefined}
            lat={team!.location_lat}
            lng={team!.location_lng}
            className="text-base"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring cursor-help"
                  aria-label="This location is set by the team. Edit the team to change it."
                >
                  <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                <p>This location is set by the team. Edit the team to change it.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="mt-1 ml-6">
          <Link
            to={`/dashboard/teams/${team!.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Navigation className="h-3 w-3" />
            Set by {team!.name}
          </Link>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <span className="text-sm font-medium text-muted-foreground">Location</span>
        <div className="mt-1 space-y-2">
          <GooglePlacesAutocomplete
            value={isCleared ? '' : (pendingPlace?.formatted_address ?? equipmentAddress)}
            onPlaceSelect={handlePlaceSelect}
            onClear={() => {
              setPendingPlace(null);
              setIsCleared(true);
            }}
            placeholder="Search for an address..."
            isLoaded={isMapsLoaded}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleSave}
              disabled={(!pendingPlace && !isCleared) || isSaving}
              className="gap-1 h-7 text-xs"
            >
              <Check className="h-3 w-3" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="gap-1 h-7 text-xs"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (equipmentAddress) {
    return (
      <div>
        <span className="text-sm font-medium text-muted-foreground">Location</span>
        <div
          className={cn(
            'mt-1 flex w-full min-w-0 items-center',
            isMobile ? mobileInlineEditRowExtrasClassName : 'gap-2',
          )}
        >
          <div className={cn('flex min-w-0 items-center gap-2', isMobile && mobileInlineEditValueClassName)}>
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <ClickableAddress
              address={equipmentAddress}
              lat={equipment.assigned_location_lat ?? undefined}
              lng={equipment.assigned_location_lng ?? undefined}
              className="min-w-0 text-base"
            />
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              className={inlineEditIconClassName}
              aria-label="Edit location"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  const legacyLocation = equipment.location;
  if (legacyLocation) {
    return (
      <div>
        <span className="text-sm font-medium text-muted-foreground">Location</span>
        <div
          className={cn(
            'mt-1 flex w-full min-w-0 items-center',
            isMobile ? mobileInlineEditRowExtrasClassName : 'gap-2',
          )}
        >
          <div className={cn('flex min-w-0 items-center gap-2', isMobile && mobileInlineEditValueClassName)}>
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="min-w-0 text-base">{legacyLocation}</span>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              className={inlineEditIconClassName}
              aria-label="Edit location"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="text-sm font-medium text-muted-foreground">Location</span>
      <div
        className={cn(
          'mt-1 flex w-full min-w-0 items-center',
          isMobile ? mobileInlineEditRowExtrasClassName : 'gap-2',
        )}
      >
        <div className={cn('flex min-w-0 items-center gap-2', isMobile && mobileInlineEditValueClassName)}>
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-base text-muted-foreground">No location set</span>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            className={isMobile ? inlineEditIconClassName : 'min-h-11 shrink-0 px-3 text-sm text-primary hover:text-primary/80 hover:underline'}
          >
            Set Location
          </Button>
        )}
      </div>
    </div>
  );
};
