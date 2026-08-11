import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { EquipmentLocationMapPanel } from '@/components/location/EquipmentLocationMapPanel';

vi.mock('@/features/equipment/hooks/useEquipmentLocationHistory', () => ({
  useLatestScanCoordinateFromHistory: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    latestScan: undefined,
  })),
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

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  AdvancedMarker: () => <div data-testid="advanced-marker" />,
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
      data-testid="places-autocomplete"
      onClick={() =>
        onPlaceSelect({
          formatted_address: '500 Test Ave, Austin, TX, USA',
          street: '500 Test Ave',
          city: 'Austin',
          state: 'TX',
          country: 'USA',
          lat: 30.27,
          lng: -97.74,
        })
      }
    >
      {value || 'Search for an equipment address...'}
    </button>
  ),
}));

const mockLiveLocation = {
  formatted_address: '600 Live Capture Rd, Dallas, TX, USA',
  street: '600 Live Capture Rd',
  city: 'Dallas',
  state: 'TX',
  country: 'USA',
  lat: 32.77,
  lng: -96.79,
};

vi.mock('@/components/location/LiveLocationCaptureDialog', () => ({
  LiveLocationCaptureDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: (data: typeof mockLiveLocation) => Promise<void>;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() => void onConfirm(mockLiveLocation)}
      >
        Confirm live location
      </button>
    ) : null,
}));

const team = {
  id: 'team-1',
  name: 'Heavy Equipment Team',
  description: null,
  override_equipment_location: true,
  location_lat: 32.7767,
  location_lng: -96.797,
  location_address: '123 Main',
  location_city: 'Dallas',
  location_state: 'TX',
  location_country: 'US',
};

