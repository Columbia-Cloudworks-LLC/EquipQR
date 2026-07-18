import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  calculatePanPosition,
  copyImageToClipboard,
  downloadImageFile,
  ensureImageFileName,
  ensurePngFileName,
  fetchImageBlob,
  blobToPngBlob,
  imageSupportsPanning,
} from '@/components/common/dynamicImageViewportUtils';
import {
  filterNotesByVisibility,
  isNoteEdited,
  isWithinAuthorEditWindow,
  resolveNoteActionPermissions,
} from '@/components/common/noteCardPermissions';

describe('dynamicImageViewportUtils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps pointer position to object-position percentages', () => {
    expect(calculatePanPosition(50, 25, 100, 100)).toEqual({ x: 50, y: 25 });
    expect(calculatePanPosition(150, 0, 100, 200)).toEqual({ x: 100, y: 0 });
  });

  it('detects when panning is useful for mismatched aspect ratios', () => {
    expect(imageSupportsPanning(1600, 900, 300, 300)).toBe(true);
    expect(imageSupportsPanning(300, 300, 300, 300)).toBe(false);
  });

  it('adds an extension when the download filename lacks one', () => {
    expect(ensureImageFileName('photo', 'image/jpeg')).toBe('photo.jpeg');
    expect(ensureImageFileName('photo.jpg', 'image/png')).toBe('photo.jpg');
    expect(ensurePngFileName('CAT-301.7-CR-mini-excavator.jpeg')).toBe(
      'CAT-301.7-CR-mini-excavator.png',
    );
    expect(ensurePngFileName('CAT-301.7')).toBe('CAT-301.7.png');
  });

  it('fetches image bytes for blob download/copy', async () => {
    const blob = new Blob(['pixels'], { type: 'image/jpeg' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      }),
    );

    await expect(fetchImageBlob('https://example.com/a.jpg')).resolves.toEqual(blob);
  });

  it('downloads via blob URL instead of cross-origin anchor href', async () => {
    const blob = new Blob(['pixels'], { type: 'image/jpeg' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      }),
    );

    const click = vi.fn();
    const anchor = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await downloadImageFile('https://signed.example/eq.jpg', 'CAT-301.7');

    expect(anchor.download).toBe('CAT-301.7.jpeg');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local');

    createElement.mockRestore();
    appendChild.mockRestore();
    removeChild.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it('copies fetched image bytes to the clipboard', async () => {
    const jpegBlob = new Blob(['pixels'], { type: 'image/jpeg' });
    const pngBlob = new Blob(['png'], { type: 'image/png' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(jpegBlob),
      }),
    );
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({
        width: 1,
        height: 1,
        close: vi.fn(),
      }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(
      this: HTMLCanvasElement,
      callback: BlobCallback,
    ) {
      callback(pngBlob);
    });

    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { write },
    });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItemMock {
        constructor(public items: Record<string, Blob | Promise<Blob>>) {}
      },
    );

    await copyImageToClipboard('https://signed.example/eq.jpg', 'eq.jpg');

    expect(write).toHaveBeenCalledTimes(1);
    const item = write.mock.calls[0][0][0] as { items: Record<string, Promise<File>> };
    const file = await item.items['image/png'];
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('eq.png');
    expect(file.type).toBe('image/png');
  });

  it('converts non-png blobs before clipboard write', async () => {
    const jpegBlob = new Blob(['pixels'], { type: 'image/jpeg' });
    const pngBlob = new Blob(['png'], { type: 'image/png' });
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({
        width: 2,
        height: 2,
        close: vi.fn(),
      }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(
      callback: BlobCallback,
    ) {
      callback(pngBlob);
    });

    await expect(blobToPngBlob(jpegBlob)).resolves.toEqual(pngBlob);
  });
});

describe('noteCardPermissions', () => {
  const note = {
    id: 'note-1',
    author_id: 'user-1',
    created_at: new Date().toISOString(),
  };

  it('filters notes by visibility', () => {
    const notes = [
      { id: '1', is_private: false, author_id: 'a' },
      { id: '2', is_private: true, author_id: 'user-1' },
      { id: '3', is_private: true, author_id: 'other' },
    ];
    expect(filterNotesByVisibility(notes, 'public', 'user-1')).toHaveLength(1);
    expect(filterNotesByVisibility(notes, 'private', 'user-1')).toHaveLength(1);
    expect(filterNotesByVisibility(notes, 'all', 'user-1')).toHaveLength(3);
  });

  it('marks notes edited after creation', () => {
    expect(
      isNoteEdited('2024-01-01T00:00:00Z', '2024-01-01T00:05:00Z'),
    ).toBe(true);
    expect(
      isNoteEdited('2024-01-01T00:00:00Z', '2024-01-01T00:00:10Z'),
    ).toBe(false);
  });

  it('allows managers to edit any note', () => {
    const perms = resolveNoteActionPermissions({
      note,
      currentUserId: 'other-user',
      isOrgAdmin: false,
      isTeamManager: true,
      isViewerOrRequestor: false,
    });
    expect(perms.canEdit).toBe(true);
    expect(perms.canDelete).toBe(true);
  });

  it('limits author edit window', () => {
    const oldNote = {
      ...note,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    };
    expect(isWithinAuthorEditWindow(oldNote.created_at, 24)).toBe(false);
    const perms = resolveNoteActionPermissions({
      note: oldNote,
      currentUserId: 'user-1',
      isOrgAdmin: false,
      isTeamManager: false,
      isViewerOrRequestor: false,
      editWindowHours: 24,
    });
    expect(perms.canEdit).toBe(false);
    expect(perms.canDelete).toBe(true);
  });
});
