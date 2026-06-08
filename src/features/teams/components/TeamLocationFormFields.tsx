import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

export type TeamLocationFormFieldsProps = {
  locationAddress: string;
  onPlaceSelect: (data: PlaceLocationData) => void;
  onClear: () => void;
  isLoaded: boolean;
  overrideEquipmentLocation: boolean;
  onOverrideEquipmentLocationChange: (checked: boolean) => void;
  locationLabel?: string;
};

export function TeamLocationFormFields({
  locationAddress,
  onPlaceSelect,
  onClear,
  isLoaded,
  overrideEquipmentLocation,
  onOverrideEquipmentLocationChange,
  locationLabel = 'Location',
}: TeamLocationFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>{locationLabel}</Label>
        <GooglePlacesAutocomplete
          value={locationAddress}
          onPlaceSelect={onPlaceSelect}
          onClear={onClear}
          placeholder="Search for a team address..."
          isLoaded={isLoaded}
        />
      </div>

      <div className="flex items-center gap-2 rounded-md border p-3">
        <Checkbox
          id="override_equipment_location"
          checked={overrideEquipmentLocation}
          onCheckedChange={(checked) => onOverrideEquipmentLocationChange(!!checked)}
        />
        <Label
          htmlFor="override_equipment_location"
          className="flex-1 cursor-pointer text-sm font-normal"
        >
          Override Equipment Location
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring cursor-help"
                aria-label="Override equipment location info"
              >
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p>
                When enabled, all equipment assigned to this team will use this team&apos;s
                address as their effective location on the Fleet Map.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}
