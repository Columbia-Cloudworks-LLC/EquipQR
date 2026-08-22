import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANDING_IMAGE_KEYS } from './landingImage';

const LANDING_DIR = join(process.cwd(), 'public', 'images', 'landing');

const LANDING_CATALOG_NOISE = new Set(['.gitkeep', '.DS_Store', 'Thumbs.db', 'desktop.ini']);

function isLandingCatalogNoise(name: string): boolean {
  return LANDING_CATALOG_NOISE.has(name);
}

function listLandingFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listLandingFiles(absolute, relative));
      continue;
    }

    if (isLandingCatalogNoise(entry.name)) {
      continue;
    }

    if (entry.isFile() || (entry.isSymbolicLink() && statSync(absolute).isFile())) {
      files.push(relative.replaceAll('\\', '/'));
    }
  }

  return files.sort();
}

describe('LANDING_IMAGE_KEYS catalog', () => {
  it('has a file under public/images/landing/ for every key', () => {
    const missing = LANDING_IMAGE_KEYS.filter((key) => !existsSync(join(LANDING_DIR, key)));
    expect(missing).toEqual([]);
  });

  it('has no extra files outside the key list', () => {
    const extras = listLandingFiles(LANDING_DIR).filter(
      (file) => !(LANDING_IMAGE_KEYS as readonly string[]).includes(file),
    );
    expect(extras).toEqual([]);
  });
});
