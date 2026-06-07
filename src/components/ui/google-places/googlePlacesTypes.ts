export interface PlaceLocationData {
  formatted_address: string;
  street: string;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

export type GooglePlacesInitMode = 'pending' | 'webcomponent' | 'edge' | 'plaintext';

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
