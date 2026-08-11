import React from 'react';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tables } from '@/integrations/supabase/types';
import EquipmentPMInfo from './EquipmentPMInfo';

const mockEquipment = {
  id: 'eq-1',
  organization_id: 'org-1',
  default_pm_template_id: null,
} as Tables<'equipment'>;

const defaultProps = {
  equipment: mockEquipment,
  canEdit: false,
  getCurrentTeamDisplay: () => 'Unassigned',
};

const { mockGetLatestCompletedPM } = vi.hoisted(() => ({
  mockGetLatestCompletedPM: vi.fn(),
}));

vi.mock('@/features/pm-templates/services/preventativeMaintenanceService', () => ({
  getLatestCompletedPM: mockGetLatestCompletedPM,
}));

vi.mock('@/features/equipment/hooks/useEquipmentPMStatus', () => ({
  useEquipmentPMStatus: vi.fn(() => ({ data: null, isLoading: false })),
  getPMComplianceLevel: vi.fn(() => 'no_interval'),
}));

vi.mock('./EquipmentPMConfigFields', () => ({
  EquipmentPMConfigFields: () => <div data-testid="pm-config-fields">PM config</div>,
}));

vi.mock('@/features/work-orders/components/PMProgressIndicator', () => ({
  default: ({ workOrderId }: { workOrderId: string }) => (
    <div data-testid="pm-progress" data-work-order-id={workOrderId} />
  ),
}));

describe('EquipmentPMInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders loading state initially', () => {
      mockGetLatestCompletedPM.mockResolvedValue(null);

      render(<EquipmentPMInfo {...defaultProps} />);

      expect(screen.getByText('Preventative Maintenance')).toBeInTheDocument();
      expect(screen.getByTestId('pm-config-fields')).toBeInTheDocument();
    });

    it('renders no PM found message when no PM data exists', async () => {
      mockGetLatestCompletedPM.mockResolvedValue(null);

      render(<EquipmentPMInfo {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/No PM records found\./)).toBeInTheDocument();
        expect(screen.getByText(/Create a work order/)).toBeInTheDocument();
      });
    });

    it('opens work order creation when the empty-state link is clicked', async () => {
      mockGetLatestCompletedPM.mockResolvedValue(null);
      const onCreateWorkOrder = vi.fn();
      const user = userEvent.setup();

      render(<EquipmentPMInfo {...defaultProps} onCreateWorkOrder={onCreateWorkOrder} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create a work order' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Create a work order' }));

      expect(onCreateWorkOrder).toHaveBeenCalledTimes(1);
    });

    it('renders PM information when PM data exists', async () => {
      const mockPMData = {
        id: 'pm-1',
        work_order_id: 'wo-123',
        completed_at: '2024-01-15T10:00:00Z',
        work_order_title: 'Scheduled Maintenance WO-123',
      };

      mockGetLatestCompletedPM.mockResolvedValue(mockPMData);

      render(<EquipmentPMInfo {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Last PM')).toBeInTheDocument();
      });

      expect(screen.getByText('Preventative Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Work Order')).toBeInTheDocument();

      const workOrderLink = screen.getByRole('link', { name: 'Scheduled Maintenance WO-123' });
      expect(workOrderLink).toHaveAttribute('href', '/dashboard/work-orders/wo-123?action=pm');

      expect(screen.getByTestId('pm-progress')).toHaveAttribute('data-work-order-id', 'wo-123');
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
});
