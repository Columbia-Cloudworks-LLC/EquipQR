import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@vitest-harness/utils/test-utils';
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

  it('is a single compact box: one text row and no image area until images are staged', () => {
    const { container, rerender } = render(
      <InlineNoteComposer value="" onChange={vi.fn()} onSubmit={vi.fn()} />
    );

    const textarea = screen.getByRole('textbox', { name: 'Note content' });
    expect(textarea).toHaveAttribute('rows', '1');
    expect(textarea.closest('.rounded-lg')).toHaveClass('border', 'bg-card', 'focus-within:ring-1');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.border-dashed')).toBeNull();

    const image = new File(['x'], 'leak.png', { type: 'image/png' });
    rerender(
      <InlineNoteComposer value="" onChange={vi.fn()} onSubmit={vi.fn()} attachedImages={[image]} />
    );

    expect(screen.getByRole('button', { name: 'Remove image' })).toBeInTheDocument();
  });

  it('posts with Ctrl+Enter from the text box', async () => {
    const onSubmit = vi.fn();
    render(<InlineNoteComposer value="Replaced the hose" onChange={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note content' }), {
      key: 'Enter',
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Replaced the hose', images: [] }),
      );
    });
  });

  it('does not post on a plain Enter', () => {
    const onSubmit = vi.fn();
    render(<InlineNoteComposer value="Line one" onChange={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note content' }), { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('marks a note private from the inline toolbar toggle', async () => {
    const onSubmit = vi.fn();
    render(
      <InlineNoteComposer value="Customer dispute" onChange={vi.fn()} onSubmit={onSubmit} showPrivateToggle />
    );

    const privateToggle = screen.getByRole('switch', { name: 'Private' });
    expect(privateToggle).not.toBeChecked();
    fireEvent.click(privateToggle);
    expect(privateToggle).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Add Note' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isPrivate: true }));
    });
  });

  it('stages images dropped anywhere on the box', () => {
    const onImagesAdd = vi.fn();
    render(
      <InlineNoteComposer value="" onChange={vi.fn()} onSubmit={vi.fn()} onImagesAdd={onImagesAdd} />
    );

    const box = screen.getByRole('textbox', { name: 'Note content' }).closest('.rounded-lg') as HTMLElement;
    const image = new File(['x'], 'leak.png', { type: 'image/png' });
    fireEvent.drop(box, { dataTransfer: { files: [image] } });

    expect(onImagesAdd).toHaveBeenCalledWith([image]);
  });

  it('stages an image pasted from the clipboard', () => {
    const onImagesAdd = vi.fn();
    render(
      <InlineNoteComposer value="" onChange={vi.fn()} onSubmit={vi.fn()} onImagesAdd={onImagesAdd} />
    );

    const image = new File(['x'], 'screenshot.png', { type: 'image/png' });
    fireEvent.paste(screen.getByRole('textbox', { name: 'Note content' }), {
      clipboardData: {
        items: [{ type: 'image/png', getAsFile: () => image }],
        getData: () => '',
      },
    });

    expect(onImagesAdd).toHaveBeenCalledWith([image]);
  });
});
