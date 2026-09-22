#!/usr/bin/env node
/**
 * Write local Supabase URL and key overrides into env files.
 * Values come from `npx supabase status -o env` and are never printed.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const START = '# >>> EQUIPQR LOCAL SUPABASE OVERRIDES >>>';
const END = '# <<< EQUIPQR LOCAL SUPABASE OVERRIDES <<<';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseStatusEnv(text) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

/**
 * @param {string} content
 * @param {string[]} blockLines
 * @param {string[]} keysToReplace
 * @returns {string}
 */
export function applyManagedBlock(content, blockLines, keysToReplace) {
  const blockPattern = new RegExp(
    `\\r?\\n?${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\n?`,
    'g',
  );
  let next = String(content ?? '').replace(blockPattern, '');
  for (const key of keysToReplace) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`^\\s*${escaped}\\s*=.*(?:\\r?\\n)?`, 'gm'), '');
  }
  next = next.trimEnd();
  const block = [START, ...blockLines, END].join('\n');
  const body = next.length === 0 ? `${block}\n` : `${next}\n\n${block}\n`;
  return body;
}

/**
 * @param {Record<string, string>} status
 * @param {number} apiPort
 * @returns {{ appLines: string[], edgeLines: string[], appKeys: string[], edgeKeys: string[] }}
 */
export function buildLocalOverrideLines(status, apiPort) {
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  const anonKey = status.ANON_KEY || status.SUPABASE_ANON_KEY || '';
  const serviceKey = status.SERVICE_ROLE_KEY || status.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!anonKey || !serviceKey) {
    throw new Error('supabase status did not include local ANON_KEY and SERVICE_ROLE_KEY.');
  }
  const redirect = `${baseUrl}/functions/v1/quickbooks-oauth-callback`;
  const appKeys = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'PUBLIC_SITE_URL',
    'INTUIT_REDIRECT_URI',
  ];
  const edgeKeys = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INTUIT_REDIRECT_URI',
    'PUBLIC_SITE_URL',
    'GW_OAUTH_REDIRECT_BASE_URL',
    'QB_OAUTH_REDIRECT_BASE_URL',
    'QBO_USE_SANDBOX',
  ];
  return {
    appKeys,
    edgeKeys,
    appLines: [
      `VITE_SUPABASE_URL=${baseUrl}`,
      `VITE_SUPABASE_ANON_KEY=${anonKey}`,
      `SUPABASE_URL=${baseUrl}`,
      'PUBLIC_SITE_URL=http://127.0.0.1:8080',
      `INTUIT_REDIRECT_URI=${redirect}`,
    ],
    edgeLines: [
      `SUPABASE_URL=${baseUrl}`,
      `SUPABASE_ANON_KEY=${anonKey}`,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
      `INTUIT_REDIRECT_URI=${redirect}`,
      'PUBLIC_SITE_URL=http://127.0.0.1:8080',
      `GW_OAUTH_REDIRECT_BASE_URL=${baseUrl}`,
      `QB_OAUTH_REDIRECT_BASE_URL=${baseUrl}`,
      'QBO_USE_SANDBOX=true',
    ],
  };
}

/**
 * @param {string} filePath
 * @param {string[]} blockLines
 * @param {string[]} keysToReplace
 */
export function writeManagedEnvFile(filePath, blockLines, keysToReplace) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const next = applyManagedBlock(existing, blockLines, keysToReplace);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next);
}

/**
 * Public log line. Intentionally excludes credential material.
 * @param {number} apiPort
 */
export function publicSyncSummary(apiPort) {
  return `Updated local env overrides for Supabase API port ${apiPort}.`;
}

function readStatusEnv() {
  const result = spawnSync('npx', ['supabase', 'status', '-o', 'env'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const detail = `${result.stderr || ''}${result.stdout || ''}`;
    const redacted = /eyJ[A-Za-z0-9_-]{10,}/.test(detail);
    console.error('supabase status failed. Start local Supabase before syncing env files.');
    if (!redacted && detail.trim()) {
      console.error(detail.trim().slice(0, 500));
    }
    process.exit(result.status || 1);
  }
  return parseStatusEnv(result.stdout || '');
}

function main() {
  const apiPort = 54321;
  const status = readStatusEnv();
  const lines = buildLocalOverrideLines(status, apiPort);
  writeManagedEnvFile(path.join(repoRoot, '.env.local'), lines.appLines, lines.appKeys);
  writeManagedEnvFile(
    path.join(repoRoot, 'supabase', 'functions', '.env'),
    lines.edgeLines,
    lines.edgeKeys,
  );
  console.log(publicSyncSummary(apiPort));
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main();
}
