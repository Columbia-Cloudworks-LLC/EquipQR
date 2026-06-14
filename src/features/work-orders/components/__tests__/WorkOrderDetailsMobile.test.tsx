import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkOrderDetailsMobile } from '../WorkOrderDetailsMobile';

vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-google-map">{children}</div>,
  MarkerF: () => null,
}));

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: () => ({ isLoaded: true }),
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

  const equipment = {
    id: 'eq-1',
    name: 'Excavator 1',
    status: 'active',
    location: 'Field site A',
    manufacturer: 'Cat',
    model: '320',
    serial_number: 'SN-1',
    team_id: 'team-1' as string | null,
    custom_attributes: null as Record<string, unknown> | null,
    image_url: null as string | null,
  };

  const renderMobile = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  it('renders equipment and team on the field context card', () => {
    renderMobile(
      <WorkOrderDetailsMobile
        workOrder={baseWorkOrder}
        equipment={equipment}
        team={{ id: 'team-1', name: 'Field Crew' }}
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
    renderMobile(<WorkOrderDetailsMobile workOrder={baseWorkOrder} equipment={equipment} />);

    expect(screen.queryByText(/\b1\s*\/\s*3\b/)).not.toBeInTheDocument();
    expect(screen.queryByText(/high priority/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^in progress$/i)).not.toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Estimated')).toBeInTheDocument();
  });

  it('still renders description when present', () => {
    renderMobile(
      <WorkOrderDetailsMobile workOrder={{ ...baseWorkOrder, description: 'Oil leak at fitting.' }} equipment={equipment} />,
    );

    expect(screen.getByRole('button', { name: /description/i })).toBeInTheDocument();
  });
});
