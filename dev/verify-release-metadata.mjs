#!/usr/bin/env node

/**
 * Verify EquipQR release metadata on PRs and local checks.
 *
 * Modes (RELEASE_METADATA_MODE or options.mode):
 * - main (default): empty [Unreleased], semver bump when release-relevant,
 *   versioned CHANGELOG section, lockfile aligned
 * - preview: no version bump vs base; release-relevant diffs require non-empty
 *   [Unreleased]; lockfile aligned; top released section still matches package.json
 *
 * PR gate (when RELEASE_METADATA_BASE_SHA is set):
 * - Diff vs base drives release-relevant path checks
 * - package-lock.json root version must match package.json
 *
 * Local invariant (no base SHA):
 * - main: [Unreleased] empty, lockfile aligned, top changelog release matches package.json
 * - preview: lockfile aligned, top changelog release matches package.json
 *   ([Unreleased] may be non-empty)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  resolveRepoRoot,
  createFail,
  listChangedFiles,
} from './lib/scriptRuntime.mjs';

const repoRoot = resolveRepoRoot(import.meta.url);

/** @typedef {'main' | 'preview'} ReleaseMetadataMode */

const fail = createFail('verify-release-metadata');

/**
 * @param {unknown} value
 * @returns {ReleaseMetadataMode}
 */
export function normalizeReleaseMetadataMode(value) {
  const normalized = String(value ?? 'main').trim().toLowerCase();
  if (normalized === 'preview') {
    return 'preview';
  }
  if (normalized === 'main' || normalized === '') {
    return 'main';
  }
  fail(`Unknown RELEASE_METADATA_MODE "${value}" (expected main or preview)`);
  return 'main';
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
  if (normalized.startsWith('.cursor/') || normalized.startsWith('.agents/')) {
    return false;
  }
  if (normalized.startsWith('docs/')) {
    return false;
  }
  if (normalized === 'dev/mcp.template.json') {
    return false;
  }
  if (/^(README|CONTRIBUTING|SUPPORT|SECURITY)\.md$/.test(normalized)) {
    return false;
  }

  return true;
}

/**
 * Lines after the first line starting with `headerPrefix`, up to the next
 * `## [..]` heading (or a `---` rule when `stopAtRule` is set). Null when the
 * header is absent.
 * @param {string} changelog
 * @param {string} headerPrefix
 * @param {{ stopAtRule?: boolean }} [options]
 */
function getSectionBody(changelog, headerPrefix, options = {}) {
  const lines = changelog.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.startsWith(headerPrefix));

  if (startIndex === -1) {
    return null;
  }

  const bodyLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^## \[[^\]]+\]/.test(line)) {
      break;
    }
    if (options.stopAtRule && line.trim() === '---') {
      break;
    }
    bodyLines.push(line);
  }

  return bodyLines.join('\n');
}

/**
 * True when the section body has at least one list bullet (ignores blanks,
 * HTML comments, and ### category headings).
 * @param {string | null} body
 */
function bodyHasListBullets(body) {
  if (body == null) {
    return false;
  }

  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => {
      if (line.length === 0 || line.startsWith('<!--')) {
        return false;
      }
      if (/^###\s/.test(line)) {
        return false;
      }
      return /^[-*]\s/.test(line);
    });
}

