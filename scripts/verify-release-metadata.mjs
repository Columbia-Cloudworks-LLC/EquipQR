#!/usr/bin/env node

/**
 * Verify EquipQR release metadata on PRs and local checks.
 *
 * PR gate (when RELEASE_METADATA_BASE_SHA is set):
 * - [Unreleased] must stay empty
 * - Release-relevant file changes require a semver bump above the base branch
 * - When the version changes, CHANGELOG.md must contain a non-empty section for it
 * - package-lock.json root version must match package.json
 *
 * Local/main invariant (no base SHA):
 * - [Unreleased] empty, lockfile aligned, top changelog release matches package.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} message */
function fail(message) {
  console.error(`verify-release-metadata: ${message}`);
  process.exit(1);
}

/** @param {string} version */
export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {-1 | 0 | 1 | null}
 */
export function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) {
    return null;
  }

  if (a.major !== b.major) {
    return a.major > b.major ? 1 : -1;
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor ? 1 : -1;
  }
  if (a.patch !== b.patch) {
    return a.patch > b.patch ? 1 : -1;
  }
  return 0;
}

/** @param {string} filePath */
export function isReleaseRelevantPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  if (normalized === 'CHANGELOG.md') {
    return false;
  }
  if (normalized === 'AGENTS.md') {
    return false;
  }
  if (normalized.startsWith('.cursor/')) {
    return false;
  }
  if (normalized.startsWith('docs/')) {
    return false;
  }
  if (normalized === 'scripts/mcp.template.json') {
    return false;
  }
  if (/^(README|CONTRIBUTING|SUPPORT|SECURITY)\.md$/.test(normalized)) {
    return false;
  }

  return true;
}

/** @param {string} changelog */
export function getUnreleasedSectionBody(changelog) {
  const lines = changelog.split(/\r?\n/);
  let startIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith('## [Unreleased]')) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return null;
  }

  const bodyLines = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^## \[[^\]]+\]/.test(line)) {
      break;
    }
    bodyLines.push(line);
  }

  return bodyLines.join('\n');
}

/** @param {string} changelog */
export function isUnreleasedSectionEmpty(changelog) {
  const body = getUnreleasedSectionBody(changelog);
  if (body == null) {
    return false;
  }
  return body.trim().length === 0;
}

/**
 * @param {string} changelog
 * @param {string} version
 */
export function getReleasedSectionBody(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const headerPrefix = `## [${version}]`;
  let startIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith(headerPrefix)) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return null;
  }

  const bodyLines = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^## \[[^\]]+\]/.test(line)) {
      break;
    }
    if (line.trim() === '---') {
      break;
    }
    bodyLines.push(line);
  }

  return bodyLines.join('\n');
}

/** @param {string} changelog @param {string} version */
export function hasNonEmptyReleaseSection(changelog, version) {
  const body = getReleasedSectionBody(changelog, version);
  if (body == null) {
    return false;
  }

  const meaningfulLines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('<!--'));

  return meaningfulLines.length > 0;
}

/** @param {string} baseSha */
function listChangedFiles(baseSha) {
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

/** @param {string} ref */
function readPackageVersionAtRef(ref) {
  const output = execFileSync(
    'git',
    ['show', `${ref}:package.json`],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  const pkg = JSON.parse(output);
  if (typeof pkg.version !== 'string') {
    fail(`Missing version in package.json at ${ref}`);
  }
  return pkg.version;
}

/**
 * @param {{
 *   packageVersion: string;
 *   packageLockVersion: string;
 *   changelog: string;
 *   changedFiles?: string[];
 *   baseVersion?: string;
 * }} input
 * @returns {string[]}
 */
export function collectReleaseMetadataErrors(input) {
  const errors = [];

  if (!parseSemver(input.packageVersion)) {
    errors.push(`package.json version "${input.packageVersion}" must match x.y.z`);
  }

  if (input.packageLockVersion !== input.packageVersion) {
    errors.push(
      `package-lock.json version "${input.packageLockVersion}" must match package.json `
        + `"${input.packageVersion}"`,
    );
  }

  if (!isUnreleasedSectionEmpty(input.changelog)) {
    errors.push('CHANGELOG.md [Unreleased] must be empty; move entries into a version section');
  }

  const requiresBump = (input.changedFiles ?? []).some(isReleaseRelevantPath);

  if (input.baseVersion != null) {
    const comparison = compareSemver(input.packageVersion, input.baseVersion);
    if (comparison == null) {
      errors.push(
        `Could not compare package.json version "${input.packageVersion}" `
          + `with base "${input.baseVersion}"`,
      );
    } else if (requiresBump && comparison <= 0) {
      errors.push(
        `Release-relevant files changed but package.json version `
          + `"${input.packageVersion}" is not newer than base "${input.baseVersion}"`,
      );
    } else if (!requiresBump && comparison < 0) {
      errors.push(
        `package.json version "${input.packageVersion}" must not be lower than base `
          + `"${input.baseVersion}"`,
      );
    }

    if (input.packageVersion !== input.baseVersion) {
      if (comparison != null && comparison > 0
        && !hasNonEmptyReleaseSection(input.changelog, input.packageVersion)) {
        errors.push(
          `CHANGELOG.md must include a non-empty "## [${input.packageVersion}]" section `
            + 'when package.json version changes',
        );
      }
    }
  } else if (!hasNonEmptyReleaseSection(input.changelog, input.packageVersion)) {
    errors.push(
      `CHANGELOG.md must include a non-empty "## [${input.packageVersion}]" section `
        + 'matching package.json',
    );
  }

  return errors;
}

function loadCurrentMetadata() {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const lockPath = path.join(repoRoot, 'package-lock.json');
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  return {
    packageVersion: pkg.version,
    packageLockVersion: lock.version ?? lock.packages?.['']?.version ?? '',
    changelog,
  };
}

export function verifyReleaseMetadata(options = {}) {
  const metadata = loadCurrentMetadata();
  const baseSha = options.baseSha ?? process.env.RELEASE_METADATA_BASE_SHA ?? '';

  /** @type {string[] | undefined} */
  let changedFiles;
  /** @type {string | undefined} */
  let baseVersion;

  if (baseSha) {
    changedFiles = listChangedFiles(baseSha);
    baseVersion = readPackageVersionAtRef(baseSha);
  }

  const errors = collectReleaseMetadataErrors({
    ...metadata,
    changedFiles,
    baseVersion,
  });

  if (errors.length > 0) {
    for (const error of errors) {
      fail(error);
    }
  }

  if (baseSha) {
    const relevant = (changedFiles ?? []).filter(isReleaseRelevantPath);
    console.log(
      `OK: release metadata valid for PR diff (${relevant.length} release-relevant file(s), `
        + `version ${metadata.packageVersion}, base ${baseVersion})`,
    );
  } else {
    console.log(`OK: release metadata valid (version ${metadata.packageVersion})`);
  }
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  verifyReleaseMetadata();
}
