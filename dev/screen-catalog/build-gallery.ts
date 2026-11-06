/**
 * Build the screen catalog gallery from captured screen.json files.
 *
 *   npx tsx dev/screen-catalog/build-gallery.ts [catalogDir]
 *
 * catalogDir defaults to SCREEN_CATALOG_OUT or tmp/screen-catalog/<device>.
 * Writes index.html (open in a browser or via `npm run screens:serve`),
 * INDEX.md and a context.md beside every screen's slices.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadScreenCatalogSettings } from '../../e2e/screen-catalog/config';
import { catalogFlows } from '../../e2e/screen-catalog/flows';
import type { CapturedScreen } from '../../e2e/screen-catalog/types';
import { buildGalleryModel, indexMarkdown, screenContextMarkdown } from './gallery-model';
import { renderGalleryHtml } from './gallery-html';

function findScreenJson(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findScreenJson(full));
    else if (entry.name === 'screen.json') found.push(full);
  }
  return found;
}

export function buildGallery(catalogDir: string): { screens: number; errors: number; indexHtml: string } {
  const root = path.resolve(catalogDir);
  const captures: CapturedScreen[] = findScreenJson(path.join(root, 'screens')).map((file) => {
    const capture = JSON.parse(fs.readFileSync(file, 'utf8')) as CapturedScreen;
    return { ...capture, dir: path.relative(root, path.dirname(file)).split(path.sep).join('/') };
  });
  if (!captures.length) {
    throw new Error(`No captures found under ${root}/screens. Run npm run screens:capture first.`);
  }

  for (const capture of captures) {
    fs.writeFileSync(
      path.join(root, capture.dir, 'context.md'),
      screenContextMarkdown(capture, { absoluteRoot: root }),
    );
  }

  const model = buildGalleryModel(catalogFlows, captures);
  const latest = captures.reduce((max, capture) => (capture.capturedAt > max ? capture.capturedAt : max), '');
  const meta = {
    device: captures[0].device,
    clock: captures[0].clock,
    builtAt: latest,
    absoluteRoot: root,
    vscodePrefix: process.env.WSL_DISTRO_NAME
      ? `vscode://vscode-remote/wsl+${process.env.WSL_DISTRO_NAME}`
      : 'vscode://file',
    repoRoot: process.cwd(),
  };
  fs.writeFileSync(path.join(root, 'INDEX.md'), indexMarkdown(model, meta));
  fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify({ meta, flows: model }, null, 2)}\n`);
  const indexHtml = path.join(root, 'index.html');
  fs.writeFileSync(indexHtml, renderGalleryHtml(model, meta));
  return {
    screens: captures.length,
    errors: captures.filter((capture) => capture.status === 'error').length,
    indexHtml,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const dir = process.argv[2] || loadScreenCatalogSettings().outDir;
  const result = buildGallery(dir);
  console.log(`Screen catalog: ${result.screens} screen(s), ${result.errors} failed capture(s)`);
  console.log(`Gallery: ${result.indexHtml}`);
}
