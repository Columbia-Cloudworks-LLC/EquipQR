import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@vitest-harness/utils/test-utils';
import { LocationDirectionsMiniMap } from '@/components/location/LocationDirectionsMiniMap';

const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

vi.mock('@/hooks/useGoogleMapsKey', () => ({
  useGoogleMapsKey: vi.fn(() => ({
    googleMapsKey: 'test-key',
    mapId: 'test-map-id',
    isLoading: false,
    error: null,
    retry: vi.fn(),
  })),
}));

vi.mock('@/hooks/useThemeVersion', () => ({
  useIsDarkTheme: vi.fn(() => false),
  useThemeVersion: vi.fn(() => 0),
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Map: () => <div data-testid="directions-mini-map" />,
  AdvancedMarker: () => null,
}));

describe('LocationDirectionsMiniMap', () => {
  it('opens Google Maps directions when the map is clicked', () => {
    render(
      <LocationDirectionsMiniMap
        lat={30.27}
        lng={-97.74}
        address="500 Org Default St, Austin, TX, USA"
        directionsUrl="https://www.google.com/maps/dir/?api=1&destination=30.27,-97.74"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /open directions to 500 org default st, austin, tx, usa in google maps/i,
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=30.27,-97.74',
      '_blank',
      'noopener,noreferrer',
    );
  });
});
