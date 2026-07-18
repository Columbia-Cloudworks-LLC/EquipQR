import { describe, expect, it } from 'vitest';
import {
  buildLiveLocationPlaceData,
  DeviceGeolocationError,
} from '@/components/location/liveLocationCapture';

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

  it('maps geolocation permission errors to readable messages', () => {
    const error = new DeviceGeolocationError('permission_denied', 'denied');
    expect(error.code).toBe('permission_denied');
    expect(error.message).toBe('denied');
  });
});
