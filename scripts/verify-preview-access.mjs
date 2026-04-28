#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const ENV_KEYS_TO_REPORT = [
  'PREVIEW_LOGIN_EMAIL',
  'PREVIEW_LOGIN_PASSWORD',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

const REQUIRED_ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const HOST = '127.0.0.1';
const STARTUP_TIMEOUT_MS = 30_000;
const SIGNUP_TIMEOUT_MS = 20_000;
const LOGIN_TIMEOUT_MS = 20_000;

function marker(value) {
  return value ? '[set]' : '[missing]';
}

function reportEnvPresence() {
  for (const key of ENV_KEYS_TO_REPORT) {
    console.log(`previewAccess.env.${key}=${marker(process.env[key])}`);
  }
}

function requireEnv() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function normalizeSupabaseUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, HOST, () => {
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Terminate a spawned npm/Vite child. On non-Windows the process was spawned
 * detached so the session leader is the process group; use negative PID.
 * Ignores ESRCH (already exited) and EPERM races so cleanup cannot fail the verifier.
 */
function terminateChild(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    try {
      child.kill(signal);
    } catch (err) {
      if (err && err.code === 'ESRCH') return;
      throw err;
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

/** Prefer the latest response that created a session; else the last captured response. */
function pickRecordedAuthResponse(responses) {
  if (responses.length === 0) return undefined;
  for (let i = responses.length - 1; i >= 0; i--) {
    if (responses[i].hasSession) return responses[i];
  }
  return responses[responses.length - 1];
}

/**
 * Redact secrets and auth artifacts from browser console strings so CI/agent logs stay safe.
 * Literal secrets are replaced longest-first to avoid partial leaks.
 */
function redactConsoleErrorText(text, { signupEmail, signupPassword, supabaseAnonKey }) {
  let out = text;
  let redactedCount = 0;

  const literals = [
    [signupEmail, '[redacted-email]'],
    [signupPassword, '[redacted-password]'],
    [supabaseAnonKey, '[redacted-anon-key]']
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

  const jwtLike =
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
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

async function waitForHttpOk(url, timeoutMs) {
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
    }`
  );
}

async function startVite({ port, viteEnv }) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(
    npmCommand,
    ['run', 'dev', '--', '--host', HOST, '--port', String(port), '--strictPort'],
    {
      env: viteEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32'
    }
  );

  let outputTail = '';
  const captureOutput = (chunk) => {
    outputTail = `${outputTail}${chunk.toString()}`.slice(-4000);
  };
  child.stdout.on('data', captureOutput);
  child.stderr.on('data', captureOutput);

  child.once('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      outputTail = `${outputTail}\n[vite exited with code ${code}]`.slice(-4000);
    } else if (signal) {
      outputTail = `${outputTail}\n[vite exited with signal ${signal}]`.slice(-4000);
    }
  });

  const baseUrl = `http://${HOST}:${port}`;
  try {
    await waitForHttpOk(baseUrl, STARTUP_TIMEOUT_MS);
  } catch (error) {
    terminateChild(child, 'SIGTERM');
    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        'Recent Vite output:',
        outputTail.trim() || '[none]'
      ].join('\n')
    );
  }

  return {
    baseUrl,
    stop: async () => {
      terminateChild(child, 'SIGTERM');
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        delay(3000).then(() => {
          if (child.exitCode === null && child.signalCode === null) {
            terminateChild(child, 'SIGKILL');
          }
        })
      ]);
    }
  };
}

async function verifyBrowserInstalled() {
  const executablePath = chromium.executablePath();
  const exists = await fileExists(executablePath);
  console.log(`previewAccess.playwright.chromium=${exists ? '[installed]' : '[missing]'}`);
  if (!exists) {
    throw new Error(
      [
        'Playwright Chromium browser binary is missing.',
        `Expected executable path: ${executablePath}`,
        'Run: npx playwright install chromium'
      ].join('\n')
    );
  }
}

