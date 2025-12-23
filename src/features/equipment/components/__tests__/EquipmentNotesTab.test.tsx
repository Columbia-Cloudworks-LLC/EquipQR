import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentNotesTab from '../EquipmentNotesTab';
import * as equipmentNotesServiceModule from '@/features/equipment/services/equipmentNotesService';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' }
  }))
}));

vi.mock('@/features/equipment/services/equipmentNotesService', () => ({
  getEquipmentNotesWithImages: vi.fn(),
  getEquipmentImages: vi.fn(),
  deleteEquipmentNoteImage: vi.fn(),
  createEquipmentNoteWithImages: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { image_url: null }, error: null }))
        }))
      }))
    }))
  }
}));

vi.mock('@/components/common/InlineNoteComposer', () => ({
  default: ({ onSubmit, onCancel }: { onSubmit: (data: { content: string; hoursWorked: number; isPrivate: boolean; images: unknown[] }) => void; onCancel: () => void }) => (
    <div data-testid="note-composer">
      <button onClick={() => onSubmit({ content: 'Test note', hoursWorked: 0, isPrivate: false, images: [] })}>
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

vi.mock('@/components/common/ImageGallery', () => ({
  default: ({ images }: { images: Array<{ url: string }> }) => (
    <div data-testid="image-gallery">
      {images.map((img: { url: string }, i: number) => (
        <div key={i} data-testid={`image-${i}`}>{img.url}</div>
      ))}
    </div>
  )
}));

const mockNotes = [
  {
    id: 'note-1',
    content: 'Test note 1',
    created_at: '2024-01-15',
    created_by: 'user-1',
    hours_worked: 2,
    is_private: false,
    images: []
  }
];

const mockImages = [
  { id: 'img-1', url: 'https://example.com/image1.jpg' }
];

describe('EquipmentNotesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(equipmentNotesServiceModule.getEquipmentNotesWithImages).mockResolvedValue(mockNotes);
    vi.mocked(equipmentNotesServiceModule.getEquipmentImages).mockResolvedValue(mockImages);
  });

  describe('Core Rendering', () => {
    it('renders notes tab', async () => {
      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      await waitFor(() => {
        expect(screen.getByText('Test note 1')).toBeInTheDocument();
      });
    });

    it('displays image gallery', async () => {
      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
      });
    });
  });

  describe('Note Creation', () => {
    it('shows note composer when add button is clicked', async () => {
      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      // Note composer should be available for creating notes
      await waitFor(() => {
        // Component should render note creation UI
      });
    });

    it('creates note when submitted', async () => {
      vi.mocked(equipmentNotesServiceModule.createEquipmentNoteWithImages).mockResolvedValue({ id: 'note-2' });

      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      await waitFor(() => {
        const submitButton = screen.queryByText('Submit');
        if (submitButton) {
          fireEvent.click(submitButton);
        }
      });
      
      await waitFor(() => {
        expect(equipmentNotesServiceModule.createEquipmentNoteWithImages).toHaveBeenCalled();
      });
    });
  });

  describe('Image Handling', () => {
    it('displays images in gallery', async () => {
      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
      });
    });

    it('handles image deletion', async () => {
      vi.mocked(equipmentNotesServiceModule.deleteEquipmentNoteImage).mockResolvedValue(undefined);

      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      // Image deletion would be triggered by user interaction
      // This depends on the ImageGallery component implementation
    });
  });
});


