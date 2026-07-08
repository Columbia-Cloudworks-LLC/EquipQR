// fallow-ignore-file unused-file
// (Invoked by scripts/qbo/Connect-QboBrowserSession.ps1, not imported statically.)
// Unattended QuickBooks Online browser sign-in for agent automation.
//
// Signs into app.qbo.intuit.com using credentials provided via env
// (QBO_USERNAME / QBO_PASSWORD, loaded by Connect-QboBrowserSession.ps1) and a
// fresh TOTP read from 1Password at challenge time. The session persists in a
// local Playwright profile so subsequent runs skip sign-in entirely.
//
// Usage (via wrapper):
//   .\scripts\qbo\Connect-QboBrowserSession.ps1 [-TargetUrl <url>]
//
// Exit codes: 0 signed in, 1 sign-in failed, 2 missing env.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const USERNAME = process.env.QBO_USERNAME;
const PASSWORD = process.env.QBO_PASSWORD;
if (!USERNAME || !PASSWORD) {
  console.error('QBO_USERNAME / QBO_PASSWORD required (run via Connect-QboBrowserSession.ps1)');
  process.exit(2);
}

const TARGET_URL = process.env.QBO_TARGET_URL || 'https://qbo.intuit.com/app/homepage';
const PROFILE_DIR = process.env.QBO_PROFILE_DIR || 'tmp/qbo-automation/profile';
const SHOTS_DIR = process.env.QBO_SHOTS_DIR || 'tmp/qbo-automation/shots';
const OP_TOTP_REF = process.env.QBO_OP_TOTP_REF
  || 'op://EquipQR Agents/quickbooks-developer/one-time password?attribute=otp';
mkdirSync(SHOTS_DIR, { recursive: true });

function freshOtp() {
  return execFileSync('op', ['read', OP_TOTP_REF], { encoding: 'utf8' }).trim();
}

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1440, height: 900 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

let step = 0;
const shot = async (label) => {
  step += 1;
  const file = `${SHOTS_DIR}/signin-${String(step).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: file }).catch(() => {});
  console.log(`[shot] ${file} url=${page.url().slice(0, 110)}`);
};

const isSignedIn = (url) => {
  const parsed = new URL(url);
  const { hostname, pathname } = parsed;
  const isQboUiHost =
    hostname === 'qbo.intuit.com' || hostname.endsWith('.qbo.intuit.com');
  return isQboUiHost && !pathname.includes('sign-in');
};

const isIntuitHost = (url) => {
  const { hostname } = new URL(url);
  return hostname === 'intuit.com' || hostname.endsWith('.intuit.com');
};

await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });

// Some Intuit sign-in steps render inside iframes; search every frame.
async function firstVisible(buildLocator) {
  for (const frame of page.frames()) {
    try {
      const locator = buildLocator(frame).filter({ visible: true }).first();
      if (await locator.count()) return locator;
    } catch {
      // Frame may have detached mid-scan; ignore and continue.
    }
  }
  return null;
}

// State machine: each iteration inspects the page and performs at most one
// action. `lastAction` prevents re-submitting the same form while a slow
// navigation is in flight (the bug that crashed the first prototype).
let lastAction = '';
let success = false;

for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(2500);
  const url = page.url();

  if (isSignedIn(url)) {
    await page.waitForTimeout(5000);
    if (isSignedIn(page.url())) {
      success = true;
      console.log('SUCCESS: QuickBooks session active');
      break;
    }
    continue;
  }

  if (!isIntuitHost(url)) {
    await shot('unexpected-origin');
    continue;
  }

  // 0. Dismiss the cookie banner so it cannot intercept clicks.
  const cookieOk = await firstVisible((f) => f.getByRole('button', { name: /^i understand$/i }));
  if (cookieOk) {
    await cookieOk.click().catch(() => {});
    console.log('[step] dismissed cookie banner');
  }

  // 1. Username / identifier
  const emailInput = await firstVisible((f) => f.locator('input[name="Email"], input[type="email"], input[data-testid*="IdentifierFirst"]'));
  if (emailInput && lastAction !== 'username') {
    await shot('username');
    await emailInput.fill(USERNAME);
    await emailInput.press('Enter');
    lastAction = 'username';
    console.log('[step] username submitted');
    continue;
  }

  // 2. Password (input may appear directly or behind the chooser below)
  const passwordInput = await firstVisible((f) => f.locator('input[type="password"]'));
  if (passwordInput && lastAction !== 'password') {
    await shot('password');
    await passwordInput.fill(PASSWORD);
    await passwordInput.press('Enter');
    lastAction = 'password';
    console.log('[step] password submitted');
    continue;
  }

  // 3. TOTP challenge
  const totpInput = await firstVisible((f) => f.locator('input[name="verificationCode"], input[data-testid*="VerifyOtp"], input[inputmode="numeric"]'));
  if (totpInput && lastAction !== 'totp') {
    await shot('totp');
    await totpInput.fill(freshOtp());
    await totpInput.press('Enter');
    lastAction = 'totp';
    console.log('[step] totp submitted');
    continue;
  }

  // 4. "Verify it's you" identity chooser → prefer the password path.
  // The card is a role=button; plain text matching can hit a screen-reader-only
  // announcement element instead, so resolve the role target and click its
  // bounding-box center with a real mouse event.
  const clickCard = async (namePattern) => {
    const card = await firstVisible((f) =>
      f.getByRole('button', { name: namePattern }).or(f.getByRole('link', { name: namePattern })),
    );
    if (!card) return false;
    // Belt and braces: real mouse click, then keyboard activation. The chooser
    // cards ignore some synthetic activation paths.
    const box = await card.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
      await page.waitForTimeout(150);
      await page.mouse.down();
      await page.waitForTimeout(80);
      await page.mouse.up();
    }
    await page.waitForTimeout(800);
    await card.focus().catch(() => {});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await page.keyboard.press(' ').catch(() => {});
    return true;
  };

  if (lastAction !== 'choose-password' && (await clickCard(/enter password/i))) {
    await shot('identity-chooser');
    lastAction = 'choose-password';
    console.log('[step] chose Enter password');
    continue;
  }

  // 5. MFA method chooser → prefer authenticator app / verification code.
  if (lastAction !== 'choose-totp' && (await clickCard(/authenticator|verification code|enter a code/i))) {
    await shot('mfa-chooser');
    lastAction = 'choose-totp';
    console.log('[step] chose authenticator code');
    continue;
  }

  // Unknown state: log it and keep polling (slow transitions land here too).
  if (i % 4 === 3) {
    await shot('waiting');
    const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 200).replace(/\s+/g, ' ');
    console.log('[state]', text);
    lastAction = '';
  }
}

if (!success) {
  await shot('failed-final');
  console.log('FAILED: did not reach a signed-in QuickBooks page');
  console.log('FINAL URL:', page.url());
  await ctx.close();
  process.exit(1);
}

console.log('FINAL URL:', page.url());
await ctx.close();
