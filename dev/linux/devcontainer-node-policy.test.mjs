import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Major version from an engines.node range such as "24.x". */
function requiredNodeMajor(enginesNode) {
  const match = /^(\d+)/.exec(String(enginesNode ?? '').trim());
  return match ? Number.parseInt(match[1], 10) : null;
}

describe('dev container Node policy', () => {
  it('installs the same Node major that package.json engines.node declares', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const devcontainer = JSON.parse(fs.readFileSync(path.join(repoRoot, '.devcontainer', 'devcontainer.json'), 'utf8'));
    const featureVersion = devcontainer.features?.['ghcr.io/devcontainers/features/node:2']?.version;
    expect(featureVersion.split(".")[0]).toBe(String(requiredNodeMajor(pkg.engines.node)));
    expect(featureVersion).toBe(fs.readFileSync(path.join(repoRoot, ".node-version"), "utf8").trim());
    expect(devcontainer.image).toBe('mcr.microsoft.com/devcontainers/base:ubuntu-24.04');
  });
});
