import React from 'react';
import { Label } from '@/components/ui/label';
import GooglePlacesAutocomplete, { type PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

export type TeamLocationFormFieldsProps = {
  locationAddress: string;
  onPlaceSelect: (data: PlaceLocationData) => void;
  onClear: () => void;
  isLoaded: boolean;
  locationLabel?: string;
};

export function TeamLocationFormFields({
  locationAddress,
  onPlaceSelect,
  onClear,
  isLoaded,
  locationLabel = 'Location',
}: TeamLocationFormFieldsProps) {
  return (
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
  );
}
