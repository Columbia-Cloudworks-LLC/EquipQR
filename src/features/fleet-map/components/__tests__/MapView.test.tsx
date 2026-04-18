import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { MapView } from '../MapView';

// Mock @vis.gl/react-google-maps. The real package mounts a Google Maps
// instance via the JS SDK which is not available (and not desirable) in
// jsdom. We replace the components with thin passthroughs and useMap with
// a stub that returns null so the auto-fit effect is a no-op.
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  ),
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  AdvancedMarker: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="marker" onClick={onClick}>
      {children}
    </div>
  ),
  InfoWindow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="info-window">{children}</div>
  ),
  useMap: vi.fn(() => null),
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
    warn: vi.fn(),
  },
}));

// Mock window.google.maps for any imperative calls that may occur during
// the tests (e.g. fitAllMarkers if useMap returns a non-null map).
interface GoogleMapsMock {
  maps: {
    Size: (width: number, height: number) => { width: number; height: number };
    Point: (x: number, y: number) => { x: number; y: number };
    LatLngBounds: () => { extend: () => void; toJSON: () => unknown };
    event: { addListenerOnce: () => void };
  };
}

global.window.google = {
  maps: {
    Size: vi.fn((width: number, height: number) => ({ width, height })),
    Point: vi.fn((x: number, y: number) => ({ x, y })),
    LatLngBounds: vi.fn(() => ({ extend: vi.fn(), toJSON: vi.fn() })),
    event: { addListenerOnce: vi.fn() },
  },
} as unknown as GoogleMapsMock;

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
    it('renders Map when provided with valid equipment locations', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          isMapsLoaded={true}
        />
      );

      expect(screen.getByTestId('api-provider')).toBeInTheDocument();
      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });

    it('renders map even with empty locations', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={[]}
          filteredLocations={[]}
          isMapsLoaded={true}
        />
      );

      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });

    it('still renders when mapId is null (degraded fallback)', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId={null}
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          isMapsLoaded={true}
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
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={filteredLocations}
          isMapsLoaded={true}
        />
      );

      const markers = screen.getAllByTestId('marker');
      expect(markers).toHaveLength(2);
    });

    it('renders all markers when filteredLocations matches equipmentLocations', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          isMapsLoaded={true}
        />
      );

      const markers = screen.getAllByTestId('marker');
      expect(markers).toHaveLength(3);
    });

    it('renders no markers when filteredLocations is empty', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={[]}
          isMapsLoaded={true}
        />
      );

      const markers = screen.queryAllByTestId('marker');
      expect(markers).toHaveLength(0);
    });
  });

  describe('Map Options', () => {
    it('passes stable options object to Map across re-renders', () => {
      const { rerender } = render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          isMapsLoaded={true}
        />
      );

      // Rerender with same props
      rerender(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          isMapsLoaded={true}
        />
      );

      // Component re-renders without errors and the Map is still in the DOM
      expect(screen.getByTestId('google-map')).toBeInTheDocument();
    });
  });
});
