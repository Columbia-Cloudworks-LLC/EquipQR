import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COLLAGE_MAX_OBJECT_BYTES = 5 * 1024 * 1024;
const COLLAGE_STORAGE_PREFIX = 'homepage-collage';
const SOURCES_MANIFEST_FILENAME = 'sources-manifest.json';
const MARKETING_SOURCE_DIR = 'public/images/marketing';

type WearKind = 'clean' | 'worn' | 'damaged';
type RecipeGrade = 'clean' | 'worn';

interface ComposeSource {
  readonly fileName: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly wear: WearKind;
}

interface ComposeValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

interface CollageRecipeTile {
  readonly source: string;
  readonly grade: RecipeGrade;
  readonly crop: 'center-cover';
  readonly license: string;
  readonly attribution: string;
  readonly pageUrl?: string;
}

interface CollageRecipe {
  readonly columns: readonly (readonly CollageRecipeTile[])[];
}

interface SourcesJoinManifestEntry {
  readonly sourcePath: string;
  readonly storageKey: string;
  readonly license: string;
  readonly attribution: string;
  readonly pageUrl: string | null;
  readonly columnIndex: number;
  readonly tileIndex: number;
  readonly grade: RecipeGrade;
}

interface SourcesJoinManifest {
  readonly generatedBy: 'compose-column-strips';
  readonly columns: number;
  readonly entries: readonly SourcesJoinManifestEntry[];
}

const NINE_SIXTEEN = 9 / 16;
const ASPECT_TOLERANCE = 0.01;
const HERE = dirname(fileURLToPath(import.meta.url));
const RECIPE_PATH = join(HERE, 'recipe.json');
const SOURCES_MANIFEST_PATH = join(HERE, SOURCES_MANIFEST_FILENAME);

function isNineSixteen(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }
  return Math.abs(width / height - NINE_SIXTEEN) <= ASPECT_TOLERANCE;
}

export function validateComposeSources(sources: readonly ComposeSource[]): ComposeValidationResult {
  const errors: string[] = [];

  for (const source of sources) {
    if (!isNineSixteen(source.width, source.height)) {
      errors.push(`${source.fileName} is not 9:16 (${source.width}x${source.height})`);
    }
    if (source.bytes > COLLAGE_MAX_OBJECT_BYTES) {
      errors.push(`${source.fileName} exceeds 5 MiB (${source.bytes} bytes)`);
    }
  }

  const wears = new Set(sources.map((source) => source.wear));
  const hasClean = wears.has('clean');
  const hasWornOrDamaged = wears.has('worn') || wears.has('damaged');
  if (!hasClean || !hasWornOrDamaged) {
    errors.push('Source mix must include clean equipment and at least one worn or damaged unit');
  }

  return { ok: errors.length === 0, errors };
}

export function storageKeyForColumn(columnIndex: number): string {
  return `${COLLAGE_STORAGE_PREFIX}/col-${columnIndex}.webp`;
}

export function validateCollageRecipe(columns: readonly (readonly CollageRecipeTile[])[]): ComposeValidationResult {
  const errors: string[] = [];

  if (columns.length !== 4) {
    errors.push(`recipe must have four columns, received ${columns.length}`);
  }

  columns.forEach((tiles, columnIndex) => {
    if (tiles.length !== 3) {
      errors.push(`col-${columnIndex} must have 3 tiles, received ${tiles.length}`);
    }
    const grades = new Set(tiles.map((tile) => tile.grade));
    if (!grades.has('clean') || !grades.has('worn')) {
      errors.push(`col-${columnIndex} must mix clean and worn`);
    }
    tiles.forEach((tile, tileIndex) => {
      if (tile.crop !== 'center-cover') {
        errors.push(`col-${columnIndex} tile ${tileIndex} crop must be center-cover`);
      }
      if (!tile.source.trim()) {
        errors.push(`col-${columnIndex} tile ${tileIndex} is missing source`);
      }
      if (!tile.license.trim()) {
        errors.push(`col-${columnIndex} tile ${tile.source || tileIndex} is missing license`);
      }
      if (!tile.attribution.trim()) {
        errors.push(`col-${columnIndex} tile ${tile.source || tileIndex} is missing attribution`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
}

export function buildSourcesJoinManifest(
  columns: readonly (readonly CollageRecipeTile[])[],
): SourcesJoinManifest {
  const validation = validateCollageRecipe(columns);
  if (!validation.ok) {
    throw new Error(validation.errors.join('\n'));
  }

  const entries: SourcesJoinManifestEntry[] = columns.flatMap((tiles, columnIndex) =>
    tiles.map((tile, tileIndex) => ({
      sourcePath: `${MARKETING_SOURCE_DIR}/${tile.source}`,
      storageKey: storageKeyForColumn(columnIndex),
      license: tile.license,
      attribution: tile.attribution,
      pageUrl: tile.pageUrl?.trim() ? tile.pageUrl : null,
      columnIndex,
      tileIndex,
      grade: tile.grade,
    })),
  );

  return {
    generatedBy: 'compose-column-strips',
    columns: columns.length,
    entries,
  };
}

export function loadCollageRecipe(recipePath = RECIPE_PATH): CollageRecipe {
  return JSON.parse(readFileSync(recipePath, 'utf8')) as CollageRecipe;
}

export function writeSourcesJoinManifest(
  manifest: SourcesJoinManifest,
  outputPath = SOURCES_MANIFEST_PATH,
): string {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return outputPath;
}

export function writeSourcesJoinManifestFromRecipe(
  recipePath = RECIPE_PATH,
  outputPath = SOURCES_MANIFEST_PATH,
): string {
  const recipe = loadCollageRecipe(recipePath);
  const manifest = buildSourcesJoinManifest(recipe.columns);
  return writeSourcesJoinManifest(manifest, outputPath);
}

if (process.argv.includes('--write-manifest')) {
  const outputPath = writeSourcesJoinManifestFromRecipe();
  process.stdout.write(`wrote ${outputPath}\n`);
}