describe('EquipmentLocationMapPanel', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useGoogleMapsKey } = await import('@/hooks/useGoogleMapsKey');
    vi.mocked(useGoogleMapsKey).mockReturnValue({
      googleMapsKey: 'test-key',
      mapId: 'test-map-id',
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    const { useLatestScanCoordinateFromHistory } = await import(
      '@/features/equipment/hooks/useEquipmentLocationHistory'
    );
    vi.mocked(useLatestScanCoordinateFromHistory).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      latestScan: undefined,
    });
  });

  it('renders a visible map and location source header selector when assigned coords exist', () => {
    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          assigned_location_lat: 30,
          assigned_location_lng: -97,
          assigned_location_city: 'Austin',
          location: null,
          last_known_location: null,
          updated_at: '2026-01-01T00:00:00Z',
        }}
        assignedTeam={team}
        organizationId="org-1"
      />,
    );

    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Location source' })).toHaveTextContent(
      'Effective location',
    );
  });

  it('uses team fallback on the map when equipment has no assigned address', () => {
    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          assigned_location_lat: null,
          assigned_location_lng: null,
          location: null,
          last_known_location: null,
        }}
        assignedTeam={team}
        organizationId="org-1"
      />,
    );

    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Location source' })).toHaveTextContent(
      'Effective location',
    );
  });

  it('shows map unavailable state when the maps key fails to load', async () => {
    const { useGoogleMapsKey } = await import('@/hooks/useGoogleMapsKey');
    vi.mocked(useGoogleMapsKey).mockReturnValue({
      googleMapsKey: '',
      mapId: null,
      isLoading: false,
      error: 'Failed to load key',
      retry: vi.fn(),
    });

    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: true,
          assigned_location_lat: 30,
          assigned_location_lng: -97,
        }}
        assignedTeam={team}
        organizationId="org-1"
      />,
    );

    expect(screen.getByText('Map unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
  });

  it('lists equipment location as a selectable source option', async () => {
    const { useLatestScanCoordinateFromHistory } = await import(
      '@/features/equipment/hooks/useEquipmentLocationHistory'
    );
    vi.mocked(useLatestScanCoordinateFromHistory).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      latestScan: {
        lat: 40.919345,
        lng: -90.659318,
        updatedAt: '2026-04-15T08:30:00Z',
        formattedAddress: 'Scan point',
      },
    });

    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: true,
          assigned_location_lat: 30.2672,
          assigned_location_lng: -97.7431,
          assigned_location_city: 'Austin',
          assigned_location_state: 'TX',
          location: null,
          last_known_location: null,
          updated_at: '2026-01-01T00:00:00Z',
        }}
        assignedTeam={team}
        organizationId="org-1"
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Location source' }));

    await waitFor(() => {
      expect(screen.getAllByText('Equipment location').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Team location').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Last known scan location').length).toBeGreaterThan(0);
    });
  });

  it('does not show legacy equipment.location text in the no-coordinate placeholder', () => {
    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: false,
          assigned_location_lat: null,
          assigned_location_lng: null,
          location: 'Houston, TX',
          last_known_location: null,
        }}
        assignedTeam={null}
        organizationId="org-1"
      />,
    );

    expect(screen.getByText('No map coordinates yet')).toBeInTheDocument();
    expect(screen.queryByText('Houston, TX')).not.toBeInTheDocument();
  });

  it('shows use my current location action for editable users without coordinates', () => {
    const onSaveAddress = vi.fn().mockResolvedValue(undefined);

    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: false,
          assigned_location_lat: null,
          assigned_location_lng: null,
          location: 'Houston, TX',
          last_known_location: null,
        }}
        assignedTeam={null}
        organizationId="org-1"
        canEditLocation
        isEditingAddress={false}
        isPlacesLoaded
        onStartAddressEdit={vi.fn()}
        onCancelAddressEdit={vi.fn()}
        onSaveAddress={onSaveAddress}
      />,
    );

    expect(screen.getByRole('button', { name: /use my current location/i })).toBeInTheDocument();
  });

  it('shows set equipment address action for editable users', () => {
    const onSaveAddress = vi.fn().mockResolvedValue(undefined);

    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: true,
          assigned_location_lat: null,
          assigned_location_lng: null,
          location: null,
          last_known_location: null,
        }}
        assignedTeam={team}
        organizationId="org-1"
        canEditLocation
        isEditingAddress={false}
        isPlacesLoaded
        onStartAddressEdit={vi.fn()}
        onCancelAddressEdit={vi.fn()}
        onSaveAddress={onSaveAddress}
      />,
    );

    expect(screen.getByRole('button', { name: 'Set equipment address' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use my current location' })).toBeInTheDocument();
  });

  it('keeps coordinate-only equipment locations visible and editable', () => {
    const onSaveAddress = vi.fn().mockResolvedValue(undefined);

    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: false,
          assigned_location_lat: 32.77,
          assigned_location_lng: -96.79,
          assigned_location_street: null,
          assigned_location_city: null,
          assigned_location_state: null,
          assigned_location_country: null,
          location: null,
          last_known_location: null,
        }}
        assignedTeam={team}
        organizationId="org-1"
        canEditLocation
        isEditingAddress={false}
        isPlacesLoaded
        onStartAddressEdit={vi.fn()}
        onCancelAddressEdit={vi.fn()}
        onSaveAddress={onSaveAddress}
      />,
    );

    expect(screen.getByText('32.770000, -96.790000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set equipment address' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use my current location' })).toBeInTheDocument();
  });

  it('calls onSaveAddress when saving from the inline editor', async () => {
    const onSaveAddress = vi.fn().mockResolvedValue(undefined);

    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: true,
          assigned_location_lat: null,
          assigned_location_lng: null,
          location: null,
          last_known_location: null,
        }}
        assignedTeam={team}
        organizationId="org-1"
        canEditLocation
        isEditingAddress
        isPlacesLoaded
        onStartAddressEdit={vi.fn()}
        onCancelAddressEdit={vi.fn()}
        onSaveAddress={onSaveAddress}
      />,
    );

    fireEvent.click(screen.getByTestId('places-autocomplete'));
    fireEvent.click(screen.getByRole('button', { name: /save equipment location/i }));

    await waitFor(() => {
      expect(onSaveAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Austin',
          lat: 30.27,
          lng: -97.74,
        }),
      );
    });
  });

  it('offers use my current location in the inline editor and saves captured coordinates', async () => {
    const onSaveAddress = vi.fn().mockResolvedValue(undefined);

    render(
      <EquipmentLocationMapPanel
        equipment={{
          id: 'eq-1',
          use_team_location: true,
          assigned_location_lat: 30.2672,
          assigned_location_lng: -97.7431,
          assigned_location_city: 'Austin',
          assigned_location_state: 'TX',
          location: null,
          last_known_location: null,
        }}
        assignedTeam={team}
        organizationId="org-1"
        canEditLocation
        isEditingAddress
        isPlacesLoaded
        onStartAddressEdit={vi.fn()}
        onCancelAddressEdit={vi.fn()}
        onSaveAddress={onSaveAddress}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm live location/i }));
    fireEvent.click(screen.getByRole('button', { name: /save equipment location/i }));

    await waitFor(() => {
      expect(onSaveAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Dallas',
          lat: 32.77,
          lng: -96.79,
        }),
      );
    });
  });
});
