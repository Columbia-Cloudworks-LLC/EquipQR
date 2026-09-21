import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COLLAGE_MAX_OBJECT_BYTES,
  buildSourcesJoinManifest,
  loadCollageRecipe,
  storageKeyForColumn,
  validateCollageRecipe,
  validateComposeSources,
  writeSourcesJoinManifest,
  writeSourcesJoinManifestFromRecipe,
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
});

describe('sources join-manifest', () => {
  it('keeps four columns of three tiles with license and attribution', () => {
    const recipe = loadCollageRecipe();
    const validation = validateCollageRecipe(recipe.columns);

    expect(validation.ok).toBe(true);
    expect(recipe.columns).toHaveLength(4);
    for (const tiles of recipe.columns) {
      expect(tiles).toHaveLength(3);
      const grades = new Set(tiles.map((tile) => tile.grade));
      expect(grades.has('clean')).toBe(true);
      expect(grades.has('worn')).toBe(true);
      expect(tiles.every((tile) => tile.crop === 'center-cover')).toBe(true);
      expect(tiles.every((tile) => tile.license.length > 0)).toBe(true);
      expect(tiles.every((tile) => tile.attribution.length > 0)).toBe(true);
    }
  });

  it('maps every recipe tile to homepage-collage/col-N.webp with source path and credit', () => {
    const recipe = loadCollageRecipe();
    const manifest = buildSourcesJoinManifest(recipe.columns);

    expect(manifest.generatedBy).toBe('compose-column-strips');
    expect(manifest.columns).toBe(4);
    expect(manifest.entries).toHaveLength(12);
    expect(manifest.entries[0]).toMatchObject({
      sourcePath: 'public/images/marketing/Toyota_forklift.jpg',
      storageKey: storageKeyForColumn(0),
      license: 'CC BY-SA 3.0',
      attribution: 'David Benbennick (Dbenbenn)',
      columnIndex: 0,
      tileIndex: 0,
    });
    expect(manifest.entries[11]?.storageKey).toBe('homepage-collage/col-3.webp');
    expect(manifest.entries.filter((entry) => entry.storageKey === 'homepage-collage/col-2.webp')).toHaveLength(3);
    expect(manifest.entries.every((entry) => entry.sourcePath.startsWith('public/images/marketing/'))).toBe(true);
  });

  it('keeps the committed sources-manifest.json aligned with recipe.json', () => {
    const recipe = loadCollageRecipe();
    const generated = buildSourcesJoinManifest(recipe.columns);
    const committedPath = join(dirname(fileURLToPath(import.meta.url)), 'sources-manifest.json');
    const committedText = readFileSync(committedPath, 'utf8');
    const committed = JSON.parse(committedText) as typeof generated;

    expect(committed).toEqual(generated);
    expect(committedText).toBe(`${JSON.stringify(generated, null, 2)}\n`);
  });

  it('rejects a recipe tile that omits license or attribution', () => {
    const result = validateCollageRecipe([
      [
        {
          source: 'a.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: '',
          attribution: 'Someone',
        },
        {
          source: 'b.jpg',
          grade: 'worn',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: '',
        },
        {
          source: 'c.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
      ],
      [
        {
          source: 'd.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
        {
          source: 'e.jpg',
          grade: 'worn',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
        {
          source: 'f.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
      ],
      [
        {
          source: 'g.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
        {
          source: 'h.jpg',
          grade: 'worn',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
        {
          source: 'i.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
      ],
      [
        {
          source: 'j.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
        {
          source: 'k.jpg',
          grade: 'worn',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
        {
          source: 'l.jpg',
          grade: 'clean',
          crop: 'center-cover',
          license: 'CC0 1.0',
          attribution: 'Someone',
        },
      ],
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => /license/.test(error))).toBe(true);
    expect(result.errors.some((error) => /attribution/.test(error))).toBe(true);
  });

  it('writes sources-manifest.json as a required compose output', () => {
    const recipe = loadCollageRecipe();
    const manifest = buildSourcesJoinManifest(recipe.columns);
    const directory = mkdtempSync(join(tmpdir(), 'equipqr-collage-manifest-'));
    const outputPath = join(directory, 'sources-manifest.json');

    try {
      expect(writeSourcesJoinManifest(manifest, outputPath)).toBe(outputPath);
      const written = JSON.parse(readFileSync(outputPath, 'utf8')) as typeof manifest;
      expect(written.entries).toHaveLength(12);
      expect(written.entries[0]?.storageKey).toBe('homepage-collage/col-0.webp');
      const recipePath = join(dirname(fileURLToPath(import.meta.url)), 'recipe.json');
      expect(writeSourcesJoinManifestFromRecipe(recipePath, join(directory, 'from-recipe.json'))).toContain(
        'from-recipe.json',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
