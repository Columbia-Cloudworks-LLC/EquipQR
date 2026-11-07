import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImageGallery from '@/components/common/ImageGallery';

vi.mock('@/components/common/DynamicImageViewport', () => ({
  default: ({ alt }: { alt: string }) => <span>{alt}</span>,
}));

const OBJECT_PATH = 'user-1/equipment-1/note-1/photo.jpg';
const signed = (token: string) =>
  `http://127.0.0.1:54321/storage/v1/object/sign/equipment-note-images/${OBJECT_PATH}?token=${token}`;

const image = {
  id: 'img-1',
  file_name: 'photo.jpg',
  file_url: signed('token-from-image-list'),
  created_at: '2026-01-01T00:00:00Z',
  uploaded_by: 'user-1',
};

describe('ImageGallery display image', () => {
  it('recognises the display image when the two URLs were signed with different tokens', () => {
    render(
      <ImageGallery
        images={[image]}
        currentDisplayImage={signed('token-from-equipment-row')}
        canSetDisplayImage
        onSetDisplayImage={vi.fn()}
      />,
    );

    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove photo.jpg as display image' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set photo.jpg as display image' })).not.toBeInTheDocument();
  });

  it('offers "set as display" for an image that is not the display image', () => {
    render(
      <ImageGallery
        images={[image]}
        currentDisplayImage="user-1/equipment-1/note-2/other.jpg"
        canSetDisplayImage
        onSetDisplayImage={vi.fn()}
      />,
    );

    expect(screen.queryByText('Display')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set photo.jpg as display image' })).toBeInTheDocument();
  });
});
