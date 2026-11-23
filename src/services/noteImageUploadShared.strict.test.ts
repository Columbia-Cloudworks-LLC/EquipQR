import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadFilesToNoteImageBucket } from './noteImageUploadShared';

const { mockUpload } = vi.hoisted(() => ({ mockUpload: vi.fn() }));

vi.mock('@/services/imageUploadService', () => ({
  uploadImageToStorage: (...args: unknown[]) => mockUpload(...args),
  displayUrlForStoredPrivateImage: (signed: string | null) => signed,
}));

vi.mock('@/services/noteImageSigningRollback', () => ({
  rollbackNoteImageAfterSigningFailure: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type TestImage = { id: string; file_url: string };

const signDisplayUrls = vi.fn(async (paths: string[]) => paths.map(path => `signed:${path}`));

function upload(
  images: File[],
  throwOnFailure?: boolean,
  insertFails = false,
  insertError?: unknown,
) {
  return uploadFilesToNoteImageBucket<TestImage>({
    bucket: 'work-order-images',
    imagesTable: 'work_order_images',
    images,
    throwOnFailure,
    buildObjectKey: file => `key/${file.name}`,
    insertImageRecord: async (file, storedPath) => {
      if (insertError) throw insertError;
      return insertFails ? null : { id: file.name, file_url: storedPath };
    },
    signDisplayUrls,
  });
}

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

describe('uploadFilesToNoteImageBucket throwOnFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockImplementation(async (_bucket: string, key: string) => key);
  });

  it('skips a failed photo by default', async () => {
    mockUpload.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await upload([photo('a.jpg'), photo('b.jpg')]);

    expect(result.map(image => image.id)).toEqual(['b.jpg']);
  });

  it('rethrows the upload error when asked to', async () => {
    mockUpload.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(upload([photo('a.jpg')], true)).rejects.toThrow('Failed to fetch');
  });

  it('throws when the photo record cannot be saved', async () => {
    await expect(upload([photo('a.jpg')], true, true)).rejects.toThrow('a.jpg');
  });

  it('keeps the original error from a failed photo record insert', async () => {
    const networkError = { message: 'TypeError: Failed to fetch' };

    await expect(upload([photo('a.jpg')], true, false, networkError)).rejects.toBe(networkError);
  });

  it('returns stored photos without signing display URLs', async () => {
    const result = await upload([photo('a.jpg')], true);

    expect(result).toEqual([{ id: 'a.jpg', file_url: 'key/a.jpg' }]);
    expect(signDisplayUrls).not.toHaveBeenCalled();
  });
});
