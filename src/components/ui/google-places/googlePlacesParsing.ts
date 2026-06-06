import type { PlaceLocationData } from '@/components/ui/google-places/googlePlacesTypes';

export function parseNewPlaceResult(place: google.maps.places.Place): PlaceLocationData {
  const comps = place.addressComponents;
  const get = (type: string) =>
    comps?.find((c: google.maps.places.AddressComponent) => c.types.includes(type));

  const streetNumber = get('street_number')?.longText ?? '';
  const route = get('route')?.longText ?? '';

  return {
    formatted_address: place.formattedAddress ?? '',
    street: [streetNumber, route].filter(Boolean).join(' '),
    city: get('locality')?.longText ?? get('sublocality')?.longText ?? '',
    state: get('administrative_area_level_1')?.shortText ?? '',
    country: get('country')?.longText ?? '',
    lat: place.location?.lat() ?? null,
    lng: place.location?.lng() ?? null,
  };
}

export const NEW_PLACE_FIELDS: Array<keyof google.maps.places.Place> = [
  'addressComponents',
  'formattedAddress',
  'location',
];

export function createManualPlaceData(formattedAddress: string): PlaceLocationData {
  return {
    formatted_address: formattedAddress,
    street: '',
    city: '',
    state: '',
    country: '',
    lat: null,
    lng: null,
  };
}
