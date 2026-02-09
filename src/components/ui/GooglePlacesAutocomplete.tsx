/**
 * GooglePlacesAutocomplete – single-input address picker.
 *
 * Wraps the `Autocomplete` widget from @react-google-maps/api.
 * On selection the component parses Google's address_components into
 * a flat structure (street, city, state, country, lat, lng) and calls
 * `onPlaceSelect`.
 *
 * Requires the Google Maps JS API to be loaded with the "places"
 * library – use the shared `useGoogleMapsLoader` hook.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

// ----------------------------------------------------------------
// Public types
// ----------------------------------------------------------------

export interface PlaceLocationData {
  formatted_address: string;
  street: string;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

export interface GooglePlacesAutocompleteProps {
  /** Current display value (formatted address string) */
  value?: string;
  /** Called when the user picks a place from the dropdown */
  onPlaceSelect: (data: PlaceLocationData) => void;
  /** Called when the user clears the input */
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Whether the Google Maps JS API is loaded */
  isLoaded: boolean;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function getComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
): google.maps.GeocoderAddressComponent | undefined {
  return components?.find((c) => c.types.includes(type));
}

export function parsePlaceResult(
  place: google.maps.places.PlaceResult,
): PlaceLocationData {
  const comps = place.address_components;
  const streetNumber = getComponent(comps, 'street_number')?.long_name ?? '';
  const route = getComponent(comps, 'route')?.long_name ?? '';

  return {
    formatted_address: place.formatted_address ?? '',
    street: [streetNumber, route].filter(Boolean).join(' '),
    city:
      getComponent(comps, 'locality')?.long_name ??
      getComponent(comps, 'sublocality')?.long_name ??
      '',
    state:
      getComponent(comps, 'administrative_area_level_1')?.short_name ?? '',
    country: getComponent(comps, 'country')?.long_name ?? '',
    lat: place.geometry?.location?.lat() ?? null,
    lng: place.geometry?.location?.lng() ?? null,
  };
}

// Fields we ask Google for – keeps billing down.
const PLACE_FIELDS = [
  'address_components',
  'formatted_address',
  'geometry.location',
];

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value = '',
  onPlaceSelect,
  onClear,
  placeholder = 'Search for an address...',
  disabled = false,
  className = '',
  isLoaded,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Keep inputValue in sync if parent changes value prop
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const onLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
      autocomplete.setFields(PLACE_FIELDS);
    },
    [],
  );

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.geometry) return;

    const data = parsePlaceResult(place);
    setInputValue(data.formatted_address);
    onPlaceSelect(data);
  }, [onPlaceSelect]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setInputValue(v);
      if (v === '' && onClear) {
        onClear();
      }
    },
    [onClear],
  );

  // When Google Maps hasn't loaded yet, render a plain input so the
  // layout doesn't shift.
  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled
          className="pl-9"
        />
      </div>
    );
  }

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      <div className={`relative ${className}`}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
        />
      </div>
    </Autocomplete>
  );
};

export default GooglePlacesAutocomplete;