async function runSignupAndLoginProbe({ baseUrl, supabaseHost, supabaseAnonKey }) {
  const runId = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const signupEmail = `cloud-agent-${runId}@example.com`;
  const signupPassword = `${crypto.randomBytes(18).toString('base64url')}A1!`;
  const signupResponses = [];
  const loginResponses = [];
  const consoleErrors = [];
  let consoleErrorsRedactedReplacements = 0;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', async (response) => {
    try {
      const url = new URL(response.url());
      if (url.host !== supabaseHost) {
        return;
      }

      if (url.pathname.includes('/auth/v1/signup')) {
        const body = await response.json().catch(() => ({}));
        signupResponses.push({
          hostMatchesEnv: true,
          status: response.status(),
          hasSession: Boolean(body?.session || body?.access_token),
          hasUser: Boolean(body?.user || body?.id),
          errorCode: body?.code || body?.error_code || body?.error || '[missing]',
          errorMessage: body?.msg || body?.message || body?.error_description || '[missing]'
        });
      }

      if (
        url.pathname.includes('/auth/v1/token') &&
        url.searchParams.get('grant_type') === 'password'
      ) {
        const body = await response.json().catch(() => ({}));
        loginResponses.push({
          hostMatchesEnv: true,
          status: response.status(),
          hasSession: Boolean(body?.session || body?.access_token),
          hasUser: Boolean(body?.user || body?.id),
          errorCode: body?.code || body?.error_code || body?.error || '[missing]',
          errorMessage: body?.msg || body?.message || body?.error_description || '[missing]'
        });
      }
    } catch {
      // Ignore non-URL responses and opaque bodies; the final assertions cover missing signup calls.
    }
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const raw = message.text();
    const { text: redacted, redactedCount } = redactConsoleErrorText(raw, {
      signupEmail,
      signupPassword,
      supabaseAnonKey
    });
    consoleErrorsRedactedReplacements += redactedCount;
    consoleErrors.push(redacted.slice(0, 240));
  });

  try {
    const response = await page.goto(`${baseUrl}/auth?tab=signup`, {
      waitUntil: 'domcontentloaded',
      timeout: STARTUP_TIMEOUT_MS
    });
    console.log(`previewAccess.authPage.status=${response ? response.status() : '[missing]'}`);

    const hcaptchaCount = await page
      .locator('[data-hcaptcha-widget-id], iframe[src*="hcaptcha"]')
      .or(page.getByText(/captcha/i))
      .count()
      .catch(() => 0);
    console.log(`previewAccess.hcaptcha.present=${hcaptchaCount > 0 ? '[yes]' : '[no]'}`);

    await page.locator('#signup-name').fill('Cloud Agent Preview Test');
    await page.locator('#signup-email').fill(signupEmail);
    await page.locator('#signup-organization').fill(`Cloud Agent Preview ${runId}`);
    await page.locator('#signup-password').fill(signupPassword);
    await page.locator('#signup-confirm-password').fill(signupPassword);

    const submit = page.getByRole('button', { name: /Create Account & Organization/i });
    const submitEnabled = await submit.isEnabled();
    console.log(`previewAccess.signup.submitEnabled=${submitEnabled ? '[yes]' : '[no]'}`);
    if (!submitEnabled) {
      throw new Error('Signup submit button is disabled.');
    }

    await submit.click();
    await page.waitForURL(/\/dashboard(\/|$|\?)/, { timeout: SIGNUP_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(1000);

    const currentPath = new URL(page.url()).pathname;
    const authenticatedRoute = currentPath.startsWith('/dashboard');
    const localStorageSession = await page.evaluate(() =>
      Object.keys(localStorage).some(
        (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
      )
    );
    const visibleAlert = await page
      .locator('[role="alert"]')
      .first()
      .innerText({ timeout: 2000 })
      .catch(() => '');

    const signup = pickRecordedAuthResponse(signupResponses);
    console.log(`previewAccess.signup.generatedEmail=[not-printed]`);
    console.log(`previewAccess.signup.supabaseRequests=${signupResponses.length}`);
    if (signup) {
      console.log(`previewAccess.signup.supabaseHostMatchesEnv=${signup.hostMatchesEnv ? '[yes]' : '[no]'}`);
      console.log(`previewAccess.signup.supabaseStatus=${signup.status}`);
      console.log(`previewAccess.signup.supabaseUser=${signup.hasUser ? '[created-or-returned]' : '[not-created]'}`);
      console.log(`previewAccess.signup.supabaseSession=${signup.hasSession ? '[created]' : '[not-created]'}`);
      if (signup.status >= 400) {
        const redactOpts = { signupEmail, signupPassword, supabaseAnonKey };
        console.log(`previewAccess.signup.supabaseErrorCode=${redactConsoleErrorText(signup.errorCode ?? '', redactOpts).text}`);
        console.log(`previewAccess.signup.supabaseErrorMessage=${redactConsoleErrorText(signup.errorMessage ?? '', redactOpts).text}`);
      }
    }
    console.log(`previewAccess.signup.localStorageSession=${localStorageSession ? '[present]' : '[missing]'}`);
    console.log(`previewAccess.signup.authenticatedRoute=${authenticatedRoute ? '[yes]' : '[no]'}`);
    console.log(`previewAccess.signup.visibleAlert=${visibleAlert ? redactConsoleErrorText(visibleAlert.replace(/\s+/g, ' ').trim(), { signupEmail, signupPassword, supabaseAnonKey }).text : '[none]'}`);
    console.log(`previewAccess.consoleErrors.count=${consoleErrors.length}`);
    console.log(
      `previewAccess.consoleErrors.redactedReplacements=${consoleErrorsRedactedReplacements}`
    );
    for (const [index, text] of consoleErrors.slice(0, 3).entries()) {
      console.log(`previewAccess.consoleErrors.${index + 1}=${text}`);
    }

    if (!signup) {
      throw new Error('No Supabase signup request was observed.');
    }
    if (signup.status >= 400) {
      throw new Error(`Supabase signup failed with status ${signup.status}.`);
    }
    if (!signup.hasSession || !localStorageSession || !authenticatedRoute) {
      throw new Error('Signup completed without a usable authenticated dashboard session.');
    }

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    const loginPageResponse = await page.goto(`${baseUrl}/auth?tab=signin`, {
      waitUntil: 'domcontentloaded',
      timeout: STARTUP_TIMEOUT_MS
    });
    console.log(`previewAccess.login.authPage.status=${loginPageResponse ? loginPageResponse.status() : '[missing]'}`);

    await page.locator('#signin-email').fill(signupEmail);
    await page.locator('#signin-password').fill(signupPassword);

    const loginSubmit = page.getByRole('button', { name: /^Sign In$/i });
    const loginSubmitEnabled = await loginSubmit.isEnabled();
    console.log(`previewAccess.login.submitEnabled=${loginSubmitEnabled ? '[yes]' : '[no]'}`);
    if (!loginSubmitEnabled) {
      throw new Error('Login submit button is disabled.');
    }

    await loginSubmit.click();
    await page.waitForURL(/\/dashboard(\/|$|\?)/, { timeout: LOGIN_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(1000);

    const loginCurrentPath = new URL(page.url()).pathname;
    const loginAuthenticatedRoute = loginCurrentPath.startsWith('/dashboard');
    const loginLocalStorageSession = await page.evaluate(() =>
      Object.keys(localStorage).some(
        (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
      )
    );
    const loginVisibleAlert = await page
      .locator('[role="alert"], #signin-auth-error')
      .first()
      .innerText({ timeout: 2000 })
      .catch(() => '');

    const login = pickRecordedAuthResponse(loginResponses);
    console.log(`previewAccess.login.generatedEmail=[not-printed]`);
    console.log(`previewAccess.login.supabaseRequests=${loginResponses.length}`);
    if (login) {
      console.log(`previewAccess.login.supabaseHostMatchesEnv=${login.hostMatchesEnv ? '[yes]' : '[no]'}`);
      console.log(`previewAccess.login.supabaseStatus=${login.status}`);
      console.log(`previewAccess.login.supabaseUser=${login.hasUser ? '[returned]' : '[not-returned]'}`);
      console.log(`previewAccess.login.supabaseSession=${login.hasSession ? '[created]' : '[not-created]'}`);
      if (login.status >= 400) {
        const redactOpts = { signupEmail, signupPassword, supabaseAnonKey };
        console.log(`previewAccess.login.supabaseErrorCode=${redactConsoleErrorText(login.errorCode ?? '', redactOpts).text}`);
        console.log(`previewAccess.login.supabaseErrorMessage=${redactConsoleErrorText(login.errorMessage ?? '', redactOpts).text}`);
      }
    }
    console.log(`previewAccess.login.localStorageSession=${loginLocalStorageSession ? '[present]' : '[missing]'}`);
    console.log(`previewAccess.login.authenticatedRoute=${loginAuthenticatedRoute ? '[yes]' : '[no]'}`);
    console.log(`previewAccess.login.visibleAlert=${loginVisibleAlert ? redactConsoleErrorText(loginVisibleAlert.replace(/\s+/g, ' ').trim(), { signupEmail, signupPassword, supabaseAnonKey }).text : '[none]'}`);

    if (!login) {
      throw new Error('No Supabase password login request was observed.');
    }
    if (login.status >= 400) {
      throw new Error(`Supabase password login failed with status ${login.status}.`);
    }
    if (!login.hasSession || !loginLocalStorageSession || !loginAuthenticatedRoute) {
      throw new Error('Login completed without a usable authenticated dashboard session.');
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  reportEnvPresence();
  requireEnv();

  const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY.trim();
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is empty or whitespace-only.');
  }
  const supabaseHost = new URL(supabaseUrl).host;

  await verifyBrowserInstalled();

  const port = await getFreePort();
  const viteEnv = {
    ...process.env,
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    // Preview's signup flow should not require hCaptcha in local dev verification.
    VITE_HCAPTCHA_SITEKEY: ''
  };

  let server;
  try {
    server = await startVite({ port, viteEnv });
    console.log(`previewAccess.localVite.url=${server.baseUrl}`);
    await runSignupAndLoginProbe({
      baseUrl: server.baseUrl,
      supabaseHost,
      supabaseAnonKey
    });
    console.log('previewAccess.result=[ok]');
  } finally {
    if (server) {
      await server.stop();
    }
  }
}

main().catch((error) => {
  console.error(`previewAccess.result=[failed]`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
