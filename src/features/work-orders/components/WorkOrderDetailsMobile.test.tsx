import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkOrderDetailsMobile } from './WorkOrderDetailsMobile';
import type { WorkOrderEmbeddedEquipment } from '@/features/work-orders/types/workOrder';

vi.mock('@/components/location/EquipmentLocationMapPanel', () => ({
  EquipmentLocationMapPanel: () => <div data-testid="mock-equipment-location-map-panel" />,
}));

vi.mock('@/features/equipment/hooks/useEquipmentWorkingHours', () => ({
  useEquipmentCurrentWorkingHours: () => ({ data: 42, isLoading: false }),
}));

describe('WorkOrderDetailsMobile', () => {
  const baseWorkOrder = {
    id: 'wo-1',
    title: 'Hydraulic repair',
    priority: 'high' as const,
    status: 'in_progress' as const,
    due_date: '2026-06-01T12:00:00Z',
    has_pm: true,
    pm_status: 'in_progress' as const,
    pm_progress: 1,
    pm_total: 3,
    estimated_hours: 2,
  };

  const equipment: WorkOrderEmbeddedEquipment = {
    id: 'eq-1',
    organization_id: 'org-1',
    name: 'Excavator 1',
    status: 'active',
    location: 'Field site A',
    manufacturer: 'Cat',
    model: '320',
    serial_number: 'SN-1',
    team_id: 'team-1',
    custom_attributes: null,
    image_url: null,
    working_hours: null,
    customer_id: null,
    default_pm_template_id: null,
    use_team_location: false,
    last_known_location: null,
    assigned_location_lat: null,
    assigned_location_lng: null,
    assigned_location_street: null,
    assigned_location_city: null,
    assigned_location_state: null,
    assigned_location_country: null,
    team: { id: 'team-1', name: 'Field Crew' },
  };

  const renderMobile = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  it('renders equipment and team on the field context card', () => {
    renderMobile(
      <WorkOrderDetailsMobile
        workOrder={baseWorkOrder}
        equipment={equipment}
        team={{ id: 'team-1', name: 'Field Crew' }}
        organizationId="org-1"
        effectiveLocation={{
          lat: 29.76,
          lng: -95.36,
          formattedAddress: 'Houston, TX',
          source: 'manual',
          sourceLabel: 'Equipment location',
        }}
      />,
    );

    expect(screen.getByText('Equipment')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Excavator 1' })).toHaveAttribute('href', '/dashboard/equipment/eq-1');
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Field Crew' })).toHaveAttribute('href', '/dashboard/teams/team-1');
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Equipment hours')).toBeInTheDocument();
  });

  it('does not duplicate compact-summary metadata on the summary card', () => {
    renderMobile(
      <WorkOrderDetailsMobile
        workOrder={baseWorkOrder}
        equipment={equipment}
        organizationId="org-1"
        effectiveLocation={{
          lat: 29.76,
          lng: -95.36,
          formattedAddress: 'Houston, TX',
          source: 'manual',
          sourceLabel: 'Equipment location',
        }}
      />,
    );

    expect(screen.queryByText(/\b1\s*\/\s*3\b/)).not.toBeInTheDocument();
    expect(screen.queryByText(/high priority/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^in progress$/i)).not.toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Estimated')).toBeInTheDocument();
  });

  it('still renders description when present', () => {
    renderMobile(
      <WorkOrderDetailsMobile
        workOrder={{ ...baseWorkOrder, description: 'Oil leak at fitting.' }}
        equipment={equipment}
        organizationId="org-1"
      />,
    );

    expect(screen.getByRole('button', { name: /description/i })).toBeInTheDocument();
  });
});
