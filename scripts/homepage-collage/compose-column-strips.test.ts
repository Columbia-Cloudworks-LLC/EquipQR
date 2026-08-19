import { describe, expect, it } from 'vitest';
import {
  COLLAGE_MAX_OBJECT_BYTES,
  HOMEPAGE_COLLAGE_OBJECT_KEYS,
  formatUploadCommands,
  validateComposeSources,
} from './compose-column-strips';

describe('compose-column-strips validation', () => {
  it('accepts four 9:16 sources with a clean/worn mix under the 5 MiB cap', () => {
    const result = validateComposeSources([
      { fileName: 'loader-clean.png', width: 1080, height: 1920, bytes: 800_000, wear: 'clean' },
      { fileName: 'excavator-worn.jpg', width: 720, height: 1280, bytes: 400_000, wear: 'worn' },
      { fileName: 'dozer-damaged.webp', width: 1080, height: 1920, bytes: 1_200_000, wear: 'damaged' },
      { fileName: 'crane-clean.webp', width: 1080, height: 1920, bytes: 900_000, wear: 'clean' },
    ]);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a source that is not 9:16', () => {
    const result = validateComposeSources([
      { fileName: 'wide-clean.png', width: 1920, height: 1080, bytes: 100_000, wear: 'clean' },
      { fileName: 'excavator-worn.jpg', width: 720, height: 1280, bytes: 100_000, wear: 'worn' },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /9:16/.test(error))).toBe(true);
  });

  it('rejects an all-clean tray', () => {
    const result = validateComposeSources([
      { fileName: 'a-clean.png', width: 1080, height: 1920, bytes: 100_000, wear: 'clean' },
      { fileName: 'b-clean.png', width: 1080, height: 1920, bytes: 100_000, wear: 'clean' },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /mix/i.test(error))).toBe(true);
  });

  it('rejects a file over the 5 MiB object cap', () => {
    const result = validateComposeSources([
      { fileName: 'huge-worn.webp', width: 1080, height: 1920, bytes: COLLAGE_MAX_OBJECT_BYTES + 1, wear: 'worn' },
      { fileName: 'ok-clean.webp', width: 1080, height: 1920, bytes: 100_000, wear: 'clean' },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /5 MiB/.test(error))).toBe(true);
  });

  it('prints upload-screenshot commands for the four homepage-collage keys', () => {
    const commands = formatUploadCommands('/tmp/out');

    expect(HOMEPAGE_COLLAGE_OBJECT_KEYS).toEqual([
      'homepage-collage/col-0.webp',
      'homepage-collage/col-1.webp',
      'homepage-collage/col-2.webp',
      'homepage-collage/col-3.webp',
    ]);
    expect(commands).toHaveLength(4);
    expect(commands[0]).toBe(
      'npx tsx scripts/upload-screenshot.ts "/tmp/out/col-0.webp" homepage-collage/col-0.webp landing-page-images',
    );
    expect(commands[3]).toContain('homepage-collage/col-3.webp');
  });

  it('quotes local paths that contain spaces', () => {
    const commands = formatUploadCommands('C:/Users/viral/My Strips');

    expect(commands[1]).toBe(
      'npx tsx scripts/upload-screenshot.ts "C:/Users/viral/My Strips/col-1.webp" homepage-collage/col-1.webp landing-page-images',
    );
  });
});
