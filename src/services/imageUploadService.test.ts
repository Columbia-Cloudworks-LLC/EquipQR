import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpload, mockFrom, mockCreateSignedUrl, mockCreateSignedUrls, mockGetPublicUrl } = vi.hoisted(() => {
  const mockUpload = vi.fn();
  const mockCreateSignedUrl = vi.fn();
  const mockCreateSignedUrls = vi.fn((paths: string[], expiresIn: number) => ({
    data: paths.map((path: string) => ({
      path,
      signedUrl: `https://example.supabase.co/storage/v1/object/sign/mock/${path}?token=test-${expiresIn}`,
    })),
    error: null,
  }));
  const mockGetPublicUrl = vi.fn(() => ({
    data: {
      publicUrl: 'https://example.supabase.co/storage/v1/object/public/organization-logos/org/logo.png',
    },
  }));
  const mockFrom = vi.fn(() => ({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
    createSignedUrl: mockCreateSignedUrl,
    createSignedUrls: mockCreateSignedUrls,
  }));
  return { mockUpload, mockFrom, mockCreateSignedUrl, mockCreateSignedUrls, mockGetPublicUrl };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: mockFrom,
    },
  },
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

import imageCompression from 'browser-image-compression';
import {
  generateFilePath,
  generateSingleFilePath,
  extractStoragePath,
  validateImageFile,
  compressImageFile,
  uploadImageToStorage,
  normalizeStoredObjectPath,
  resolveImageDisplayUrl,
  createSignedUrlForPath,
  batchResolveEquipmentDisplayImageUrls,
  batchResolveEquipmentNoteImageDisplayUrls,
  batchResolveInventoryItemImageDisplayUrls,
  batchResolveTeamImageDisplayUrls,
  batchResolveWorkOrderImageDisplayUrls,
  displayUrlForStoredPrivateImage,
  displayableImageSrc,
  isEquipQrPrivateStorageUrl,
  isFetchableSignedStorageUrl,
  toAbsoluteSignedStorageUrl,
  DEFAULT_SIGNED_URL_TTL_SECONDS,
} from '@/services/imageUploadService';

