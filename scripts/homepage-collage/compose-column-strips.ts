import { readdir } from 'node:fs/promises';
import path from 'node:path';

export const COLLAGE_MAX_OBJECT_BYTES = 5 * 1024 * 1024;

export const HOMEPAGE_COLLAGE_OBJECT_KEYS = [
  'homepage-collage/col-0.webp',
  'homepage-collage/col-1.webp',
  'homepage-collage/col-2.webp',
  'homepage-collage/col-3.webp',
] as const;

type WearKind = 'clean' | 'worn' | 'damaged';

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

const NINE_SIXTEEN = 9 / 16;
const ASPECT_TOLERANCE = 0.01;

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

export function formatUploadCommands(outputDir: string): string[] {
  const root = outputDir.replace(/[\\/]+$/, '');
  return HOMEPAGE_COLLAGE_OBJECT_KEYS.map((key) => {
    const fileName = key.slice('homepage-collage/'.length);
    const localPath = `${root}/${fileName}`;
    return `npx tsx scripts/upload-screenshot.ts ${JSON.stringify(localPath)} ${key} landing-page-images`;
  });
}

async function main(): Promise<void> {
  const sourceDir = process.argv[2];
  console.log(
    'Prints quoted upload-screenshot commands for homepage-collage/col-0.webp through col-3.webp. Pixel packing is a separate photo pass.',
  );

  if (sourceDir) {
    const entries = await readdir(sourceDir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    console.log(`Source dir ${path.resolve(sourceDir)} has ${files.length} file(s).`);
  }

  for (const command of formatUploadCommands(sourceDir ?? 'tmp/homepage-collage')) {
    console.log(command);
  }
}

const entry = process.argv[1]?.replaceAll('\\', '/');
if (entry?.endsWith('compose-column-strips.ts') || entry?.endsWith('compose-column-strips.js')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
