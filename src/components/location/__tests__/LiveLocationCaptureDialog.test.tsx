import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
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

const mockOnDragEnd = vi.fn();

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  AdvancedMarker: ({
    onDragEnd,
  }: {
    onDragEnd?: (event: { latLng?: { lat: () => number; lng: () => number } }) => void;
  }) => {
    mockOnDragEnd.mockImplementation(onDragEnd);
    return (
      <button
        type="button"
        data-testid="draggable-marker"
        onClick={() =>
          onDragEnd?.({
            latLng: {
              lat: () => 29.77,
              lng: () => -95.37,
            },
          })
        }
      >
        marker
      </button>
    );
  },
}));

describe('LiveLocationCaptureDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDragEnd.mockReset();
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
      expect(screen.getByTestId('google-map')).toBeInTheDocument();
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

  it('updates pending coordinates when the marker is dragged', async () => {
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
      expect(screen.getByTestId('draggable-marker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('draggable-marker'));
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
