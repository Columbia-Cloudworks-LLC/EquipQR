import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Repository root for a script that lives directly under `dev/`.
 * @param {string} importMetaUrl `import.meta.url` of the calling script
 */
export function resolveRepoRoot(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '..');
}

/**
 * Builds a `fail(message)` that prints (optionally prefixed) to stderr and exits 1.
 * @param {string} [prefix]
 * @returns {(message: string) => never}
 */
export function createFail(prefix) {
  return (message) => {
    console.error(prefix ? `${prefix}: ${message}` : message);
    process.exit(1);
  };
}

/**
 * Reads and parses vercel.json from the repo root, failing with the shared messages.
 * @param {string} repoRoot
 * @param {(message: string) => never} fail
 */
export function readVercelConfig(repoRoot, fail) {
  const vercelPath = path.join(repoRoot, 'vercel.json');
  if (!fs.existsSync(vercelPath)) {
    fail('Missing vercel.json at repo root.');
  }

  try {
    return JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  } catch {
    return fail('vercel.json is not valid JSON.');
  }
}

/**
 * Files changed between `baseSha` and HEAD, as repo-relative paths.
 * @param {string} repoRoot
 * @param {string} baseSha
 */
export function listChangedFiles(repoRoot, baseSha) {
  const output = execFileSync(
    'git',
    ['diff', '--name-only', `${baseSha}..HEAD`],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * When `importMetaUrl` is the process entry point, runs `run()` and exits with its code;
 * an unexpected rejection prints a GitHub Actions `::error title=<title>::` line and exits 1.
 * @param {string} importMetaUrl `import.meta.url` of the calling script
 * @param {() => Promise<number | void>} run
 * @param {string} title
 */
export function runAsCliEntry(importMetaUrl, run, title) {
  if (process.argv[1] && importMetaUrl === pathToFileURL(process.argv[1]).href) {
    run().then(
      (code) => process.exit(code),
      (err) => {
        process.stderr.write(`::error title=${title}::${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
      },
    );
  }
}
