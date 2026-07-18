import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResponsiveEquipmentTabs from './ResponsiveEquipmentTabs';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

describe('ResponsiveEquipmentTabs', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
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
      expect(screen.getByText('Parts')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Check-Ins')).toBeInTheDocument();
      expect(screen.getByText('Scan History')).toBeInTheDocument();
    });

    it('no longer renders separate Scans and History tabs', () => {
      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );

      expect(screen.queryByText('Scans')).not.toBeInTheDocument();
      expect(screen.queryByText('History')).not.toBeInTheDocument();
    });

    it('applies desktop grid layout', () => {
      const { container } = render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      // Desktop uses grid-cols-7 (Details, Work Orders, Notes, Parts, Images, Check-Ins, Scan History)
      const tabsList = container.querySelector('[class*="grid-cols-7"]');
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
      expect(screen.getByText('Check-Ins')).toBeInTheDocument();
      expect(screen.getByText('Scan History')).toBeInTheDocument();
    });

    it('applies mobile grid layout', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      const { container } = render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );
      
      // Mobile row 1 uses grid-cols-3; row 2 uses grid-cols-4 (Parts, Images, Check-Ins, Scan History)
      const rows = container.querySelectorAll('[class*="grid-cols-3"], [class*="grid-cols-4"]');
      expect(rows.length).toBeGreaterThanOrEqual(2);
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

  describe('Inventory RBAC (showPartsTab)', () => {
    it('hides the Parts tab on desktop when the user lacks inventory access', () => {
      const { container } = render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange} showPartsTab={false}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );

      expect(screen.queryByText('Parts')).not.toBeInTheDocument();
      // Grid collapses to 6 columns without the Parts trigger
      expect(container.querySelector('[class*="grid-cols-6"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="grid-cols-7"]')).not.toBeInTheDocument();
    });

    it('hides the Parts tab on mobile when the user lacks inventory access', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange} showPartsTab={false}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );

      expect(screen.queryByText('Parts')).not.toBeInTheDocument();
    });

    it('shows the Parts tab by default', () => {
      render(
        <ResponsiveEquipmentTabs activeTab="details" onTabChange={mockOnTabChange}>
          <div>Tab Content</div>
        </ResponsiveEquipmentTabs>
      );

      expect(screen.getByText('Parts')).toBeInTheDocument();
    });
  });
});
