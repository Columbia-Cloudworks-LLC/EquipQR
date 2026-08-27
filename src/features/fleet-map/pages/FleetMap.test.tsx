import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import FleetMap from './FleetMap';

const mockUseGoogleMapsKey = vi.fn();
const mockUseTeamFleetData = vi.fn();

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

vi.mock('@/features/fleet-map/components/MapView', () => ({
  MapView: () => <div data-testid="map-view" />,
}));

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
});
