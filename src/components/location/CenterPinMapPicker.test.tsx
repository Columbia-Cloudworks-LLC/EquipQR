import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { CenterPinMapPicker } from '@/components/location/CenterPinMapPicker';

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  useMap: vi.fn(() => null),
}));

describe('CenterPinMapPicker', () => {
  it('renders a centered pin overlay with a ground shadow', () => {
    render(
      <CenterPinMapPicker
        center={{ lat: 29.7604, lng: -95.3698 }}
        onCenterChange={vi.fn()}
        googleMapsKey="test-key"
      />,
    );

    expect(screen.getByTestId('center-pin-map-picker')).toBeInTheDocument();
    expect(screen.getByTestId('center-pin-marker')).toBeInTheDocument();
    expect(screen.getByTestId('center-pin-shadow')).toBeInTheDocument();
    expect(screen.getByTestId('center-pin-overlay')).toHaveAttribute('data-panning', 'false');
  });
});
