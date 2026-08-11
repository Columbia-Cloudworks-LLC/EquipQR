import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import { QueryClient } from '@tanstack/react-query';
import WorkOrderImagesSection from './WorkOrderImagesSection';
import {
  getWorkOrderImages,
  deleteWorkOrderImage,
  type WorkOrderCarouselImage,
} from '@/features/work-orders/services/workOrderNotesService';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { workOrders as workOrderQueryKeys, workOrderMetrics } from '@/lib/queryKeys';

vi.mock('@/features/work-orders/hooks/useWorkOrderImageCount', () => ({
  useWorkOrderImageCount: vi.fn(() => ({
    data: { count: 2, images: [] },
    isLoading: false,
  })),
}));

vi.mock('@/features/work-orders/services/workOrderNotesService', () => ({
  getWorkOrderImages: vi.fn(() => Promise.resolve([])),
  deleteWorkOrderImage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
}));

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatDateTime: (d: Date | string) =>
      `fmt:${typeof d === 'string' ? d : d.toISOString()}`,
  }),
}));

const makeImage = (over: Partial<WorkOrderCarouselImage>): WorkOrderCarouselImage => ({
  id: 'img-1',
  work_order_id: 'wo-1',
  note_id: 'note-1',
  file_name: 'a.png',
  file_url: 'https://example.com/a.png',
  file_size: 1024,
  mime_type: 'image/png',
  description: null,
  uploaded_by: 'user-1',
  created_at: '2026-05-06T12:00:00Z',
  uploaded_by_name: 'Uploader Name',
  note_content: 'Damage on hydraulic line near coupling',
  note_author_name: 'Author Name',
  note_created_at: '2026-05-06T11:00:00Z',
  is_private_note: false,
  ...over,
});

describe('WorkOrderImagesSection', () => {
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkOrderImageCount).mockReturnValue({
      data: { count: 2, images: [] },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useWorkOrderImageCount>);
    vi.mocked(getWorkOrderImages).mockResolvedValue([]);
    invalidateSpy = vi
      .spyOn(QueryClient.prototype, 'invalidateQueries')
      .mockResolvedValue(undefined as never);

    global.IntersectionObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds = [];
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    invalidateSpy.mockRestore();
  });

  it('does not fetch full images before expand', async () => {
    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload
        showPrivateNotes={false}
      />,
    );

    expect(screen.getByText('Work Order Images')).toBeInTheDocument();
    expect(getWorkOrderImages).not.toHaveBeenCalled();
  });

  it('loads carousel after expand and shows slide metadata', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderImages).mockResolvedValue([
      makeImage({
        id: 'img-a',
        note_content: 'Long note text '.repeat(20),
        note_author_name: 'Pat Technician',
        note_created_at: '2026-05-09T08:00:00Z',
      }),
    ]);

    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload
        showPrivateNotes={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /work order images/i }));

    await waitFor(() => {
      expect(getWorkOrderImages).toHaveBeenCalledWith('wo-1', 'org-1');
    });

    expect(screen.getByAltText('a.png')).toBeInTheDocument();
    expect(screen.getByText('Pat Technician')).toBeInTheDocument();
    expect(screen.getByText(/^fmt:2026-05-09T08:00:00/)).toBeInTheDocument();
    expect(screen.getByText(/Long note text/)).toBeInTheDocument();
  });

  it('hides private-note images when showPrivateNotes is false', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderImages).mockResolvedValue([
      makeImage({
        id: 'priv',
        uploaded_by: 'other-user',
        is_private_note: true,
        note_content: 'Secret',
      }),
    ]);

    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload={false}
        showPrivateNotes={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /work order images/i }));

    await waitFor(() => {
      expect(getWorkOrderImages).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/No images are visible for your account/i),
    ).toBeInTheDocument();
  });

  it('shows a retry state when image loading fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderImages).mockRejectedValueOnce(new Error('network unavailable'));

    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload={false}
        showPrivateNotes={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /work order images/i }));

    expect(
      await screen.findByText(/We could not load work order images/i),
    ).toBeInTheDocument();

    vi.mocked(getWorkOrderImages).mockResolvedValueOnce([makeImage({ id: 'retry-success' })]);
    await user.click(screen.getByRole('button', { name: /^retry$/i }));

    expect(await screen.findByAltText('a.png')).toBeInTheDocument();
  });

  it('still lets users expand when the image count query fails', async () => {
    const user = userEvent.setup();
    vi.mocked(useWorkOrderImageCount).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useWorkOrderImageCount>);
    vi.mocked(getWorkOrderImages).mockResolvedValue([makeImage({ id: 'count-error-image' })]);

    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload={false}
        showPrivateNotes={false}
      />,
    );

    expect(screen.getByText(/Image count unavailable/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /work order images/i }));

    expect(await screen.findByAltText('a.png')).toBeInTheDocument();
  });

  it('shows private-note images for uploader when showPrivateNotes is true', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderImages).mockResolvedValue([
      makeImage({
        id: 'mine',
        uploaded_by: 'user-1',
        is_private_note: true,
        note_content: 'My private photo note',
      }),
    ]);

    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload
        showPrivateNotes
      />,
    );

    await user.click(screen.getByRole('button', { name: /work order images/i }));

    await waitFor(() => {
      expect(screen.getByAltText('a.png')).toBeInTheDocument();
    });

    expect(screen.getByText(/My private photo note/)).toBeInTheDocument();
  });

  it('shows primary image first with a Primary badge when primaryImageId is set', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderImages).mockResolvedValue([
      makeImage({
        id: 'img-later',
        file_name: 'later.png',
        note_content: 'Second photo',
      }),
      makeImage({
        id: 'img-primary',
        file_name: 'primary-shot.png',
        note_content: 'First attached',
      }),
    ]);

    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload
        showPrivateNotes={false}
        primaryImageId="img-primary"
      />,
    );

    await user.click(screen.getByRole('button', { name: /work order images/i }));

    await waitFor(() => {
      expect(screen.getByText('Primary')).toBeInTheDocument();
    });

    const imgs = screen.getAllByRole('img');
    expect(imgs[0]).toHaveAttribute('alt', 'primary-shot.png');
  });

  it('invalidates image, notes-with-images, and image count queries after delete', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkOrderImages).mockResolvedValue([makeImage({ id: 'del-1' })]);

    render(
      <WorkOrderImagesSection
        workOrderId="wo-1"
        organizationId="org-1"
        canUpload
        showPrivateNotes={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /work order images/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete image a\.png/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /delete image a\.png/i }));

    await waitFor(() => {
      expect(deleteWorkOrderImage).toHaveBeenCalled();
    });
    expect(vi.mocked(deleteWorkOrderImage).mock.calls[0]).toEqual(['del-1', 'org-1', 'wo-1']);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: workOrderQueryKeys.images('wo-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: workOrderQueryKeys.notesWithImages('wo-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: workOrderMetrics.imageCount('wo-1'),
    });
  });
});
