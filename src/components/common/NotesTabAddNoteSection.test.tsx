import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import { NotesTabAddNoteSection } from '@/components/common/NotesTabAddNoteSection';

vi.mock('@/hooks/useVoiceTextAppender', () => ({
  useVoiceTextAppender: () => ({
    isSupported: true,
    isListening: false,
    error: null,
    interimTranscript: '',
    toggleListening: vi.fn(),
    canUseVoice: true,
  }),
}));

const baseProps = {
  noteCount: 0,
  showForm: false,
  canAddNotes: true,
  onShowForm: vi.fn(),
  onCancelForm: vi.fn(),
  noteContent: '',
  onNoteContentChange: vi.fn(),
  onSubmit: vi.fn(),
  attachedImages: [] as File[],
  onImagesAdd: vi.fn(),
  onImageRemove: vi.fn(),
  showPrivateToggle: false,
};

describe('NotesTabAddNoteSection', () => {
  it('shows a live composer for note-capable users on open work', () => {
    render(
      <NotesTabAddNoteSection
        {...baseProps}
        showForm
      />,
    );

    expect(screen.getByText('Add Your First Note')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Note content' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attach images' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Note' })).toBeInTheDocument();
  });

  it('replaces the composer with a lock card when notes are locked', () => {
    render(
      <NotesTabAddNoteSection
        {...baseProps}
        lockedMessage="This work order is completed. Reopen it to add a note or attachment."
      />,
    );

    expect(screen.getByText('Notes locked')).toBeInTheDocument();
    expect(
      screen.getByText('This work order is completed. Reopen it to add a note or attachment.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Note content' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start voice input' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Attach images' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Note' })).not.toBeInTheDocument();
  });
});
