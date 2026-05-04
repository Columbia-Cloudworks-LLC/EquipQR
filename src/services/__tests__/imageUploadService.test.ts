import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUpload, mockFrom, mockCreateSignedUrl, mockGetPublicUrl } = vi.hoisted(() => {
  const mockUpload = vi.fn();
  const mockCreateSignedUrl = vi.fn();
  const mockGetPublicUrl = vi.fn(() => ({
    data: {
      publicUrl: 'https://example.supabase.co/storage/v1/object/public/organization-logos/org/logo.png',
    },
  }));
  const mockFrom = vi.fn(() => ({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
    createSignedUrl: mockCreateSignedUrl,
  }));
  return { mockUpload, mockFrom, mockCreateSignedUrl, mockGetPublicUrl };
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
  DEFAULT_SIGNED_URL_TTL_SECONDS,
} from '@/services/imageUploadService';

describe('imageUploadService', () => {
  beforeEach(() => {
    vi.mocked(imageCompression).mockReset();
    mockUpload.mockResolvedValue({ data: { path: 'prefix/1.jpg' }, error: null });
    mockCreateSignedUrl.mockImplementation((path: string, expiresIn: number) => ({
      data: {
        signedUrl: `https://example.supabase.co/storage/v1/object/sign/mock/${path}?e=${expiresIn}`,
      },
      error: null,
    }));
    mockGetPublicUrl.mockImplementation((path: string) => ({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/organization-logos/${path}`,
      },
    }));
    mockFrom.mockClear();
    mockUpload.mockClear();
    mockCreateSignedUrl.mockClear();
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

    it('strips query strings from bare paths', () => {
      expect(normalizeStoredObjectPath('a/b.jpg?v=1', 'team-images')).toBe('a/b.jpg');
    });
  });

  describe('createSignedUrlForPath', () => {
    it('delegates to supabase storage createSignedUrl', async () => {
      const url = await createSignedUrlForPath('team-images', 'org/photo.jpg', 120);
      expect(url).toContain('sign/mock/org/photo.jpg');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('org/photo.jpg', 120);
    });

    it('returns null for empty path', async () => {
      await expect(createSignedUrlForPath('team-images', '  ', DEFAULT_SIGNED_URL_TTL_SECONDS)).resolves.toBeNull();
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
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
  });
});
