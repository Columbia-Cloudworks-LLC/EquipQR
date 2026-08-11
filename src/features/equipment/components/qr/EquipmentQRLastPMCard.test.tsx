import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import EquipmentQRLastPMCard from './EquipmentQRLastPMCard';
import type { LatestCompletedPMDetails } from '@/features/pm-templates/services/preventativeMaintenanceService';

vi.mock('@/utils/organizationSelection', () => ({
  persistDashboardOrganizationSelection: vi.fn(),
}));

const baseDetails: LatestCompletedPMDetails = {
  id: 'pm-1',
  work_order_id: 'wo-99',
  completed_at: '2024-06-01T12:00:00.000Z',
  completed_by: 'user-1',
  completed_by_name: 'Alex Tech',
  work_order_title: 'Forklift PM June',
  checklist_data: [
    {
      id: 'a',
      title: 'Oil',
      section: 'Engine',
      condition: 1,
      required: true,
    },
    {
      id: 'b',
      title: 'Brakes',
      section: 'Engine',
      condition: 3,
      required: true,
    },
    {
      id: 'c',
      title: 'Tires',
      section: 'Chassis',
      condition: 2,
      required: false,
    },
  ],
};

function renderCard(props: Partial<React.ComponentProps<typeof EquipmentQRLastPMCard>> = {}) {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <EquipmentQRLastPMCard
          organizationId="org-1"
          details={null}
          isLoading={false}
          isError={false}
          {...props}
        />
      </MemoryRouter>
    </TooltipProvider>
  );
}

describe('EquipmentQRLastPMCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton', () => {
    renderCard({ isLoading: true });
    expect(screen.getByTestId('equipment-qr-last-pm-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    renderCard({ isError: true });
    expect(screen.getByTestId('equipment-qr-last-pm-error')).toBeInTheDocument();
    expect(screen.getByText(/pm history unavailable/i)).toBeInTheDocument();
  });

  it('renders empty state when details is null', () => {
    renderCard({ details: null });
    expect(screen.getByTestId('equipment-qr-last-pm-empty')).toBeInTheDocument();
  });

  it('renders performer, title, sections, warnings, and PM work order link', () => {
    renderCard({ details: baseDetails });
    expect(screen.getByTestId('equipment-qr-last-pm-card')).toBeInTheDocument();
    expect(screen.getByText('Alex Tech')).toBeInTheDocument();
    expect(screen.getByText('Forklift PM June')).toBeInTheDocument();
    expect(screen.getByTestId('equipment-qr-last-pm-warnings')).toHaveTextContent(
      '2 checklist items flagged for review'
    );
    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText('Chassis')).toBeInTheDocument();
    const link = screen.getByTestId('equipment-qr-last-pm-open-wo');
    expect(link).toHaveAttribute('href', '/dashboard/work-orders/wo-99?action=pm');
  });

  it('uses fallbacks for missing names and title', () => {
    renderCard({
      details: {
        ...baseDetails,
        completed_by_name: null,
        work_order_title: null,
        checklist_data: [],
      },
    });
    expect(screen.getByText('Technician not recorded')).toBeInTheDocument();
    expect(screen.getByText('PM work order')).toBeInTheDocument();
    expect(screen.queryByTestId('equipment-qr-last-pm-warnings')).not.toBeInTheDocument();
  });

  it('parses stringified checklist JSON without throwing', () => {
    const checklistJson = JSON.stringify([
      { id: 'x', title: 'Only', section: 'Sec', condition: 5, required: true },
    ]);
    renderCard({
      details: { ...baseDetails, checklist_data: checklistJson as unknown as LatestCompletedPMDetails['checklist_data'] },
    });
    expect(screen.getByTestId('equipment-qr-last-pm-warnings')).toBeInTheDocument();
  });

  it('ignores invalid checklist payloads', () => {
    renderCard({
      details: { ...baseDetails, checklist_data: '{not-json' as unknown as LatestCompletedPMDetails['checklist_data'] },
    });
    expect(screen.queryByText('Engine')).not.toBeInTheDocument();
  });
});
