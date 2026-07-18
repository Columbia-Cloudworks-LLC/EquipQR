import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { TeamLocationEditorDialog } from '@/features/teams/components/TeamLocationEditorDialog';

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: vi.fn(() => ({ isLoaded: true })),
}));

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

vi.mock('@/components/ui/GooglePlacesAutocomplete', () => ({
  default: ({
    value,
    onPlaceSelect,
  }: {
    value?: string;
    onPlaceSelect: (data: {
      formatted_address: string;
      street: string;
      city: string;
      state: string;
      country: string;
      lat: number;
      lng: number;
    }) => void;
  }) => (
    <button
      type="button"
      data-testid="team-places-autocomplete"
      onClick={() =>
        onPlaceSelect({
          formatted_address: '500 Team Yard, Dallas, TX, USA',
          street: '500 Team Yard',
          city: 'Dallas',
          state: 'TX',
          country: 'USA',
          lat: 32.77,
          lng: -96.79,
        })
      }
    >
      {value || 'Search for a team address...'}
    </button>
  ),
}));

vi.mock('@/components/location/CenterPinMapPicker', () => ({
  CenterPinMapPicker: () => <div data-testid="center-pin-map-picker" />,
}));

vi.mock('@/components/location/LiveLocationCaptureDialog', () => ({
  LiveLocationCaptureDialog: () => null,
}));

const mockUpdateTeam = vi.fn().mockResolvedValue({});
vi.mock('@/features/teams/services/teamService', () => ({
  updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
}));

const baseTeam = {
  id: 'team-1',
  name: 'Heavy Equipment Team',
  description: 'Main yard',
  organization_id: 'org-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  image_url: null,
  customer_id: null,
  override_equipment_location: false,
  location_address: null,
  location_city: null,
  location_state: null,
  location_country: null,
  location_lat: null,
  location_lng: null,
  members: [],
  member_count: 1,
};

describe('TeamLocationEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a searched team address without opening the full metadata editor', async () => {
    render(
      <TeamLocationEditorDialog open onOpenChange={vi.fn()} team={baseTeam} />,
    );

    fireEvent.click(screen.getByTestId('team-places-autocomplete'));
    fireEvent.click(screen.getByRole('button', { name: /save team location/i }));

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith(
        'team-1',
        expect.objectContaining({
          location_address: '500 Team Yard',
          location_city: 'Dallas',
          location_lat: 32.77,
          location_lng: -96.79,
        }),
      );
    });
  });
});
