import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { LiveLocationCaptureDialog } from '@/components/location/LiveLocationCaptureDialog';

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

vi.mock('@/components/location/CenterPinMapPicker', () => ({
  CenterPinMapPicker: ({
    onCenterChange,
  }: {
    onCenterChange: (center: { lat: number; lng: number }) => void;
  }) => (
    <div data-testid="center-pin-map-picker">
      <button
        type="button"
        data-testid="simulate-map-pan"
        onClick={() => onCenterChange({ lat: 29.77, lng: -95.37 })}
      >
        pan map
      </button>
    </div>
  ),
}));

describe('LiveLocationCaptureDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests geolocation only after the user clicks Use my current location', async () => {
    const getCurrentPosition = vi.fn(() => {
      /* intentionally unresolved until clicked again */
    });
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(
      <LiveLocationCaptureDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(getCurrentPosition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a map preview after geolocation succeeds and confirms only on explicit save', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: 29.7604,
              longitude: -95.3698,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });

    render(
      <LiveLocationCaptureDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    await waitFor(() => {
      expect(screen.getByTestId('center-pin-map-picker')).toBeInTheDocument();
    });

    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /set equipment location/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 29.7604,
          lng: -95.3698,
          formatted_address: 'Current device location',
        }),
      );
    });
  });

  it('updates pending coordinates when the user pans the map', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: 29.7604,
              longitude: -95.3698,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });

    render(
      <LiveLocationCaptureDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));

    await waitFor(() => {
      expect(screen.getByTestId('simulate-map-pan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('simulate-map-pan'));
    fireEvent.click(screen.getByRole('button', { name: /set equipment location/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 29.77,
          lng: -95.37,
          formatted_address: 'Pinned map location',
        }),
      );
    });
  });
});
