import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { MapView } from './MapView';

const mapMountSpy = vi.fn();
const mapUnmountSpy = vi.fn();
const mockWithResolvedEquipmentImages = vi.hoisted(() => vi.fn(async (rows: unknown[]) => rows));
let mapInstanceCounter = 0;

vi.mock('@/services/imageUploadService', async () => {
  const actual = await vi.importActual<typeof import('@/services/imageUploadService')>(
    '@/services/imageUploadService',
  );

  return {
    ...actual,
    withResolvedEquipmentImages: (...args: unknown[]) => mockWithResolvedEquipmentImages(...args),
  };
});

// Mock @vis.gl/react-google-maps. The real package mounts a Google Maps
// instance via the JS SDK which is not available (and not desirable) in
// jsdom. This mock keeps the important contract for this bug: an InfoWindow
// only renders when it is anchored to the clicked AdvancedMarker instance.
vi.mock('@vis.gl/react-google-maps', async () => {
  const React = await import('react');

  const APIProvider = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="api-provider">{children}</div>
  );

  const Map = ({ children }: { children: React.ReactNode }) => {
    const instanceIdRef = React.useRef(`map-${++mapInstanceCounter}`);

    React.useEffect(() => {
      mapMountSpy(instanceIdRef.current);
      return () => {
        mapUnmountSpy(instanceIdRef.current);
      };
    }, []);

    return (
      <div data-testid="google-map" data-map-instance-id={instanceIdRef.current}>
        {children}
      </div>
    );
  };

  const AdvancedMarker = React.forwardRef<
    HTMLButtonElement,
    { children?: React.ReactNode; onClick?: () => void; title?: string }
  >(({ children, onClick, title }, ref) => (
    <button
      ref={ref}
      type="button"
      data-testid="marker"
      aria-label={title ?? 'marker'}
      onClick={onClick}
    >
      {children}
    </button>
  ));
  AdvancedMarker.displayName = 'AdvancedMarker';

  const InfoWindow = ({
    anchor,
    children,
    onClose,
  }: {
    anchor?: unknown;
    children: React.ReactNode;
    onClose?: () => void;
  }) => (
    anchor ? (
      <div data-testid="info-window">
        <button type="button" aria-label="Close info window" onClick={onClose} />
        {children}
      </div>
    ) : null
  );

  const useAdvancedMarkerRef = () => {
    const [marker, setMarker] = React.useState<HTMLButtonElement | null>(null);
    const ref = React.useCallback((node: HTMLButtonElement | null) => {
      setMarker(node);
    }, []);

    return [ref, marker] as const;
  };

  return {
    APIProvider,
    Map,
    AdvancedMarker,
    InfoWindow,
    useAdvancedMarkerRef,
    useMap: vi.fn(() => null),
  };
});

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
      source: 'manual' as const,
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
      source: 'legacy' as const,
      last_maintenance: null,
      image_url: null,
      location_updated_at: '2024-01-03T00:00:00Z',
      team_id: 'team-1',
      team_name: 'Team 1',
    },
  ];

  const mockTeamHQLocations = [
    {
      id: 'team-1',
      name: 'Heavy Equipment Team',
      lat: 32.776664,
      lng: -96.796988,
      formatted_address: '123 Main St, Dallas, TX, United States',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWithResolvedEquipmentImages.mockImplementation(async (rows: unknown[]) => rows);
    mapInstanceCounter = 0;
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

    it('anchors equipment and HQ selection without remounting the map instance', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          teamHQLocations={mockTeamHQLocations}
        />
      );

      const initialMap = screen.getByTestId('google-map');
      const initialMapInstanceId = initialMap.getAttribute('data-map-instance-id');

      fireEvent.click(screen.getByRole('button', { name: 'Equipment 1' }));
      expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
      expect(screen.getByText('Equipment 1')).toBeInTheDocument();
      expect(screen.getByTestId('google-map')).toHaveAttribute('data-map-instance-id', initialMapInstanceId);
      expect(mapMountSpy).toHaveBeenCalledTimes(1);
      expect(mapUnmountSpy).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Heavy Equipment Team' }));
      const hqInfoWindow = screen.getAllByTestId('info-window').at(-1);
      expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'View Team' })).toBeInTheDocument();
      expect(hqInfoWindow).toBeDefined();
      expect(within(hqInfoWindow!).getByText('Team HQ')).toBeInTheDocument();
      expect(within(hqInfoWindow!).getByText('Heavy Equipment Team')).toBeInTheDocument();
      expect(screen.getByTestId('google-map')).toHaveAttribute('data-map-instance-id', initialMapInstanceId);
      expect(mapMountSpy).toHaveBeenCalledTimes(1);
      expect(mapUnmountSpy).not.toHaveBeenCalled();
    });

    it('renders popup images from resolved display URLs instead of raw storage paths', async () => {
      mockWithResolvedEquipmentImages.mockImplementation(async (rows: unknown[]) =>
        (rows as Array<{ id: string; image_url?: string | null }>).map((row) =>
          row.id === 'eq-1'
            ? { ...row, image_url: 'https://signed.example/storage/v1/object/sign/work-order-images/org/eq-1/photo.jpg?token=test' }
            : row,
        ),
      );

      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={[
            {
              ...mockEquipmentLocations[0],
              image_url: 'org/eq-1/photo.jpg',
            },
          ]}
          filteredLocations={[
            {
              ...mockEquipmentLocations[0],
              image_url: 'org/eq-1/photo.jpg',
            },
          ]}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Equipment 1' }));

      const image = await screen.findByRole('img', { name: 'Equipment 1' });
      expect(image).toHaveAttribute(
        'src',
        'https://signed.example/storage/v1/object/sign/work-order-images/org/eq-1/photo.jpg?token=test',
      );
      expect(mockWithResolvedEquipmentImages).toHaveBeenCalledTimes(1);
    });
  });

  describe('Source controls', () => {
    it('renders location source legend labels and filter control', () => {
      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          teamHQLocations={mockTeamHQLocations}
          isMapsLoaded={true}
        />
      );

      expect(screen.getByText('Assigned Address')).toBeInTheDocument();
      expect(screen.getByText('QR Scan GPS')).toBeInTheDocument();
      expect(screen.getByText('Team HQ')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter map markers by location source')).toBeInTheDocument();
    });

    it('clears marker selection when the source filter hides the selected marker', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <MapView
          googleMapsKey="test-api-key"
          mapId="test-map-id"
          equipmentLocations={mockEquipmentLocations}
          filteredLocations={mockEquipmentLocations}
          teamHQLocations={mockTeamHQLocations}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Equipment 1' }));
      expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();

      await user.click(screen.getByRole('combobox', { name: 'Filter map markers by location source' }));
      await user.click(screen.getByRole('option', { name: 'QR Scan GPS' }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox', { name: 'Filter map markers by location source' }));
      await user.click(screen.getByRole('option', { name: 'All sources' }));

      expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
    });
  });
});
