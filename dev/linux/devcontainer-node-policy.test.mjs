import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { requiredNodeMajor } from './prereq.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('dev container Node policy', () => {
  it('installs the same Node major that package.json engines.node declares', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const devcontainer = JSON.parse(fs.readFileSync(path.join(repoRoot, '.devcontainer', 'devcontainer.json'), 'utf8'));
    const featureVersion = devcontainer.features?.['ghcr.io/devcontainers/features/node:2']?.version;
    expect(featureVersion).toBe(String(requiredNodeMajor(pkg.engines.node)));
    expect(devcontainer.image).toBe('mcr.microsoft.com/devcontainers/base:ubuntu-24.04');
  });
});
