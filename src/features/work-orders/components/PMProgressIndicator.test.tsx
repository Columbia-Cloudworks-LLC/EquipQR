import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect, type MockedFunction } from 'vitest';
import PMProgressIndicator from './PMProgressIndicator';
import { TestProviders } from '@/test/utils/TestProviders';
import { usePMByWorkOrderId } from '@/features/pm-templates/hooks/usePMData';

// Mock hooks with proper factory to avoid hoisting
vi.mock('@/features/pm-templates/hooks/usePMData', () => ({
  usePMByWorkOrderId: vi.fn()
}));

const mockPMData = {
  id: 'pm-1',
  work_order_id: 'wo-1',
  equipment_id: 'eq-1',
  status: 'in_progress',
  checklist_data: [
    {
      id: 'item-1',
      section: 'Engine',
      title: 'Check oil level',
      description: 'Verify oil is at proper level',
      condition: 1, // OK
      required: true
    },
    {
      id: 'item-2',
      section: 'Engine',
      title: 'Check coolant',
      description: 'Verify coolant level',
      condition: 2, // Adjusted
      required: true
    },
    {
      id: 'item-3',
      section: 'Safety',
      title: 'Test brakes',
      description: 'Ensure brakes function',
      condition: null, // Not rated
      required: true
    }
  ],
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  completed_by: null,
  completed_at: null,
  historical_completion_date: null,
  historical_notes: null,
  organization_id: 'org-1'
};

// Simple mock utility
const createMockQueryResult = (data: unknown) => ({
  data,
  isLoading: false,
  isError: false,
  error: null
} as ReturnType<typeof usePMByWorkOrderId>);

/** Icons replace legacy "PM Required" / "PM Complete" copy */
const pmRowIcons = (container: HTMLElement) => ({
  wrench: container.querySelector('.lucide-wrench'),
  circleCheck: container.querySelector('.lucide-circle-check'),
  circleDashed: container.querySelector('.lucide-circle-dashed'),
  segmentBar: container.querySelector('.relative.w-full.overflow-hidden.rounded-md'),
});

describe('PMProgressIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No PM Required', () => {
    it('shows nothing when PM is not required', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(mockPMData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={false} />, { wrapper: TestProviders });
      
      const { wrench, circleCheck, circleDashed } = pmRowIcons(container);
      expect(wrench).toBeNull();
      expect(circleCheck).toBeNull();
      expect(circleDashed).toBeNull();
    });

    it('shows nothing when PM data is null', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(null));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, circleCheck, circleDashed } = pmRowIcons(container);
      expect(wrench).toBeNull();
      expect(circleCheck).toBeNull();
      expect(circleDashed).toBeNull();
    });
  });

  describe('PM Required Badge', () => {
    it('shows PM row with wrench icon and segmented progress', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(mockPMData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, segmentBar, circleDashed } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      expect(segmentBar).toBeInTheDocument();
      expect(circleDashed).toBeInTheDocument();
    });

    it('renders segmented progress for all checklist items', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(mockPMData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, segmentBar } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      const segmentedProgress = segmentBar ?? container.querySelector('[class*="rounded-md"]');
      expect(segmentedProgress).toBeInTheDocument();
    });

    it('shows segmented progress when no items are rated', () => {
      const noRatedData = {
        ...mockPMData,
        checklist_data: [
          { id: '1', title: 'Check oil', section: 'Engine', condition: null, required: true },
          { id: '2', title: 'Check filter', section: 'Engine', condition: null, required: true }
        ]
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(noRatedData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, segmentBar } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      const segmentedProgress = segmentBar ?? container.querySelector('[class*="rounded-md"]');
      expect(segmentedProgress).toBeInTheDocument();
    });

    it('handles empty checklist', () => {
      const emptyData = {
        ...mockPMData,
        checklist_data: []
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(emptyData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, segmentBar, circleDashed } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      expect(circleDashed).toBeInTheDocument();
      expect(segmentBar).not.toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('PM Complete Badge', () => {
    it('shows completion icon when status is completed', () => {
      const completePMData = {
        ...mockPMData,
        status: 'completed'
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(completePMData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, circleCheck, circleDashed, segmentBar } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      expect(circleCheck).toBeInTheDocument();
      expect(circleDashed).not.toBeInTheDocument();
      expect(segmentBar).toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('keeps segment bar visible when complete', () => {
      const completePMData = {
        ...mockPMData,
        status: 'completed'
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(completePMData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { circleCheck, segmentBar } = pmRowIcons(container);
      expect(circleCheck).toBeInTheDocument();
      expect(segmentBar).toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null checklist data', () => {
      const nullChecklistData = {
        ...mockPMData,
        checklist_data: null
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(nullChecklistData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, segmentBar, circleDashed } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      expect(circleDashed).toBeInTheDocument();
      expect(segmentBar).not.toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('handles undefined checklist data', () => {
      const undefinedChecklistData = {
        ...mockPMData,
        checklist_data: undefined
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(undefinedChecklistData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, segmentBar, circleDashed } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      expect(circleDashed).toBeInTheDocument();
      expect(segmentBar).not.toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('renders segments with different condition statuses', () => {
      const mixedData = {
        ...mockPMData,
        checklist_data: [
          { id: '1', section: 'Test', title: 'Item 1', condition: 1, required: true }, // OK
          { id: '2', section: 'Test', title: 'Item 2', condition: 2, required: true }, // Adjusted
          { id: '3', section: 'Test', title: 'Item 3', condition: 3, required: true }, // Recommend Repairs
          { id: '4', section: 'Test', title: 'Item 4', condition: null, required: true } // Not rated
        ]
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(mixedData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      const { wrench, segmentBar } = pmRowIcons(container);
      expect(wrench).toBeInTheDocument();
      const segmentedProgress = segmentBar ?? container.querySelector('[class*="rounded-md"]');
      expect(segmentedProgress).toBeInTheDocument();
    });
  });
});

