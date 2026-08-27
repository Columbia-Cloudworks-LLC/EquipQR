import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@vitest-harness/utils/test-utils';
import FleetMap from './FleetMap';
import type { EquipmentLocation, TeamHQLocation } from '@/features/fleet-map/components/MapView';
import type { TeamFleetData } from '@/features/teams/services/teamFleetService';

const mockUseGoogleMapsKey = vi.fn();
const mockUseTeamFleetData = vi.fn();
const mapViewMountSpy = vi.fn();
const mapViewUnmountSpy = vi.fn();

vi.mock('@/hooks/useGoogleMapsKey', () => ({
  useGoogleMapsKey: (...args: unknown[]) => mockUseGoogleMapsKey(...args),
}));

vi.mock('@/features/teams/hooks/useTeamFleetData', () => ({
  useTeamFleetData: (...args: unknown[]) => mockUseTeamFleetData(...args),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: () => ({ selectedTeamId: null }),
}));

vi.mock('@/features/fleet-map/components/MapView', async () => {
  const React = await import('react');

  interface MockMapViewProps {
    filteredLocations: EquipmentLocation[];
    teamHQLocations?: TeamHQLocation[];
    onMarkerClick?: (id: string) => void;
  }

  const MapView = ({ filteredLocations, teamHQLocations = [], onMarkerClick }: MockMapViewProps) => {
    const [selectedEquipmentId, setSelectedEquipmentId] = React.useState<string | null>(null);
    const [selectedHQId, setSelectedHQId] = React.useState<string | null>(null);

    React.useEffect(() => {
      mapViewMountSpy();
      return () => {
        mapViewUnmountSpy();
      };
    }, []);

    const selectedEquipment = filteredLocations.find((location) => location.id === selectedEquipmentId) ?? null;
    const selectedHQ = teamHQLocations.find((hq) => hq.id === selectedHQId) ?? null;

    return (
      <div data-testid="map-view">
        {filteredLocations.map((location) => (
          <button
            key={location.id}
            type="button"
            onClick={() => {
              setSelectedHQId(null);
              setSelectedEquipmentId(location.id);
              onMarkerClick?.(location.id);
            }}
          >
            {location.name}
          </button>
        ))}
        {teamHQLocations.map((hq) => (
          <button
            key={hq.id}
            type="button"
            onClick={() => {
              setSelectedEquipmentId(null);
              setSelectedHQId(hq.id);
            }}
          >
            {hq.name}
          </button>
        ))}
        {selectedEquipment ? (
          <div data-testid="equipment-popup">
            <h2>{selectedEquipment.name}</h2>
            <button type="button">Details</button>
          </div>
        ) : null}
        {selectedHQ ? (
          <div data-testid="hq-popup">
            <h2>{selectedHQ.name}</h2>
            <p>Team HQ</p>
            <button type="button">View Team</button>
          </div>
        ) : null}
      </div>
    );
  };

  return { MapView };
});

vi.mock('@/features/fleet-map/components/EquipmentPanel', () => ({
  default: () => <div data-testid="equipment-panel" />,
}));

vi.mock('@/components/layout/Page', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="page">{children}</div>,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title, description }: { title: string; description?: string }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  ),
}));

