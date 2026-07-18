import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkingHoursTimelineModal } from './WorkingHoursTimelineModal';

const mockToggleListening = vi.fn();

vi.mock('@/hooks/useVoiceTextAppender', () => ({
  useVoiceTextAppender: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => ({
    isSupported: true,
    isListening: false,
    error: null,
    interimTranscript: '',
    toggleListening: () => {
      mockToggleListening();
      if (!disabled) {
        onChange(`${value}${value.trim() ? ' ' : ''}dictated hours note`);
      }
    },
    canUseVoice: !disabled,
  }),
}));

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

  describe('voice dictation on notes field', () => {
    it('shows voice control when adding hours and appends dictated text', () => {
      render(
        <WorkingHoursTimelineModal
          open={true}
          onClose={mockOnClose}
          equipmentId="eq-1"
          equipmentName="Test Equipment"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /update hours/i }));

      const notesField = screen.getByPlaceholderText('Add any notes about this update');
      fireEvent.change(notesField, { target: { value: 'Meter' } });
      fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));

      expect(mockToggleListening).toHaveBeenCalledTimes(1);
      expect(notesField).toHaveValue('Meter dictated hours note');
    });
  });
});
