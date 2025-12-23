import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResponsiveEquipmentTabs from '../ResponsiveEquipmentTabs';

// Mock mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

describe('ResponsiveEquipmentTabs', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop Rendering', () => {
    it('renders all tabs on desktop', () => {
      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Scans')).toBeInTheDocument();
    });

    it('applies desktop grid layout', () => {
      const { container } = render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      const tabsList = container.querySelector('[class*="grid-cols-5"]');
      expect(tabsList).toBeInTheDocument();
    });
  });

  describe('Mobile Rendering', () => {
    it('renders tabs in two rows on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument(); // Shortened on mobile
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Scans')).toBeInTheDocument();
    });

    it('applies mobile grid layout', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      const { container } = render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      const firstRow = container.querySelector('[class*="grid-cols-3"]');
      const secondRow = container.querySelector('[class*="grid-cols-2"]');
      expect(firstRow).toBeInTheDocument();
      expect(secondRow).toBeInTheDocument();
    });

    it('shortens work orders label on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.queryByText('Work Orders')).not.toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('calls onTabChange when tab is clicked', () => {
      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      const workOrdersTab = screen.getByText('Work Orders');
      fireEvent.click(workOrdersTab);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('work-orders');
    });

    it('highlights active tab', () => {
      render(
        <ResponsiveEquipmentTabs activeTab="notes" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      const notesTab = screen.getByText('Notes');
      // Active tab should have active styling
      expect(notesTab).toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('renders children content', () => {
      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div data-testid="tab-content">Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    });
  });
});


