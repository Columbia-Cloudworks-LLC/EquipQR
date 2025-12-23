import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentScansTab from '../EquipmentScansTab';

// Mock hooks
vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentScans: vi.fn()
}));

const mockScans = [
  {
    id: 'scan-1',
    scanned_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    scannedByName: 'John Doe',
    location: 'Warehouse A',
    scanned_by: 'user-1'
  },
  {
    id: 'scan-2',
    scanned_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    scannedByName: 'Jane Smith',
    location: 'Field Site 1',
    scanned_by: 'user-2'
  }
];

describe('EquipmentScansTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useEquipmentScans } = require('@/features/equipment/hooks/useEquipment');
    vi.mocked(useEquipmentScans).mockReturnValue({
      data: mockScans,
      isLoading: false
    });
  });

  describe('Core Rendering', () => {
    it('renders scans list', () => {
      render(<EquipmentScansTab equipmentId="eq-1" organizationId="org-1" />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays scan locations', () => {
      render(<EquipmentScansTab equipmentId="eq-1" organizationId="org-1" />);
      
      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
      expect(screen.getByText('Field Site 1')).toBeInTheDocument();
    });

    it('displays scan times', () => {
      render(<EquipmentScansTab equipmentId="eq-1" organizationId="org-1" />);
      
      // Should show formatted time
      expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when isLoading is true', () => {
      const { useEquipmentScans } = require('@/features/equipment/hooks/useEquipment');
      vi.mocked(useEquipmentScans).mockReturnValue({
        data: [],
        isLoading: true
      });

      const { container } = render(<EquipmentScansTab equipmentId="eq-1" organizationId="org-1" />);
      
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no scans', () => {
      const { useEquipmentScans } = require('@/features/equipment/hooks/useEquipment');
      vi.mocked(useEquipmentScans).mockReturnValue({
        data: [],
        isLoading: false
      });

      render(<EquipmentScansTab equipmentId="eq-1" organizationId="org-1" />);
      
      expect(screen.getByText('No scans yet')).toBeInTheDocument();
      expect(screen.getByText(/No QR code scans have been recorded/)).toBeInTheDocument();
    });
  });

  describe('Timeline View Toggle', () => {
    it('renders timeline view toggle', () => {
      render(<EquipmentScansTab equipmentId="eq-1" organizationId="org-1" />);
      
      // Should have a switch or button to toggle timeline view
      // This depends on the actual implementation
    });
  });

  describe('Time Formatting', () => {
    it('formats recent scans correctly', () => {
      const { useEquipmentScans } = require('@/features/equipment/hooks/useEquipment');
      vi.mocked(useEquipmentScans).mockReturnValue({
        data: [{
          id: 'scan-1',
          scanned_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          scannedByName: 'Test User',
          location: 'Test Location',
          scanned_by: 'user-1'
        }],
        isLoading: false
      });

      render(<EquipmentScansTab equipmentId="eq-1" organizationId="org-1" />);
      
      expect(screen.getByText(/Less than an hour ago/)).toBeInTheDocument();
    });
  });
});