describe('imageUploadService', () => {
  beforeEach(() => {
    vi.mocked(imageCompression).mockReset();
    mockUpload.mockResolvedValue({ data: { path: 'prefix/1.jpg' }, error: null });
    mockCreateSignedUrl.mockImplementation((path: string, expiresIn: number) => ({
      data: {
        signedUrl: `https://example.supabase.co/storage/v1/object/sign/mock/${path}?token=test-${expiresIn}`,
      },
      error: null,
    }));
    mockGetPublicUrl.mockImplementation((path: string) => ({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/organization-logos/${path}`,
      },
    }));
    mockFrom.mockClear();
    mockFrom.mockImplementation(() => ({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      createSignedUrl: mockCreateSignedUrl,
      createSignedUrls: mockCreateSignedUrls,
    }));
    mockUpload.mockClear();
    mockCreateSignedUrl.mockClear();
    mockCreateSignedUrls.mockClear();
    mockGetPublicUrl.mockClear();
  });

  describe('generateFilePath', () => {
    it('should generate a path with prefix, entity ID, and timestamp', () => {
      const file = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      const path = generateFilePath('user123', 'item456', file);
      expect(path).toMatch(/^user123\/item456\/\d+\.jpg$/);
    });

    it('should handle files with uppercase extensions', () => {
      const file = new File([''], 'photo.PNG', { type: 'image/png' });
      const path = generateFilePath('user', 'entity', file);
      expect(path).toMatch(/\.png$/);
    });

    it('should use the last segment when filename has no dot', () => {
      const file = new File([''], 'noextension', { type: 'image/jpeg' });
      const path = generateFilePath('user', 'entity', file);
      expect(path).toMatch(/^user\/entity\/\d+\.noextension$/);
    });
  });

  describe('generateSingleFilePath', () => {
    it('should generate a deterministic path with entity ID and label', () => {
      const file = new File([''], 'my-logo.png', { type: 'image/png' });
      const path = generateSingleFilePath('org-123', 'logo', file);
      expect(path).toBe('org-123/logo.png');
    });
  });

  describe('extractStoragePath', () => {
    it('should extract path from a standard Supabase public URL', () => {
      const url =
        'https://example.supabase.co/storage/v1/object/public/organization-logos/org123/logo.png';
      const path = extractStoragePath(url, 'organization-logos');
      expect(path).toBe('org123/logo.png');
    });

    it('should return null for a URL that does not match the bucket', () => {
      const url =
        'https://example.supabase.co/storage/v1/object/public/other-bucket/file.png';
      const path = extractStoragePath(url, 'organization-logos');
      expect(path).toBeNull();
    });

    it('should return null for an invalid URL', () => {
      const path = extractStoragePath('not-a-url', 'organization-logos');
      expect(path).toBeNull();
    });

    it('should handle paths with multiple segments', () => {
      const url =
        'https://example.supabase.co/storage/v1/object/public/inventory-item-images/user1/item2/1234567890.jpg';
      const path = extractStoragePath(url, 'inventory-item-images');
      expect(path).toBe('user1/item2/1234567890.jpg');
    });
  });

  describe('validateImageFile', () => {
    it('should accept valid JPEG files within size limit', () => {
      const file = new File(['x'.repeat(1000)], 'photo.jpg', { type: 'image/jpeg' });
      expect(() => validateImageFile(file, 5)).not.toThrow();
    });

    it('should accept valid PNG files', () => {
      const file = new File(['x'.repeat(1000)], 'image.png', { type: 'image/png' });
      expect(() => validateImageFile(file, 5)).not.toThrow();
    });

    it('should accept valid GIF files', () => {
      const file = new File(['x'.repeat(1000)], 'anim.gif', { type: 'image/gif' });
      expect(() => validateImageFile(file, 5)).not.toThrow();
    });

    it('should accept valid WebP files', () => {
      const file = new File(['x'.repeat(1000)], 'image.webp', { type: 'image/webp' });
      expect(() => validateImageFile(file, 5)).not.toThrow();
    });

    it('should reject unsupported MIME types', () => {
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
      expect(() => validateImageFile(file, 5)).toThrow(/Unsupported file type/);
    });

    it('should reject files exceeding size limit', () => {
      const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
      expect(() => validateImageFile(file, 5)).toThrow(/too large/);
    });

    it('should respect custom size limits', () => {
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 8 * 1024 * 1024 });
      expect(() => validateImageFile(file, 10)).not.toThrow();
      expect(() => validateImageFile(file, 5)).toThrow(/too large/);
    });
  });

  describe('compressImageFile', () => {
    it('returns the original file when compression throws', async () => {
      const file = new File(['x'.repeat(400_000)], 'big.jpg', { type: 'image/jpeg' });
      vi.mocked(imageCompression).mockRejectedValue(new Error('codec failure'));
      const out = await compressImageFile(file);
      expect(out).toBe(file);
    });

    it('does not invoke compressor for GIF inputs', async () => {
      const file = new File(['x'.repeat(400_000)], 'a.gif', { type: 'image/gif' });
      const out = await compressImageFile(file);
      expect(out).toBe(file);
      expect(imageCompression).not.toHaveBeenCalled();
    });
  });

  describe('uploadImageToStorage', () => {
    it('uploads the compressed file when compression succeeds', async () => {
      const original = new File(['x'.repeat(400_000)], 'big.jpg', { type: 'image/jpeg' });
      const compressed = new File(['tiny'], 'big.jpg', { type: 'image/jpeg' });
      vi.mocked(imageCompression).mockResolvedValue(compressed);
      await uploadImageToStorage('inventory-item-images', 'u/e/1.jpg', original, { compress: true });
      expect(mockUpload).toHaveBeenCalled();
      const uploaded = mockUpload.mock.calls[0][1] as File;
      expect(uploaded.size).toBe(compressed.size);
    });

    it('uploads the original file when compression fails', async () => {
      const original = new File(['x'.repeat(400_000)], 'big.jpg', { type: 'image/jpeg' });
      vi.mocked(imageCompression).mockRejectedValue(new Error('fail'));
      await uploadImageToStorage('inventory-item-images', 'u/e/1.jpg', original, { compress: true });
      const uploaded = mockUpload.mock.calls[0][1] as File;
      expect(uploaded).toBe(original);
    });

    it('returns canonical object path for private buckets', async () => {
      const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
      vi.mocked(imageCompression).mockResolvedValue(file);
      mockUpload.mockResolvedValue({ data: { path: 'org/item/99.jpg' }, error: null });
      const out = await uploadImageToStorage('inventory-item-images', 'org/item/99.jpg', file, {
        compress: false,
      });
      expect(out).toBe('org/item/99.jpg');
      expect(mockGetPublicUrl).not.toHaveBeenCalled();
    });

    it('returns public URL for organization-logos', async () => {
      const file = new File(['x'], 'logo.png', { type: 'image/png' });
      vi.mocked(imageCompression).mockResolvedValue(file);
      mockUpload.mockResolvedValue({ data: { path: 'org/logo.png' }, error: null });
      const out = await uploadImageToStorage('organization-logos', 'org/logo.png', file, {
        compress: false,
      });
      expect(out).toContain('/storage/v1/object/public/organization-logos/org/logo.png');
      expect(mockGetPublicUrl).toHaveBeenCalled();
    });

    it('appends cache-buster when upserting public uploads', async () => {
      const file = new File(['x'], 'logo.png', { type: 'image/png' });
      vi.mocked(imageCompression).mockResolvedValue(file);
      mockUpload.mockResolvedValue({ data: { path: 'org/logo.png' }, error: null });
      const out = await uploadImageToStorage('organization-logos', 'org/logo.png', file, {
        compress: false,
        upsert: true,
      });
      expect(out).toMatch(/\?v=\d+$/);
    });
  });

  describe('normalizeStoredObjectPath', () => {
    it('normalizes legacy public URLs to object paths', () => {
      const url =
        'https://example.supabase.co/storage/v1/object/public/work-order-images/u/wo/1.jpg';
      expect(normalizeStoredObjectPath(url, 'work-order-images')).toBe('u/wo/1.jpg');
    });

    it('normalizes signed URLs to object paths', () => {
      const url =
        'https://example.supabase.co/storage/v1/object/sign/inventory-item-images/org/a/1.jpg?token=abc';
      expect(normalizeStoredObjectPath(url, 'inventory-item-images')).toBe('org/a/1.jpg');
    });

    it('accepts bare object paths', () => {
      expect(normalizeStoredObjectPath('user123/avatar.png', 'user-avatars')).toBe('user123/avatar.png');
    });

    it('normalizes legacy user-avatars public URLs to object paths', () => {
      const url =
        'https://example.supabase.co/storage/v1/object/public/user-avatars/user123/avatar.png';
      expect(normalizeStoredObjectPath(url, 'user-avatars')).toBe('user123/avatar.png');
    });

    it('returns null for external Google avatar CDN URLs', () => {
      expect(
        normalizeStoredObjectPath(
          'https://lh3.googleusercontent.com/a/photo',
          'user-avatars',
        ),
      ).toBeNull();
    });

    it('strips query strings from bare paths', () => {
      expect(normalizeStoredObjectPath('a/b.jpg?v=1', 'team-images')).toBe('a/b.jpg');
    });
  });

  describe('createSignedUrlForPath', () => {
    it('delegates to supabase storage createSignedUrl', async () => {
      const url = await createSignedUrlForPath('team-images', 'org/photo.jpg', { expiresInSeconds: 120 });
      expect(url).toContain('sign/mock/org/photo.jpg');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('org/photo.jpg', 120);
    });

    it('returns null for empty path', async () => {
      await expect(
        createSignedUrlForPath('team-images', '  ', { expiresInSeconds: DEFAULT_SIGNED_URL_TTL_SECONDS }),
      ).resolves.toBeNull();
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('displayUrlForStoredPrivateImage', () => {
    it('prefers signed URL over stored path', () => {
      expect(displayUrlForStoredPrivateImage('https://signed.example/x', 'uid/wo/n.jpg')).toBe(
        'https://signed.example/x',
      );
    });

    it('allows legacy absolute URLs when signing failed', () => {
      expect(displayUrlForStoredPrivateImage(null, 'https://cdn.example/a.jpg')).toBe(
        'https://cdn.example/a.jpg',
      );
    });

    it('drops expired EquipQR signed URLs instead of passing them through', () => {
      const stale =
        'https://supabase.equipqr.app/storage/v1/object/sign/work-order-images/u/wo/n.jpg?token=expired';
      expect(displayUrlForStoredPrivateImage(null, stale)).toBeNull();
      expect(isEquipQrPrivateStorageUrl(stale)).toBe(true);
    });

    it('drops tokenless EquipQR sign URLs instead of using them as img src', () => {
      const unsigned =
        'http://localhost:54321/storage/v1/object/sign/equipment-note-images/u/eq/n.jpg';
      expect(displayUrlForStoredPrivateImage(unsigned, 'u/eq/n.jpg')).toBeNull();
      expect(isEquipQrPrivateStorageUrl(unsigned)).toBe(true);
      expect(isFetchableSignedStorageUrl(unsigned)).toBe(false);
    });

    it('rejects private sign URLs with empty or missing token query param', () => {
      const emptyToken =
        'https://supabase.equipqr.app/storage/v1/object/sign/work-order-images/u/wo/n.jpg?token=';
      const wrongParam =
        'https://supabase.equipqr.app/storage/v1/object/sign/work-order-images/u/wo/n.jpg?e=900';
      expect(isFetchableSignedStorageUrl(emptyToken)).toBe(false);
      expect(isFetchableSignedStorageUrl(wrongParam)).toBe(false);
    });

    it('normalizes local relative signed URLs for img src', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
      try {
        const relative =
          '/object/sign/equipment-note-images/u/eq/n.jpg?token=abc123';
        const absolute = toAbsoluteSignedStorageUrl(relative);
        expect(absolute).toBe(
          'http://127.0.0.1:54321/storage/v1/object/sign/equipment-note-images/u/eq/n.jpg?token=abc123',
        );
        expect(displayableImageSrc(relative)).toBe(absolute);
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('returns null for canonical path without a signed URL', () => {
      expect(displayUrlForStoredPrivateImage(null, 'uid/work/img.jpg')).toBeNull();
      expect(displayUrlForStoredPrivateImage(undefined, 'path-only')).toBeNull();
    });
  });

  describe('batchResolveWorkOrderImageDisplayUrls', () => {
    it('uses createSignedUrls with deduped paths', async () => {
      const paths = ['u/a/1.jpg', 'u/a/2.jpg', 'u/a/1.jpg'];
      const out = await batchResolveWorkOrderImageDisplayUrls(paths);
      expect(out).toHaveLength(3);
      expect(out[0]).toContain('u/a/1.jpg');
      expect(out[1]).toContain('u/a/2.jpg');
      expect(out[2]).toContain('u/a/1.jpg');
      expect(mockCreateSignedUrls).toHaveBeenCalledTimes(1);
      expect(mockCreateSignedUrls.mock.calls[0][0]).toEqual(['u/a/1.jpg', 'u/a/2.jpg']);
    });

    it('falls back to createSignedUrl when batch errors', async () => {
      mockCreateSignedUrls.mockImplementationOnce(() => ({ data: null, error: { message: 'fail' } }));
      const out = await batchResolveWorkOrderImageDisplayUrls(['x/y.jpg']);
      expect(mockCreateSignedUrl).toHaveBeenCalled();
      expect(out[0]).toContain('sign/mock/x/y.jpg');
    });
  });

  describe('batchResolveTeamImageDisplayUrls', () => {
    it('uses createSignedUrls with deduped paths', async () => {
      const paths = ['org/a/t1.jpg', 'org/a/t2.jpg', 'org/a/t1.jpg'];
      const out = await batchResolveTeamImageDisplayUrls(paths);
      expect(out).toHaveLength(3);
      expect(out[0]).toContain('org/a/t1.jpg');
      expect(out[1]).toContain('org/a/t2.jpg');
      expect(mockCreateSignedUrls).toHaveBeenCalledTimes(1);
      expect(mockCreateSignedUrls.mock.calls[0][0]).toEqual(['org/a/t1.jpg', 'org/a/t2.jpg']);
    });
  });

  describe('batchResolveEquipmentNoteImageDisplayUrls', () => {
    it('uses createSignedUrls with deduped paths', async () => {
      const paths = ['u/n/a.jpg', 'u/n/b.jpg', 'u/n/a.jpg'];
      const out = await batchResolveEquipmentNoteImageDisplayUrls(paths);
      expect(out).toHaveLength(3);
      expect(mockCreateSignedUrls).toHaveBeenCalledTimes(1);
      expect(mockCreateSignedUrls.mock.calls[0][0]).toEqual(['u/n/a.jpg', 'u/n/b.jpg']);
    });
  });

  describe('batchResolveInventoryItemImageDisplayUrls', () => {
    it('uses createSignedUrls with deduped paths', async () => {
      const paths = ['org/item/a.jpg', 'org/item/b.jpg', 'org/item/a.jpg'];
      const out = await batchResolveInventoryItemImageDisplayUrls(paths);
      expect(out).toHaveLength(3);
      expect(mockCreateSignedUrls).toHaveBeenCalledTimes(1);
      expect(mockCreateSignedUrls.mock.calls[0][0]).toEqual(['org/item/a.jpg', 'org/item/b.jpg']);
    });
  });

  describe('batchResolveEquipmentDisplayImageUrls', () => {
    it('signs canonical paths via createSignedUrl on work-order bucket', async () => {
      const out = await batchResolveEquipmentDisplayImageUrls(['u/wo/a.jpg', null, 'u/wo/b.jpg']);
      expect(out[0]).toContain('sign/mock/u/wo/a.jpg');
      expect(out[1]).toBeNull();
      expect(out[2]).toContain('sign/mock/u/wo/b.jpg');
      expect(mockCreateSignedUrl).toHaveBeenCalled();
      expect(mockCreateSignedUrls).not.toHaveBeenCalled();
    });

    it('falls back to equipment-note bucket when work-order signing returns null', async () => {
      mockFrom.mockImplementation((bucket: string) => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        createSignedUrl: vi.fn((path: string, expiresIn: number) => {
          if (bucket === 'work-order-images') {
            return Promise.resolve({ data: null, error: { message: 'not found' } });
          }
          if (bucket === 'equipment-note-images') {
            return Promise.resolve({
              data: {
                signedUrl: `https://example.supabase.co/storage/v1/object/sign/eq-note/${path}?token=test-${expiresIn}`,
              },
              error: null,
            });
          }
          return mockCreateSignedUrl(path, expiresIn);
        }),
        createSignedUrls: mockCreateSignedUrls,
      }));

      const out = await batchResolveEquipmentDisplayImageUrls(['only/in/eq.jpg']);
      expect(out[0]).toContain('sign/eq-note/only/in/eq.jpg');
    });

    it('derives the owning bucket from equipment ids and batch-signs without probing (#1156)', async () => {
      const bucketCalls: Array<{ bucket: string; paths: string[] }> = [];
      mockFrom.mockImplementation((bucket: string) => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        createSignedUrl: mockCreateSignedUrl,
        createSignedUrls: vi.fn((paths: string[], expiresIn: number) => {
          bucketCalls.push({ bucket, paths });
          return Promise.resolve({
            data: paths.map((path: string) => ({
              path,
              signedUrl: `https://example.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=test-${expiresIn}`,
              error: null,
            })),
            error: null,
          });
        }),
      }));

      const out = await batchResolveEquipmentDisplayImageUrls(
        ['user1/eq-1/note-1/a.jpg', 'user1/wo-9/b.jpg'],
        { equipmentIds: ['eq-1', 'eq-2'] },
      );

      expect(out[0]).toContain('sign/equipment-note-images/user1/eq-1/note-1/a.jpg');
      expect(out[1]).toContain('sign/work-order-images/user1/wo-9/b.jpg');
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
      expect(bucketCalls.map((call) => call.bucket).sort()).toEqual([
        'equipment-note-images',
        'work-order-images',
      ]);
    });

    it('nulls refs whose batch row reports an error instead of probing per path (#1156)', async () => {
      mockFrom.mockImplementation(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        createSignedUrl: mockCreateSignedUrl,
        createSignedUrls: vi.fn((paths: string[]) =>
          Promise.resolve({
            data: paths.map((path: string) => ({
              path,
              signedUrl: null,
              error: 'Object not found',
            })),
            error: null,
          }),
        ),
      }));

      const out = await batchResolveEquipmentDisplayImageUrls(['user1/wo-9/gone.jpg'], {
        equipmentIds: ['eq-1'],
      });

      expect(out[0]).toBeNull();
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    });

    it('passes batch TTL to per-path fallback when batch omits a usable URL', async () => {
      mockFrom.mockImplementation((bucket: string) => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        createSignedUrl: mockCreateSignedUrl,
        createSignedUrls: vi.fn((paths: string[]) =>
          Promise.resolve({
            data: paths.map((path: string) => ({
              path,
              signedUrl: null,
              error: null,
            })),
            error: null,
          }),
        ),
      }));

      await batchResolveEquipmentDisplayImageUrls(['user1/eq-1/note-1/a.jpg'], {
        equipmentIds: ['eq-1'],
        expiresInSeconds: 600,
      });

      expect(mockCreateSignedUrl).toHaveBeenCalledWith('user1/eq-1/note-1/a.jpg', 600);
    });
  });

  describe('resolveImageDisplayUrl', () => {
    it('returns signed URL for private bucket path references', async () => {
      const resolved = await resolveImageDisplayUrl('work-order-images', 'u/w/5.jpg');
      expect(resolved).toContain('sign/mock/u/w/5.jpg');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('u/w/5.jpg', DEFAULT_SIGNED_URL_TTL_SECONDS);
    });

    it('reconstructs public URL for organization logos', async () => {
      const resolved = await resolveImageDisplayUrl(
        'organization-logos',
        'org123/logo.png'
      );
      expect(resolved).toContain('/storage/v1/object/public/organization-logos/org123/logo.png');
    });

    it('preserves cache-buster query on existing public logo URLs', async () => {
      const url =
        'https://example.supabase.co/storage/v1/object/public/organization-logos/org123/logo.png?v=999';
      const resolved = await resolveImageDisplayUrl('organization-logos', url);
      expect(resolved).toBe(url);
      expect(mockGetPublicUrl).not.toHaveBeenCalled();
    });
  });
});
