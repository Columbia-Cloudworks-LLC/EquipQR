import { describe, it, expect, vi, beforeEach } from 'vitest';
import { set, get, del } from 'idb-keyval';
import {
  stageOfflineImages,
  loadOfflineImageFiles,
  deleteOfflineImageRefs,
} from './offlineBlobStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(async () => []),
  delMany: vi.fn(),
}));

describe('offlineBlobStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stages image blobs and returns reference ids', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    vi.mocked(set).mockResolvedValue(undefined);

    const refs = await stageOfflineImages('user-1', 'org-1', [file]);

    expect(refs).toHaveLength(1);
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('loads staged blobs as File objects', async () => {
    const blob = new Blob(['hello'], { type: 'image/jpeg' });
    vi.mocked(get).mockResolvedValue({
      blob,
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 5,
      createdAt: Date.now(),
    });

    const files = await loadOfflineImageFiles('user-1', 'org-1', ['ref-1']);

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('photo.jpg');
  });

  it('deletes blob refs on cleanup', async () => {
    vi.mocked(del).mockResolvedValue(undefined);
    await deleteOfflineImageRefs('user-1', 'org-1', ['ref-1', 'ref-2']);
    expect(del).toHaveBeenCalledTimes(2);
  });

  it('rolls back partially staged blobs when a later file fails', async () => {
    const first = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const second = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    vi.mocked(set)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new DOMException('quota', 'QuotaExceededError'));
    vi.mocked(del).mockResolvedValue(undefined);

    await expect(stageOfflineImages('user-1', 'org-1', [first, second])).rejects.toThrow(
      /quota exceeded/i,
    );
    expect(del).toHaveBeenCalled();
  });
});
