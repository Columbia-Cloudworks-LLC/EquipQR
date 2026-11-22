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

function upload(images: File[], throwOnFailure?: boolean, insertFails = false) {
  return uploadFilesToNoteImageBucket<TestImage>({
    bucket: 'work-order-images',
    imagesTable: 'work_order_images',
    images,
    throwOnFailure,
    buildObjectKey: file => `key/${file.name}`,
    insertImageRecord: async (file, storedPath) =>
      insertFails ? null : { id: file.name, file_url: storedPath },
    signDisplayUrls: async paths => paths.map(path => `signed:${path}`),
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
});
