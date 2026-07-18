import React from 'react';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentNotesTab from './EquipmentNotesTab';
import * as equipmentNotesServiceModule from '@/features/equipment/services/equipmentNotesService';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com', user_metadata: { name: 'Test User' } },
  })),
}));

vi.mock('@/hooks/useNotesSectionContext', () => ({
  useNotesSectionContext: vi.fn(() => ({
    isOrgAdmin: true,
    isTeamManager: true,
    editWindowHours: 24,
    isViewerOrRequestor: false,
  })),
}));

vi.mock('@/features/equipment/services/equipmentNotesService', () => ({
  getEquipmentNotesWithImages: vi.fn(),
  deleteEquipmentNoteImage: vi.fn(),
  createEquipmentNoteWithImages: vi.fn(),
  updateEquipmentNote: vi.fn(),
  deleteEquipmentNote: vi.fn(),
  addImagesToEquipmentNote: vi.fn(),
}));

vi.mock('@/components/common/InlineNoteComposer', () => ({
  default: ({ onSubmit, onCancel }: { onSubmit: (data: { content: string; hoursWorked: number; isPrivate: boolean; images: unknown[] }) => void; onCancel: () => void }) => (
    <div data-testid="note-composer">
      <button onClick={() => onSubmit({ content: 'Test note', hoursWorked: 0, isPrivate: false, images: [] })}>
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
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
    images: [],
  },
];

describe('EquipmentNotesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(equipmentNotesServiceModule.getEquipmentNotesWithImages).mockResolvedValue(mockNotes);
  });

  it('renders notes tab with card content', async () => {
    render(<EquipmentNotesTab equipmentId="eq-1" organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test note 1')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('image-gallery')).not.toBeInTheDocument();
  });

  it('shows note composer when add button is clicked', async () => {
    render(<EquipmentNotesTab equipmentId="eq-1" organizationId="org-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test note 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Note'));

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
      images: [],
    };
    vi.mocked(equipmentNotesServiceModule.createEquipmentNoteWithImages).mockResolvedValue(newNote);

    render(<EquipmentNotesTab equipmentId="eq-1" organizationId="org-1" />);

    fireEvent.click(await screen.findByText('Add Note'));
    fireEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(equipmentNotesServiceModule.createEquipmentNoteWithImages).toHaveBeenCalled();
    });
  });
});
