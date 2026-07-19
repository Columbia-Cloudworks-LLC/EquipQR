import { test, expect } from '../user/fixtures/equipqr-test';
import { evidenceScreenshot, evidencePause } from './shared/evidence-helpers';

// Unauthenticated — default owner storage would redirect `/` to the dashboard.
// Pin reduced-motion off so assertions about the animated path stay deterministic.
test.use({
  storageState: { cookies: [], origins: [] },
  reducedMotion: 'no-preference',
});

/**
 * PR evidence for #1364 — landing hero Suspense no longer flashes Texas while
 * lazy phase chunks load on cold first paint.
 */
test.describe('PR evidence landing hero Suspense flash @pr-evidence', () => {
  test('cold load shows continuous hero stage without Texas static composite flash', async ({
    page,
  }) => {
    // Hard navigation so lazy chunks behave like a first visit.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hero = page.getByRole('region', { name: /EquipQR asset tracking demo/i });
    await expect(hero).toBeVisible({ timeout: 30_000 });

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Texas static composite is reduced-motion only — must never appear during
    // the animated cold-load path.
    await expect(page.getByTestId('static-hero-composite')).toHaveCount(0);

    await evidencePause(page, 400);
    await evidenceScreenshot(page, '01-landing-hero-cold-load', { target: hero });

    // Hold through the first QR → morph handoff window where TX used to flash.
    await evidencePause(page, 2800);
    await expect(page.getByTestId('static-hero-composite')).toHaveCount(0);
    await evidenceScreenshot(page, '02-landing-hero-after-first-transition', { target: hero });
  });
});
