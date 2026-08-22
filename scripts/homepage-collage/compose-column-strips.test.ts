import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLLAGE_MAX_OBJECT_BYTES, validateComposeSources } from './compose-column-strips';

const RECIPE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'recipe.json');

interface RecipeTile {
  readonly source: string;
  readonly grade: 'clean' | 'worn';
  readonly crop: 'center-cover';
}

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

  it('keeps four columns of three tiles with a clean and worn mix', () => {
    const recipe = JSON.parse(readFileSync(RECIPE_PATH, 'utf8')) as { columns: RecipeTile[][] };

    expect(recipe.columns).toHaveLength(4);
    for (const tiles of recipe.columns) {
      expect(tiles).toHaveLength(3);
      const grades = new Set(tiles.map((tile) => tile.grade));
      expect(grades.has('clean')).toBe(true);
      expect(grades.has('worn')).toBe(true);
      expect(tiles.every((tile) => tile.crop === 'center-cover')).toBe(true);
    }
  });
});
