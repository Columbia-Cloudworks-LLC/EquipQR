import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkingHoursTimelineModal } from '../WorkingHoursTimelineModal';

describe('WorkingHoursTimelineModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('renders when open is true', () => {
      render(
        <WorkingHoursTimelineModal 
          open={true} 
          onClose={mockOnClose} 
          equipmentId="eq-1"
          equipmentName="Test Equipment"
        />
      );
      
      expect(screen.getByText(/Working Hours/i)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <WorkingHoursTimelineModal 
          open={false} 
          onClose={mockOnClose} 
          equipmentId="eq-1"
          equipmentName="Test Equipment"
        />
      );
      
      expect(screen.queryByText(/Working Hours/i)).not.toBeInTheDocument();
    });

    it('calls onClose when modal is closed', () => {
      render(
        <WorkingHoursTimelineModal 
          open={true} 
          onClose={mockOnClose} 
          equipmentId="eq-1"
          equipmentName="Test Equipment"
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
