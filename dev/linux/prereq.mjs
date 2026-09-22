#!/usr/bin/env node
/**
 * Prerequisite checks for the EquipQR Linux development runtime.
 * Prints remediation and exits non-zero when Node, npm, or Docker is unusable.
 * Does not print secret values.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {string} enginesNode
 * @returns {number | null}
 */
export function requiredNodeMajor(enginesNode) {
  const match = /^(\d+)/.exec(String(enginesNode ?? '').trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

/**
 * @param {string} versionText
 * @returns {number | null}
 */
export function nodeMajorFromVersion(versionText) {
  const match = /v?(\d+)/.exec(String(versionText ?? '').trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

/**
 * @param {{ enginesNode: string, actualVersion: string }} input
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function evaluateNode(input) {
  const required = requiredNodeMajor(input.enginesNode);
  if (required == null) {
    return {
      ok: false,
      message: 'package.json engines.node is missing or not a major version such as "24.x".',
    };
  }
  const actual = nodeMajorFromVersion(input.actualVersion);
  if (actual == null) {
    return {
      ok: false,
      message: `Could not read the Node version from "${input.actualVersion}". Install Node ${required}.x from https://nodejs.org/.`,
    };
  }
  if (actual !== required) {
    return {
      ok: false,
      message: [
        `Node ${input.actualVersion} does not satisfy engines.node "${input.enginesNode}" (major ${required}).`,
        `Install Node ${required}.x from https://nodejs.org/ and rerun this command.`,
        'The EquipQR dev container installs that same major. Do not change the repository Node policy to match an older local install.',
      ].join('\n'),
    };
  }
  return { ok: true };
}

/**
 * @param {{ ok: boolean, detail?: string }} input
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function evaluateDocker(input) {
  if (input.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    message: [
      'Docker is not available. Local Supabase needs a running Docker daemon.',
      'Start Docker Engine (or Docker Desktop with the WSL2 integration) and rerun.',
      'In GitHub Codespaces, rebuild the dev container so Docker-in-Docker can start.',
      'https://docs.docker.com/engine/install/ubuntu/',
      input.detail ? `Detail: ${input.detail}` : '',
    ].filter(Boolean).join('\n'),
  };
}

/**
 * @param {{ ok: boolean }} input
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function evaluateNpm(input) {
  if (input.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    message: 'npm is not on PATH. Install Node.js, which includes npm, from https://nodejs.org/. EquipQR uses npm ci and does not support other package managers.',
  };
}

/**
 * @param {{ skipDocker?: boolean, nodeVersion?: string, npmOk?: boolean, dockerOk?: boolean, dockerDetail?: string, repoRoot?: string }} [options]
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function evaluatePrerequisites(options = {}) {
  const root = options.repoRoot ?? repoRoot;
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const nodeResult = evaluateNode({
    enginesNode: String(pkg.engines?.node ?? ''),
    actualVersion: options.nodeVersion ?? process.version,
  });
  if (!nodeResult.ok) {
    return nodeResult;
  }
  const npmResult = evaluateNpm({ ok: options.npmOk ?? true });
  if (!npmResult.ok) {
    return npmResult;
  }
  if (options.skipDocker) {
    return { ok: true };
  }
  return evaluateDocker({
    ok: options.dockerOk ?? false,
    detail: options.dockerDetail,
  });
}

function commandOk(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return {
    ok: result.status === 0,
    detail: (result.stderr || result.stdout || result.error?.message || '').trim().slice(0, 400),
  };
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function main() {
  const skipDocker = process.argv.includes('--skip-docker');
  const npm = commandOk('npm', ['--version']);
  let docker = { ok: true, detail: '' };
  if (!skipDocker) {
    docker = commandOk('docker', ['ps', '-q']);
    for (let attempt = 0; !docker.ok && attempt < 30; attempt += 1) {
      sleepSync(2000);
      docker = commandOk('docker', ['ps', '-q']);
    }
  }
  const result = evaluatePrerequisites({
    skipDocker,
    npmOk: npm.ok,
    dockerOk: docker.ok,
    dockerDetail: docker.ok ? '' : docker.detail,
  });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log('Prerequisites OK.');
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main();
}
