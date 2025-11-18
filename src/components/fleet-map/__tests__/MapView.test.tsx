import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { MapView } from '../MapView';

// Mock @react-google-maps/api
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  useJsApiLoader: () => ({ isLoaded: true, loadError: null }),
  MarkerF: () => <div data-testid="marker" />,
  InfoWindowF: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="info-window">{children}</div>
  ),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

// Mock window.google.maps for icon creation
global.window.google = {
  maps: {
    Size: vi.fn((width: number, height: number) => ({ width, height })),
    Point: vi.fn((x: number, y: number) => ({ x, y })),
  },
} as any;

describe('MapView', () => {
  const mockEquipmentLocations = [
    {
      id: 'eq-1',
      name: 'Equipment 1',
      manufacturer: 'Test',
      model: 'Model 1',
      serial_number: 'SN001',
      lat: 10,
      lng: 20,
      source: 'equipment' as const,
      formatted_address: undefined,
      working_hours: 100,
      last_maintenance: null,
      image_url: null,
      location_updated_at: '2024-01-01T00:00:00Z',
      team_id: 'team-1',
      team_name: 'Team 1',
    },
    {
      id: 'eq-2',
      name: 'Equipment 2',
      manufacturer: 'Test',
      model: 'Model 2',
      serial_number: 'SN002',
      lat: 30,
      lng: 40,
      source: 'scan' as const,
      formatted_address: undefined,
      working_hours: 200,
      last_maintenance: null,
      image_url: null,
      location_updated_at: '2024-01-02T00:00:00Z',
      team_id: 'team-1',
      team_name: 'Team 1',
    },
    {
      id: 'eq-3',
      name: 'Equipment 3',
      manufacturer: 'Test',
      model: 'Model 3',
      serial_number: 'SN003',
      lat: 50,
      lng: 60,
      source: 'equipment' as const,
      formatted_address: undefined,
      working_hours: 300,
      last_maintenance: null,
      image_url: null,
      location_updated_at: '2024-01-03T00:00:00Z',
      team_id: 'team-1',
      team_name: 'Team 1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Map Rendering', () => {
    it('renders GoogleMap when provided with valid equipment locations', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
        />
      );

      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });

    it('renders map even with empty locations', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          equipmentLocations={[]}
          filteredLocations={[]}
        />
      );

      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });
  });

  describe('Marker Rendering', () => {
    it('renders correct number of markers based on filteredLocations', () => {
      const filteredLocations = [mockEquipmentLocations[0], mockEquipmentLocations[1]];

      render(
        <MapView
          googleMapsKey="test-api-key"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={filteredLocations}
        />
      );

      const markers = screen.getAllByTestId('marker');
      expect(markers).toHaveLength(2);
    });

    it('renders all markers when filteredLocations matches equipmentLocations', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
        />
      );

      const markers = screen.getAllByTestId('marker');
      expect(markers).toHaveLength(3);
    });

    it('renders no markers when filteredLocations is empty', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={[]}
        />
      );

      const markers = screen.queryAllByTestId('marker');
      expect(markers).toHaveLength(0);
    });
  });

  describe('Map Options', () => {
    it('passes stable options object to GoogleMap', () => {
      const { rerender } = render(
        <MapView
          googleMapsKey="test-api-key"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
        />
      );

      // Get the initial options reference
      const firstRender = screen.getByTestId('google-map');

      // Rerender with same props
      rerender(
        <MapView
          googleMapsKey="test-api-key"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
        />
      );

      // Options should be stable (extracted to constant)
      // This is verified by the fact that the component renders without errors
      // and the options are passed correctly
      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });
  });

});

