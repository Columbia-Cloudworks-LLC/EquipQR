import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLiveLocationPlaceData,
  DeviceGeolocationError,
  requestCurrentDevicePosition,
} from '@/components/location/liveLocationCapture';

function stubGeolocation(geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation });
}

function failWith(code: number): Pick<Geolocation, 'getCurrentPosition'> {
  return {
    getCurrentPosition: vi.fn((_success: PositionCallback, error?: PositionErrorCallback | null) => {
      error?.({ code, message: 'browser error', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
    }),
  };
}

describe('liveLocationCapture', () => {
  it('builds PlaceLocationData for device and pinned locations', () => {
    expect(
      buildLiveLocationPlaceData({ lat: 29.76, lng: -95.36 }),
    ).toEqual(
      expect.objectContaining({
        formatted_address: 'Current device location',
        lat: 29.76,
        lng: -95.36,
      }),
    );

    expect(
      buildLiveLocationPlaceData({ lat: 29.77, lng: -95.37 }, { wasAdjusted: true }),
    ).toEqual(
      expect.objectContaining({
        formatted_address: 'Pinned map location',
      }),
    );
  });

  describe('requestCurrentDevicePosition error mapping', () => {
    const originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

    afterEach(() => {
      if (originalGeolocation) {
        Object.defineProperty(navigator, 'geolocation', originalGeolocation);
      } else {
        Reflect.deleteProperty(navigator, 'geolocation');
      }
    });

    it.each([
      [1, 'permission_denied', 'Location permission was denied. Allow location access to use this feature.'],
      [2, 'position_unavailable', 'Your device location is unavailable right now.'],
      [3, 'timeout', 'Timed out while waiting for your device location.'],
      [99, 'unknown', 'Unable to read your device location.'],
    ])('maps browser error code %i to %s with a readable message', async (code, expectedCode, expectedMessage) => {
      stubGeolocation(failWith(code));

      const error = await requestCurrentDevicePosition().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DeviceGeolocationError);
      expect(error).toMatchObject({ code: expectedCode, message: expectedMessage });
    });

    it('rejects as unsupported when the browser has no geolocation', async () => {
      stubGeolocation(undefined);

      await expect(requestCurrentDevicePosition()).rejects.toMatchObject({
        code: 'unsupported',
        message: 'Location services are not available in this browser.',
      });
    });
  });
});
