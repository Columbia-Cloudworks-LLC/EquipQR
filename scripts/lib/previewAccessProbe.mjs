/**
 * Preview-access probe helpers for scripts/verify-preview-access.mjs.
 * Pure utilities for env reporting, process management, and log redaction.
 */

import fs from 'node:fs/promises';
import net from 'node:net';
import { execSync } from 'node:child_process';

export const ENV_KEYS_TO_REPORT = [
  'PREVIEW_LOGIN_EMAIL',
  'PREVIEW_LOGIN_PASSWORD',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
];

export const REQUIRED_ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
export const PREVIEW_ACCESS_HOST = '127.0.0.1';

/**
 * @param {string | undefined} value
 */
export function marker(value) {
  return value ? '[set]' : '[missing]';
}

export function reportEnvPresence() {
  for (const key of ENV_KEYS_TO_REPORT) {
    console.log(`previewAccess.env.${key}=${marker(process.env[key])}`);
  }
}

export function requireEnv() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * @param {string} rawUrl
 */
export function normalizeSupabaseUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * @param {string} path
 */
export async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, PREVIEW_ACCESS_HOST, () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Could not allocate a local TCP port.'));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

/**
 * @param {number} ms
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals} signal
 */
export function terminateChild(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    if (!child.pid) return;
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Tree may already be gone (same role as ESRCH on Unix).
    }
    return;
  }
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch (err) {
    if (err && (err.code === 'ESRCH' || err.code === 'EPERM')) return;
    throw err;
  }
}

/**
 * @param {Array<{ hasSession?: boolean }>} responses
 */
export function pickRecordedAuthResponse(responses) {
  if (responses.length === 0) return undefined;
  for (let i = responses.length - 1; i >= 0; i--) {
    if (responses[i].hasSession) return responses[i];
  }
  return responses[responses.length - 1];
}

/**
 * @param {string} text
 * @param {{ signupEmail?: string, signupPassword?: string, supabaseAnonKey?: string }} secrets
 */
export function redactConsoleErrorText(text, { signupEmail, signupPassword, supabaseAnonKey }) {
  let out = text;
  let redactedCount = 0;

  const literals = [
    [signupEmail, '[redacted-email]'],
    [signupPassword, '[redacted-password]'],
    [supabaseAnonKey, '[redacted-anon-key]'],
  ].filter(([s]) => typeof s === 'string' && s.length > 0);

  literals.sort((a, b) => b[0].length - a[0].length);

  for (const [secret, placeholder] of literals) {
    let pos = 0;
    while ((pos = out.indexOf(secret, pos)) !== -1) {
      out = `${out.slice(0, pos)}${placeholder}${out.slice(pos + secret.length)}`;
      redactedCount++;
      pos += placeholder.length;
    }
  }

  const jwtLike = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  out = out.replace(jwtLike, () => {
    redactedCount++;
    return '[redacted-jwt]';
  });

  const sbAuthTokenLike = /sb-[A-Za-z0-9_-]+-auth-token\b/g;
  out = out.replace(sbAuthTokenLike, () => {
    redactedCount++;
    return '[redacted-sb-auth-key]';
  });

  return { text: out, redactedCount };
}

/**
 * @param {string} url
 * @param {number} timeoutMs
 */
export async function waitForHttpOk(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }

  throw new Error(
    `Timed out waiting for local Vite server at ${url}. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
