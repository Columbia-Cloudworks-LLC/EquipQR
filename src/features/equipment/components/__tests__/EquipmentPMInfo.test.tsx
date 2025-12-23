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
      expect(screen.getByText('Preventative Maintenance (PM)')).toBeInTheDocument();
    });

    it('renders no PM found message when no PM data exists', async () => {
      mockGetLatestCompletedPM.mockResolvedValue(null);
      
      render(<EquipmentPMInfo equipmentId="eq-1" organizationId="org-1" />);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('No preventative maintenance records found')).toBeInTheDocument();
      });
      
      // Should also show the helper text
      expect(screen.getByText(/Create work orders with PM requirements to track maintenance history/i)).toBeInTheDocument();
    });

    it('renders PM information when PM data exists', async () => {
      const mockPMData = {
        id: 'pm-1',
        completed_at: '2024-01-15T10:00:00Z',
        work_order_title: 'Scheduled Maintenance WO-123'
      };
      
      mockGetLatestCompletedPM.mockResolvedValue(mockPMData);
      
      render(<EquipmentPMInfo equipmentId="eq-1" organizationId="org-1" />);
      
      // Wait for data to load and verify specific content
      await waitFor(() => {
        expect(screen.getByText('Latest Preventative Maintenance (PM)')).toBeInTheDocument();
      });
      
      // Verify completed date is displayed
      expect(screen.getByText('Completed Date')).toBeInTheDocument();
      
      // Verify work order title is displayed
      expect(screen.getByText('Work Order')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Maintenance WO-123')).toBeInTheDocument();
      
      // Verify status badge
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
});
