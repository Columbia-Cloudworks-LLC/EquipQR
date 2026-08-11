import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import InlineNoteComposer from '@/components/common/InlineNoteComposer';

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
        onChange(`${value}${value.trim() ? ' ' : ''}dictated note`);
      }
    },
    canUseVoice: !disabled,
  }),
}));

describe('InlineNoteComposer voice dictation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows voice and attach controls on the note textarea', () => {
    render(
      <InlineNoteComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('textbox', { name: 'Note content' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attach images' })).toBeInTheDocument();
  });

  it('appends dictated text when voice button is clicked', () => {
    const onChange = vi.fn();

    render(
      <InlineNoteComposer
        value="Existing"
        onChange={onChange}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));

    expect(mockToggleListening).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Existing dictated note');
  });

  it('hides voice control when disabled', () => {
    render(
      <InlineNoteComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        disabled
      />
    );

    expect(screen.queryByRole('button', { name: 'Start voice input' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attach images' })).toBeDisabled();
  });
});
