export const COLLAGE_MAX_OBJECT_BYTES = 5 * 1024 * 1024;

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
