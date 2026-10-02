import { test } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';

test.describe('Usability improvements 1584-1587 @pr-evidence', () => {
  test('landing page and dashboard', async ({
    page,
    gotoDashboard,
    assertHealthyShell,
  }) => {
    // 1585: Landing page CTA
    await page.goto('/');
    await evidencePause(page, 1000);
    await evidenceScreenshot(page, '01-landing-cta');

    // 1587: Dashboard calendar surface
    await gotoDashboard('/work-orders?view=calendar');
    await assertHealthyShell();
    await evidencePause(page, 1000);
    await evidenceScreenshot(page, '02-work-orders-calendar');
  });
});
