import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import SingleImageUpload from '@/components/common/SingleImageUpload';

const error = vi.hoisted(() => vi.fn());
const success = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({
    toast: vi.fn(),
    success,
    error,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

function jpegFile(name = 'photo.jpg', size = 32) {
  return new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('file input missing');
  }
  return input;
}

describe('SingleImageUpload', () => {
  beforeEach(() => {
    error.mockReset();
    success.mockReset();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the empty drop zone and rejects an unsupported type', () => {
    render(<SingleImageUpload onUpload={vi.fn()} />);

    expect(screen.getByText('Drop an image here, or click to browse')).toBeInTheDocument();
    const dropzone = screen.getByText('Drop an image here, or click to browse').closest('label');
    if (!dropzone) throw new Error('drop zone missing');
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [new File(['x'], 'notes.pdf', { type: 'application/pdf' })] },
    });

    expect(error).toHaveBeenCalledWith({
      description: 'Unsupported format: notes.pdf. Use JPEG, PNG, GIF, WEBP.',
    });
    expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument();
  });

  it('previews a valid file, uploads it, and clears the pending preview', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const file = jpegFile();
    render(<SingleImageUpload onUpload={onUpload} />);

    await user.upload(fileInput(), file);
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
    expect(success).toHaveBeenCalledWith({ description: 'Image uploaded successfully' });
    expect(screen.getByText('Drop an image here, or click to browse')).toBeInTheDocument();
  });

  it('keeps the preview and toasts when upload fails', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockRejectedValue(new Error('storage full'));
    render(<SingleImageUpload onUpload={onUpload} />);

    await user.upload(fileInput(), jpegFile());
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(error).toHaveBeenCalledWith({
        description: 'Upload failed: storage full',
      });
    });
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
  });

  it('removes an existing image on the default variant', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <SingleImageUpload
        currentImageUrl="https://cdn.example/logo.png"
        onUpload={vi.fn()}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByAltText('Current image')).toHaveAttribute(
      'src',
      'https://cdn.example/logo.png',
    );
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
    expect(success).toHaveBeenCalledWith({ description: 'Image removed' });
  });

  it('renders compact and avatar empty actions', () => {
    const { rerender } = render(<SingleImageUpload variant="compact" onUpload={vi.fn()} />);
    expect(screen.getByText('Upload')).toBeInTheDocument();

    rerender(<SingleImageUpload variant="avatar" onUpload={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, GIF, WEBP up to 5 MB/)).toBeInTheDocument();
  });

  it('disables the file input when disabled', () => {
    render(<SingleImageUpload disabled onUpload={vi.fn()} />);
    expect(fileInput()).toBeDisabled();
  });
});
