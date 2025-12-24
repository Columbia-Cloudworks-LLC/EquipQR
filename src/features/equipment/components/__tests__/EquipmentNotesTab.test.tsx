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
  default: ({ images }: { images: Array<{ file_url?: string; url?: string }> }) => (
    <div data-testid="image-gallery">
      {images.map((img: { file_url?: string; url?: string }, i: number) => (
        <div key={i} data-testid={`image-${i}`}>{img.file_url || img.url}</div>
      ))}
    </div>
  )
}));

const mockNotes = [
  {
    id: 'note-1',
    equipment_id: 'eq-1',
    content: 'Test note 1',
    author_id: 'user-1',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    hours_worked: 2,
    is_private: false,
    author_name: 'Test User',
    images: []
  }
];

const mockImages = [
  {
    id: 'img-1',
    equipment_note_id: 'note-1',
    file_name: 'image1.jpg',
    file_url: 'https://example.com/image1.jpg',
    file_size: 1024,
    mime_type: 'image/jpeg',
    description: null,
    uploaded_by: 'user-1',
    created_at: '2024-01-15T00:00:00Z',
    uploaded_by_name: 'Test User',
    note_content: 'Test note 1',
    note_author_name: 'Test User',
    is_private_note: false,
    equipment_notes: null,
    profiles: null
  }
] as unknown as Awaited<ReturnType<typeof equipmentNotesServiceModule.getEquipmentImages>>;

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
        // Verify that the mocked images are actually passed to and rendered by ImageGallery
        expect(screen.getByTestId('image-0')).toBeInTheDocument();
        expect(screen.getByText(mockImages[0].file_url)).toBeInTheDocument();
      });
    });
  });

  describe('Note Creation', () => {
    it('shows note composer when add button is clicked', async () => {
      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      // Wait for initial render with notes
      await waitFor(() => {
        expect(screen.getByText('Test note 1')).toBeInTheDocument();
      });
      
      // Click the "Add Note" button
      const addNoteButton = screen.getByText('Add Note');
      fireEvent.click(addNoteButton);
      
      // Verify that the note composer is now visible
      await waitFor(() => {
        expect(screen.getByTestId('note-composer')).toBeInTheDocument();
      });
    });

    it('creates note when submitted', async () => {
      const newNote = {
        id: 'note-2',
        equipment_id: 'eq-1',
        content: 'Test note',
        author_id: 'user-1',
        created_at: '2024-01-16T00:00:00Z',
        updated_at: '2024-01-16T00:00:00Z',
        hours_worked: 0,
        is_private: false,
        author_name: 'Test User',
        images: []
      };
      vi.mocked(equipmentNotesServiceModule.createEquipmentNoteWithImages).mockResolvedValue(newNote);

      render(<EquipmentNotesTab equipmentId="eq-1" />);
      
      const addNoteButton = await screen.findByText('Add Note');
      fireEvent.click(addNoteButton);

      const submitButton = await screen.findByText('Submit');
      fireEvent.click(submitButton);
      
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
