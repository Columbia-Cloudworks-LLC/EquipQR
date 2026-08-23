import { runPlaywrightCommand, extractPageUrlFromOutput, sleep } from './demoGifPlaywright.mjs';

/**
 * @param {string} pageUrl
 * @param {string} baseUrl
 */
export function isAuthLikeUrl(pageUrl, baseUrl) {
  if (!pageUrl) return true;
  try {
    const base = new URL(baseUrl);
    const current = new URL(pageUrl);
    if (current.origin !== base.origin) {
      return false;
    }
    const p = current.pathname.toLowerCase();
    return (
      p.includes('/auth') ||
      p.includes('/login') ||
      p.includes('/sign-in') ||
      p.includes('/signup')
    );
  } catch {
    return true;
  }
}

/**
 * @param {string} baseUrl
 * @param {{ maxAttempts?: number, delayMs?: number }} [opts]
 */
export async function waitForDashboardOrThrow(baseUrl, { maxAttempts = 12, delayMs = 1200 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await runPlaywrightCommand(`playwright-cli goto ${baseUrl}/dashboard`);
    const output = `${result.stdout}\n${result.stderr}`;
    const pageUrl = extractPageUrlFromOutput(output);
    if (pageUrl && !isAuthLikeUrl(pageUrl, baseUrl)) {
      return;
    }
    await sleep(delayMs);
  }
  throw new Error(
    `Timed out reaching dashboard at ${baseUrl}/dashboard. ` +
      'For production, use saved auth: run `npx playwright codegen <url> --save-storage=tmp/demos/auth.json` once, then `npm run demo:record:prod` with DEMO_STORAGE_STATE set. ' +
      'Localhost automated persona login remains available via --base-url=http://localhost:8080.',
  );
}

/**
 * @param {string} value
 */
export function escapeForSingleQuotedJsString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * @param {string} baseUrl
 */
export async function loginAsAlexApex(baseUrl) {
  return loginWithPersona(baseUrl, { persona: 'Alex Apex' });
}

/**
 * @param {string} baseUrl
 * @param {{ persona?: string }} [opts]
 */
export async function loginWithPersona(baseUrl, { persona = 'Alex Apex' } = {}) {
  const escapedPersona = persona.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  await runPlaywrightCommand(`playwright-cli goto ${baseUrl}/auth`);

  async function navigateToDashboardAndCheckAuth() {
    const result = await runPlaywrightCommand(`playwright-cli goto ${baseUrl}/dashboard`);
    const output = `${result.stdout}\n${result.stderr}`;
    const pageUrl = extractPageUrlFromOutput(output);
    return Boolean(pageUrl && !isAuthLikeUrl(pageUrl, baseUrl));
  }

  await runPlaywrightCommand(
    `playwright-cli eval "() => { const trigger = document.querySelector('[role=combobox]') || Array.from(document.querySelectorAll('button')).find(el => /select a test account|persona/i.test(el.textContent || '')); if (!trigger) throw new Error('Persona dropdown not found on /auth'); trigger.click(); }"`,
  );
  await runPlaywrightCommand(
    `playwright-cli eval "() => { const option = Array.from(document.querySelectorAll('[role=option]')).find(el => new RegExp('${escapedPersona}', 'i').test(el.textContent || '')); if (!option) throw new Error('Requested persona option not found: ${escapedPersona}'); option.click(); }"`,
  );
  await runPlaywrightCommand(
    `playwright-cli eval "() => { const loginButton = Array.from(document.querySelectorAll('button')).find(el => /quick login/i.test(el.textContent || '')); if (!loginButton) throw new Error('Quick Login button not found after selecting persona'); loginButton.click(); }"`,
  );
  await runPlaywrightCommand('playwright-cli snapshot');
  if (await navigateToDashboardAndCheckAuth()) {
    return;
  }

  await runPlaywrightCommand(
    `playwright-cli eval "() => { const loginButton = Array.from(document.querySelectorAll('button')).find(el => /quick login/i.test(el.textContent || '')); if (!loginButton) throw new Error('Quick Login button not found in auth retry flow'); loginButton.click(); }"`,
  );
  if (!(await navigateToDashboardAndCheckAuth())) {
    throw new Error(`Authentication did not complete for persona: ${persona}`);
  }
}
