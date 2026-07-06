import { test, expect } from '@playwright/test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { startDocsDistCspServer, type DocsCspServer } from './shared/docs-csp-server';

/**
 * Issue #1147 — equipqr.info served a front page whose links, theme toggle,
 * and hero button did nothing because the production CSP (script-src 'self')
 * blocked the inline scripts VitePress needs to hydrate. The site also had no
 * EquipQR branding (no nav logo, no hero logo, favicon 404).
 *
 * Production CSP uses sha256 hashes for the three VitePress inline bootstraps
 * (generated post-build by scripts/docs/generate-docs-csp.mjs) instead of
 * script-src 'unsafe-inline'.
 *
 * This spec serves the built docs through the exact CSP shipped in
 * docs/vercel.json and proves hydration, navigation, theme toggling, and
 * branding assets all work under that policy.
 */
test.describe.serial('Help Center CSP hydration and branding @pr-evidence', () => {
  let docsServer: DocsCspServer;
  const cspViolations: string[] = [];

  test.beforeAll(async () => {
    docsServer = await startDocsDistCspServer();
  });

  test.afterAll(async () => {
    await docsServer?.close();
  });

  test('homepage hydrates under production CSP with EquipQR branding', async ({ page }) => {
    page.on('console', (message) => {
      if (message.type() === 'error' && /content security policy/i.test(message.text())) {
        cspViolations.push(message.text());
      }
    });

    await page.goto(`${docsServer.baseUrl}/`);

    // Hydration proof: VitePress site data (an inline script the old CSP
    // blocked) must be present and the Vue app must have mounted.
    await page.waitForFunction(() => {
      const app = document.querySelector('#app') as (Element & { __vue_app__?: unknown }) | null;
      return Boolean(app?.__vue_app__);
    });

    // Branding proof: nav logo + hero logo render from /eqr-logo/icon.svg.
    const navLogo = page.locator('.VPNavBarTitle img.logo');
    await expect(navLogo).toBeVisible();
    await expect(navLogo).toHaveAttribute('src', /eqr-logo\/icon\.svg/);
    await expect(page.locator('.VPHero .VPImage')).toBeVisible();

    await evidencePause(page, 600);
    await evidenceScreenshot(page, '01-homepage-branded-and-hydrated');

    expect(cspViolations).toEqual([]);
  });

  test('favicon and logo assets are served', async ({ request }) => {
    const favicon = await request.get(`${docsServer.baseUrl}/favicon.ico`);
    expect(favicon.status()).toBe(200);

    const logo = await request.get(`${docsServer.baseUrl}/eqr-logo/icon.svg`);
    expect(logo.status()).toBe(200);
    expect(logo.headers()['content-type']).toContain('image/svg+xml');
  });

  test('feature cards, hero button, and theme toggle work under production CSP', async ({
    page,
  }) => {
    await page.goto(`${docsServer.baseUrl}/`);

    // "Get oriented" feature card — the exact dead link from issue #1147.
    // VPFeature cards compute an empty accessible name, so target by href.
    await page.locator('a.VPFeature[href="/support/start-here/"]').click();
    await expect(page).toHaveURL(/\/support\/start-here\/$/);
    await expect(page.getByRole('heading', { name: /start here/i }).first()).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '02-get-oriented-card-navigates');

    // Hero call-to-action from the homepage.
    await page.goto(`${docsServer.baseUrl}/`);
    await page.getByRole('link', { name: 'Browse Help Center' }).click();
    await expect(page).toHaveURL(/\/support\/$/);
    await expect(
      page.getByRole('heading', { name: /equipqr help center/i }).first(),
    ).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '03-browse-help-center-navigates');

    // Theme toggle only works when the Vue app is interactive.
    const html = page.locator('html');
    const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
    await page.locator('.VPSwitchAppearance').first().click();
    await expect(html).toHaveClass(wasDark ? /^((?!dark).)*$/ : /dark/);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-theme-toggle-works');
  });
});
