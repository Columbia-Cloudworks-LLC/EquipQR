import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layoutPath = path.join(repoRoot, 'etc', 'root-layout.json');

function isUnder(rel, prefix) {
  const normalized = rel.replaceAll('\\', '/');
  const wanted = prefix.replaceAll('\\', '/');
  return normalized === wanted.replace(/\/$/, '') || normalized.startsWith(wanted);
}

function isColocatedTestFile(name) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/i.test(name);
}

/**
 * Validate repository root and dev/ script inventory against etc/root-layout.json.
 *
 * @param {{ rootDir?: string, layout?: Record<string, unknown> }} [options]
 * @returns {string[]} List of violation messages (empty when valid)
 */
export function checkRootLayout(options = {}) {
  const rootDir = options.rootDir || repoRoot;
  const layout =
    options.layout || JSON.parse(fs.readFileSync(path.join(rootDir, 'etc', 'root-layout.json'), 'utf8'));

  /** @type {string[]} */
  const errors = [];

  const allowedFiles = new Set(layout.rootAllowedFiles || []);
  const allowedDirs = new Set(layout.rootAllowedDirs || []);
  const ignored = new Set((layout.rootIgnoredNames || []).map((name) => String(name).toLowerCase()));

  for (const name of fs.readdirSync(rootDir)) {
    if (ignored.has(name.toLowerCase())) {
      continue;
    }
    const abs = path.join(rootDir, name);
    const stat = fs.lstatSync(abs);
    if (stat.isDirectory()) {
      if (!allowedDirs.has(name)) {
        errors.push(`unexpected root directory: ${name}`);
      }
      continue;
    }
    if (!allowedFiles.has(name)) {
      errors.push(`unexpected root file: ${name}`);
    }
  }

  const devDir = path.join(rootDir, 'dev');
  if (fs.existsSync(devDir) && (layout.devAllowedFiles || layout.devAllowedDirs)) {
    const devAllowedFiles = new Set(layout.devAllowedFiles || []);
    const devAllowedDirs = new Set(layout.devAllowedDirs || []);

    for (const name of fs.readdirSync(devDir)) {
      if (ignored.has(name.toLowerCase())) {
        continue;
      }
      const abs = path.join(devDir, name);
      const stat = fs.lstatSync(abs);
      if (stat.isDirectory()) {
        if (!devAllowedDirs.has(name)) {
          errors.push(`unexpected dev/ directory: dev/${name} (register in etc/root-layout.json devAllowedDirs)`);
        }
        continue;
      }
      if (isColocatedTestFile(name)) {
        continue;
      }
      if (!devAllowedFiles.has(name)) {
        errors.push(
          `unexpected dev/ script or file: dev/${name} (extend existing CLI tools or register in etc/root-layout.json devAllowedFiles)`,
        );
      }
    }
  }

  const imagePrefix = String(layout.imageMustLiveUnder || 'public/images/').replaceAll('\\', '/');
  const exceptions = (layout.imageExceptions || []).map((entry) => String(entry).replaceAll('\\', '/'));
  const imageExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);
  const skipDirs = new Set([
    '.git',
    'node_modules',
    'dist',
    'coverage',
    'coverage-shards',
    'tmp',
    'test-results',
    'artifacts',
  ]);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(entry.name)) {
        continue;
      }
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!imageExt.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      const rel = path.relative(rootDir, abs).replaceAll('\\', '/');
      if (isUnder(rel, imagePrefix)) {
        continue;
      }
      const allowed = exceptions.some((exception) =>
        exception.endsWith('/') ? isUnder(rel, exception) : rel === exception,
      );
      if (!allowed) {
        errors.push(`image must live under ${imagePrefix}: ${rel}`);
      }
    }
  }

  walk(rootDir);

  return errors;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  const errors = checkRootLayout({ rootDir: repoRoot, layout });
  if (errors.length > 0) {
    for (const message of errors) {
      console.error(`root-layout: ${message}`);
    }
    process.exit(1);
  }
  console.log('root-layout: ok');
}
