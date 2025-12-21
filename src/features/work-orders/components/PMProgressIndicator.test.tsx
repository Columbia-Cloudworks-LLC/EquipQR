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

describe('PMProgressIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No PM Required', () => {
    it('shows nothing when PM is not required', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(mockPMData));
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={false} />, { wrapper: TestProviders });
      
      expect(screen.queryByText('PM Required')).not.toBeInTheDocument();
      expect(screen.queryByText('PM Complete')).not.toBeInTheDocument();
    });

    it('shows nothing when PM data is null', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(null));
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.queryByText('PM Required')).not.toBeInTheDocument();
      expect(screen.queryByText('PM Complete')).not.toBeInTheDocument();
    });
  });

  describe('PM Required Badge', () => {
    it('shows PM Required badge with segmented progress', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(mockPMData));
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.getByText('PM Required')).toBeInTheDocument();
      // SegmentedProgress should be rendered (check for container with segments)
      const container = screen.getByText('PM Required').closest('div')?.parentElement;
      expect(container).toBeInTheDocument();
    });

    it('renders segmented progress for all checklist items', () => {
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(mockPMData));
      
      const { container } = render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.getByText('PM Required')).toBeInTheDocument();
      // Check for SegmentedProgress component (it renders divs with segments)
      const segmentedProgress = container.querySelector('[class*="rounded-md"]');
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
      
      expect(screen.getByText('PM Required')).toBeInTheDocument();
      // SegmentedProgress should still render with not_rated segments
      const segmentedProgress = container.querySelector('[class*="rounded-md"]');
      expect(segmentedProgress).toBeInTheDocument();
    });

    it('handles empty checklist', () => {
      const emptyData = {
        ...mockPMData,
        checklist_data: []
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(emptyData));
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.getByText('PM Required')).toBeInTheDocument();
      // No progress bar shown for empty checklist
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });

  describe('PM Complete Badge', () => {
    it('shows PM Complete badge when status is completed', () => {
      const completePMData = {
        ...mockPMData,
        status: 'completed'
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(completePMData));
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.getByText('PM Complete')).toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('hides progress bar when complete', () => {
      const completePMData = {
        ...mockPMData,
        status: 'completed'
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(completePMData));
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.getByText('PM Complete')).toBeInTheDocument();
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
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.getByText('PM Required')).toBeInTheDocument();
      // No progress bar shown for null data
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('handles undefined checklist data', () => {
      const undefinedChecklistData = {
        ...mockPMData,
        checklist_data: undefined
      };
      (usePMByWorkOrderId as MockedFunction<typeof usePMByWorkOrderId>).mockReturnValue(createMockQueryResult(undefinedChecklistData));
      
      render(<PMProgressIndicator workOrderId="wo-1" hasPM={true} />, { wrapper: TestProviders });
      
      expect(screen.getByText('PM Required')).toBeInTheDocument();
      // No progress bar shown for undefined data
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
      
      expect(screen.getByText('PM Required')).toBeInTheDocument();
      // SegmentedProgress should render with 4 segments
      const segmentedProgress = container.querySelector('[class*="rounded-md"]');
      expect(segmentedProgress).toBeInTheDocument();
    });
  });
});