describe('FleetMap page', () => {
  const mockEquipmentLocations: EquipmentLocation[] = [
    {
      id: 'eq-1',
      name: 'Portable Generator',
      manufacturer: 'Acme',
      model: 'G100',
      serial_number: 'SN-001',
      lat: 40.7128,
      lng: -74.006,
      source: 'manual',
      team_id: 'team-1',
      team_name: 'Heavy Equipment Team',
    },
  ];

  const mockTeamFleetData: TeamFleetData = {
    teams: [
      {
        id: 'team-1',
        name: 'Heavy Equipment Team',
        description: null,
        equipmentCount: 1,
        hasLocationData: true,
        location_lat: 40.7128,
        location_lng: -74.006,
        location_address: '123 Main St',
        location_city: 'New York',
        location_state: 'NY',
        location_country: 'United States',
      },
      {
        id: 'team-2',
        name: 'Field Service Team',
        description: null,
        equipmentCount: 0,
        hasLocationData: true,
        location_lat: 34.0522,
        location_lng: -118.2437,
        location_address: '456 Elm St',
        location_city: 'Los Angeles',
        location_state: 'CA',
        location_country: 'United States',
      },
    ],
    teamEquipmentData: [
      {
        teamId: 'team-1',
        teamName: 'Heavy Equipment Team',
        equipment: mockEquipmentLocations,
        equipmentCount: 1,
        locatedCount: 1,
      },
      {
        teamId: 'team-2',
        teamName: 'Field Service Team',
        equipment: [],
        equipmentCount: 0,
        locatedCount: 0,
      },
    ],
    hasLocationData: true,
    totalEquipmentCount: 1,
    totalLocatedCount: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamFleetData.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  it('renders the signed error card with Try Again when the maps key invoke fails', () => {
    mockUseGoogleMapsKey.mockReturnValue({
      googleMapsKey: '',
      mapId: null,
      isLoading: false,
      error: 'Edge function failed: upstream blew up',
      retry: vi.fn(),
    });

    render(<FleetMap />);

    expect(screen.getByRole('heading', { name: 'Fleet Map' })).toBeInTheDocument();
    expect(screen.getByText('Fleet Map Error')).toBeInTheDocument();
    expect(screen.getByText('Edge function failed: upstream blew up')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/GOOGLE_MAPS_BROWSER_KEY/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/VITE_GOOGLE_MAPS_BROWSER_KEY/i)).not.toBeInTheDocument();
  });

  it('keeps the mounted map visible when loading flags flip after first paint', () => {
    mockUseGoogleMapsKey.mockReturnValue({
      googleMapsKey: 'maps-key',
      mapId: 'map-id',
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    mockUseTeamFleetData.mockReturnValue({
      data: mockTeamFleetData,
      isLoading: false,
      error: null,
    });

    const { rerender } = render(<FleetMap />);

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    expect(mapViewMountSpy).toHaveBeenCalledTimes(1);
    expect(mapViewUnmountSpy).not.toHaveBeenCalled();

    mockUseGoogleMapsKey.mockReturnValue({
      googleMapsKey: 'maps-key',
      mapId: 'map-id',
      isLoading: true,
      error: null,
      retry: vi.fn(),
    });
    rerender(<FleetMap />);

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    expect(mapViewMountSpy).toHaveBeenCalledTimes(1);
    expect(mapViewUnmountSpy).not.toHaveBeenCalled();

    mockUseGoogleMapsKey.mockReturnValue({
      googleMapsKey: 'maps-key',
      mapId: 'map-id',
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    mockUseTeamFleetData.mockReturnValue({
      data: mockTeamFleetData,
      isLoading: true,
      error: null,
    });
    rerender(<FleetMap />);

    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    expect(mapViewMountSpy).toHaveBeenCalledTimes(1);
    expect(mapViewUnmountSpy).not.toHaveBeenCalled();
  });

  it('keeps MapView mounted while switching from equipment to repeated HQ selection', () => {
    mockUseGoogleMapsKey.mockReturnValue({
      googleMapsKey: 'maps-key',
      mapId: 'map-id',
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });
    mockUseTeamFleetData.mockReturnValue({
      data: mockTeamFleetData,
      isLoading: false,
      error: null,
    });

    render(<FleetMap />);

    fireEvent.click(screen.getByRole('button', { name: 'Portable Generator' }));
    expect(screen.getByTestId('equipment-popup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Portable Generator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
    expect(mapViewMountSpy).toHaveBeenCalledTimes(1);
    expect(mapViewUnmountSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Heavy Equipment Team' }));
    expect(screen.getByTestId('hq-popup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Heavy Equipment Team' })).toBeInTheDocument();
    expect(screen.getByText('Team HQ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Team' })).toBeInTheDocument();
    expect(mapViewMountSpy).toHaveBeenCalledTimes(1);
    expect(mapViewUnmountSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Field Service Team' }));
    expect(screen.getByTestId('hq-popup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Field Service Team' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Portable Generator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Heavy Equipment Team' })).not.toBeInTheDocument();
    expect(screen.getByText('Team HQ')).toBeInTheDocument();
    expect(mapViewMountSpy).toHaveBeenCalledTimes(1);
    expect(mapViewUnmountSpy).not.toHaveBeenCalled();
  });
});