/** @param {string} changelog */
export function getUnreleasedSectionBody(changelog) {
  return getSectionBody(changelog, '## [Unreleased]');
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
 * True when [Unreleased] has at least one list bullet (ignores blanks, HTML
 * comments, and ### category headings).
 * @param {string} changelog
 */
export function hasNonEmptyUnreleasedBullets(changelog) {
  return bodyHasListBullets(getUnreleasedSectionBody(changelog));
}

/**
 * @param {string} changelog
 * @param {string} version
 */
export function getReleasedSectionBody(changelog, version) {
  return getSectionBody(changelog, `## [${version}]`, { stopAtRule: true });
}

/** @param {string} changelog */
export function getTopReleasedVersion(changelog) {
  const lines = changelog.split(/\r?\n/);
  let pastUnreleased = false;

  for (const line of lines) {
    if (line.startsWith('## [Unreleased]')) {
      pastUnreleased = true;
      continue;
    }

    if (!pastUnreleased) {
      continue;
    }

    const match = /^## \[(\d+\.\d+\.\d+)\]/.exec(line);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/** @param {string} changelog @param {string} version */
export function hasNonEmptyReleaseSection(changelog, version) {
  return bodyHasListBullets(getReleasedSectionBody(changelog, version));
}

/** @param {string} changelog @param {string} version */
export function topReleasedSectionMatches(changelog, version) {
  return getTopReleasedVersion(changelog) === version
    && hasNonEmptyReleaseSection(changelog, version);
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
 * Compares package.json version with the base version, recording an error when not comparable.
 * @param {string} packageVersion
 * @param {string} baseVersion
 * @param {string[]} errors
 */
function compareWithBaseVersion(packageVersion, baseVersion, errors) {
  const comparison = compareSemver(packageVersion, baseVersion);
  if (comparison == null) {
    errors.push(
      `Could not compare package.json version "${packageVersion}" `
        + `with base "${baseVersion}"`,
    );
  }
  return comparison;
}

/**
 * @param {{
 *   packageVersion: string;
 *   packageLockVersion: string;
 *   changelog: string;
 *   changedFiles?: string[];
 *   baseVersion?: string;
 *   mode?: ReleaseMetadataMode | string;
 * }} input
 * @returns {string[]}
 */
export function collectReleaseMetadataErrors(input) {
  const mode = normalizeReleaseMetadataMode(input.mode ?? 'main');
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

  if (!topReleasedSectionMatches(input.changelog, input.packageVersion)) {
    const topVersion = getTopReleasedVersion(input.changelog);
    if (topVersion !== input.packageVersion) {
      errors.push(
        `CHANGELOG.md top release must be [${input.packageVersion}] `
          + `(found [${topVersion ?? 'none'}])`,
      );
    } else {
      errors.push(
        `CHANGELOG.md must include a non-empty "## [${input.packageVersion}]" section `
          + 'matching package.json',
      );
    }
  }

  const requiresBump = (input.changedFiles ?? []).some(isReleaseRelevantPath);

  if (mode === 'preview') {
    if (input.baseVersion != null) {
      const comparison = compareWithBaseVersion(input.packageVersion, input.baseVersion, errors);
      if (comparison != null && comparison !== 0) {
        errors.push(
          `PRs into preview must not bump package.json version `
            + `(found "${input.packageVersion}", base "${input.baseVersion}"). `
            + 'Defer the version bump to the preview → main release.',
        );
      }

      if (requiresBump && !hasNonEmptyUnreleasedBullets(input.changelog)) {
        errors.push(
          'Release-relevant files changed on a preview PR but CHANGELOG.md '
            + '[Unreleased] has no list bullets; document the change under [Unreleased]',
        );
      }
    }

    return errors;
  }

  if (!isUnreleasedSectionEmpty(input.changelog)) {
    errors.push('CHANGELOG.md [Unreleased] must be empty; move entries into a version section');
  }

  if (input.baseVersion != null) {
    const comparison = compareWithBaseVersion(input.packageVersion, input.baseVersion, errors);
    if (comparison != null && requiresBump && comparison <= 0) {
      errors.push(
        `Release-relevant files changed but package.json version `
          + `"${input.packageVersion}" is not newer than base "${input.baseVersion}"`,
      );
    } else if (comparison != null && !requiresBump && comparison < 0) {
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
  const mode = normalizeReleaseMetadataMode(
    options.mode ?? process.env.RELEASE_METADATA_MODE ?? 'main',
  );

  /** @type {string[] | undefined} */
  let changedFiles;
  /** @type {string | undefined} */
  let baseVersion;

  if (baseSha) {
    changedFiles = listChangedFiles(repoRoot, baseSha);
    baseVersion = readPackageVersionAtRef(baseSha);
  }

  const errors = collectReleaseMetadataErrors({
    ...metadata,
    changedFiles,
    baseVersion,
    mode,
  });

  if (errors.length > 0) {
    for (const error of errors) {
      fail(error);
    }
  }

  if (baseSha) {
    const relevant = (changedFiles ?? []).filter(isReleaseRelevantPath);
    console.log(
      `OK: release metadata valid for ${mode} PR diff (${relevant.length} release-relevant `
        + `file(s), version ${metadata.packageVersion}, base ${baseVersion})`,
    );
  } else {
    console.log(
      `OK: release metadata valid (${mode} mode, version ${metadata.packageVersion})`,
    );
  }
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  verifyReleaseMetadata();
}
