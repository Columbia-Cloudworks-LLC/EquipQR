import { test, expect } from '../user/fixtures/equipqr-test';
import { evidencePause, evidenceScreenshot } from './shared/evidence-helpers';
import {
  closeFleetMapPanelIfOpen,
  expectFleetMapRootToStayMounted,
  markFleetMapRootAsStable,
  openFleetMapWithInterceptedMapsKey,
} from '../user/shared/fleet-map-test-helpers';

test.describe('Fleet map Team HQ marker @pr-evidence', () => {
  test('captures Team HQ selection without remounting the map', async ({ page, assertHealthyShell }) => {
    await openFleetMapWithInterceptedMapsKey(page);
    await assertHealthyShell();
    await closeFleetMapPanelIfOpen(page);
    await markFleetMapRootAsStable(page);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '01-fleet-map-before-hq-click');

    await page.getByTitle('Heavy Equipment Team').first().click();
    await expect(page.getByRole('button', { name: 'View Team' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Heavy Equipment Team').last()).toBeVisible();
    await expectFleetMapRootToStayMounted(page);

    await evidencePause(page, 800);
    await evidenceScreenshot(page, '02-fleet-map-hq-popup');
  });
});
