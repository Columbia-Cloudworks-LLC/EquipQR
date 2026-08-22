import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layoutPath = path.join(repoRoot, 'etc', 'root-layout.json');

function fail(message) {
  console.error(`root-layout: ${message}`);
  process.exitCode = 1;
}

function isUnder(rel, prefix) {
  const normalized = rel.replaceAll('\\', '/');
  const wanted = prefix.replaceAll('\\', '/');
  return normalized === wanted.replace(/\/$/, '') || normalized.startsWith(wanted);
}

const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
const allowedFiles = new Set(layout.rootAllowedFiles);
const allowedDirs = new Set(layout.rootAllowedDirs);
const ignored = new Set(layout.rootIgnoredNames.map((name) => name.toLowerCase()));

for (const name of fs.readdirSync(repoRoot)) {
  if (ignored.has(name.toLowerCase())) {
    continue;
  }
  const abs = path.join(repoRoot, name);
  const stat = fs.lstatSync(abs);
  if (stat.isDirectory()) {
    if (!allowedDirs.has(name)) {
      fail(`unexpected root directory: ${name}`);
    }
    continue;
  }
  if (!allowedFiles.has(name)) {
    fail(`unexpected root file: ${name}`);
  }
}

const imagePrefix = layout.imageMustLiveUnder.replaceAll('\\', '/');
const exceptions = layout.imageExceptions.map((entry) => entry.replaceAll('\\', '/'));
const imageExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']);
const skipDirs = new Set(['.git', 'node_modules', 'dist', 'coverage', 'tmp', 'test-results', 'artifacts']);

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
    const rel = path.relative(repoRoot, abs).replaceAll('\\', '/');
    if (isUnder(rel, imagePrefix)) {
      continue;
    }
    const allowed = exceptions.some((exception) => (
      exception.endsWith('/') ? isUnder(rel, exception) : rel === exception
    ));
    if (!allowed) {
      fail(`image must live under ${imagePrefix}: ${rel}`);
    }
  }
}

walk(repoRoot);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('root-layout: ok');
