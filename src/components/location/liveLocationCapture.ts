import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';

export type LatLng = { lat: number; lng: number };

export type DeviceGeolocationErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unknown';

export class DeviceGeolocationError extends Error {
  readonly code: DeviceGeolocationErrorCode;

  constructor(code: DeviceGeolocationErrorCode, message: string) {
    super(message);
    this.name = 'DeviceGeolocationError';
    this.code = code;
  }
}

export function buildLiveLocationPlaceData(
  position: LatLng,
  options?: { wasAdjusted?: boolean },
): PlaceLocationData {
  return {
    formatted_address: options?.wasAdjusted ? 'Pinned map location' : 'Current device location',
    street: '',
    city: '',
    state: '',
    country: '',
    lat: position.lat,
    lng: position.lng,
  };
}

export function requestCurrentDevicePosition(
  options?: PositionOptions,
): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(
        new DeviceGeolocationError(
          'unsupported',
          'Location services are not available in this browser.',
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new DeviceGeolocationError(
                'permission_denied',
                'Location permission was denied. Allow location access to use this feature.',
              ),
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new DeviceGeolocationError(
                'position_unavailable',
                'Your device location is unavailable right now.',
              ),
            );
            break;
          case error.TIMEOUT:
            reject(
              new DeviceGeolocationError(
                'timeout',
                'Timed out while waiting for your device location.',
              ),
            );
            break;
          default:
            reject(
              new DeviceGeolocationError(
                'unknown',
                'Unable to read your device location.',
              ),
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
        ...options,
      },
    );
  });
}
