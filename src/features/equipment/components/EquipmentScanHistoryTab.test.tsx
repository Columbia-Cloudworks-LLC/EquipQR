import React from 'react';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentScanHistoryTab from './EquipmentScanHistoryTab';
import * as useEquipmentModule from '@/features/equipment/hooks/useEquipment';
import * as useEquipmentLocationHistoryModule from '@/features/equipment/hooks/useEquipmentLocationHistory';

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentScans: vi.fn(),
  useEquipmentScanFollowUps: vi.fn(),
}));

vi.mock('@/features/equipment/hooks/useEquipmentLocationHistory', () => ({
  useEquipmentLocationHistory: vi.fn(),
}));

const mockUseEquipmentScans = vi.mocked(useEquipmentModule.useEquipmentScans);
const mockUseEquipmentScanFollowUps = vi.mocked(useEquipmentModule.useEquipmentScanFollowUps);
const mockUseEquipmentLocationHistory = vi.mocked(
  useEquipmentLocationHistoryModule.useEquipmentLocationHistory,
);

function setScans(value: unknown) {
  mockUseEquipmentScans.mockReturnValue(value as ReturnType<typeof useEquipmentModule.useEquipmentScans>);
}

function setFollowUps(value: unknown) {
  mockUseEquipmentScanFollowUps.mockReturnValue(
    value as ReturnType<typeof useEquipmentModule.useEquipmentScanFollowUps>,
  );
}

function setLocationHistory(value: unknown) {
  mockUseEquipmentLocationHistory.mockReturnValue(
    value as ReturnType<typeof useEquipmentLocationHistoryModule.useEquipmentLocationHistory>,
  );
}

describe('EquipmentScanHistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setScans({ data: [], isLoading: false, error: null });
    setFollowUps({ data: [], isLoading: false, error: null });
    setLocationHistory({ data: [], isLoading: false, error: null });
  });

  it('shows loading skeletons while either query is loading', () => {
    setScans({ data: [], isLoading: true, error: null });

    const { container } = render(
      <EquipmentScanHistoryTab equipmentId="eq-1" organizationId="org-1" />,
    );

    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no scans', () => {
    render(<EquipmentScanHistoryTab equipmentId="eq-1" organizationId="org-1" />);

    expect(screen.getByText('No scan history yet')).toBeInTheDocument();
    expect(screen.getByText('No coordinate history yet')).toBeInTheDocument();
  });

  it('shows an error state when a query fails', () => {
    setScans({ data: [], isLoading: false, error: new Error('boom') });

    render(<EquipmentScanHistoryTab equipmentId="eq-1" organizationId="org-1" />);

    expect(screen.getByText('Failed to load scan history')).toBeInTheDocument();
  });

  it('renders coordinate-backed location history rows separately from scan event text', () => {
    setLocationHistory({
      data: [
        {
          id: 'hist-1',
          equipment_id: 'eq-1',
          source: 'scan',
          latitude: 40.919345,
          longitude: -90.659318,
          address_street: null,
          address_city: null,
          address_state: null,
          address_country: null,
          formatted_address: '40.919345, -90.659318',
          created_at: '2026-04-15T08:30:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });
    setScans({
      data: [
        {
          id: 'scan-1',
          equipment_id: 'eq-1',
          scanned_by: 'user-1',
          scanned_at: '2026-01-02T00:00:00Z',
          location: 'Warehouse A',
          notes: null,
          scanned_by_name: null,
          scannedByName: 'John Doe',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<EquipmentScanHistoryTab equipmentId="eq-1" organizationId="org-1" />);

    expect(screen.getByText('Location Movement')).toBeInTheDocument();
    expect(screen.getByText('Scan GPS')).toBeInTheDocument();
    expect(screen.getByText('40.919345, -90.659318')).toBeInTheDocument();
    expect(screen.getByText('Directions')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();
  });

  it('renders a scan with location and a "Viewed scan page" fallback action', () => {
    setScans({
      data: [
        {
          id: 'scan-1',
          equipment_id: 'eq-1',
          scanned_by: 'user-1',
          scanned_at: '2026-01-02T00:00:00Z',
          location: 'Warehouse A',
          notes: null,
          scanned_by_name: null,
          scannedByName: 'John Doe',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<EquipmentScanHistoryTab equipmentId="eq-1" organizationId="org-1" />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();
    expect(screen.getByText('Viewed scan page')).toBeInTheDocument();
  });

  it('renders a scan without location and still lists follow-up actions', () => {
    setScans({
      data: [
        {
          id: 'scan-1',
          equipment_id: 'eq-1',
          scanned_by: 'user-1',
          scanned_at: '2026-01-02T00:00:00Z',
          location: null,
          notes: null,
          scanned_by_name: null,
          scannedByName: 'Jane Smith',
        },
      ],
      isLoading: false,
      error: null,
    });
    setFollowUps({
      data: [
        {
          id: 'evt-1',
          scan_id: 'scan-1',
          equipment_id: 'eq-1',
          event_type: 'generic_work_order_created',
          entity_type: 'work_order',
          entity_id: 'wo-1',
          metadata: { title: 'Fix hydraulics' },
          performed_by: 'user-1',
          performed_by_name: null,
          performed_at: '2026-01-02T01:00:00Z',
          performedByName: 'Jane Smith',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<EquipmentScanHistoryTab equipmentId="eq-1" organizationId="org-1" />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('Warehouse A')).not.toBeInTheDocument();
    expect(screen.getByText('Created work order')).toBeInTheDocument();
    expect(screen.getByText('Fix hydraulics')).toBeInTheDocument();
    expect(screen.queryByText('Viewed scan page')).not.toBeInTheDocument();
  });
});
