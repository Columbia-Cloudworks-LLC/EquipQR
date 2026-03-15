import React from 'react';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentPMInfo from '../EquipmentPMInfo';

// Mock the service function - hoisted to avoid initialization issues
const { mockGetLatestCompletedPM } = vi.hoisted(() => ({
  mockGetLatestCompletedPM: vi.fn()
}));

vi.mock('@/features/pm-templates/services/preventativeMaintenanceService', () => ({
  getLatestCompletedPM: mockGetLatestCompletedPM
}));

describe('EquipmentPMInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders loading state initially', () => {
      mockGetLatestCompletedPM.mockResolvedValue(null);
      
      render(<EquipmentPMInfo equipmentId="eq-1" organizationId="org-1" />);
      
      // Should show the PM title in loading state
      expect(screen.getByText('Preventative Maintenance')).toBeInTheDocument();
    });

    it('renders no PM found message when no PM data exists', async () => {
      mockGetLatestCompletedPM.mockResolvedValue(null);
      
      render(<EquipmentPMInfo equipmentId="eq-1" organizationId="org-1" />);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('No PM records found. Create a work order with PM to start tracking.')).toBeInTheDocument();
      });
    });

    it('renders PM information when PM data exists', async () => {
      const mockPMData = {
        id: 'pm-1',
        completed_at: '2024-01-15T10:00:00Z',
        work_order_title: 'Scheduled Maintenance WO-123'
      };
      
      mockGetLatestCompletedPM.mockResolvedValue(mockPMData);
      
      render(<EquipmentPMInfo equipmentId="eq-1" organizationId="org-1" />);
      
      // Wait for data to load (content that only appears when PM data is loaded)
      await waitFor(() => {
        expect(screen.getByText('Last PM')).toBeInTheDocument();
      });
      
      // Verify card and work order are displayed
      expect(screen.getByText('Preventative Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Work Order')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Maintenance WO-123')).toBeInTheDocument();
      
      // Verify status badge (no interval -> Completed)
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
});
