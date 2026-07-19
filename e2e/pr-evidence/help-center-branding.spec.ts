import { test, expect } from '@playwright/test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';
import { startDocsDistCspServer, type DocsCspServer } from './shared/docs-csp-server';

/**
 * Issue #1147 — equipqr.info served a front page whose links, theme toggle,
 * and hero button did nothing because the production CSP (script-src 'self')
 * blocked the inline scripts VitePress needs to hydrate. The site also had no
 * EquipQR branding (no nav logo, no hero logo, favicon 404).
 *
 * Issue #1158 — the sha256-hash CSP from #1147 drifted as soon as any doc page
 * changed (VitePress regenerates its inline __VP_HASH_MAP__ bootstrap), because
 * Vercel serves headers from the committed vercel.json, not the build output.
 * The build now externalizes all inline scripts to /assets/inline.*.js
 * (scripts/docs/externalize-docs-inline-scripts.mjs) so the CSP stays a static
 * script-src 'self' that can never drift.
 *
 * Issue #1358 — VitePress theme mirrors Mission Control tokens from the app,
 * defaults to dark, uses EquipQR (+ Docs) wordmark, and styles Open App as a
 * primary CTA so the help center reads as the same product family.
 *
 * This spec serves the built docs through the exact CSP shipped in
 * docs/vercel.json and proves hydration, navigation, theme toggling,
 * branding assets, and #1358 design-system alignment under that policy.
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

    // #1358 — product wordmark (EquipQR), not "EquipQR Help" as primary title.
    await expect(page.locator('.VPNavBarTitle .title')).toContainText('EquipQR');
    await expect(page.locator('.VPHero .name')).toHaveText(/EquipQR/i);
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Mission Control primary (#B79CFF) wired into VitePress brand token.
    // Custom properties may retain the var() expression rather than resolving it.
    const brandColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--vp-c-brand-1').trim(),
    );
    expect(brandColor).toBe('hsl(var(--eqr-primary))');

    // Open App CTA uses primary button treatment (desktop menu or mobile screen).
    const openAppDesktop = page.locator('.VPNavBarMenuLink[href="https://equipqr.app"]');
    const openAppMobile = page.locator('.VPNavScreenMenuLink[href="https://equipqr.app"]');
    if (await openAppDesktop.isVisible()) {
      await expect(openAppDesktop).toHaveCSS('font-weight', /^(600|bold)$/);
    } else {
      await page.locator('.VPNavBarHamburger').click();
      await expect(openAppMobile).toBeVisible();
      await expect(openAppMobile).toHaveCSS('font-weight', /^(600|bold)$/);
      // Close the screen so later homepage screenshots stay clean.
      await page.locator('.VPNavBarHamburger').click();
    }

    await evidencePause(page, 600);
    // Full viewport — nav is edge-to-edge and fails { target } padding checks.
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
    // Narrow viewports: open hamburger and use the VPNavScreen switch (multiple
    // hidden .VPSwitchAppearance nodes exist in the desktop chrome).
    const html = page.locator('html');
    const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
    const isNarrow = (page.viewportSize()?.width ?? 1920) < 960;
    if (isNarrow) {
      await page.locator('.VPNavBarHamburger').click();
      await page.locator('.VPNavScreen .VPSwitchAppearance').click();
    } else {
      await page.locator('.VPNavBar .VPSwitchAppearance').first().click();
    }
    await expect(html).toHaveClass(wasDark ? /^((?!dark).)*$/ : /dark/);
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '04-theme-toggle-works');
    if (isNarrow) {
      await page.locator('.VPNavBarHamburger').click();
    }

    // #1358 — article chrome (sidebar + doc) under Mission Control tokens.
    await page.goto(`${docsServer.baseUrl}/support/start-here/`);
    await expect(page.getByRole('heading', { name: /start here/i }).first()).toBeVisible();
    await expect(page.locator('.VPSidebar')).toBeVisible();
    await evidencePause(page, 600);
    await evidenceScreenshot(page, '05-article-chrome-mission-control');
  });
});
