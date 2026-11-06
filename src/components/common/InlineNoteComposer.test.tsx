import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import InlineNoteComposer from '@/components/common/InlineNoteComposer';

describe('InlineNoteComposer', () => {
  it('shows the attach control on the note textarea', () => {
    render(
      <InlineNoteComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('textbox', { name: 'Note content' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attach images' })).toBeInTheDocument();
  });

  it('disables the attach control when disabled', () => {
    render(
      <InlineNoteComposer
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        disabled
      />
    );

    expect(screen.getByRole('button', { name: 'Attach images' })).toBeDisabled();
  });
});
