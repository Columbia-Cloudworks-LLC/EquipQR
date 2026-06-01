#!/usr/bin/env node

/**
 * Ensure Node runtime policy (engines.node) matches resolved @types/node major.
 * Prevents accidental Node 25 typings while runtime stays on Node 24 LTS.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} message */
function fail(message) {
  console.error(`verify-node-policy: ${message}`);
  process.exit(1);
}

/** @param {string} version */
function majorFromSemver(version) {
  const match = /^(\d+)/.exec(String(version).trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

/** @param {string} enginesNode */
function runtimeMajorFromEngines(enginesNode) {
  const value = String(enginesNode).trim();
  const match = /^(\d+)/.exec(value);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

const packageJsonPath = path.join(repoRoot, 'package.json');
const lockPath = path.join(repoRoot, 'package-lock.json');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

const enginesNode = pkg.engines?.node;
if (!enginesNode) {
  fail('package.json is missing engines.node');
}

const runtimeMajor = runtimeMajorFromEngines(enginesNode);
if (runtimeMajor == null) {
  fail(`Could not parse engines.node value "${enginesNode}"`);
}

const typesSpec = pkg.devDependencies?.['@types/node'];
if (!typesSpec) {
  fail('package.json is missing devDependencies["@types/node"]');
}

const resolvedTypesVersion = lock.packages?.['node_modules/@types/node']?.version
  ?? lock.dependencies?.['@types/node']?.version
  ?? lock.packages?.['']?.devDependencies?.['@types/node'];

let resolvedMajor = null;
if (typeof resolvedTypesVersion === 'string') {
  resolvedMajor = majorFromSemver(resolvedTypesVersion);
} else {
  const lockEntry = lock.packages?.['node_modules/@types/node'];
  if (lockEntry?.version) {
    resolvedMajor = majorFromSemver(lockEntry.version);
  }
}

if (resolvedMajor == null) {
  fail('Could not resolve @types/node version from package-lock.json');
}

if (resolvedMajor !== runtimeMajor) {
  fail(
    `Node policy drift: engines.node is "${enginesNode}" (major ${runtimeMajor}) `
      + `but package-lock resolves @types/node@${lock.packages?.['node_modules/@types/node']?.version ?? 'unknown'} `
      + `(major ${resolvedMajor}). Keep @types/node on the Node ${runtimeMajor} line.`,
  );
}

console.log(
  `OK: engines.node=${enginesNode} aligns with @types/node major ${resolvedMajor} `
    + `(${lock.packages?.['node_modules/@types/node']?.version ?? resolvedTypesVersion})`,
);
